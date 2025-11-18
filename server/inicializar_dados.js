// Script para inicializar dados de exemplo
// Execute com: node inicializar_dados.js

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/init-sample-data',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  console.log(`Status da resposta: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Resposta completa:');
    console.log(data);
  });
});

req.on('error', (error) => {
  console.error('Erro na requisição:', error);
});

req.end();

console.log('Enviando requisição para inicializar dados de exemplo...');
