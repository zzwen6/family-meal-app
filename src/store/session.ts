import { computed, reactive } from 'vue'
import { authApi, familyApi } from '@/api'
import { getToken, setToken, setUnauthorizedHandler } from '@/api/request'
import type { FamilyView, LoginResponse, MealType, UserView } from '@/api/types'
import { defaultMeal, today } from '@/utils/format'

const FAMILY_KEY = 'fm_family'

interface SessionState {
  ready: boolean
  token: string
  user: UserView | null
  families: FamilyView[]
  familyId: number | null
  /** 各页面共享的当前餐次（tabBar 页面之间不能传参） */
  date: string
  mealType: MealType
}

export const session = reactive<SessionState>({
  ready: false,
  token: getToken(),
  user: null,
  families: [],
  familyId: (uni.getStorageSync(FAMILY_KEY) as number) || null,
  date: today(),
  mealType: defaultMeal(),
})

export const currentFamily = computed<FamilyView | null>(
  () => session.families.find((f) => f.id === session.familyId) || session.families[0] || null,
)
export const canCook = computed(() => !!currentFamily.value && ['ADMIN', 'COOK'].includes(currentFamily.value.myRole))
export const isAdmin = computed(() => currentFamily.value?.myRole === 'ADMIN')

function apply(res: { user: UserView; families: FamilyView[] }) {
  session.user = res.user
  session.families = res.families
  if (!res.families.some((f) => f.id === session.familyId)) {
    selectFamily(res.families[0]?.id ?? null)
  }
}

export function selectFamily(id: number | null) {
  session.familyId = id
  if (id) uni.setStorageSync(FAMILY_KEY, id)
  else uni.removeStorageSync(FAMILY_KEY)
}

export function onLoggedIn(res: LoginResponse) {
  setToken(res.token)
  session.token = res.token
  apply(res)
  session.ready = true
}

export async function refreshMe() {
  const me = await authApi.me()
  apply(me)
}

export async function refreshFamily() {
  if (!session.familyId) return
  const f = await familyApi.get(session.familyId)
  const i = session.families.findIndex((x) => x.id === f.id)
  if (i >= 0) session.families.splice(i, 1, f)
}

export function logout() {
  setToken(null)
  session.token = ''
  session.user = null
  session.families = []
  session.ready = true
  selectFamily(null)
}

function wxCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (r) => (r.code ? resolve(r.code) : reject(new Error('wx.login 没有返回 code'))),
      fail: reject,
    })
  })
}

/** 小程序静默登录：wx.login → 后端 code2session。 */
export async function wechatLogin(nickname?: string) {
  const code = await wxCode()
  onLoggedIn(await authApi.wxLogin(code, nickname))
}

let booting: Promise<void> | null = null

/** 启动时恢复登录态：已有 token 先校验；小程序端没有 token 就静默登录；H5 等用户自己登录。 */
export function bootstrap(): Promise<void> {
  if (booting) return booting
  booting = (async () => {
    try {
      if (session.token) {
        try {
          await refreshMe()
          return
        } catch {
          setToken(null)
          session.token = ''
        }
      }
      // #ifdef MP-WEIXIN
      try {
        await wechatLogin()
      } catch (e) {
        console.warn('微信静默登录失败', e)
      }
      // #endif
    } finally {
      session.ready = true
    }
  })()
  return booting
}

/** 页面里调用：确保已登录且有家庭。返回 false 时已经跳转。 */
export async function ensureSession(opts: { needFamily?: boolean } = { needFamily: true }): Promise<boolean> {
  await bootstrap()
  if (!session.token) {
    uni.reLaunch({ url: '/pages/login/index' })
    return false
  }
  if (opts.needFamily !== false && !currentFamily.value) {
    return false
  }
  return true
}

setUnauthorizedHandler(() => {
  session.token = ''
  booting = null
  // #ifdef H5
  uni.reLaunch({ url: '/pages/login/index' })
  // #endif
  // #ifdef MP-WEIXIN
  bootstrap()
  // #endif
})
