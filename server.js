/**
 * server.js
 * ---------------------------------------------------------
 * Servidor estático mínimo (sin dependencias externas) para
 * servir POS-Pro por http://localhost en vez de file://.
 *
 * Por qué existe:
 *   Los navegadores bloquean por CORS los módulos ES6
 *   (import/export) cuando se abren con file://. Sirviendo la
 *   carpeta por HTTP, ese bloqueo desaparece y localStorage
 *   funciona de forma más consistente entre navegadores.
 *
 * Uso:
 *   node server.js
 *   Luego abrir http://localhost:5500 en el navegador.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 5500;
const ROOT = path.dirname(fileURLToPath(import.meta.url));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.join(ROOT, decodeURIComponent(urlPath));

  // Evita salir de la carpeta del proyecto.
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Prohibido');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 - No encontrado: ' + urlPath);
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`POS-Pro corriendo en http://localhost:${PORT}`);
});
