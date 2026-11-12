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
  fatigueWindowDays: number
  fatigueThreshold: number
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
  guardianMemberId?: number | null
  guardianName?: string | null
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

export interface NutritionMacros {
  kcal?: number
  protein?: number
  fat?: number
  carb?: number
}

/** 营养是按用料估算的约数，不是检测或官方认证。 */
export interface NutritionEstimate {
  estimated: boolean
  override: boolean
  servings: number
  total: NutritionMacros
  perServing: NutritionMacros
  excluded?: string[]
}

export interface NutritionOverride {
  enabled?: boolean
  kcal?: number | null
  protein?: number | null
  fat?: number | null
  carb?: number | null
}

export interface DishStepView {
  stepNo: number
  content: string
  durationMinutes?: number
  imageUrl?: string
  videoUrl?: string
  videoCoverUrl?: string
  videoDurationSeconds?: number
}

export interface DishDetail extends DishSummary {
  servings: number
  tips?: string
  steps: DishStepView[]
  ingredients: IngredientView[]
  seasonings: IngredientView[]
  nutrition?: NutritionEstimate
  nutritionOverride?: boolean
}

export interface DishRequest {
  name: string
  category: string
  difficulty?: string
  durationMinutes: number
  defaultServings: number
  coverUrl?: string | null
  description?: string
  tips?: string
  steps?: { content: string; durationMinutes?: number | null; imageUrl?: string | null; videoUrl?: string | null; videoCoverUrl?: string | null; videoDurationSeconds?: number | null }[]
  ingredients?: { name: string; amount?: number | null; unit?: string; staple?: boolean; note?: string }[]
  seasonings?: { name: string; amount?: number | null; unit?: string; staple?: boolean; note?: string }[]
  nutrition?: NutritionOverride
}

export interface MediaView {
  url: string
  storedName: string
  contentType: string
  kind: 'IMAGE' | 'VIDEO'
  sizeBytes: number
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
  assignedMemberId?: number
  assignedMemberName?: string
  assignedSource?: 'AUTO' | 'MANUAL'
  proxyConfirm?: boolean
  nutrition?: NutritionEstimate
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

export type HintType = 'FATIGUE' | 'FAIRNESS' | 'AVOID' | 'LEFTOVER'

export interface HintView {
  type: HintType
  dishId?: number
  dishName?: string
  memberId?: number
  memberName?: string
  message: string
  count?: number
  total?: number
  ratio?: number
  leftoverId?: number
  expiresOn?: string
}

export interface CookBrief {
  memberId: number
  displayName: string
  source: 'AUTO' | 'MANUAL'
}

export interface LeftoverView {
  id: number
  menuId?: number
  name: string
  amount?: number
  unit?: string
  expiresOn?: string
  used: boolean
  usedAt?: string
  usedMenuId?: number
  note?: string
}

export interface InventoryView {
  id: number
  name: string
  amount?: number
  unit?: string
  staple: boolean
  note?: string
}

export interface LedgerView {
  id: number
  inventoryItemId?: number
  sourceType: string
  sourceId?: number
  name: string
  unit?: string
  delta: number
  balanceAfter?: number
  note?: string
  createdAt: string
}

export interface BoardView {
  mealDate: string
  mealType: MealType
  menu?: MenuView
  canEditWish: boolean
  canCook: boolean
  canRunKitchen: boolean
  canManageAssignment: boolean
  deadline: string
  headcount: number
  members: MemberStatus[]
  votes: DishVote[]
  wishes: WishView[]
  assignedCook?: CookBrief
  proxyConfirm: boolean
  hints: HintView[]
  leftovers: LeftoverView[]
  planItems: PlanItemView[]
  ratings: RatingView[]
  myRating?: RatingView | null
}

export interface PlanItemView {
  id: number
  mealDate: string
  mealType: MealType
  dishId?: number | null
  name: string
  servings: number
  coverUrl?: string
  sourceTemplateId?: number | null
}

export interface RatingView {
  id: number
  menuId: number
  memberId: number
  memberName: string
  score: number
  comment?: string
  editable: boolean
  updatedAt: string
}

export interface RatingRequest {
  score: number
  comment?: string
  memberId?: number | null
}

export interface TemplateItemInput {
  dayOfWeek: number
  mealType: MealType
  dishId?: number | null
  customName?: string | null
  servings?: number
}

export interface TemplateItemView {
  id: number
  dayOfWeek: number
  mealType: MealType
  dishId?: number | null
  name: string
  servings: number
  coverUrl?: string
}

export interface TemplateView {
  id: number
  name: string
  note?: string
  items: TemplateItemView[]
}

export interface ApplyResult {
  weekStart: string
  overwrite: boolean
  appliedSlots: number
  skippedConfirmed: number
  skippedExistingPlan: number
  itemsWritten: number
}

export interface DishBrief {
  dishId?: number | null
  name: string
  servings: number
}

export interface DayMeal {
  date: string
  mealType: MealType
  menuId?: number | null
  status?: MenuStatus | null
  plannedOnly: boolean
  items: DishBrief[]
  assignedMemberId?: number | null
  assignedMemberName?: string | null
  confirmedById?: number | null
  confirmedByName?: string | null
  averageScore?: number | null
  ratingCount: number
}

export interface DishCookStat {
  dishId?: number | null
  name: string
  times: number
  lastCooked?: string | null
  averageScore?: number | null
}

export interface DishWishStat {
  dishId?: number | null
  name: string
  wantCount: number
  selectedCount: number
  selectedRate: number
}

export interface MemberFairness {
  memberId: number
  displayName: string
  wantCount: number
  fulfilledCount: number
  fulfillmentRate: number
  assignedCookCount: number
  confirmedCookCount: number
}

export interface FatigueStat {
  dishId?: number | null
  name: string
  times: number
  windowDays: number
  threshold: number
}

export interface StatsView {
  from: string
  to: string
  days: DayMeal[]
  frequentDishes: DishCookStat[]
  frequentWishes: DishWishStat[]
  fairness: MemberFairness[]
  fatigue: FatigueStat[]
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
  note?: string
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

// ---------------- 掌厨轮换、库存 ----------------

export interface RotationMemberView {
  memberId: number
  displayName: string
  sortOrder: number
}

export interface RotationView {
  enabled: boolean
  mealTypes: MealType[]
  members: RotationMemberView[]
}

export interface AssignmentView {
  mealDate: string
  mealType: MealType
  memberId?: number
  memberName?: string
  source?: 'AUTO' | 'MANUAL'
  confirmedByMemberId?: number
  confirmedByName?: string
  proxyConfirm: boolean
}
