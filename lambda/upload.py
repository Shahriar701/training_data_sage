import json
import boto3
import os
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')

def handler(event, context):
    logger.info(f"Event: {json.dumps(event)}")
    try:
        path = event['path']
        bucket = os.environ['TRAINING_BUCKET'] if '/photos' in path else os.environ['WEIGHTS_BUCKET']
        prefix = 'photos/' if '/photos' in path else 'weights/'
        
        filename = event['queryStringParameters'].get('filename')
        if not filename:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'filename required'})
            }

        url = s3.generate_presigned_url(
            'put_object',
            Params={'Bucket': bucket, 'Key': f"{prefix}{filename}"},
            ExpiresIn=3600
        )
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'uploadUrl': url})
        }
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }