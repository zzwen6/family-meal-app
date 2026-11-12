import { request } from './request'
import type {
  BoardView, ConfirmItem, DishDetail, DishSummary, FamilyView, LoginResponse, MealType, MeResponse, MemberView,
  MenuView, NotificationView, ShoppingItemView, ShoppingListView, UserView, WishRequest, WishView,
} from './types'

const fam = (fid: number) => `/api/families/${fid}`
const qs = (o: Record<string, string | number | boolean | undefined | null>) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')

export const authApi = {
  wxLogin: (code: string, nickname?: string) => request<LoginResponse>('POST', '/api/auth/wx-login', { code, nickname }),
  login: (username: string, password: string) => request<LoginResponse>('POST', '/api/auth/login', { username, password }),
  register: (body: { username: string; password: string; nickname: string; inviteCode?: string }) =>
    request<LoginResponse>('POST', '/api/auth/register', body),
  me: () => request<MeResponse>('GET', '/api/auth/me', undefined, { silent: true }),
  updateProfile: (body: { nickname?: string; avatarUrl?: string }) => request<UserView>('PUT', '/api/auth/me', body),
}

export const familyApi = {
  create: (name: string, displayName?: string) => request<FamilyView>('POST', '/api/families', { name, displayName }),
  join: (inviteCode: string, displayName?: string) => request<FamilyView>('POST', '/api/families/join', { inviteCode, displayName }),
  get: (fid: number) => request<FamilyView>('GET', fam(fid)),
  members: (fid: number) => request<MemberView[]>('GET', `${fam(fid)}/members`),
  updateMember: (fid: number, mid: number, body: Partial<Pick<MemberView, 'displayName' | 'dietaryNotes' | 'allergies' | 'role'>>) =>
    request<MemberView>('PUT', `${fam(fid)}/members/${mid}`, body),
  notifications: (fid: number, limit = 10) => request<NotificationView[]>('GET', `${fam(fid)}/notifications?limit=${limit}`),
}

export const dishApi = {
  list: (fid: number, params: { category?: string; keyword?: string } = {}) =>
    request<DishSummary[]>('GET', `${fam(fid)}/dishes?${qs(params)}`),
  categories: (fid: number) => request<string[]>('GET', `${fam(fid)}/dishes/categories`),
  detail: (fid: number, id: number, servings?: number) =>
    request<DishDetail>('GET', `${fam(fid)}/dishes/${id}?${qs({ servings })}`),
}

export const wishApi = {
  list: (fid: number, date: string, mealType: MealType) =>
    request<WishView[]>('GET', `${fam(fid)}/wishes?${qs({ date, mealType })}`),
  mine: (fid: number, from?: string, to?: string) => request<WishView[]>('GET', `${fam(fid)}/wishes/mine?${qs({ from, to })}`),
  create: (fid: number, body: WishRequest) => request<WishView>('POST', `${fam(fid)}/wishes`, body),
  update: (fid: number, id: number, body: WishRequest) => request<WishView>('PUT', `${fam(fid)}/wishes/${id}`, body),
  remove: (fid: number, id: number) => request<null>('DELETE', `${fam(fid)}/wishes/${id}`),
}

export const menuApi = {
  board: (fid: number, date: string, mealType: MealType) =>
    request<BoardView>('GET', `${fam(fid)}/menus/board?${qs({ date, mealType })}`),
  confirm: (fid: number, body: { mealDate: string; mealType: MealType; items: ConfirmItem[]; note?: string }) =>
    request<{ menu: MenuView; shoppingList: ShoppingListView }>('POST', `${fam(fid)}/menus/confirm`, body),
  lock: (fid: number, menuId: number) => request<MenuView>('POST', `${fam(fid)}/menus/${menuId}/lock`),
  reopen: (fid: number, mealDate: string, mealType: MealType) =>
    request<MenuView>('POST', `${fam(fid)}/menus/reopen`, { mealDate, mealType }),
  ready: (fid: number, menuId: number) => request<MenuView>('POST', `${fam(fid)}/menus/${menuId}/ready`),
}

export const shoppingApi = {
  get: (fid: number, menuId: number) =>
    request<ShoppingListView>('GET', `${fam(fid)}/menus/${menuId}/shopping-list`, undefined, { silent: true }),
  regenerate: (fid: number, menuId: number) =>
    request<ShoppingListView>('POST', `${fam(fid)}/menus/${menuId}/shopping-list/regenerate`),
  add: (fid: number, menuId: number, body: { name: string; amount?: number | null; unit?: string }) =>
    request<ShoppingItemView>('POST', `${fam(fid)}/menus/${menuId}/shopping-list/items`, body),
  update: (fid: number, itemId: number, body: { toBuy?: boolean; purchased?: boolean }) =>
    request<ShoppingItemView>('PATCH', `${fam(fid)}/shopping-items/${itemId}`, body),
  remove: (fid: number, itemId: number) => request<null>('DELETE', `${fam(fid)}/shopping-items/${itemId}`),
}
