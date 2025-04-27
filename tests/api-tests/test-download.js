const https = require('https');
const url = require('url');

// API Gateway Endpoint from CDK stack output
const API_ENDPOINT = 'https://0wyjkiw5el.execute-api.us-east-1.amazonaws.com/prod';

// Test download endpoint for weights download
async function testDownload() {
  const testFilename = 'model.h5';
  const path = `/weights?filename=${encodeURIComponent(testFilename)}`;
  
  console.log(`Testing download endpoint: ${API_ENDPOINT}${path}`);
  
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(`${API_ENDPOINT}${path}`);
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      method: 'GET',
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

// Test the ECR models endpoint
async function testModels() {
  const path = '/models';
  
  console.log(`Testing models endpoint: ${API_ENDPOINT}${path}`);
  
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(`${API_ENDPOINT}${path}`);
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      method: 'GET',
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

// Run the tests
async function runTests() {
  try {
    await testDownload();
    console.log('\n');
    await testModels();
    console.log('Download endpoint tests completed');
  } catch (error) {
    console.error('Download endpoint tests failed:', error);
    process.exit(1);
  }
}

runTests(); 