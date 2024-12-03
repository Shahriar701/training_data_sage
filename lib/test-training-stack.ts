import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigatewayv2 from '@aws-cdk/aws-apigatewayv2-alpha';
import * as apigatewayv2_integrations from '@aws-cdk/aws-apigatewayv2-integrations-alpha';

export class TestTrainingStack extends cdk.Stack {
 constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
   super(scope, id, props);

   // Storage Buckets
   const trainingDataBucket = new s3.Bucket(this, 'TrainingDataBucket', {
     versioned: true,
     encryption: s3.BucketEncryption.S3_MANAGED,
     cors: [{
       allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
       allowedOrigins: ['*'],
       allowedHeaders: ['*']
     }]
   });

   const weightsBucket = new s3.Bucket(this, 'WeightsBucket', {
     versioned: true,
     encryption: s3.BucketEncryption.S3_MANAGED,
     cors: [{
       allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
       allowedOrigins: ['*'],
       allowedHeaders: ['*']
     }]
   });

   // Docker Repository
   const modelRegistry = new ecr.Repository(this, 'ModelRegistry', {
     repositoryName: 'test-models',
     imageScanOnPush: true,
     removalPolicy: cdk.RemovalPolicy.RETAIN,
   });

   // SageMaker Role
   const sagemakerRole = new iam.Role(this, 'SageMakerRole', {
     assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
     managedPolicies: [
       iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
       iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess')
     ]
   });

   // Lambda Role
   const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
     assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
     managedPolicies: [
       iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
     ]
   });

   // Grant permissions
   trainingDataBucket.grantReadWrite(sagemakerRole);
   weightsBucket.grantReadWrite(sagemakerRole);
   modelRegistry.grantPullPush(sagemakerRole);

   // Lambda Functions
   const uploadHandler = new lambda.Function(this, 'UploadHandler', {
     runtime: lambda.Runtime.PYTHON_3_9,
     code: lambda.Code.fromAsset('lambda'),
     handler: 'upload.handler',
     environment: {
       TRAINING_BUCKET: trainingDataBucket.bucketName,
       WEIGHTS_BUCKET: weightsBucket.bucketName
     },
     timeout: cdk.Duration.seconds(30),
     memorySize: 256,
     role: lambdaRole
   });

   const downloadHandler = new lambda.Function(this, 'DownloadHandler', {
     runtime: lambda.Runtime.PYTHON_3_9,
     code: lambda.Code.fromAsset('lambda'),
     handler: 'download.handler',
     environment: {
       WEIGHTS_BUCKET: weightsBucket.bucketName,
       MODEL_REGISTRY: modelRegistry.repositoryUri
     },
     timeout: cdk.Duration.seconds(30),
     memorySize: 256,
     role: lambdaRole
   });

   const trainingJobConfig = {
     trainingJobName: 'demo-training-job',
     algorithmSpecification: {
       trainingImage: modelRegistry.repositoryUri,
       trainingInputMode: 'File'
     },
     roleArn: sagemakerRole.roleArn,
     inputDataConfig: [{
       channelName: 'training',
       dataSource: {
         s3DataSource: {
           s3Uri: `s3://${trainingDataBucket.bucketName}/photos/`,
           s3DataType: 'S3Prefix',
           s3DataDistributionType: 'FullyReplicated'
         }
       }
     }],
     outputDataConfig: {
       s3OutputPath: `s3://${weightsBucket.bucketName}/training-output/`
     },
     resourceConfig: {
       instanceCount: 1,
       instanceType: 'ml.m5.large',
       volumeSizeInGb: 50
     },
     stoppingCondition: {
       maxRuntimeInSeconds: 86400
     }
   };

   const trainingHandler = new lambda.Function(this, 'TrainingJobAPIHandler', {
     runtime: lambda.Runtime.PYTHON_3_9,
     code: lambda.Code.fromAsset('lambda'),
     handler: 'training_api.handler',
     environment: {
       TRAINING_CONFIG: JSON.stringify(trainingJobConfig)
     },
     timeout: cdk.Duration.minutes(5),
     memorySize: 256,
     role: lambdaRole
   });

   const audioHandler = new lambda.Function(this, 'AudioHandler', {
     runtime: lambda.Runtime.PYTHON_3_9,
     code: lambda.Code.fromAsset('lambda'),
     handler: 'audio.handler',
     environment: {
       TRAINING_BUCKET: trainingDataBucket.bucketName
     },
     timeout: cdk.Duration.seconds(30),
     memorySize: 256,
     role: lambdaRole
   });

   const audioStreamApi = new apigatewayv2.WebSocketApi(this, 'AudioStreamApi', {
     connectRouteOptions: { integration: new apigatewayv2_integrations.WebSocketLambdaIntegration('AudioConnect', audioHandler) },
     disconnectRouteOptions: { integration: new apigatewayv2_integrations.WebSocketLambdaIntegration('AudioDisconnect', audioHandler) },
     defaultRouteOptions: { integration: new apigatewayv2_integrations.WebSocketLambdaIntegration('AudioDefault', audioHandler) }
   });

   const audioStage = new apigatewayv2.WebSocketStage(this, 'AudioStage', {
     webSocketApi: audioStreamApi,
     stageName: 'prod',
     autoDeploy: true
   });

   // Lambda Permissions
   uploadHandler.addToRolePolicy(new iam.PolicyStatement({
     effect: iam.Effect.ALLOW,
     actions: [
       's3:PutObject',
       's3:GetObject',
       's3:ListBucket',
       's3:GetObjectVersion',
       's3:DeleteObject'
     ],
     resources: [
       trainingDataBucket.bucketArn,
       `${trainingDataBucket.bucketArn}/*`,
       weightsBucket.bucketArn,
       `${weightsBucket.bucketArn}/*`
     ]
   }));

   downloadHandler.addToRolePolicy(new iam.PolicyStatement({
     effect: iam.Effect.ALLOW,
     actions: [
       's3:GetObject',
       's3:ListBucket',
       's3:GetObjectVersion'
     ],
     resources: [
       weightsBucket.bucketArn,
       `${weightsBucket.bucketArn}/*`
     ]
   }));

   downloadHandler.addToRolePolicy(new iam.PolicyStatement({
     effect: iam.Effect.ALLOW,
     actions: ['ecr:GetAuthorizationToken'],
     resources: ['*']
   }));

   downloadHandler.addToRolePolicy(new iam.PolicyStatement({
     effect: iam.Effect.ALLOW,
     actions: [
       'ecr:BatchCheckLayerAvailability',
       'ecr:GetDownloadUrlForLayer',
       'ecr:GetRepositoryPolicy',
       'ecr:DescribeRepositories',
       'ecr:ListImages',
       'ecr:DescribeImages',
       'ecr:BatchGetImage'
     ],
     resources: [modelRegistry.repositoryArn]
   }));

   trainingHandler.addToRolePolicy(new iam.PolicyStatement({
     effect: iam.Effect.ALLOW,
     actions: [
       'sagemaker:CreateTrainingJob',
       'sagemaker:DescribeTrainingJob',
       'sagemaker:StopTrainingJob'
     ],
     resources: [`arn:aws:sagemaker:${this.region}:${this.account}:training-job/*`]
   }));

   trainingHandler.addToRolePolicy(new iam.PolicyStatement({
     effect: iam.Effect.ALLOW,
     actions: ['iam:PassRole'],
     resources: [sagemakerRole.roleArn]
   }));

   trainingHandler.addToRolePolicy(new iam.PolicyStatement({
     effect: iam.Effect.ALLOW,
     actions: ['ecr:GetAuthorizationToken'],
     resources: ['*']
   }));

   trainingHandler.addToRolePolicy(new iam.PolicyStatement({
     effect: iam.Effect.ALLOW,
     actions: [
       'ecr:BatchCheckLayerAvailability',
       'ecr:GetDownloadUrlForLayer',
       'ecr:GetRepositoryPolicy',
       'ecr:DescribeRepositories',
       'ecr:ListImages',
       'ecr:DescribeImages',
       'ecr:BatchGetImage'
     ],
     resources: [modelRegistry.repositoryArn]
   }));

   audioHandler.addToRolePolicy(new iam.PolicyStatement({
     effect: iam.Effect.ALLOW,
     actions: ['execute-api:ManageConnections'],
     resources: [`arn:aws:execute-api:${this.region}:${this.account}:${audioStreamApi.apiId}/*`]
   }));

   audioHandler.addToRolePolicy(new iam.PolicyStatement({
     effect: iam.Effect.ALLOW,
     actions: [
       's3:PutObject',
       's3:GetObject',
       's3:ListBucket'
     ],
     resources: [
       trainingDataBucket.bucketArn,
       `${trainingDataBucket.bucketArn}/*`
     ]
   }));

   // API Gateway
   const api = new apigateway.RestApi(this, 'ModelAPI', {
     restApiName: 'Test Model API',
     defaultCorsPreflightOptions: {
       allowOrigins: apigateway.Cors.ALL_ORIGINS,
       allowMethods: apigateway.Cors.ALL_METHODS,
       allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key']
     }
   });

   const photos = api.root.addResource('photos');
   const weights = api.root.addResource('weights');
   const models = api.root.addResource('models');
   const training = api.root.addResource('training');

   photos.addMethod('POST', new apigateway.LambdaIntegration(uploadHandler));
   weights.addMethod('POST', new apigateway.LambdaIntegration(uploadHandler));
   weights.addMethod('GET', new apigateway.LambdaIntegration(downloadHandler));
   models.addMethod('GET', new apigateway.LambdaIntegration(downloadHandler));
   training.addMethod('POST', new apigateway.LambdaIntegration(trainingHandler));

   // Outputs
   new cdk.CfnOutput(this, 'TrainingBucketName', {
     value: trainingDataBucket.bucketName,
     description: 'Training data bucket name'
   });

   new cdk.CfnOutput(this, 'WeightsBucketName', {
     value: weightsBucket.bucketName,
     description: 'Model weights bucket name'
   });

   new cdk.CfnOutput(this, 'ModelRegistryUri', {
     value: modelRegistry.repositoryUri,
     description: 'ECR repository URI'
   });

   new cdk.CfnOutput(this, 'APIEndpoint', {
     value: api.url,
     description: 'API Gateway endpoint URL'
   });

   new cdk.CfnOutput(this, 'AudioWSEndpoint', {
     value: audioStage.url,
     description: 'Audio WebSocket Endpoint'
   });
 }
}