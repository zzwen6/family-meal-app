import { wechatApi } from '@/api'

/**
 * 「提醒我开饭」：小程序里请求一次性订阅授权（wx.requestSubscribeMessage）。
 * 授权一次，就能收到一条开饭提醒（家里的饭和临时聚餐共用同一个模板）。
 * 后端没配模板 ID 时提示只有站内通知；H5 没有微信 API，什么都不调。
 */
export async function requestDinnerReminder(): Promise<boolean> {
  // #ifdef MP-WEIXIN
  const cfg = await wechatApi.subscribeConfig().catch(() => null)
  if (!cfg?.enabled || !cfg.dinnerReadyTemplateId) {
    uni.showToast({ title: '还没开通微信提醒，开饭时会有站内通知', icon: 'none' })
    return false
  }
  const tmplId = cfg.dinnerReadyTemplateId
  return new Promise<boolean>((resolve) => {
    uni.requestSubscribeMessage({
      tmplIds: [tmplId],
      success: (res) => {
        const ok = (res as unknown as Record<string, string>)[tmplId] === 'accept'
        uni.showToast({ title: ok ? '好的，开饭时提醒你' : '没有授权，开饭时只有站内通知', icon: 'none' })
        resolve(ok)
      },
      fail: (err: unknown) => {
        console.warn('requestSubscribeMessage fail', err)
        uni.showToast({ title: '订阅失败，可以在设置里打开通知', icon: 'none' })
        resolve(false)
      },
    })
  })
  // #endif
  // #ifndef MP-WEIXIN
  uni.showToast({ title: '网页版没有微信提醒，开饭时请留意站内通知', icon: 'none' })
  return false
  // #endif
}

/** 只有小程序能订阅微信消息 */
export const canSubscribeWechat = (() => {
  let v = false
  // #ifdef MP-WEIXIN
  v = true
  // #endif
  return v
})()
