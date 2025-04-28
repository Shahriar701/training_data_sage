import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { FileEntity } from '../../domain/entities/File';
import { S3FileRepository } from '../../infrastructure/repositories/S3FileRepository';
import { UploadFileUseCase } from '../../usecases/UploadFileUseCase';
import { createResponse, createErrorResponse } from '../../utils/types';

/**
 * Factory function to create the upload file use case with its dependencies
 */
function createUploadService(): UploadFileUseCase {
  // Get bucket names from environment variables
  const photosBucket = process.env.TRAINING_BUCKET;
  const weightsBucket = process.env.WEIGHTS_BUCKET;
  
  if (!photosBucket || !weightsBucket) {
    throw new Error('Required environment variables not set: TRAINING_BUCKET, WEIGHTS_BUCKET');
  }
  
  // Create repository
  const fileRepository = new S3FileRepository(photosBucket, weightsBucket);
  
  // Create and return use case
  return new UploadFileUseCase(fileRepository);
}

/**
 * Handler for file upload URL generation requests
 */
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  try {
    // Extract path parameters
    const path = event.path;
    const queryParams = event.queryStringParameters || {};
    const filename = queryParams.filename;
    
    // Validate request
    if (!filename) {
      return createErrorResponse(400, 'Missing required parameter: filename');
    }
    
    // Determine file type by path
    let filePath = '';
    if (path.includes('/photos')) {
      filePath = 'photos/';
    } else if (path.includes('/weights')) {
      filePath = 'weights/';
    } else {
      return createErrorResponse(400, 'Invalid path. Must be /photos or /weights');
    }
    
    // Create the upload service
    const uploadService = createUploadService();
    
    // Create file entity
    const file: FileEntity = {
      filename,
      path: filePath,
      contentType: queryParams.contentType || 'application/octet-stream',
    };
    
    // Generate upload URL
    const result = await uploadService.execute(file);
    
    // Return the presigned URL
    return createResponse(200, {
      uploadUrl: result.url,
      key: result.key,
      bucket: result.bucket,
      expiresAt: result.expiresAt
    });
  } catch (error) {
    console.error('Error:', error);
    
    if (error instanceof Error && error.message.includes('Invalid filename')) {
      return createErrorResponse(400, error.message);
    }
    
    return createErrorResponse(500, error instanceof Error ? error.message : 'Unknown error');
  }
}; 