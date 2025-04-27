# ML Training Infrastructure Project

This project sets up an AWS infrastructure for machine learning model training, providing APIs for data upload, model training, and weight management.

## Architecture

The project creates the following AWS resources:
- S3 buckets for storing training data and model weights
- Amazon ECR repository for model containers
- Lambda functions for API handlers
- API Gateway endpoints for REST APIs
- WebSocket API for streaming audio data
- SageMaker training job infrastructure

## Security Considerations

This project has been configured with security best practices:
- Input validation for all user-provided data
- Filename validation to prevent path traversal
- Configurable CORS settings (no longer using wildcard origins)
- WebSocket connection management with proper error handling
- Sanitized output in all API responses

## Environment Variables

The following environment variables can be used to configure the deployment:

- `ALLOWED_ORIGIN`: Origin allowed for CORS in S3 (default: https://example.com)
- `ALLOWED_ORIGINS`: Comma-separated list of origins allowed for API Gateway CORS
- `WEBSOCKET_URI`: WebSocket endpoint URI for testing and wscat

## Useful Commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
* `npm run wscat`   connect to the WebSocket endpoint (requires WEBSOCKET_URI)

## Testing

### Testing WebSocket API

Run the WebSocket test script with:

```bash
export WEBSOCKET_URI=wss://your-api-id.execute-api.region.amazonaws.com/prod
python test_websocket.py
```

Or directly specify the URI:

```bash
python test_websocket.py --uri wss://your-api-id.execute-api.region.amazonaws.com/prod
```

## API Documentation

### Upload API
- `POST /photos?filename=example.jpg` - Generate presigned URL for uploading training photos
- `POST /weights?filename=model.h5` - Generate presigned URL for uploading model weights

### Download API
- `GET /weights?filename=model.h5` - Generate presigned URL for downloading model weights
- `GET /models` - Get repository information for model containers

### Training API
- `POST /training` - Start a SageMaker training job

### WebSocket API
- Connect to the WebSocket endpoint and send a JSON message with the format:
  ```json
  {"audio": "<base64-encoded-audio-data>"}
  ```
