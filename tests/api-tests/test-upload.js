const https = require('https');
const url = require('url');

// API Gateway Endpoint from CDK stack output
const API_ENDPOINT = 'https://0wyjkiw5el.execute-api.us-east-1.amazonaws.com/prod';

// Test upload endpoint for photo upload
async function testUpload() {
  const testFilename = 'test-image.jpg';
  const path = `/photos?filename=${encodeURIComponent(testFilename)}`;
  
  console.log(`Testing upload endpoint: ${API_ENDPOINT}${path}`);
  
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(`${API_ENDPOINT}${path}`);
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        
        try {
          const response = JSON.parse(data);
          console.log('Response:', JSON.stringify(response, null, 2));
          resolve(response);
        } catch (error) {
          console.error('Error parsing response:', error);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Error making request:', error);
      reject(error);
    });
    
    req.end();
  });
}

// Run the test
testUpload()
  .then(() => {
    console.log('Upload endpoint test completed');
  })
  .catch((error) => {
    console.error('Upload endpoint test failed:', error);
    process.exit(1);
  }); 