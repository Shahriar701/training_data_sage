import json
import boto3
import os
import base64
import logging
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')
BUCKET = os.environ['TRAINING_BUCKET']

def get_ws_client(event):
    endpoint = f"https://{event['requestContext']['domainName']}/{event['requestContext']['stage']}"
    return boto3.client('apigatewaymanagementapi', endpoint_url=endpoint)

def send_ws_response(api_client, connection_id, message):
    try:
        api_client.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(message)
        )
    except Exception as e:
        logger.error(f"Failed to send WebSocket response: {str(e)}")

def handler(event, context):
    logger.info(f"Event received: {json.dumps(event)}")
    
    try:
        if 'requestContext' not in event or 'connectionId' not in event['requestContext']:
            logger.error("Invalid WebSocket event format")
            return {'statusCode': 400}
            
        connection_id = event['requestContext']['connectionId']
        route = event['requestContext']['routeKey']
        api_client = get_ws_client(event)
        
        if route == '$connect':
            return {'statusCode': 200}
            
        elif route == '$disconnect':
            return {'statusCode': 200}
            
        elif route == '$default':
            try:
                body = json.loads(event.get('body', '{}'))
            except json.JSONDecodeError:
                error_message = {'status': 'error', 'message': 'Invalid JSON in request body'}
                send_ws_response(api_client, connection_id, error_message)
                return {'statusCode': 400}
                
            if 'audio' not in body:
                error_message = {'status': 'error', 'message': 'Missing audio data'}
                send_ws_response(api_client, connection_id, error_message)
                return {'statusCode': 400}
                
            try:
                # Save audio
                audio_data = base64.b64decode(body['audio'])
                # Simple validation - check if we got actual data
                if len(audio_data) == 0:
                    error_message = {'status': 'error', 'message': 'Empty audio data'}
                    send_ws_response(api_client, connection_id, error_message)
                    return {'statusCode': 400}
                    
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                # Sanitize the filename to prevent path traversal
                safe_connection_id = connection_id.replace('/', '_').replace('..', '_')
                key = f"audio/{safe_connection_id}/{timestamp}.wav"
                
                s3.put_object(
                    Bucket=BUCKET,
                    Key=key,
                    Body=audio_data
                )
                
                # Send response back through WebSocket
                response_data = {'status': 'success', 'file': key}
                send_ws_response(api_client, connection_id, response_data)
                
            except Exception as audio_error:
                logger.error(f"Error processing audio: {str(audio_error)}")
                error_message = {'status': 'error', 'message': f'Failed to process audio: {str(audio_error)}'}
                send_ws_response(api_client, connection_id, error_message)
                return {'statusCode': 500}
                
            return {'statusCode': 200}
            
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}