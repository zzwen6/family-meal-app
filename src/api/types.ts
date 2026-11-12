export type Role = 'ADMIN' | 'COOK' | 'MEMBER' | 'CHILD'
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER'
export type Intensity = 'WANT' | 'OK' | 'AVOID'
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'
export type MenuStatus = 'OPEN' | 'LOCKED' | 'CONFIRMED' | 'READY'
export type MenuItemSource = 'WISH' | 'COOK_ADDED' | 'SUBSTITUTE'

export interface ApiError {
  code: string
  message: string
  status: number
  fieldErrors?: Record<string, string>
}

export interface UserView {
  id: number
  nickname: string
  avatarUrl?: string
  username?: string
  wechatBound: boolean
  systemAdmin: boolean
}

export interface FamilyView {
  id: number
  name: string
  inviteCode?: string
  breakfastDeadline: string
  lunchDeadline: string
  dinnerDeadline: string
  myMemberId: number
  myRole: Role
  memberCount: number
}

export interface LoginResponse {
  token: string
  expiresIn: number
  user: UserView
  families: FamilyView[]
}

export interface MeResponse {
  user: UserView
  families: FamilyView[]
}

export interface MemberView {
  id: number
  userId: number
  displayName: string
  role: Role
  dietaryNotes?: string
  allergies?: string
  username?: string
  wechatBound: boolean
  joinedAt: string
}

export interface DishSummary {
  id: number
  name: string
  category: string
  difficulty: Difficulty
  durationMinutes: number
  defaultServings: number
  coverUrl?: string
  description?: string
  active: boolean
}

export interface IngredientView {
  id: number
  kind: 'MAIN' | 'SEASONING'
  name: string
  amount?: number
  unit?: string
  staple: boolean
  note?: string
}

export interface DishDetail extends DishSummary {
  servings: number
  tips?: string
  steps: { stepNo: number; content: string; durationMinutes?: number }[]
  ingredients: IngredientView[]
  seasonings: IngredientView[]
}

export interface WishView {
  id: number
  memberId: number
  memberName: string
  mealDate: string
  mealType: MealType
  dishId?: number
  dishName?: string
  freeText?: string
  intensity: Intensity
  servings: number
  notEatingHome: boolean
  note?: string
  editable: boolean
}

export interface WishRequest {
  mealDate: string
  mealType: MealType
  dishId?: number | null
  freeText?: string | null
  intensity?: Intensity
  servings?: number
  notEatingHome: boolean
  note?: string
  memberId?: number | null
}

export interface MenuItemView {
  id: number
  dishId?: number
  name: string
  servings: number
  source: MenuItemSource
  substituteForDishId?: number
  substituteForName?: string
  note?: string
  coverUrl?: string
  durationMinutes?: number
  category?: string
}

export interface MenuView {
  id: number
  mealDate: string
  mealType: MealType
  status: MenuStatus
  deadline: string
  note?: string
  confirmedAt?: string
  confirmedByName?: string
  readyAt?: string
  items: MenuItemView[]
  wishCount: number
}

export interface MemberStatus {
  memberId: number
  displayName: string
  role: Role
  submitted: boolean
  notEatingHome: boolean
  allergies?: string
  dietaryNotes?: string
}

export interface DishVote {
  dishId?: number
  name: string
  wantCount: number
  okCount: number
  avoidCount: number
  servings: number
  wantBy: string[]
  avoidBy: string[]
}

export interface BoardView {
  mealDate: string
  mealType: MealType
  menu?: MenuView
  canEditWish: boolean
  canCook: boolean
  deadline: string
  headcount: number
  members: MemberStatus[]
  votes: DishVote[]
  wishes: WishView[]
}

export interface ConfirmItem {
  dishId?: number | null
  customName?: string | null
  servings?: number
  source?: MenuItemSource
  substituteForDishId?: number | null
  note?: string
}

export interface ShoppingItemView {
  id: number
  name: string
  amount?: number
  unit?: string
  kind: 'MAIN' | 'SEASONING'
  staple: boolean
  toBuy: boolean
  purchased: boolean
  sourceDishes?: string
}

export interface ShoppingListView {
  id: number
  menuId: number
  mealDate: string
  mealType: MealType
  generatedAt: string
  buyItems: ShoppingItemView[]
  stapleItems: ShoppingItemView[]
  toBuyCount: number
  purchasedCount: number
}

export interface NotificationView {
  id: number
  menuId?: number
  gatheringId?: number
  type: 'MENU_CONFIRMED' | 'DINNER_READY'
  title: string
  content: string
  wechatStatus: string
  createdAt: string
}

// ---------------- 临时聚餐 ----------------

/** HOST_COOK 主人掌厨 / VOTE 众筹投票 / POTLUCK 各带一道 */
export type GatheringMode = 'HOST_COOK' | 'VOTE' | 'POTLUCK'
/** OPEN 邀请中 / CONFIRMED 菜单已定 / CLOSED 已散场 */
export type GatheringStatus = 'OPEN' | 'CONFIRMED' | 'CLOSED'
export type Rsvp = 'YES' | 'NO' | 'MAYBE'

export interface GatheringSummary {
  id: number
  title: string
  mealDate: string
  mealType: MealType
  location?: string
  mode: GatheringMode
  status: GatheringStatus
  hostName: string
  host: boolean
  myRsvp: Rsvp
  headcount: number
  participantCount: number
  readyAt?: string
}

export interface InvitePreview {
  title: string
  mealDate: string
  mealType: MealType
  location?: string
  mode: GatheringMode
  status: GatheringStatus
  hostName: string
  deadlineAt?: string
  joinable: boolean
  joined: boolean
  gatheringId?: number
  reason?: string
}

export interface GatheringParticipantView {
  id: number
  name: string
  rsvp: Rsvp
  headcount: number
  /** 只有发起人和本人能看到 */
  dietaryNotes?: string
  host: boolean
  me: boolean
  /** 主人代填、没有账号的客人 */
  guest: boolean
  joinedAt: string
}

export interface GatheringWishView {
  id: number
  participantId: number
  participantName: string
  dishName: string
  note?: string
  bringBySelf: boolean
  votes: number
  votedByMe: boolean
  mine: boolean
  editable: boolean
  createdAt: string
}

export interface DishTally {
  dishName: string
  count: number
  by: string[]
}

export interface GatheringMenuItemView {
  id: number
  dishName: string
  servings: number
  autoServings: boolean
  wishId?: number
  bringParticipantId?: number
  bringByName?: string
  note?: string
}

export interface GatheringDetail {
  id: number
  title: string
  mealDate: string
  mealType: MealType
  location?: string
  note?: string
  mode: GatheringMode
  status: GatheringStatus
  hostName: string
  host: boolean
  /** 只有发起人自己能看到 */
  hostFamilyId?: number
  /** 散场后为空 */
  inviteToken?: string
  deadlineAt?: string
  canEditWishes: boolean
  headcount: number
  confirmedHeadcount?: number
  headcountChanged: boolean
  yesCount: number
  maybeCount: number
  noCount: number
  confirmedAt?: string
  readyAt?: string
  closedAt?: string
  createdAt: string
  sourceGatheringId?: number
  me: GatheringParticipantView
  participants: GatheringParticipantView[]
  wishes: GatheringWishView[]
  tally: DishTally[]
  unclaimed: string[]
  menu: GatheringMenuItemView[]
}

export interface GatheringForm {
  title: string
  mealDate: string
  mealType: MealType
  location?: string | null
  mode?: GatheringMode
  deadlineAt?: string | null
  hostFamilyId?: number | null
  note?: string | null
  headcount?: number
  dietaryNotes?: string | null
}

export interface GatheringConfirmItem {
  wishId?: number | null
  dishName?: string | null
  servings?: number | null
  bringParticipantId?: number | null
  note?: string | null
}

export interface GatheringShoppingItemView {
  id: number
  name: string
  amount?: number
  unit?: string
  baseServings?: number
  scaledAmount?: number
  forDish?: string
  note?: string
  purchased: boolean
}

export interface GatheringShoppingView {
  gatheringId: number
  headcount: number
  items: GatheringShoppingItemView[]
  total: number
  purchasedCount: number
}

export interface GatheringShoppingItemRequest {
  name: string
  amount?: number | null
  unit?: string | null
  baseServings?: number | null
  forDish?: string | null
  note?: string | null
}

export interface FamilyGatheringSlot {
  id: number
  title: string
  mealDate: string
  mealType: MealType
  status: GatheringStatus
  hostName: string
  joined: boolean
}

export interface GatheringNotificationView {
  id: number
  gatheringId?: number
  type: 'GATHERING_CONFIRMED' | 'GATHERING_READY'
  title: string
  content: string
  wechatStatus: string
  createdAt: string
}

export interface SubscribeConfig {
  enabled: boolean
  dinnerReadyTemplateId?: string
}
