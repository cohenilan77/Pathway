/**
 * Production server for platforms that run a plain Node process (e.g. Railway),
 * as opposed to Vercel's serverless function runtime that `api/*.js` was written for.
 *
 * It mounts every handler under api/ at the same path Vercel would have used
 * (mirroring the rewrite in vercel.json), then serves the Vite build as a SPA fallback.
 */

import express from 'express';
import path from 'path';
import { readdirSync, statSync, existsSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.join(__dirname, 'api');
const DIST_DIR = path.join(__dirname, 'dist');

const app = express();
app.use(express.json({ limit: '10mb' }));

function collectRoutes(dir, base = '') {
  const routes = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      routes.push(...collectRoutes(fullPath, `${base}/${entry}`));
    } else if (entry.endsWith('.js')) {
      const name = entry.slice(0, -3);
      const routePath = name === 'index' ? base || '/' : `${base}/${name}`;
      routes.push({ routePath, fullPath });
    }
  }
  return routes;
}

async function mountApiRoutes() {
  const routes = collectRoutes(API_DIR);
  for (const { routePath, fullPath } of routes) {
    const mod = await import(pathToFileURL(fullPath).href);
    const handler = mod.default;
    if (typeof handler !== 'function') continue;
    const apiPath = `/api${routePath}`;
    app.all(apiPath, async (req, res) => {
      try {
        await handler(req, res);
      } catch (err) {
        console.error(`Unhandled error in ${apiPath}:`, err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    });
    console.log(`Mounted ${apiPath}`);
  }
}

async function start() {
  await mountApiRoutes();

  if (existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR));
    app.get('*', (req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Pathway server listening on port ${PORT}`);
  });
}

start();
