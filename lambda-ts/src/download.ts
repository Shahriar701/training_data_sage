import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ECRClient, GetAuthorizationTokenCommand } from '@aws-sdk/client-ecr';
import { createResponse, createErrorResponse } from './types';

// Initialize clients
const s3Client = new S3Client({});
const ecrClient = new ECRClient({});

/**
 * Handler for generating presigned URLs for file downloads or returning ECR information
 */
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        // Validate path
        if (!event.path) {
            return createErrorResponse(400, 'Invalid request: missing path');
        }

        const path = event.path;

        // Handle download weights request
        if (path.includes('/weights')) {
            // Validate query parameters
            if (!event.queryStringParameters || !event.queryStringParameters.filename) {
                return createErrorResponse(400, 'filename required');
            }

            const filename = event.queryStringParameters.filename;
            const bucketName = process.env.WEIGHTS_BUCKET;

            if (!bucketName) {
                return createErrorResponse(500, 'WEIGHTS_BUCKET environment variable not set');
            }

            const command = new GetObjectCommand({
                Bucket: bucketName,
                Key: `weights/${filename}`,
            });

            const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

            return createResponse(200, { downloadUrl: url });
        }
        // Handle ECR models request
        else if (path.includes('/models')) {
            const authCommand = new GetAuthorizationTokenCommand({});
            const authResponse = await ecrClient.send(authCommand);

            if (!authResponse.authorizationData || authResponse.authorizationData.length === 0) {
                return createErrorResponse(500, 'Failed to get ECR authorization token');
            }

            const url = authResponse.authorizationData[0].proxyEndpoint;

            if (!url) {
                return createErrorResponse(500, 'ECR proxy endpoint not found');
            }

            return createResponse(200, { registryUrl: url });
        }
        // Handle unknown paths
        else {
            return createErrorResponse(404, `Unsupported path: ${path}`);
        }
    } catch (error) {
        console.error('Error:', error);
        return createErrorResponse(500, error instanceof Error ? error.message : 'Unknown error occurred');
    }
}; 