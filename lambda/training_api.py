import json
import boto3
import os
import logging
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

sagemaker = boto3.client('sagemaker')

def handler(event, context):
    logger.info(f"Event: {json.dumps(event)}")
    try:
        config = json.loads(os.environ['TRAINING_CONFIG'])
        
        # Transform config to match AWS SDK format
        training_params = {
            'TrainingJobName': f"demo-training-job-{datetime.now().strftime('%Y-%m-%d-%H-%M-%S')}",
            'AlgorithmSpecification': {
                'TrainingImage': config['algorithmSpecification']['trainingImage'],
                'TrainingInputMode': config['algorithmSpecification']['trainingInputMode']
            },
            'RoleArn': config['roleArn'],
            'InputDataConfig': [{
                'ChannelName': config['inputDataConfig'][0]['channelName'],
                'DataSource': {
                    'S3DataSource': {
                        'S3Uri': config['inputDataConfig'][0]['dataSource']['s3DataSource']['s3Uri'],
                        'S3DataType': config['inputDataConfig'][0]['dataSource']['s3DataSource']['s3DataType'],
                        'S3DataDistributionType': config['inputDataConfig'][0]['dataSource']['s3DataSource']['s3DataDistributionType']
                    }
                }
            }],
            'OutputDataConfig': {
                'S3OutputPath': config['outputDataConfig']['s3OutputPath']
            },
            'ResourceConfig': {
                'InstanceCount': config['resourceConfig']['instanceCount'],
                'InstanceType': config['resourceConfig']['instanceType'],
                'VolumeSizeInGB': config['resourceConfig']['volumeSizeInGb']
            },
            'StoppingCondition': {
                'MaxRuntimeInSeconds': config['stoppingCondition']['maxRuntimeInSeconds']
            }
        }
        
        logger.info(f"Starting training job with params: {json.dumps(training_params)}")
        response = sagemaker.create_training_job(**training_params)
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'TrainingJobArn': response['TrainingJobArn'],
                'TrainingJobName': training_params['TrainingJobName']
            })
        }
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }