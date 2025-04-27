import websockets
import asyncio
import json
import base64
import os
import argparse

async def test_audio(uri):
    """Test WebSocket audio upload with configurable WebSocket URI."""
    print(f"Connecting to WebSocket at: {uri}")
    
    try:
        async with websockets.connect(uri) as websocket:
            # Create test audio data (in a real scenario, this would be actual audio)
            audio_data = base64.b64encode(b"test audio data").decode()
            
            message = {"audio": audio_data}
            print(f"Sending audio data...")
            
            await websocket.send(json.dumps(message))
            response = await websocket.recv()
            print(f"Received: {response}")
            
            # Parse and validate the response
            response_json = json.loads(response)
            if 'status' in response_json and response_json['status'] == 'success':
                print("✅ Test successful!")
                return True
            else:
                print("❌ Test failed: Unexpected response format")
                return False
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        return False

if __name__ == "__main__":
    # Support command line argument for WebSocket URL or environment variable
    parser = argparse.ArgumentParser(description='Test WebSocket audio upload')
    parser.add_argument('--uri', type=str, 
                        default=os.environ.get('WEBSOCKET_URI', 'wss://f8nllkhd8i.execute-api.us-east-1.amazonaws.com/prod'),
                        help='WebSocket URI to connect to')
    
    args = parser.parse_args()
    asyncio.run(test_audio(args.uri))