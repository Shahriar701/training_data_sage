import json
import boto3
import os
import logging
import re

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')

def is_safe_filename(filename):
    """Check if the filename is safe to use (no path traversal)."""
    # Don't allow paths, only filenames
    if '/' in filename or '\\' in filename:
        return False
    # Don't allow hidden files
    if filename.startswith('.'):
        return False
    # Basic validation - alphanumeric plus some safe chars
    return bool(re.match(r'^[a-zA-Z0-9._-]+$', filename))

def handler(event, context):
    logger.info(f"Event: {json.dumps(event)}")
    try:
        # Ensure path exists in the event
        if 'path' not in event:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Invalid request: missing path'})
            }
            
        path = event['path']
        bucket = os.environ['TRAINING_BUCKET'] if '/photos' in path else os.environ['WEIGHTS_BUCKET']
        prefix = 'photos/' if '/photos' in path else 'weights/'
        
        # Ensure queryStringParameters exists
        if 'queryStringParameters' not in event or not event['queryStringParameters']:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Missing queryStringParameters'})
            }
            
        filename = event['queryStringParameters'].get('filename')
        if not filename:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'filename required'})
            }
            
        # Validate filename to prevent path traversal and other security issues
        if not is_safe_filename(filename):
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Invalid filename format'})
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