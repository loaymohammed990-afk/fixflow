import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "FIXFLOW_");
  const proxy = { "/api": env.FIXFLOW_API_TARGET || "http://127.0.0.1:4000" };
  return {
    server: { host: "127.0.0.1", port: 5173, strictPort: true, proxy },
    preview: { proxy },
    esbuild: { jsx: "automatic" },
  };
});
