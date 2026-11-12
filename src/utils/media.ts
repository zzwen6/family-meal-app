import { API_BASE } from '@/config'
import { getToken } from '@/api/request'

/**
 * 把后端返回的媒体路径变成可给 <image>/<video> 用的地址。
 * 本 API 的 /api/families/.../media/... 需要登录：小程序和 H5 的 src 带不上 Authorization，
 * 因此附加 access_token 查询参数。外链保持原样。
 */
export function mediaSrc(url?: string | null): string {
  if (!url) return ''
  const token = getToken()
  const absolute = url.startsWith('http://') || url.startsWith('https://')
    ? url
    : url.startsWith('/')
      ? API_BASE + url
      : url
  if (!absolute.includes('/api/families/') || !absolute.includes('/media/')) return absolute
  if (!token) return absolute
  const sep = absolute.includes('?') ? '&' : '?'
  return `${absolute}${sep}access_token=${encodeURIComponent(token)}`
}
