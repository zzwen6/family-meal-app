/** 邀请落地页（小程序卡片 path / H5 链接共用）。 */
export function sharePath(token: string): string {
  return `/pages/gathering/join?token=${encodeURIComponent(token)}`
}

/**
 * H5：当前站点地址 + hash 路由，直接能打开；
 * 小程序里没有网址，复制的是小程序页面路径（发到群里仍建议用「发给微信好友」卡片）。
 */
export function inviteLink(token: string): string {
  let link = sharePath(token)
  // #ifdef H5
  link = `${window.location.origin}${window.location.pathname}#${sharePath(token)}`
  // #endif
  return link
}
