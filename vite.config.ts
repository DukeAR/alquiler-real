import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

const normalizeUrl = (value?: string) => value?.replace(/\/+$/, '') || '';
const DEV_BACKEND_UNAVAILABLE_RESPONSE = JSON.stringify({
  error: 'No pudimos conectar con el backend local. Levantá npm run server o npm run dev para seguir.',
});

const sendDevBackendUnavailableResponse = (res: Partial<ServerResponse<IncomingMessage>> | undefined | null) => {
  if (!res || typeof res.writeHead !== 'function' || typeof res.end !== 'function') {
    return;
  }

  if (!res.headersSent) {
    res.writeHead(503, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
  }

  if (!res.writableEnded) {
    res.end(DEV_BACKEND_UNAVAILABLE_RESPONSE);
  }
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const useRemoteHmr = env.VITE_REMOTE_HMR === 'true';
  const remoteHmrHost = useRemoteHmr ? (env.VITE_HMR_HOST || env.HMR_HOST) : '';
  const hmrHost = remoteHmrHost || 'localhost';
  const hmrClientPort = Number(env.VITE_HMR_CLIENT_PORT || env.VITE_HMR_PORT || env.HMR_CLIENT_PORT || env.HMR_PORT || 3000);
  const hmrProtocol = (hmrHost === 'localhost' || hmrHost === '127.0.0.1' || hmrHost === '0.0.0.0') ? 'ws' : 'wss';
  const allowedHosts = remoteHmrHost
    ? [remoteHmrHost]
    : ['localhost', '127.0.0.1'];
  const shouldAnalyze = env.ANALYZE === 'true';
  const devApiProxyTarget = normalizeUrl(env.VITE_DEV_API_PROXY_TARGET || env.DEV_API_PROXY_TARGET || 'http://127.0.0.1:3001');

  const plugins: PluginOption[] = [react(), tailwindcss()];

  if (shouldAnalyze) {
    plugins.push(
      visualizer({
        filename: 'dist/bundle-report.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
    );
  }

  return {
    plugins,
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');

            if (!normalizedId.includes('/node_modules/')) {
              return undefined;
            }

            if (
              normalizedId.includes('/react/') ||
              normalizedId.includes('/react-dom/') ||
              normalizedId.includes('/react-router-dom/') ||
              normalizedId.includes('/scheduler/')
            ) {
              return 'react-core';
            }

            if (
              normalizedId.includes('/react-leaflet/') ||
              normalizedId.includes('/leaflet/')
            ) {
              return 'maps';
            }

            if (
              normalizedId.includes('/motion/') ||
              normalizedId.includes('/framer-motion/')
            ) {
              return 'motion';
            }

            if (
              normalizedId.includes('/react-markdown/') ||
              normalizedId.includes('/remark-') ||
              normalizedId.includes('/rehype-') ||
              normalizedId.includes('/mdast-') ||
              normalizedId.includes('/micromark/') ||
              normalizedId.includes('/unified/')
            ) {
              return 'markdown';
            }

            if (
              normalizedId.includes('/socket.io-client/') ||
              normalizedId.includes('/engine.io-client/') ||
              normalizedId.includes('/socket.io-parser/')
            ) {
              return 'realtime';
            }

            if (normalizedId.includes('/lucide-react/')) {
              return 'ui-icons';
            }

            return undefined;
          },
        },
      },
    },
    server: {
      host: true,
      port: 3000,
      strictPort: true,
      hmr: (() => {
        const cfg: Record<string, unknown> = { protocol: hmrProtocol, clientPort: hmrClientPort };
        if (hmrHost && hmrHost !== 'localhost' && hmrHost !== '127.0.0.1' && hmrHost !== '0.0.0.0') {
          cfg.host = hmrHost;
        }
        return cfg;
      })(),
      allowedHosts,
      proxy: {
        '/api': {
          target: devApiProxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
          rewrite: (path) => path,
          configure: (proxy) => {
            proxy.on('error', (_error, _req, res) => {
              sendDevBackendUnavailableResponse(res as ServerResponse<IncomingMessage>);
            });
          },
        },
        '/socket.io': {
          target: devApiProxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (_error, _req, res) => {
              sendDevBackendUnavailableResponse(res as ServerResponse<IncomingMessage>);
            });
          },
        },
      },
    },
    preview: {
      host: true,
      port: 4173,
    },
  };
});