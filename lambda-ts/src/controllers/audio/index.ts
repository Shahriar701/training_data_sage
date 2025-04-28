import { Context } from 'aws-lambda';
import { WebSocketEvent, WebSocketResult } from '../../utils/types';
import { S3AudioRepository } from '../../infrastructure/repositories/S3AudioRepository';
import { ApiGatewayWebSocketService } from '../../infrastructure/services/ApiGatewayWebSocketService';
import { ProcessAudioUseCase } from '../../usecases/audio/ProcessAudioUseCase';

/**
 * Factory function to create the audio processing use case with its dependencies
 */
function createAudioProcessor(event: WebSocketEvent): ProcessAudioUseCase {
    // Get bucket name from environment variable
    const bucketName = process.env.TRAINING_BUCKET;
    if (!bucketName) {
        throw new Error('TRAINING_BUCKET environment variable not set');
    }

    // Create dependencies
    const audioRepository = new S3AudioRepository(bucketName);
    const webSocketService = new ApiGatewayWebSocketService(event);

    // Create and return the use case
    return new ProcessAudioUseCase(audioRepository, webSocketService);
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
                // Create services
                const webSocketService = new ApiGatewayWebSocketService(event);

                // Send error response
                await webSocketService.sendResponse(connectionId, {
                    status: 'error',
                    message: 'Invalid JSON in request body'
                });

                return { statusCode: 400 };
            }

            // Process the audio data using the use case
            try {
                // Create the audio processor
                const audioProcessor = createAudioProcessor(event);

                // Process the audio
                const result = await audioProcessor.execute(connectionId, body.audio);

                // Return success or error based on the result
                return { statusCode: result.status === 'success' ? 200 : 500 };
            } catch (audioError) {
                console.error('Error in audio processing:', audioError);
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