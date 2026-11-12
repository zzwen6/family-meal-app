import { defineConfig, loadEnv } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// https://uniapp.dcloud.net.cn/collocation/vite-config.html
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [uni()],
    server: {
      port: 5173,
      host: true,
      // H5 开发时把 /api 代理到后端，避免跨域；VITE_API_BASE 留空即可
      proxy: {
        '/api': {
          target: env.VITE_DEV_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  }
})
