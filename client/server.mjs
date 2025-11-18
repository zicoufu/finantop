// Servidor Express ESM para servir a SPA do Vite (pasta dist)
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5173;

// Proxy para backend
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
}));

// Servir arquivos estáticos do build do cliente (gerado em ../dist/public)
const distPath = path.join(__dirname, '../dist/public');
app.use(express.static(distPath));

// Fallback SPA: sempre retornar o index.html do build
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
  console.log(`SPA fallback: ${req.path} -> /index.html`);
});

app.listen(PORT, () => {
  console.log(`SPA server running at http://localhost:${PORT}`);
});
