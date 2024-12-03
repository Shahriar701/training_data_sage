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

def handler(event, context):
    logger.info(f"Event received: {json.dumps(event)}")
    
    try:
        connection_id = event['requestContext']['connectionId']
        route = event['requestContext']['routeKey']
        api_client = get_ws_client(event)
        
        if route == '$connect':
            return {'statusCode': 200}
            
        elif route == '$disconnect':
            return {'statusCode': 200}
            
        elif route == '$default':
            body = json.loads(event.get('body', '{}'))
            if 'audio' in body:
                # Save audio
                audio_data = base64.b64decode(body['audio'])
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                key = f"audio/{connection_id}/{timestamp}.wav"
                
                s3.put_object(
                    Bucket=BUCKET,
                    Key=key,
                    Body=audio_data
                )
                
                # Send response back through WebSocket
                response_data = {'status': 'success', 'file': key}
                api_client.post_to_connection(
                    ConnectionId=connection_id,
                    Data=json.dumps(response_data)
                )
                
            return {'statusCode': 200}
            
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {'statusCode': 500}