const https = require('https');

const req = https.request('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyAAwxCLWkDPPKRr8HnCRhr5w4sqjzB92-E', {
  method: 'GET'
}, (res) => {
  console.log(`Status: ${res.statusCode}`);
  res.on('data', d => process.stdout.write(d));
});

req.on('error', e => console.error(e));
req.end();
