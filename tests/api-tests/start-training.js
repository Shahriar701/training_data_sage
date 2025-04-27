const https = require('https');
const url = require('url');

// API Gateway Endpoint from CDK stack output
const API_ENDPOINT = 'https://0wyjkiw5el.execute-api.us-east-1.amazonaws.com/prod';

// Start a training job
async function startTraining() {
  const path = '/training';
  
  console.log(`Starting training job: ${API_ENDPOINT}${path}`);
  
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
startTraining()
  .then((response) => {
    if (response.TrainingJobArn) {
      console.log(`Training job started: ${response.TrainingJobName}`);
      console.log(`ARN: ${response.TrainingJobArn}`);
    } else if (response.error) {
      console.error(`Training job failed: ${response.error}`);
    }
  })
  .catch((error) => {
    console.error('Failed to start training job:', error);
    process.exit(1);
  }); 