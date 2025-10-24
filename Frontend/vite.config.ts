import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
<<<<<<< HEAD
  build: {
    outDir: 'D:/apps/nginx-1.24.0/iot/frontend/ui/task', // Specify your desired path here
  },
=======
>>>>>>> ca2965efbdb0910b36d6788750b8bbb771a50f83
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
<<<<<<< HEAD
        target: "https://iot.electems.com/task/api", // backend URL
=======
        target: "http://localhost:5000", // backend URL
>>>>>>> ca2965efbdb0910b36d6788750b8bbb771a50f83
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
