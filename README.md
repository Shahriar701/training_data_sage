# ML Training Infrastructure Project

This project sets up an AWS infrastructure for machine learning model training, providing REST APIs for data upload, model training, and weight management, as well as a WebSocket API for streaming audio data.

## Table of Contents
1. [Architecture](#architecture)
2. [Security Features](#security-features)
3. [Prerequisites](#prerequisites)
4. [Deployment Guide](#deployment-guide)
5. [Configuration](#configuration)
6. [API Reference](#api-reference)
7. [Testing Guide](#testing-guide)
8. [Troubleshooting](#troubleshooting)
9. [Development Guide](#development-guide)
10. [Common Commands](#common-commands)

## Architecture

This project creates the following AWS resources using the AWS CDK:

- **Storage**:
  - S3 bucket for training data (photos, audio)
  - S3 bucket for model weights and outputs
  - ECR repository for containerized ML models

- **Compute & Training**:
  - Lambda functions for API handling
  - SageMaker training job configuration

- **API Endpoints**:
  - REST API Gateway for data management
  - WebSocket API for real-time audio streaming

- **Security**:
  - IAM roles with least privilege
  - S3 bucket encryption
  - API request validation

## Security Features

This project implements the following security best practices:

- **Input Validation**:
  - Filename validation to prevent path traversal
  - JSON payload validation
  - Audio data format validation

- **Access Control**:
  - Configurable CORS settings
  - Fine-grained IAM permissions
  - Proper error handling with sanitized responses

- **Data Protection**:
  - S3 server-side encryption
  - Secure presigned URLs for uploads/downloads
  - ECR image scanning on push

## Prerequisites

Before you deploy this project, ensure you have:

1. AWS CLI installed and configured with appropriate credentials
2. Node.js 14+ and npm installed
3. AWS CDK installed globally (`npm install -g aws-cdk`)
4. Python 3.9+ for Lambda functions and testing
5. Docker for local testing (optional)

## Deployment Guide

### First-time Setup

```bash
# Clone the repository
git clone <repository-url>
cd <repository-directory>

# Install dependencies
npm install

# Bootstrap the CDK (first-time only)
cdk bootstrap

# Set configuration environment variables
export ALLOWED_ORIGIN="https://your-app-domain.com"
export ALLOWED_ORIGINS="https://app1.example.com,https://app2.example.com"

# Deploy the stack
cdk deploy
```

### Updating an Existing Deployment

```bash
# Pull the latest changes
git pull

# Install any new dependencies
npm install

# Deploy updates
cdk deploy
```

### Cleanup

To remove all resources created by this project:

```bash
cdk destroy
```

## Configuration

### Environment Variables

Configure the deployment with these environment variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ALLOWED_ORIGIN` | Origin allowed for S3 CORS | https://example.com | No |
| `ALLOWED_ORIGINS` | Comma-separated list of origins for API Gateway CORS | https://example.com | No |
| `WEBSOCKET_URI` | WebSocket endpoint for testing | None | For testing only |

### CDK Context

Advanced configuration can be set in cdk.json context.

## API Reference

### REST API Endpoints

#### Upload API
- **POST /photos?filename={filename}**
  - Generate a presigned URL for uploading training photos
  - Required query params: `filename` (alphanumeric, `.`, `-`, `_` only)
  - Response: `{ "uploadUrl": "https://..." }`

- **POST /weights?filename={filename}**
  - Generate a presigned URL for uploading model weights
  - Required query params: `filename` (alphanumeric, `.`, `-`, `_` only)
  - Response: `{ "uploadUrl": "https://..." }`

#### Download API
- **GET /weights?filename={filename}**
  - Generate a presigned URL for downloading model weights
  - Required query params: `filename`
  - Response: `{ "downloadUrl": "https://..." }`

- **GET /models**
  - Get ECR repository information
  - Response: `{ "registryUrl": "https://..." }`

#### Training API
- **POST /training**
  - Start a SageMaker training job
  - Response: `{ "TrainingJobArn": "arn:aws:...", "TrainingJobName": "..." }`

### WebSocket API

Connect to the WebSocket endpoint from the CDK output.

**Send a message**:
```json
{
  "audio": "<base64-encoded-audio-data>"
}
```

**Success response**:
```json
{
  "status": "success",
  "file": "audio/connection-id/timestamp.wav"
}
```

**Error response**:
```json
{
  "status": "error",
  "message": "Error message details"
}
```

## Testing Guide

### REST API Testing

Use curl or a REST client like Postman:

```bash
# Set your API endpoint (from CDK output)
export API_ENDPOINT="https://your-api-id.execute-api.region.amazonaws.com/prod"

# Test photo upload URL generation
curl -X POST "${API_ENDPOINT}/photos?filename=test-image.jpg"

# Test weights upload URL generation
curl -X POST "${API_ENDPOINT}/weights?filename=model.h5"
```

### End-to-End Testing

The following steps demonstrate how to test the complete workflow:

#### 1. Build and Push the Model Docker Image

```bash
# Build the Docker image
docker build -t test-models ./model/

# Tag and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <your-account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag test-models:latest <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/test-models:latest
docker push <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/test-models:latest

# Verify the image was pushed
aws ecr describe-images --repository-name test-models
```

#### 2. Upload Training Data

The upload process involves two steps: getting a presigned URL and then using it to upload data:

```bash
# Create a dummy test image
echo "This is dummy image data" > dummy_image.jpg

# Get a presigned URL using the API (either with your script or curl)
curl -X POST "${API_ENDPOINT}/photos?filename=dummy_image.jpg"

# Use the presigned URL to upload the file (you'll need a script or tool like curl)
# Replace the URL below with the one from the previous response
curl -X PUT -H "Content-Type: image/jpeg" --data-binary @dummy_image.jpg "https://your-s3-presigned-url"

# Verify the upload
aws s3 ls s3://<your-training-bucket>/photos/
```

#### 3. Start a SageMaker Training Job

```bash
# Call the training endpoint to start a job
curl -X POST "${API_ENDPOINT}/training"

# Check the job status (replace job-name with the name from the response)
aws sagemaker describe-training-job --training-job-name <job-name>
```

#### 4. Monitoring Your SageMaker Training Job

**Using AWS CLI:**
```bash
# Check the status of the training job
aws sagemaker describe-training-job --training-job-name <job-name>

# List all your training jobs
aws sagemaker list-training-jobs

# Get the latest training jobs
aws sagemaker list-training-jobs --sort-by CreationTime --sort-order Descending --max-results 5
```

**Using AWS Console:**

1. Go to the AWS Management Console (https://console.aws.amazon.com)
2. Search for "SageMaker" and click on the service
3. In the left navigation panel, expand "Training"
4. Click on "Training jobs"
5. Your training job will be listed - click on it to see details

**Job Status Flow:**
- **Starting**: Provisioning instances and preparing environment
- **Downloading**: Downloading training data from S3
- **Training**: Running your model training code
- **Uploading**: Uploading trained model artifacts to S3
- **Completed/Failed**: Final status

**View Logs:**
In the job details page, click "View logs" to see training output in CloudWatch.

**Output Data:**
When the job completes, trained model artifacts will be available in the S3 output path.

#### 5. Testing WebSocket Audio API

```bash
# Install wscat if needed
npm install -g wscat

# Connect to the WebSocket endpoint (replace with your endpoint)
wscat -c "wss://your-api-id.execute-api.region.amazonaws.com/prod"

# Once connected, send a test message
# In the wscat terminal, enter:
{"audio": "SGVsbG8gV29ybGQ="}

# Verify the audio was stored
aws s3 ls s3://<your-training-bucket>/audio/
```

### Architecture Flow

1. **Data Upload Flow**:
   - Client calls REST API to get presigned URL
   - Client uploads data directly to S3 using the presigned URL
   - Data is stored in the training bucket

2. **Training Flow**:
   - Client calls training endpoint
   - Lambda function configures and starts SageMaker training job
   - SageMaker pulls Docker image from ECR
   - SageMaker provisions instances and runs training
   - Trained model is saved to the weights bucket

3. **Audio Processing Flow**:
   - Client connects to WebSocket API
   - Client sends audio data through WebSocket
   - Lambda processes and validates audio
   - Audio is stored in the training bucket
   - Success/failure response sent back through WebSocket

4. **Model Download Flow**:
   - Client calls download endpoint with filename
   - Lambda generates presigned URL for the file
   - Client downloads file directly from S3

## Troubleshooting

### Common Issues

1. **Deployment Failures**
   - Check the CloudFormation stack events in AWS Console
   - Ensure your AWS account has necessary permissions
   - Verify the CDK is bootstrapped in your account/region

2. **API Errors**
   - Check CloudWatch logs for the specific Lambda function
   - Verify IAM permissions for the Lambda roles
   - Test API Gateway directly in the AWS Console

3. **WebSocket Connection Issues**
   - Verify the WebSocket URL is correct
   - Check network connectivity and firewall settings
   - Review the WebSocket route configuration in API Gateway

4. **Lambda Timeouts**
   - If operations are timing out, increase the timeout in the stack
   - Consider optimizing the Lambda functions

### Viewing Logs

```bash
# View logs for a specific Lambda function
aws logs get-log-events --log-group-name /aws/lambda/StackName-FunctionName --limit 100

# Watch logs in real-time
aws logs tail /aws/lambda/StackName-FunctionName --follow
```

## Development Guide

### Directory Structure

```
├── bin/                # CDK application entry point
├── lib/                # CDK stack definition
├── lambda/             # Lambda function code
│   ├── upload.py       # Handles file upload URLs
│   ├── download.py     # Handles file download URLs
│   ├── training_api.py # Handles training job creation
│   └── audio.py        # Handles WebSocket audio streaming
├── test/               # Unit and integration tests
└── test_websocket.py   # WebSocket test script
```

### Adding New Features

1. Modify Lambda functions in the `lambda/` directory
2. Update infrastructure in `lib/test-training-stack.ts`
3. Run `npm run build` to compile TypeScript
4. Deploy with `cdk deploy`

### Local Testing

For local Lambda testing:

```bash
# Install AWS SAM CLI
pip install aws-sam-cli

# Invoke a Lambda function locally
sam local invoke UploadHandler -e events/upload-event.json
```

## Common Commands

* `npm run build`   - Compile TypeScript to JavaScript
* `npm run watch`   - Watch for changes and compile
* `npm run test`    - Run the Jest unit tests
* `npx cdk deploy`  - Deploy the stack to your AWS account/region
* `npx cdk diff`    - Compare the deployed stack with current state
* `npx cdk synth`   - Output the synthesized CloudFormation template
* `npm run wscat`   - Connect to the WebSocket endpoint
