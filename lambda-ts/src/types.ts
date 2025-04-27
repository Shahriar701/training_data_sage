import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyEventPathParameters } from 'aws-lambda';

// Extended API Gateway event with strong typing for path parameters
export interface ExtendedAPIGatewayProxyEvent extends Omit<APIGatewayProxyEvent, 'pathParameters'> {
    pathParameters: APIGatewayProxyEventPathParameters | null;
}

// Response helper
export function createResponse(statusCode: number, body: Record<string, any>): APIGatewayProxyResult {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify(body),
    };
}

// Error response helper
export function createErrorResponse(statusCode: number, errorMessage: string): APIGatewayProxyResult {
    return createResponse(statusCode, { error: errorMessage });
}

// WebSocket types
export interface WebSocketEvent {
    requestContext: {
        connectionId: string;
        routeKey: string;
        domainName: string;
        stage: string;
    };
    body?: string;
}

export interface WebSocketResult {
    statusCode: number;
    body?: string;
} 