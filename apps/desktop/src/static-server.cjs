const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const HOST = '127.0.0.1';
const PORT = 39217;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

/** @type {Array<{ prefix: string; shell: string }>} */
const DYNAMIC_SHELLS = [
  { prefix: '/sales/', shell: path.join('sales', '[id]', 'index.html') },
  { prefix: '/orders/', shell: path.join('orders', '[id]', 'index.html') },
  { prefix: '/products/', shell: path.join('products', '[id]', 'index.html') },
  { prefix: '/purchases/', shell: path.join('purchases', '[id]', 'index.html') },
  { prefix: '/suppliers/', shell: path.join('suppliers', '[id]', 'index.html') },
  { prefix: '/customers/', shell: path.join('customers', '[id]', 'index.html') },
  { prefix: '/expenses/', shell: path.join('expenses', '[id]', 'index.html') },
  { prefix: '/custom-orders/', shell: path.join('custom-orders', '[id]', 'index.html') },
  { prefix: '/promo-codes/', shell: path.join('promo-codes', '[id]', 'index.html') },
  { prefix: '/users/', shell: path.join('users', '[id]', 'index.html') },
  { prefix: '/inventory/', shell: path.join('inventory', '[variantId]', 'index.html') },
];

/**
 * @param {string} appRoot
 * @param {string} relative pathname under the app (starts with /)
 * @returns {string | null}
 */
function resolveDynamicShell(appRoot, relative) {
  const normalized = relative.endsWith('/') && relative.length > 1 ? relative.slice(0, -1) : relative;
  for (const { prefix, shell } of DYNAMIC_SHELLS) {
    if (!normalized.startsWith(prefix)) {
      continue;
    }
    const rest = normalized.slice(prefix.length);
    if (!rest || rest.includes('/')) {
      continue;
    }
    // Skip known non-detail inventory paths
    if (prefix === '/inventory/' && (rest === 'movements' || rest === 'low-stock')) {
      continue;
    }
    const candidate = path.join(appRoot, shell);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

/**
 * @param {string} rendererRoot Absolute path containing pos/ and erp/ folders
 * @param {() => { apiUrl: string }} getConfig
 * @returns {Promise<{ host: string; port: number; origin: string; close: () => Promise<void> }>}
 */
function startStaticServer(rendererRoot, getConfig) {
  const server = http.createServer((req, res) => {
    try {
      const requestUrl = new URL(req.url || '/', `http://${HOST}:${PORT}`);
      let pathname = decodeURIComponent(requestUrl.pathname);

      if (pathname === '/runtime-config.js') {
        const { apiUrl } = getConfig();
        const safeUrl = String(apiUrl || 'http://localhost:4000').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const body = `window.__JCE_PUBLIC__={apiUrl:"${safeUrl}",portal:"erp"};\n`;
        res.writeHead(200, {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        res.end(body);
        return;
      }

      let appRoot = null;
      let relative = pathname;

      if (pathname === '/pos' || pathname.startsWith('/pos/')) {
        appRoot = path.join(rendererRoot, 'pos');
        relative = pathname === '/pos' ? '/' : pathname.slice('/pos'.length) || '/';
      } else if (pathname === '/erp' || pathname.startsWith('/erp/')) {
        appRoot = path.join(rendererRoot, 'erp');
        relative = pathname === '/erp' ? '/' : pathname.slice('/erp'.length) || '/';
      } else if (pathname.startsWith('/_next/') || pathname === '/favicon.ico') {
        // Next basePath embeds /pos or /erp in asset URLs; bare /_next is a mis-route.
        res.writeHead(404).end('Not found');
        return;
      } else {
        res.writeHead(302, { Location: '/pos/' });
        res.end();
        return;
      }

      if (relative.includes('\0') || relative.includes('..')) {
        res.writeHead(400).end('Bad request');
        return;
      }

      let filePath = path.normalize(path.join(appRoot, relative));
      if (!filePath.startsWith(appRoot)) {
        res.writeHead(400).end('Bad request');
        return;
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        const dynamicShell = resolveDynamicShell(appRoot, relative);
        if (dynamicShell) {
          filePath = dynamicShell;
        } else {
          // SPA-style fallback for client routes under the base path.
          const fallback = path.join(appRoot, 'index.html');
          if (fs.existsSync(fallback)) {
            filePath = fallback;
          } else {
            res.writeHead(404).end('Not found');
            return;
          }
        }
      }

      const ext = path.extname(filePath).toLowerCase();
      const type = MIME[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      res.writeHead(500).end(error instanceof Error ? error.message : 'Server error');
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, HOST, () => {
      resolve({
        host: HOST,
        port: PORT,
        origin: `http://${HOST}:${PORT}`,
        close: () =>
          new Promise((resClose, rejClose) => {
            server.close((err) => (err ? rejClose(err) : resClose()));
          }),
      });
    });
  });
}

module.exports = { startStaticServer, HOST, PORT };
