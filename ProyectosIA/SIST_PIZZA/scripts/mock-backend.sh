#!/bin/bash
# Mock Backend Server - Validación rápida sin dependencias complejas
PORT=${PORT:-3000}

echo "🚀 Iniciando Mock Backend en puerto $PORT"
echo "   URL: http://localhost:$PORT"
echo ""
echo "Rutas disponibles:"
echo "  GET  /api/health - Health check"
echo "  POST /api/comandas - Crear orden (mock)"
echo ""

# Crear servidor con netcat puro o con Node.js simple
node -e "
const http = require('http');

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/api/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: 'development' 
    }));
  } else if (req.url === '/api/comandas' && req.method === 'POST') {
    res.writeHead(200);
    res.end(JSON.stringify({ 
      id: 'mock-' + Date.now(),
      status: 'pending',
      message: 'Mock order created'
    }));
  } else if (req.url === '/metrics') {
    res.writeHead(200);
    res.end('# HELP mock_requests_total Mock requests counter\n');
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen($PORT, '0.0.0.0', () => {
  console.log('✅ Mock backend listening on http://0.0.0.0:$PORT');
});
"
