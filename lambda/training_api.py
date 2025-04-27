import json
import boto3
import os
import logging
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

sagemaker = boto3.client('sagemaker')

def validate_config(config):
    """Validate that the config contains all the required keys."""
    required_keys = [
        'algorithmSpecification', 'roleArn', 'inputDataConfig', 
        'outputDataConfig', 'resourceConfig', 'stoppingCondition'
    ]
    
    for key in required_keys:
        if key not in config:
            return False, f"Missing required key: {key}"
    
    # Validate sub-keys
    if not all(k in config['algorithmSpecification'] for k in ['trainingImage', 'trainingInputMode']):
        return False, "Missing required keys in algorithmSpecification"
        
    if not config['inputDataConfig'] or not isinstance(config['inputDataConfig'], list) or len(config['inputDataConfig']) < 1:
        return False, "inputDataConfig must be a non-empty list"
        
    if not all(k in config['resourceConfig'] for k in ['instanceCount', 'instanceType', 'volumeSizeInGb']):
        return False, "Missing required keys in resourceConfig"
        
    if 'maxRuntimeInSeconds' not in config['stoppingCondition']:
        return False, "Missing maxRuntimeInSeconds in stoppingCondition"
        
    return True, ""

def handler(event, context):
    logger.info(f"Event: {json.dumps(event)}")
    try:
        if 'TRAINING_CONFIG' not in os.environ:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Missing TRAINING_CONFIG environment variable'})
            }
            
        try:
            config = json.loads(os.environ['TRAINING_CONFIG'])
        except json.JSONDecodeError:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Invalid JSON in TRAINING_CONFIG'})
            }
            
        # Validate the configuration
        is_valid, error_message = validate_config(config)
        if not is_valid:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': f'Invalid configuration: {error_message}'})
            }
        
        # Transform config to match AWS SDK format
        training_params = {
            'TrainingJobName': f"demo-training-job-{datetime.now().strftime('%Y-%m-%d-%H-%M-%S')}",
            'AlgorithmSpecification': {
                'TrainingImage': config['algorithmSpecification']['trainingImage'],
                'TrainingInputMode': config['algorithmSpecification']['trainingInputMode']
            },
            'RoleArn': config['roleArn'],
            'InputDataConfig': [{
                'ChannelName': config['inputDataConfig'][0]['channelName'],
                'DataSource': {
                    'S3DataSource': {
                        'S3Uri': config['inputDataConfig'][0]['dataSource']['s3DataSource']['s3Uri'],
                        'S3DataType': config['inputDataConfig'][0]['dataSource']['s3DataSource']['s3DataType'],
                        'S3DataDistributionType': config['inputDataConfig'][0]['dataSource']['s3DataSource']['s3DataDistributionType']
                    }
                }
            }],
            'OutputDataConfig': {
                'S3OutputPath': config['outputDataConfig']['s3OutputPath']
            },
            'ResourceConfig': {
                'InstanceCount': config['resourceConfig']['instanceCount'],
                'InstanceType': config['resourceConfig']['instanceType'],
                'VolumeSizeInGB': config['resourceConfig']['volumeSizeInGb']
            },
            'StoppingCondition': {
                'MaxRuntimeInSeconds': config['stoppingCondition']['maxRuntimeInSeconds']
            }
        }
        
        logger.info(f"Starting training job with params: {json.dumps(training_params)}")
        response = sagemaker.create_training_job(**training_params)
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'TrainingJobArn': response['TrainingJobArn'],
                'TrainingJobName': training_params['TrainingJobName']
            })
        }
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }