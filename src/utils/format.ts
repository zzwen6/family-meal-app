import type { Difficulty, Intensity, MealType, MenuStatus, Role } from '@/api/types'

export const MEAL_LABELS: Record<MealType, string> = { BREAKFAST: '早餐', LUNCH: '午餐', DINNER: '晚餐' }
export const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER']
export const ROLE_LABELS: Record<Role, string> = { ADMIN: '管理员', COOK: '掌厨', MEMBER: '成员', CHILD: '小朋友' }
export const INTENSITY_LABELS: Record<Intensity, string> = { WANT: '很想吃', OK: '都可以', AVOID: '别做这个' }
export const DIFFICULTY_LABELS: Record<Difficulty, string> = { EASY: '简单', MEDIUM: '中等', HARD: '有难度' }
export const STATUS_LABELS: Record<MenuStatus, string> = { OPEN: '点餐中', LOCKED: '已截止', CONFIRMED: '菜单已定', READY: '开饭啦' }

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
