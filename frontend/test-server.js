const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Test Server Working!</h1><p>If you see this, the server is working correctly.</p>');
});

server.listen(3005, () => {
  console.log('Test server running on http://localhost:3005');
});