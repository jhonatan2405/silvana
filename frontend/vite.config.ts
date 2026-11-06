import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react(), {
  name: 'canonical-local-origin',
  configureServer(server) {
    // Keep browser requests and session cookies on the origin trusted by the services.
    server.middlewares.use((request, response, next) => {
      if (request.method === 'GET' && request.headers.host === '127.0.0.1:5173'
        && request.headers.accept?.includes('text/html') && !request.url?.startsWith('/api/')) {
        const path = request.url?.startsWith('/') ? request.url : '/';
        response.writeHead(302, { Location: 'http://localhost:5173' + path, 'Cache-Control': 'no-store' });
        response.end();
        return;
      }
      next();
    });
  },
}], server: { port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:8000' } } });
