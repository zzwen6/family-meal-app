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
  type: 'MENU_CONFIRMED' | 'DINNER_READY'
  title: string
  content: string
  wechatStatus: string
  createdAt: string
}
