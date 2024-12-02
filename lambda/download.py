import json
import boto3
import os
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')
ecr = boto3.client('ecr')

def handler(event, context):
    logger.info(f"Event: {json.dumps(event)}")
    try:
        path = event['path']
        if '/weights' in path:
            filename = event['queryStringParameters'].get('filename')
            if not filename:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'filename required'})
                }
                
            url = s3.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': os.environ['WEIGHTS_BUCKET'],
                    'Key': f"weights/{filename}"
                },
                ExpiresIn=3600
            )
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'downloadUrl': url})
            }
            
        elif '/models' in path:
            auth = ecr.get_authorization_token()
            url = auth['authorizationData'][0]['proxyEndpoint']
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'registryUrl': url})
            }
            
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }