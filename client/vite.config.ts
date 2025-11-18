import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // Importe o módulo path

// https://vitejs.dev/config/
export default defineConfig({
  root: __dirname, // Define a raiz do projeto Vite como a pasta 'client'
  plugins: [
    react(),
    // Plugin personalizado para ignorar erros de módulos não encontrados relacionados ao date-fns
    {
      name: 'ignore-date-fns-locale-errors',
      resolveId(id) {
        // Se o caminho contiver algum padrão de locale do date-fns que está causando erro
        if (id.includes('/_lib/') && id.includes('date-fns/locale')) {
          // Retorna um caminho vazio para um módulo vazio
          return path.resolve(__dirname, './src/utils/empty-module.js');
        }
        return null;
      }
    }
  ],
  server: {
    proxy: {
      // Redireciona requisições que começam com /api para o backend
      '/api': {
        target: 'http://localhost:3001', // Onde o backend está rodando
        changeOrigin: true, // Necessário para virtual hosted sites
      }
    },
    cors: true,
    port: 5174,
    strictPort: true
  },
  base: '/',
  appType: 'spa',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'), // Alias para a pasta shared
      '@': path.resolve(__dirname, './src'), // Alias para a pasta src do client
    },
  },
  optimizeDeps: {
    // Ignorar warnings relacionados a módulos não encontrados
    force: true,
    esbuildOptions: {
      logOverride: {
        'could-not-resolve': 'silent'
      }
    }
  },
})
