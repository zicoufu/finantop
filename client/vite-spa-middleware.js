// Middleware para tratar rotas SPA no Vite
const fs = require('fs');
const path = require('path');

module.exports = function spaFallbackMiddleware(req, res, next) {
  // Bypass para requisições de API ou arquivos estáticos
  if (
    req.url.startsWith('/api') || 
    req.url.includes('.') || 
    req.url.includes('__vite')
  ) {
    return next();
  }

  // Para qualquer outra rota, retorna o index.html
  const indexHtml = path.resolve(__dirname, 'index.html');
  
  if (fs.existsSync(indexHtml)) {
    res.setHeader('Content-Type', 'text/html');
    return fs.createReadStream(indexHtml).pipe(res);
  }

  next();
};
