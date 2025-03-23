import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: process.env.PORT || 5173,
    strictPort: true,
    allowedHosts: ['acn-webrtc-prod.onrender.com'], // Allow the deployed URL
    cors: true
  }
});
