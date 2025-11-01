import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import { HandleErrorFunction } from "react-router"

export const handleError: HandleErrorFunction = (error) => {
  console.error(error) // log locally only
  // maybe send to sentry or something later
}

// Vite recommends exporting a function to access mode
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "") // Loads all env vars, not just VITE_

  return {
    define: {
      global: "globalThis",
      "process.env": {},
    },
    plugins: [
      react(),
      {
        name: "client-error-logger",
        configureServer(server) {
          // Intercept any client-side error posts
          server.middlewares.use("/api/client-errors", async (req, res) => {
            let body = ""
            req.on("data", (chunk) => (body += chunk))
            req.on("end", () => {
              try {
                const parsed = JSON.parse(body)
                console.error("Client Error Logged:", parsed)
              } catch {
                console.error("Client Error Logged (raw):", body)
              }
              res.writeHead(200, { "Content-Type": "application/json" })
              res.end(JSON.stringify({ ok: true }))
            })
          })
        },
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@abis": path.resolve(__dirname, "./src/abis"),
        "@shared": path.resolve(__dirname, "./shared"),
        buffer: "buffer",
        "rxjs": path.resolve(__dirname, "./node_modules/rxjs"),
      },
      dedupe: ["react", "react-dom", "rxjs"],
    },
    optimizeDeps: {
      include: ["buffer"],
      exclude: ["@coinbase/wallet-sdk", "@reown/appkit", "rxjs"],
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
        mainFields: ["module", "main"],
      },
    },
    server: {
      port: parseInt(env.PORT || "3000"),
      host: "0.0.0.0",
    },
    preview: {
      port: parseInt(env.PORT || "4173"),
      host: "0.0.0.0",
    },
    build: {
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
      },
      // rollupOptions: {
      //   external: ["@reown/appkit/core", "@coinbase/wallet-sdk"],
      // },
    },
  }
})
