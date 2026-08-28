import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
export default defineConfig({
  base: '/Raksha-bandhan-gift/',
  plugins: [react()],
  build: {
    target: 'es2020',
  },
});
