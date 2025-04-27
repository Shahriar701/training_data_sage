import { Context } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { WebSocketEvent, WebSocketResult } from './types';

// Initialize S3 client
const s3Client = new S3Client({});

/**
 * Create an API Gateway Management API client for the WebSocket
 */
function getWsClient(event: WebSocketEvent): ApiGatewayManagementApiClient {
    const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
    return new ApiGatewayManagementApiClient({ endpoint });
}

/**
 * Send a response through the WebSocket connection
 */
async function sendWsResponse(
    apiClient: ApiGatewayManagementApiClient,
    connectionId: string,
    message: Record<string, any>
): Promise<void> {
    try {
        const command = new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: Buffer.from(JSON.stringify(message)),
        });

        await apiClient.send(command);
    } catch (error) {
        console.error('Failed to send WebSocket response:', error);
    }
}

/**
 * Handler for WebSocket requests
 */
export const handler = async (event: WebSocketEvent, context: Context): Promise<WebSocketResult> => {
    console.log('Event received:', JSON.stringify(event, null, 2));

    try {
        // Validate request context
        if (!event.requestContext || !event.requestContext.connectionId) {
            console.error('Invalid WebSocket event format');
            return { statusCode: 400 };
        }

        const connectionId = event.requestContext.connectionId;
        const route = event.requestContext.routeKey;
        const apiClient = getWsClient(event);

        // Handle connection
        if (route === '$connect') {
            return { statusCode: 200 };
        }

        // Handle disconnection
        if (route === '$disconnect') {
            return { statusCode: 200 };
        }

        // Handle default route (messages)
        if (route === '$default') {
            let body: any;

            try {
                body = event.body ? JSON.parse(event.body) : {};
            } catch (error) {
                const errorMessage = { status: 'error', message: 'Invalid JSON in request body' };
                await sendWsResponse(apiClient, connectionId, errorMessage);
                return { statusCode: 400 };
            }

            // Validate audio data
            if (!body.audio) {
                const errorMessage = { status: 'error', message: 'Missing audio data' };
                await sendWsResponse(apiClient, connectionId, errorMessage);
                return { statusCode: 400 };
            }

            try {
                // Decode base64 audio data
                const audioData = Buffer.from(body.audio, 'base64');

                // Simple validation - check if we got actual data
                if (audioData.length === 0) {
                    const errorMessage = { status: 'error', message: 'Empty audio data' };
                    await sendWsResponse(apiClient, connectionId, errorMessage);
                    return { statusCode: 400 };
                }

                // Create timestamp for the filename
                const timestamp = new Date().toISOString()
                    .replace(/[-:]/g, '')
                    .replace('T', '_')
                    .replace(/\..+/, '');

                // Sanitize the connection ID to prevent path traversal
                const safeConnectionId = connectionId.replace(/[\/\\.]/g, '_');
                const key = `audio/${safeConnectionId}/${timestamp}.wav`;

                // Get bucket name from environment variable
                const bucketName = process.env.TRAINING_BUCKET;
                if (!bucketName) {
                    throw new Error('TRAINING_BUCKET environment variable not set');
                }

                // Save audio to S3
                await s3Client.send(new PutObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                    Body: audioData
                }));

                // Send success response
                const responseData = { status: 'success', file: key };
                await sendWsResponse(apiClient, connectionId, responseData);

                return { statusCode: 200 };
            } catch (audioError) {
                console.error('Error processing audio:', audioError);
                const errorMessage = {
                    status: 'error',
                    message: `Failed to process audio: ${audioError instanceof Error ? audioError.message : 'Unknown error'}`
                };
                await sendWsResponse(apiClient, connectionId, errorMessage);
                return { statusCode: 500 };
            }
        }

        // Handle unknown route
        return { statusCode: 400, body: JSON.stringify({ error: `Unknown route: ${route}` }) };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })
        };
    }
}; 