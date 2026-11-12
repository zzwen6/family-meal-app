/**
 * 后端地址。
 * - H5 开发：留空即可，走 vite 代理（见 vite.config.ts，默认代理到 http://localhost:8080）。
 * - H5 生产：同域部署留空；跨域部署填完整地址，并在后端 CORS_ALLOWED_ORIGINS 里加上 H5 的域名。
 * - 微信小程序：必须填 https 完整地址，并在小程序后台「开发管理 → 服务器域名」里配置 request 合法域名。
 */
export const API_BASE: string = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
