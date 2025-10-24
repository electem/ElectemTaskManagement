import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'D:/apps/nginx-1.24.0/iot/frontend/ui/task', // Specify your desired path here
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "https://iot.electems.com/task/api", // backend URL
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
