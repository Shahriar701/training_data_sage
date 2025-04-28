import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { IWebSocketService } from '../../domain/services/IWebSocketService';
import { WebSocketEvent } from '../../utils/types';

export class ApiGatewayWebSocketService implements IWebSocketService {
    private apiClient: ApiGatewayManagementApiClient;

    constructor(event: WebSocketEvent) {
        const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
        this.apiClient = new ApiGatewayManagementApiClient({ endpoint });
    }

    /**
     * Send a response through the WebSocket connection
     */
    async sendResponse(connectionId: string, message: Record<string, any>): Promise<void> {
        try {
            const command = new PostToConnectionCommand({
                ConnectionId: connectionId,
                Data: Buffer.from(JSON.stringify(message)),
            });

            await this.apiClient.send(command);
        } catch (error) {
            console.error('Failed to send WebSocket response:', error);
            throw error;
        }
    }
} 