# ML Training Infrastructure

A serverless infrastructure for collecting training data, managing models, and running SageMaker training jobs.

## Architecture Overview

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│               │     │               │     │               │
│   Client      │────▶│  API Gateway  │────▶│  Lambda       │
│   Application │     │  REST/WebSocket│     │  Functions    │
│               │     │               │     │               │
└───────────────┘     └───────────────┘     └───────┬───────┘
                                                    │
                                                    ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│               │     │               │     │               │
│  SageMaker    │◀───▶│   ECR         │     │   S3 Buckets  │
│  Training Jobs│     │   Repository  │     │   Storage     │
│               │     │               │     │               │
└───────────────┘     └───────────────┘     └───────────────┘
```

### Components

- **Client Applications** - Web or mobile apps that collect training data and interact with the infrastructure
- **API Gateway** - REST and WebSocket interfaces for client interactions
- **Lambda Functions** - Serverless compute for handling requests (upload, download, training, audio)
- **S3 Buckets** - Storage for training data, audio files, and model weights
- **ECR Repository** - Container registry for training algorithms
- **SageMaker** - ML training service for running training jobs

## Clean Architecture Design

The Lambda functions follow Clean Architecture principles, organized in layers:

```
┌──────────────────────────────────────────────────────────┐
│ Controllers (Lambda Handlers)                            │
│                                                          │
│  ┌──────────┐  ┌────────────┐  ┌────────────┐  ┌───────┐ │
│  │ Upload   │  │ Download   │  │ Training   │  │ Audio │ │
│  └────┬─────┘  └─────┬──────┘  └─────┬──────┘  └───┬───┘ │
└──────┼──────────────┼───────────────┼────────────┼──────┘
       │              │               │            │
       ▼              ▼               ▼            ▼
┌──────────────────────────────────────────────────────────┐
│ Use Cases                                                │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐  ┌─────┐│
│  │ UploadFile │  │DownloadFile│  │CreateTraining│  │Audio││
│  └────┬───────┘  └─────┬──────┘  └─────┬───────┘  └──┬──┘│
└──────┼──────────────┼───────────────┼───────────────┼───┘
       │              │               │               │
       ▼              ▼               ▼               ▼
┌──────────────────────────────────────────────────────────┐
│ Domain                                                    │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐  ┌─────┐│
│  │ Entities   │  │Repositories│  │  Services   │  │Types ││
│  └────────────┘  └────────────┘  └─────────────┘  └─────┘│
└──────────────────────────────────────────────────────────┘
```

### Design Patterns Implemented

1. **Repository Pattern**
   - **Purpose**: Abstracts data access logic from business logic
   - **Implementation**: `IFileRepository`, `IAudioRepository`, etc. with S3 implementations
   - **Benefit**: Allows swapping storage implementations without changing business logic
   
2. **Dependency Injection**
   - **Purpose**: Reduces coupling between components
   - **Implementation**: Dependencies passed via constructors (e.g., repositories to use cases)
   - **Benefit**: Makes testing easier by allowing mock implementations

3. **Factory Method Pattern**
   - **Purpose**: Encapsulates complex object creation
   - **Implementation**: `createUploadService()`, `createAudioProcessor()`, etc.
   - **Benefit**: Centralizes creation logic and handles dependencies

4. **Strategy Pattern**
   - **Purpose**: Enables selecting algorithms at runtime
   - **Implementation**: Repository interfaces allow swapping implementations
   - **Benefit**: Flexibility to change implementation details without affecting higher layers

## Data Flow

### 1. Data Upload Flow
```
Client → API Gateway → Upload Lambda → S3 Bucket (photos/)
```
- Client calls REST API to get presigned URL
- Client uploads directly to S3 using the presigned URL
- Data stored in training bucket

### 2. Audio Processing Flow
```
Client → WebSocket API → Audio Lambda → S3 Bucket (audio/)
```
- Client connects to WebSocket API
- Client streams audio data
- Audio Lambda validates and stores audio files

### 3. Training Flow
```
Client → API Gateway → Training Lambda → SageMaker → ECR → S3 (weights/)
```
- Client calls training endpoint
- Lambda configures and starts SageMaker training job
- SageMaker pulls container from ECR
- SageMaker reads training data from S3
- Trained model saved back to S3

### 4. Model Download Flow
```
Client → API Gateway → Download Lambda → S3 Bucket (weights/)
```
- Client requests download URL
- Lambda generates presigned URL
- Client downloads model weights

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

## Troubleshooting

### Common Issues

1. **Presigned URL Expiration**: Presigned URLs expire after the specified time (default 15 minutes). Generate a new URL if you encounter expiration errors.

2. **CORS Issues**: If accessing from a browser, ensure the CORS settings on the API Gateway and S3 buckets match your application's origin.

3. **Permission Errors**: Check that Lambda execution roles have appropriate permissions for S3, ECR, and SageMaker operations.

4. **Training Jobs Failing**: Review SageMaker logs for training jobs. Common issues include:
   - Invalid training data format
   - Container image issues
   - Resource constraints

## CDK Commands

### Setup and Deployment

```bash
# Install CDK dependencies
npm install

# Bootstrap CDK in your AWS account (first time only)
npx cdk bootstrap

# Synthesize CloudFormation template
npx cdk synth

# Deploy the stack
npx cdk deploy

# Deploy with approval for security-related IAM changes
npx cdk deploy --require-approval never
```

### Stack Management

```bash
# List all stacks in the app
npx cdk ls

# Get information about stack
npx cdk metadata

# Get stack drift information
npx cdk doctor
```

### Update and Delete

```bash
# Update existing stack deployment
npx cdk deploy

# Destroy stack and all resources
npx cdk destroy

# Destroy without confirmation prompt
npx cdk destroy --force
```

### Testing and Development

```bash
# Run CDK unit tests
npm test

# Watch for changes and auto-synth
npx cdk watch

# Compare deployed stack with current state
npx cdk diff
```
