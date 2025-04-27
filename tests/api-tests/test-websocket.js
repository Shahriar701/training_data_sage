const WebSocket = require('ws');

// WebSocket endpoint from the CDK deployment
const WEBSOCKET_URI = 'wss://yy3ovnuuxb.execute-api.us-east-1.amazonaws.com/prod';

// Create a simple test with base64 encoded data (this represents "Hello World" in base64)
const testAudioData = "SGVsbG8gV29ybGQ=";

// Connect to the WebSocket
const ws = new WebSocket(WEBSOCKET_URI);

ws.on('open', function open() {
  console.log('Connected to WebSocket');
  
  // Send the audio data
  const message = JSON.stringify({ audio: testAudioData });
  console.log('Sending message:', message);
  ws.send(message);
});

ws.on('message', function incoming(data) {
  console.log('Received:', data.toString());
  // Close the connection after receiving a response
  ws.close();
});

ws.on('close', function close() {
  console.log('Connection closed');
  process.exit(0);
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
  process.exit(1);
}); 