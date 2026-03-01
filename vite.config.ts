import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path/win32';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@app": path.resolve(__dirname, "src/app"),
      "@modules": path.resolve(__dirname, "src/modules"),
      "@shared": path.resolve(__dirname, "src/shared"),
      "@ui": path.resolve(__dirname, "src/ui"),
      "@components": path.resolve(__dirname, "src/components"),
      "@layouts": path.resolve(__dirname, "src/layouts"),
      "@lib": path.resolve(__dirname, "src/shared/lib"),
      "@admin-pages": path.resolve(__dirname, "src/pages/admin"),
      "@public-pages": path.resolve(__dirname, "src/pages/public"),
      "@repositories": path.resolve(__dirname, "src/gateways/repositories"),
      "@helpers": path.resolve(__dirname, "src/domain/helpers"),
      "@models": path.resolve(__dirname, "src/domain/models"),
      "@styles": path.resolve(__dirname, "src/styles")
    }
  }
});