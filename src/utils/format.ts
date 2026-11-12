import type { Difficulty, GatheringMode, GatheringStatus, HintType, Intensity, MealType, MenuStatus, Role, Rsvp } from '@/api/types'

export const MEAL_LABELS: Record<MealType, string> = { BREAKFAST: '早餐', LUNCH: '午餐', DINNER: '晚餐' }
export const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER']
export const ROLE_LABELS: Record<Role, string> = { ADMIN: '管理员', COOK: '掌厨', MEMBER: '成员', CHILD: '小朋友' }
export const INTENSITY_LABELS: Record<Intensity, string> = { WANT: '很想吃', OK: '都可以', AVOID: '别做这个' }
export const DIFFICULTY_LABELS: Record<Difficulty, string> = { EASY: '简单', MEDIUM: '中等', HARD: '有难度' }
export const STATUS_LABELS: Record<MenuStatus, string> = { OPEN: '点餐中', LOCKED: '已截止', CONFIRMED: '菜单已定', READY: '开饭啦' }

export const MODE_LABELS: Record<GatheringMode, string> = { HOST_COOK: '主人掌厨', VOTE: '众筹投票', POTLUCK: '各带一道' }
export const MODE_HINTS: Record<GatheringMode, string> = {
  HOST_COOK: '大家说想吃什么，主人定菜单、负责采购和下厨',
  VOTE: '大家提议菜名并投票，一人一菜一票，主人按票数定菜单',
  POTLUCK: '每人认领一道自己带来的菜，主人看谁带什么',
}
export const GATHERING_STATUS_LABELS: Record<GatheringStatus, string> = { OPEN: '邀请中', CONFIRMED: '菜单已定', CLOSED: '已散场' }
export const RSVP_LABELS: Record<Rsvp, string> = { YES: '来', MAYBE: '待定', NO: '不来' }

const pad = (n: number) => String(n).padStart(2, '0')

export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function today(): string {
  return fmtDate(new Date())
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const x = new Date(y, m - 1, d)
  x.setDate(x.getDate() + n)
  return fmtDate(x)
}

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 2026-11-12 → 今天 / 明天 / 11月14日 周六 */
export function dateLabel(date: string): string {
  const t = today()
  if (date === t) return '今天'
  if (date === addDays(t, 1)) return '明天'
  if (date === addDays(t, -1)) return '昨天'
  const [y, m, d] = date.split('-').map(Number)
  return `${m}月${d}日 ${WEEK[new Date(y, m - 1, d).getDay()]}`
}

/** 2026-11-12T16:00:00 → 今天 16:00 */
export function deadlineLabel(dt?: string): string {
  if (!dt) return ''
  const [date, time] = dt.split('T')
  return `${dateLabel(date)} ${time.slice(0, 5)}`
}

/** 后端 LocalDateTime（无时区，按家庭时区）转毫秒，用于倒计时 */
export function parseLocal(dt: string): number {
  const [date, time] = dt.split('T')
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm, ss] = time.split(':').map((s) => Number(s.split('.')[0]))
  return new Date(y, m - 1, d, hh, mm, ss || 0).getTime()
}

export function amountLabel(amount?: number | null, unit?: string | null): string {
  if (amount === undefined || amount === null) return '适量'
  return `${amount}${unit || ''}`
}

/** 默认展示的餐次：10 点前看午餐，16 点前看晚餐，再晚看晚餐 */
export function defaultMeal(): MealType {
  const h = new Date().getHours()
  if (h < 9) return 'BREAKFAST'
  if (h < 13) return 'LUNCH'
  return 'DINNER'
}

export const HINT_TYPE_LABELS: Record<HintType, string> = {
  FATIGUE: '可能吃腻',
  FAIRNESS: '心愿公平',
  AVOID: '忌口',
  LEFTOVER: '剩菜',
}

export const DOW_LABELS = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']

/** 该日期所在周的周一（本地日历）。 */
export function mondayOf(date: string = today()): string {
  const [y, m, d] = date.split('-').map(Number)
  const x = new Date(y, m - 1, d)
  const dow = x.getDay() // 0 Sun
  const back = dow === 0 ? 6 : dow - 1
  x.setDate(x.getDate() - back)
  return fmtDate(x)
}

export function scoreLabel(n?: number | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '还没评分'
  return `${Math.round(n * 10) / 10} 分`
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

export function kcalLabel(kcal?: number | null, simple = false): string {
  if (kcal === undefined || kcal === null || Number.isNaN(Number(kcal))) return ''
  const n = Math.round(Number(kcal))
  return simple ? `大约 ${n} 千卡` : `约 ${n} 千卡`
}

export const LEDGER_LABELS: Record<string, string> = {
  PURCHASE: '采购入账',
  PURCHASE_REVERT: '取消已买',
  LEFTOVER_USE: '用掉剩菜',
  MEAL_READY: '开饭用掉',
  MANUAL: '手工调整',
}
