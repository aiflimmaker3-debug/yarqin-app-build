/**
 * تەپەككۇر بۇلىقى — Electron ئۈستەلئۈستى (Windows / macOS / Linux) ئاساسىي كۆزنەك قوزغاتقۇچىسى
 * Runs 100% locally with zero telemetry and persistent local IndexedDB storage.
 */

const { app, BrowserWindow, shell, Menu } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PREFERRED_PORT = 18472; // Fixed localhost port preserves IndexedDB & localStorage origin across restarts

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.wasm': 'application/wasm',
};

let localServer = null;
let mainWindow = null;

function startStaticDistServer(distDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqUrl = (req.url || '/').split('?')[0];
      const safeRelative = path.normalize(decodeURIComponent(reqUrl)).replace(/^(\.\.[/\\])+/, '');
      let filePath = path.join(distDir, safeRelative === '/' || safeRelative === '\\' ? 'index.html' : safeRelative);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distDir, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      fs.createReadStream(filePath).pipe(res);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        server.listen(0, '127.0.0.1', () => {
          const addr = server.address();
          resolve({ server, port: addr.port });
        });
      } else {
        reject(err);
      }
    });

    server.listen(PREFERRED_PORT, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

async function createMainWindow() {
  const distDir = path.join(__dirname, '..', 'dist');
  const iconPath = path.join(__dirname, '..', 'build', 'icon.ico');

  const { server, port } = await startStaticDistServer(distDir);
  localServer = server;

  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 960,
    minHeight: 640,
    title: 'تەپەككۇر بۇلىقى — بىلىم ۋە خاتىرە ئامبىرى',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#141418',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Hide default English Electron menu bar for a clean Uyghur workspace
  Menu.setApplicationMenu(null);

  // Open external links in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  await mainWindow.loadURL(`http://127.0.0.1:${port}/`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (localServer) {
    localServer.close();
    localServer = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
