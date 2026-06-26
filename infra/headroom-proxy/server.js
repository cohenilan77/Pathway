import http from 'http';
import { handleCompress } from './lib/compress.js';

const PORT = process.env.PORT || 8080;

function readBody(req) {
    return new Promise((resolve, reject) => {
          let data = '';
          req.on('data', (chunk) => (data += chunk));
          req.on('end', () => {
                  try {
                            resolve(data ? JSON.parse(data) : {});
                  } catch {
                            reject(new Error('Invalid JSON'));
                  }
          });
          req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

                                   if (req.method === 'OPTIONS') {
                                         res.writeHead(204);
                                         res.end();
                                         return;
                                   }

                                   if (req.url === '/health' && req.method === 'GET') {
                                         res.writeHead(200);
                                         res.end(JSON.stringify({ status: 'ok' }));
                                         return;
                                   }

                                   if (req.url === '/v1/compress' && req.method === 'POST') {
                                         try {
                                                 const body = await readBody(req);
                                                 const result = handleCompress(body);
                                                 res.writeHead(200);
                                                 res.end(JSON.stringify(result));
                                         } catch (err) {
                                                 res.writeHead(400);
                                                 res.end(JSON.stringify({ error: err.message }));
                                         }
                                         return;
                                   }

                                   res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Headroom proxy listening on 0.0.0.0:${PORT}`);
});
