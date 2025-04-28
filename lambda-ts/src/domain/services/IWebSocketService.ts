/**
 * Interface for WebSocket communication service
 */
export interface IWebSocketService {
    /**
     * Send a response message to a WebSocket connection
     * @param connectionId The WebSocket connection ID
     * @param message The message to send
     */
    sendResponse(connectionId: string, message: Record<string, any>): Promise<void>;
} 