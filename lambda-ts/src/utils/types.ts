import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

/**
 * WebSocket event structure
 */
export interface WebSocketEvent {
    requestContext: {
        connectionId: string;
        domainName: string;
        stage: string;
        routeKey: string;
    };
    body?: string;
}

/**
 * WebSocket response structure
 */
export interface WebSocketResult {
    statusCode: number;
    body?: string;
}

/**
 * Helper function to create a standard API response
 */
export function createResponse(statusCode: number, body: Record<string, any>): APIGatewayProxyResult {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify(body)
    };
}

/**
 * Helper function to create an error response
 */
export function createErrorResponse(statusCode: number, errorMessage: string): APIGatewayProxyResult {
    return createResponse(statusCode, { error: errorMessage });
} 