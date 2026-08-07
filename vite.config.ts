import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
  vite: {
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes("node_modules")) {
              if (id.includes("react-dom") || id.includes("react/") || id.includes("@tanstack")) {
                return "vendor";
              }
              if (id.includes("lucide-react")) {
                return "icons";
              }
              if (id.includes("leaflet") || id.includes("react-leaflet")) {
                return "leaflet";
              }
              if (id.includes("socket.io-client")) {
                return "socket";
              }
            }
          },
        },
      },
    },
    resolve: {
      tsconfigPaths: true,
      dedupe: ["react", "react-dom", "@tanstack/react-router"],
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
        },
        "/uploads": {
          target: "http://localhost:5000",
          changeOrigin: true,
        },
      },
    },
  },
});
