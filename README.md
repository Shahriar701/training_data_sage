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

# Test weights download URL generation
curl -X GET "${API_ENDPOINT}/weights?filename=model.h5"

# Test ECR repository info
curl -X GET "${API_ENDPOINT}/models"

# Test training job creation
curl -X POST "${API_ENDPOINT}/training"
```

### WebSocket Testing

Use the provided test script:

```bash
# Set the WebSocket URI (from CDK output)
export WEBSOCKET_URI="wss://your-api-id.execute-api.region.amazonaws.com/prod"

# Run the test script
python test_websocket.py

# Or with a specific URI
python test_websocket.py --uri "wss://your-api-id.execute-api.region.amazonaws.com/prod"
```

Alternatively, use wscat:

```bash
# Use the npm script
npm run wscat

# Or directly
wscat -c "wss://your-api-id.execute-api.region.amazonaws.com/prod"
```

Once connected, send a test message:
```json
{"audio": "SGVsbG8gV29ybGQ="}
```

### Security Testing

Test input validation and error handling:

```bash
# Test invalid filenames (should return 400 errors)
curl -X POST "${API_ENDPOINT}/photos?filename=../etc/passwd"
curl -X POST "${API_ENDPOINT}/photos?filename=.hidden-file"

# Test missing parameters
curl -X POST "${API_ENDPOINT}/photos"

# Test invalid endpoints
curl -X GET "${API_ENDPOINT}/invalid"
```

### End-to-End Testing

For comprehensive testing, create a shell script that:

1. Generates upload URLs for photos and weights
2. Uploads actual files using the presigned URLs
3. Verifies the files exist in S3
4. Initiates a training job
5. Tests the WebSocket connection with audio data

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
