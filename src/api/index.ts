import { request } from './request'
import type {
  BoardView, ConfirmItem, DishDetail, DishSummary, FamilyGatheringSlot, FamilyView, GatheringConfirmItem,
  GatheringDetail, GatheringForm, GatheringNotificationView, GatheringShoppingItemRequest, GatheringShoppingView,
  GatheringSummary, InvitePreview, LoginResponse, MealType, MeResponse, MemberView, MenuView, NotificationView, Rsvp,
  ShoppingItemView, ShoppingListView, SubscribeConfig, UserView, WishRequest, WishView,
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

/** 临时聚餐：独立于家庭，接口都在 /api/gatherings 下；只有发起人和本场参与者能看详情。 */
const gat = (id: number) => `/api/gatherings/${id}`

export const gatheringApi = {
  mine: () => request<GatheringSummary[]>('GET', '/api/gatherings'),
  create: (body: GatheringForm) => request<GatheringDetail>('POST', '/api/gatherings', body),
  get: (id: number, silent = false) => request<GatheringDetail>('GET', gat(id), undefined, { silent }),
  update: (id: number, body: GatheringForm) => request<GatheringDetail>('PUT', gat(id), body),
  copy: (id: number, body: GatheringForm) => request<GatheringDetail>('POST', `${gat(id)}/copy`, body),
  preview: (token: string) =>
    request<InvitePreview>('GET', `/api/gatherings/invite/${encodeURIComponent(token)}`, undefined, { silent: true }),
  join: (token: string, body: { rsvp: Rsvp; headcount: number; dietaryNotes?: string; guestName?: string }) =>
    request<GatheringDetail>('POST', `/api/gatherings/invite/${encodeURIComponent(token)}/join`, body),
  rsvp: (id: number, body: { rsvp: Rsvp; headcount: number; dietaryNotes?: string; guestName?: string }) =>
    request<GatheringDetail>('PUT', `${gat(id)}/me`, body),
  addGuest: (id: number, body: { guestName: string; headcount?: number; rsvp?: Rsvp; dietaryNotes?: string }) =>
    request<GatheringDetail>('POST', `${gat(id)}/participants`, body),
  removeParticipant: (id: number, pid: number) => request<GatheringDetail>('DELETE', `${gat(id)}/participants/${pid}`),
  addWish: (id: number, body: { dishName: string; note?: string }) => request<GatheringDetail>('POST', `${gat(id)}/wishes`, body),
  updateWish: (id: number, wishId: number, body: { dishName: string; note?: string }) =>
    request<GatheringDetail>('PUT', `${gat(id)}/wishes/${wishId}`, body),
  deleteWish: (id: number, wishId: number) => request<GatheringDetail>('DELETE', `${gat(id)}/wishes/${wishId}`),
  vote: (id: number, wishId: number) => request<GatheringDetail>('POST', `${gat(id)}/wishes/${wishId}/vote`),
  unvote: (id: number, wishId: number) => request<GatheringDetail>('DELETE', `${gat(id)}/wishes/${wishId}/vote`),
  confirm: (id: number, items: GatheringConfirmItem[]) => request<GatheringDetail>('POST', `${gat(id)}/confirm`, { items }),
  reopen: (id: number, deadlineAt?: string | null) => request<GatheringDetail>('POST', `${gat(id)}/reopen`, { deadlineAt }),
  ready: (id: number) => request<GatheringDetail>('POST', `${gat(id)}/ready`),
  close: (id: number) => request<GatheringDetail>('POST', `${gat(id)}/close`),
  notifications: (id: number, limit = 10) =>
    request<GatheringNotificationView[]>('GET', `${gat(id)}/notifications?limit=${limit}`, undefined, { silent: true }),
  shopping: (id: number) => request<GatheringShoppingView>('GET', `${gat(id)}/shopping`, undefined, { silent: true }),
  addShoppingItem: (id: number, body: GatheringShoppingItemRequest) =>
    request<GatheringShoppingView>('POST', `${gat(id)}/shopping/items`, body),
  updateShoppingItem: (id: number, itemId: number, body: GatheringShoppingItemRequest) =>
    request<GatheringShoppingView>('PUT', `${gat(id)}/shopping/items/${itemId}`, body),
  markPurchased: (id: number, itemId: number, purchased: boolean) =>
    request<GatheringShoppingView>('PATCH', `${gat(id)}/shopping/items/${itemId}`, { purchased }),
  deleteShoppingItem: (id: number, itemId: number) =>
    request<GatheringShoppingView>('DELETE', `${gat(id)}/shopping/items/${itemId}`),
  /** 家庭日历占位：这个家庭在某段日期里有哪些临时聚餐（只有标题和发起人） */
  familySlots: (fid: number, from: string, to: string) =>
    request<FamilyGatheringSlot[]>('GET', `${fam(fid)}/gatherings?${qs({ from, to })}`, undefined, { silent: true }),
}

export const wechatApi = {
  subscribeConfig: () => request<SubscribeConfig>('GET', '/api/wechat/subscribe-config', undefined, { silent: true }),
}
