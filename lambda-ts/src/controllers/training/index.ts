import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { SageMakerRepository } from '../../infrastructure/repositories/SageMakerRepository';
import { EcrRepository } from '../../infrastructure/repositories/EcrRepository';
import { CreateTrainingJobUseCase } from '../../usecases/CreateTrainingJobUseCase';
import { createResponse, createErrorResponse } from '../../utils/types';

/**
 * Factory function to create the training job use case with its dependencies
 */
function createTrainingService(): CreateTrainingJobUseCase {
  // Create repositories
  const sageMakerRepository = new SageMakerRepository();
  const ecrRepository = new EcrRepository();
  
  // Create and return use case
  return new CreateTrainingJobUseCase(sageMakerRepository, ecrRepository);
}

/**
 * Handler for training job creation requests
 */
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  try {
    // Get required environment variables
    const sageMakerRoleArn = process.env.SAGEMAKER_ROLE_ARN;
    const trainingBucket = process.env.TRAINING_BUCKET;
    const weightsBucket = process.env.WEIGHTS_BUCKET;
    
    if (!sageMakerRoleArn || !trainingBucket || !weightsBucket) {
      throw new Error('Required environment variables not set: SAGEMAKER_ROLE_ARN, TRAINING_BUCKET, WEIGHTS_BUCKET');
    }
    
    // Create paths
    const trainingInputPath = `s3://${trainingBucket}/photos/`;
    const trainingOutputPath = `s3://${weightsBucket}/training-output/`;
    
    // Create the training service
    const trainingService = createTrainingService();
    
    // Parse request body for optional parameters
    let requestParams: Record<string, any> = {};
    if (event.body) {
      try {
        requestParams = JSON.parse(event.body);
      } catch (e) {
        return createErrorResponse(400, 'Invalid request body: must be valid JSON');
      }
    }
    
    // Extract optional parameters
    const instanceType = requestParams.instanceType;
    const instanceCount = requestParams.instanceCount;
    const maxRuntimeInSeconds = requestParams.maxRuntimeInSeconds;
    
    // Start the training job
    const trainingJob = await trainingService.execute({
      roleArn: sageMakerRoleArn,
      trainingInputPath,
      outputPath: trainingOutputPath,
      instanceType,
      instanceCount,
      maxRuntimeInSeconds
    });
    
    // Return the training job details
    return createResponse(200, trainingJob);
  } catch (error) {
    console.error('Error starting training job:', error);
    return createErrorResponse(500, error instanceof Error ? error.message : 'Unknown error');
  }
}; 