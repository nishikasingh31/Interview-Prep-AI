import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "https://interview-prep-ai-l5lt.onrender.com/", // forwards frontend API calls to your Express backend
    },
  },
});
