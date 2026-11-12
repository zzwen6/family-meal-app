import { API_BASE } from '@/config'
import type { ApiError } from './types'

const TOKEN_KEY = 'fm_token'

export function getToken(): string {
  return (uni.getStorageSync(TOKEN_KEY) as string) || ''
}

export function setToken(token: string | null) {
  if (token) uni.setStorageSync(TOKEN_KEY, token)
  else uni.removeStorageSync(TOKEN_KEY)
}

export class RequestError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

export interface RequestOptions {
  /** 出错时不自动弹 toast */
  silent?: boolean
}

/** 统一请求：自动带 JWT；后端错误格式 { code, message }，默认 toast 提示。 */
export function request<T>(method: Method, url: string, data?: unknown, opts: RequestOptions = {}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const header: Record<string, string> = { Accept: 'application/json' }
    const token = getToken()
    if (token) header.Authorization = `Bearer ${token}`
    if (data !== undefined) header['Content-Type'] = 'application/json'
    uni.request({
      url: API_BASE + url,
      method: method as UniApp.RequestOptions['method'],
      data: data as UniApp.RequestOptions['data'],
      header,
      timeout: 15000,
      success: (res) => {
        const body = res.data as unknown
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve((body === '' ? null : body) as T)
          return
        }
        const err = (body && typeof body === 'object' ? body : {}) as Partial<ApiError>
        const e = new RequestError(res.statusCode, err.code || 'HTTP_' + res.statusCode, err.message || `请求失败（${res.statusCode}）`)
        if (res.statusCode === 401 && !url.startsWith('/api/auth/')) {
          setToken(null)
          onUnauthorized?.()
        }
        if (!opts.silent) uni.showToast({ title: e.message, icon: 'none', duration: 2500 })
        reject(e)
      },
      fail: (err) => {
        const e = new RequestError(0, 'NETWORK', '网络异常，连不上服务器')
        console.warn('request fail', url, err)
        if (!opts.silent) uni.showToast({ title: e.message, icon: 'none' })
        reject(e)
      },
    })
  })
}

/** 上传菜谱图片或短视频，字段名 file。 */
export function uploadFile<T>(url: string, filePath: string, formData: Record<string, string> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const header: Record<string, string> = { Accept: 'application/json' }
    const token = getToken()
    if (token) header.Authorization = `Bearer ${token}`
    uni.uploadFile({
      url: API_BASE + url,
      filePath,
      name: 'file',
      header,
      formData,
      timeout: 60000,
      success: (res) => {
        let body: unknown = res.data
        if (typeof res.data === 'string' && res.data) {
          try { body = JSON.parse(res.data) } catch { body = res.data }
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body as T)
          return
        }
        const err = (body && typeof body === 'object' ? body : {}) as Partial<ApiError>
        const e = new RequestError(res.statusCode, err.code || 'HTTP_' + res.statusCode, err.message || `上传失败（${res.statusCode}）`)
        if (res.statusCode === 401) {
          setToken(null)
          onUnauthorized?.()
        }
        uni.showToast({ title: e.message, icon: 'none', duration: 2500 })
        reject(e)
      },
      fail: () => {
        const e = new RequestError(0, 'NETWORK', '网络异常，文件没传上去')
        uni.showToast({ title: e.message, icon: 'none' })
        reject(e)
      },
    })
  })
}
