import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { S3FileRepository } from '../../infrastructure/repositories/S3FileRepository';
import { DownloadFileUseCase } from '../../usecases/DownloadFileUseCase';
import { createResponse, createErrorResponse } from '../../utils/types';

/**
 * Factory function to create the download file use case with its dependencies
 */
function createDownloadService(): DownloadFileUseCase {
    // Get bucket names from environment variables
    const photosBucket = process.env.TRAINING_BUCKET;
    const weightsBucket = process.env.WEIGHTS_BUCKET;

    if (!photosBucket || !weightsBucket) {
        throw new Error('Required environment variables not set: TRAINING_BUCKET, WEIGHTS_BUCKET');
    }

    // Create repository
    const fileRepository = new S3FileRepository(photosBucket, weightsBucket);

    // Create and return use case
    return new DownloadFileUseCase(fileRepository);
}

/**
 * Handler for file download URL generation requests
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

        // Determine file key by path
        let fileKey = '';
        if (path.includes('/photos')) {
            fileKey = `photos/${filename}`;
        } else if (path.includes('/weights')) {
            fileKey = `weights/${filename}`;
        } else {
            return createErrorResponse(400, 'Invalid path. Must be /photos or /weights');
        }

        // Create the download service
        const downloadService = createDownloadService();

        // Generate download URL
        const downloadUrl = await downloadService.execute(fileKey, filename);

        // Return the presigned URL
        return createResponse(200, {
            downloadUrl
        });
    } catch (error) {
        console.error('Error:', error);

        // Special case for file not found
        if (error instanceof Error && error.message.includes('Failed to get metadata')) {
            return createErrorResponse(404, `File not found: ${event.queryStringParameters?.filename || 'unknown'}`);
        }

        return createErrorResponse(500, error instanceof Error ? error.message : 'Unknown error');
    }
}; 