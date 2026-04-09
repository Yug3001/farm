const https = require('https');

const req = https.request('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyAAwxCLWkDPPKRr8HnCRhr5w4sqjzB92-E', {
  method: 'GET'
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      const names = data.models.map(m => m.name);
      console.log("Available models:");
      names.forEach(n => console.log(n));
    } catch(e) {
      console.log(e);
    }
  });
});

req.on('error', e => console.error(e));
req.end();
