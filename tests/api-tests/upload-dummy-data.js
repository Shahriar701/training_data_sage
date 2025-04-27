const https = require('https');
const url = require('url');
const fs = require('fs');
const http = require('http');

// API Gateway Endpoint from CDK stack output
const API_ENDPOINT = 'https://0wyjkiw5el.execute-api.us-east-1.amazonaws.com/prod';

// Get a presigned URL for upload
async function getUploadUrl(filename) {
  const path = `/photos?filename=${encodeURIComponent(filename)}`;
  
  console.log(`Getting presigned upload URL: ${API_ENDPOINT}${path}`);
  
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
        try {
          const response = JSON.parse(data);
          console.log('Response:', JSON.stringify(response, null, 2));
          resolve(response.uploadUrl);
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

// Upload a file using the presigned URL
async function uploadFile(uploadUrl, filepath) {
  console.log(`Uploading file: ${filepath}`);
  
  return new Promise((resolve, reject) => {
    const fileData = fs.readFileSync(filepath);
    const parsedUrl = url.parse(uploadUrl);
    
    // Determine if the URL uses http or https
    const httpModule = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': fileData.length
      }
    };
    
    const req = httpModule.request(options, (res) => {
      console.log(`Upload status code: ${res.statusCode}`);
      
      if (res.statusCode === 200) {
        console.log('Upload successful');
        resolve();
      } else {
        reject(new Error(`Upload failed with status code: ${res.statusCode}`));
      }
    });
    
    req.on('error', (error) => {
      console.error('Error uploading file:', error);
      reject(error);
    });
    
    req.write(fileData);
    req.end();
  });
}

// Main function
async function main() {
  try {
    // Get upload URL
    const filename = 'dummy_image.jpg';
    const uploadUrl = await getUploadUrl(filename);
    
    // Upload file
    await uploadFile(uploadUrl, './dummy_image.jpg');
    
    console.log('File upload completed');
  } catch (error) {
    console.error('Process failed:', error);
    process.exit(1);
  }
}

main(); 