/**
 * SkyPulse Weather Dashboard - Node.js Local Server
 * Zero dependencies, built with native Node.js modules
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.normalize(path.join(ROOT_DIR, reqPath));

  // Security check: ensure path stays within ROOT_DIR
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('========================================================');
  console.log(` SkyPulse Weather Dashboard running at: ${url}`);
  console.log(' Press Ctrl+C in this terminal to stop the server.');
  console.log('========================================================');

  // Automatically open browser on Windows (skip in Docker / headless)
  if (process.platform === 'win32' && !process.env.DOCKER) {
    exec(`start "" "${url}"`, (err) => {
      if (err) {
        console.log(`Open ${url} manually in your web browser.`);
      }
    });
  } else {
    console.log(`Open ${url} in your web browser.`);
  }
});

// Graceful shutdown for Docker SIGINT / SIGTERM signals
const shutdown = (signal) => {
  console.log(`\nReceived ${signal}, shutting down SkyPulse server...`);
  server.close(() => {
    console.log('Server stopped cleanly.');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
