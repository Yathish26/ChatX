import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // hafrontend uses 5173, so run chat on 5174 (allowed in the backend's CORS list).
  server: { port: 5174, strictPort: true },
});
