import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createResponse, createErrorResponse } from './types';

// Initialize S3 client
const s3Client = new S3Client({});

/**
 * Check if the filename is safe to use (no path traversal)
 */
function isSafeFilename(filename: string): boolean {
    // Don't allow paths, only filenames
    if (filename.includes('/') || filename.includes('\\')) {
        return false;
    }
    // Don't allow hidden files
    if (filename.startsWith('.')) {
        return false;
    }
    // Basic validation - alphanumeric plus some safe chars
    return /^[a-zA-Z0-9._-]+$/.test(filename);
}

/**
 * Handler for generating presigned URLs for file uploads
 */
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        // Ensure path exists in the event
        if (!event.path) {
            return createErrorResponse(400, 'Invalid request: missing path');
        }

        const path = event.path;
        const bucket = path.includes('/photos')
            ? process.env.TRAINING_BUCKET
            : process.env.WEIGHTS_BUCKET;

        if (!bucket) {
            return createErrorResponse(500, 'Bucket name not configured');
        }

        const prefix = path.includes('/photos') ? 'photos/' : 'weights/';

        // Ensure queryStringParameters exists
        if (!event.queryStringParameters) {
            return createErrorResponse(400, 'Missing queryStringParameters');
        }

        const filename = event.queryStringParameters.filename;
        if (!filename) {
            return createErrorResponse(400, 'filename required');
        }

        // Validate filename to prevent path traversal and other security issues
        if (!isSafeFilename(filename)) {
            return createErrorResponse(400, 'Invalid filename format');
        }

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: `${prefix}${filename}`,
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        return createResponse(200, { uploadUrl: url });
    } catch (error) {
        console.error('Error:', error);
        return createErrorResponse(500, error instanceof Error ? error.message : 'Unknown error occurred');
    }
}; 