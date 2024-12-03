import websockets
import asyncio
import json
import base64

async def test_audio():
    uri = "wss://f8nllkhd8i.execute-api.us-east-1.amazonaws.com/prod"
    
    async with websockets.connect(uri) as websocket:
        audio_data = base64.b64encode(b"test audio data").decode()
        await websocket.send(json.dumps({"audio": audio_data}))
        response = await websocket.recv()
        print(f"Received: {response}")

asyncio.run(test_audio())