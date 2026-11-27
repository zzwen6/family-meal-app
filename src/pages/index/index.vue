<template>
  <view class="container" :class="{ child: isChild }">
    <template v-if="session.ready && session.token && !currentFamily">
      <no-family />
    </template>
    <template v-else-if="currentFamily">
      <view class="hello">
        <view class="family">{{ currentFamily.name }}</view>
        <view class="muted">{{ greeting }}</view>
      </view>
      <slot-picker @change="load" />

      <view v-for="gs in slotGatherings" :key="gs.id" class="card gathering-tip" @click="openGathering(gs)">
        <view class="row between">
          <view class="flex1">
            <view class="gt-title">🎉 这餐有一场临时聚餐</view>
            <view class="muted">「{{ gs.title }}」· {{ gs.hostName }} 发起 · {{ GATHERING_STATUS_LABELS[gs.status] }}</view>
          </view>
          <text v-if="gs.joined" class="link">查看 ›</text>
        </view>
      </view>

      <view v-if="board" class="card status-card">
        <view class="row between">
          <view class="flex1">
            <view class="big">{{ dateLabel(board.mealDate) }}{{ MEAL_LABELS[board.mealType] }}</view>
            <view class="muted">{{ statusLine }}</view>
            <view v-if="board.assignedCook" class="muted cook-line">掌厨：{{ board.assignedCook.displayName }}</view>
          </view>
          <text class="tag" :class="statusClass">{{ STATUS_LABELS[status] }}</text>
        </view>
        <view class="stats-line">在家吃 {{ board.headcount }} · 已点 {{ submittedCount }} · {{ board.votes.length }} 道想吃</view>
        <button v-if="board.canEditWish" class="btn block hero-btn" @click="goWish()">{{ isChild ? '我想吃这个！' : '我想吃…' }}</button>
        <view v-if="!isChild && (board.canRunKitchen || wards.length)" class="sec-links">
          <text v-if="board.canRunKitchen" class="link" @click="goCook">掌厨工作台</text>
          <text v-if="wards.length" class="link" @click="goHelp">帮孩子点餐</text>
          <!-- #ifdef MP-WEIXIN -->
          <text v-if="status !== 'READY'" class="link" @click="remind">提醒开饭</text>
          <!-- #endif -->
        </view>
      </view>

      <view v-if="board?.hints?.length" class="compact-banner">
        <view v-for="h in visibleHints" :key="h.type + (h.dishName || '') + (h.memberId || '') + (h.leftoverId || '')" class="hint" :class="hintClass(h.type)">{{ h.message }}</view>
        <text v-if="board.hints.length > 1" class="link" @click="hintsOpen = !hintsOpen">{{ hintsOpen ? '收起' : ('还有 ' + (board.hints.length - 1) + ' 条') }}</text>
      </view>

      <view v-if="unusedLeftovers.length" class="compact-banner" @click="leftoverOpen = !leftoverOpen">
        剩菜可先吃：{{ leftoverSummary }}
        <view v-if="leftoverOpen">
          <view v-for="l in unusedLeftovers" :key="l.id" class="muted leftover-line">
            {{ l.name }}<text v-if="l.amount"> {{ l.amount }}{{ l.unit || '' }}</text><text v-if="l.expiresOn"> · 保鲜到 {{ l.expiresOn }}</text>
          </view>
        </view>
      </view>

      <view v-if="board?.planItems?.length && !board?.menu?.items?.length" class="card">
        <view class="card-title">本餐计划</view>
        <view v-for="it in board.planItems" :key="it.id" class="menu-item" @click="it.dishId && goDish(it.dishId, it.servings)">
          <image v-if="it.coverUrl" :src="mediaSrc(it.coverUrl)" class="cover" mode="aspectFill" />
          <view v-else class="cover placeholder">{{ it.name.slice(0, 1) }}</view>
          <view class="flex1">
            <view class="name">{{ it.name }}</view>
            <view class="muted">{{ it.servings }} 人份</view>
          </view>
        </view>
      </view>

      <view v-if="board?.menu?.items?.length" class="card">
        <view class="card-title">
          <text>{{ status === 'READY' ? (isChild ? '今天吃这些哟' : '今天吃这些') : '菜单' }}</text>
          <text v-if="!isChild" class="link" @click="goShopping">采购清单 ›</text>
        </view>
        <view v-for="it in board.menu.items" :key="it.id" class="menu-item" @click="it.dishId && goDish(it.dishId, it.servings)">
          <image v-if="it.coverUrl" :src="mediaSrc(it.coverUrl)" class="cover" mode="aspectFill" />
          <view v-else class="cover placeholder">{{ it.name.slice(0, 1) }}</view>
          <view class="flex1">
            <view class="name">{{ it.name }}</view>
            <view class="muted">
              {{ it.servings }} 人份
              <text v-if="it.durationMinutes"> · 约 {{ it.durationMinutes }} 分钟</text>
              <text v-if="it.substituteForName"> · 替代 {{ it.substituteForName }}</text>
            </view>
          </view>
          <text v-if="it.source === 'WISH'" class="tag primary">家人点的</text>
        </view>
        <view v-if="board.menu.nutrition || board.menu.note" class="muted note">
          <text v-if="board.menu.nutrition">{{ isChild ? kcalLabel(board.menu.nutrition.total?.kcal, true) : ('约 ' + kcalLabel(board.menu.nutrition.total?.kcal).replace('约 ','')) }}</text>
          <text v-if="!isChild && board.menu.nutrition?.excluded?.length" class="link" @click="nutriOpen = !nutriOpen"> 详情</text>
          <view v-if="nutriOpen && board.menu.nutrition?.excluded?.length">未计入：{{ board.menu.nutrition.excluded.join('；') }}</view>
          <view v-if="board.menu.note">{{ board.menu.note }}</view>
        </view>
      </view>

      <view v-if="status === 'READY' && board?.menu?.id" class="card">
        <rate-meal :menu-id="board.menu.id" :ratings="board.ratings" :my-rating="board.myRating" @saved="load" />
      </view>

      <view v-if="board" class="card">
        <view class="card-title"><text>{{ isChild ? '我点的' : '我的意愿' }}</text></view>
        <view v-if="!myWishes.length" class="muted">{{ board.canEditWish ? '还没点' : '这餐已经不能点了' }}</view>
        <view v-for="w in myWishes" :key="w.id" class="wish row between">
          <view>
            <text v-if="w.notEatingHome">这餐不在家吃</text>
            <text v-else>{{ w.dishName || w.freeText }}</text>
            <text v-if="!w.notEatingHome" class="tag" :class="intensityClass(w.intensity)" style="margin-left: 12rpx">{{ INTENSITY_LABELS[w.intensity] }}</text>
          </view>
          <text v-if="w.editable" class="link" @click="goWish(w.id)">修改</text>
        </view>
      </view>

      <expand-section
        v-if="board"
        title="全家想吃"
        :hint="familyWishHint"
        :default-open="!board.menu?.items?.length"
      >
        <view v-if="!board.votes.length" class="muted">还没人点</view>
        <view v-for="v in board.votes" :key="v.name" class="wish row between">
          <text class="name">{{ v.name }}</text>
          <text v-if="v.wantCount" class="tag primary">很想吃 {{ v.wantCount }}</text>
          <text v-else-if="v.avoidCount" class="tag danger">别做 {{ v.avoidCount }}</text>
          <text v-else-if="v.okCount" class="tag">都可以 {{ v.okCount }}</text>
        </view>
        <view v-if="pendingMembers" class="muted members">{{ pendingMembers }}</view>
      </expand-section>

      <view v-if="latestNotice" class="card notice">
        🔔 {{ latestNotice.title }}：{{ latestNotice.content }}
      </view>
    </template>
    <view v-else class="empty">加载中…</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onHide, onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { familyApi, gatheringApi, menuApi } from '@/api'
import type { BoardView, FamilyGatheringSlot, Intensity, MemberView, MenuStatus, NotificationView } from '@/api/types'
import { applyTabBar, currentFamily, ensureSession, isChild, session } from '@/store/session'
import type { HintType } from '@/api/types'
import { dateLabel, GATHERING_STATUS_LABELS, INTENSITY_LABELS, kcalLabel, MEAL_LABELS, parseLocal, STATUS_LABELS } from '@/utils/format'
import { mediaSrc } from '@/utils/media'
import { requestDinnerReminder } from '@/utils/subscribe'
import SlotPicker from '@/components/SlotPicker.vue'
import NoFamily from '@/components/NoFamily.vue'
import RateMeal from '@/components/RateMeal.vue'
import ExpandSection from '@/components/ExpandSection.vue'

const board = ref<BoardView | null>(null)
const latestNotice = ref<NotificationView | null>(null)
/** 家庭日历占位：这餐有没有家人发起的临时聚餐 */
const slotGatherings = ref<FamilyGatheringSlot[]>([])
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

const status = computed<MenuStatus>(() => board.value?.menu?.status || (board.value && parseLocal(board.value.deadline) <= now.value ? 'LOCKED' : 'OPEN'))
const statusClass = computed(() => ({ OPEN: 'primary', LOCKED: 'warn', CONFIRMED: 'success', READY: 'success' })[status.value])
const myWishes = computed(() => board.value?.wishes.filter((w) => w.memberId === currentFamily.value?.myMemberId) || [])
const submittedCount = computed(() => board.value?.members.filter((m) => m.submitted).length || 0)
const unusedLeftovers = computed(() => (isChild.value ? [] : (board.value?.leftovers || []).filter((l) => !l.used)))
const members = ref<MemberView[]>([])
const wards = computed(() => members.value.filter((m) => m.role === 'CHILD' && m.guardianMemberId === currentFamily.value?.myMemberId))
const hintsOpen = ref(false)
const leftoverOpen = ref(false)
const nutriOpen = ref(false)
const visibleHints = computed(() => {
  const all = board.value?.hints || []
  if (hintsOpen.value || all.length <= 1) return all
  return all.slice(0, 1)
})
const leftoverSummary = computed(() =>
  unusedLeftovers.value.map((l) => l.name + (l.amount ? ` ${l.amount}${l.unit || ''}` : '')).join('、'),
)
const familyWishHint = computed(() => {
  const votes = board.value?.votes || []
  if (!votes.length) return '还没人点'
  return votes.map((v) => v.name).slice(0, 4).join('、') + (votes.length > 4 ? '…' : '')
})
const pendingMembers = computed(() => {
  const ms = board.value?.members || []
  const pending = ms.filter((m) => !m.submitted && !m.notEatingHome).map((m) => m.displayName)
  const away = ms.filter((m) => m.notEatingHome).map((m) => m.displayName)
  const parts: string[] = []
  if (pending.length) parts.push('未点：' + pending.join('、'))
  if (away.length) parts.push('不在家：' + away.join('、'))
  return parts.join(' · ')
})
const statusLine = computed(() => {
  if (status.value === 'OPEN') {
    return isChild.value
      ? (countdown.value ? countdown.value + '前告诉家里' : '还可以点')
      : (countdown.value ? countdown.value + '截止' : '已到截止时间')
  }
  if (status.value === 'LOCKED') return isChild.value ? '点餐已截止，等大人定菜单' : '点餐已截止，等掌厨定菜单'
  if (status.value === 'CONFIRMED') {
    const who = board.value?.menu?.confirmedByName || '掌厨'
    return '菜单已定 · ' + who + (board.value?.proxyConfirm ? '（代做）' : '')
  }
  return isChild.value ? '开饭啦' : '开饭啦'
})

function hintClass(t: HintType) {
  return { AVOID: 'danger', FATIGUE: 'warn', FAIRNESS: '', LEFTOVER: '' }[t]
}
const greeting = computed(() => {
  const h = new Date().getHours()
  const name = board.value?.members.find((m) => m.memberId === currentFamily.value?.myMemberId)?.displayName || session.user?.nickname || ''
  return `${h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好'}，${name}`
})
const countdown = computed(() => {
  if (!board.value) return ''
  const ms = parseLocal(board.value.deadline) - now.value
  if (ms <= 0) return ''
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `还有 ${h} 小时 ${m} 分` : `还有 ${m} 分钟`
})

function intensityClass(i: Intensity) {
  return i === 'WANT' ? 'primary' : i === 'AVOID' ? 'danger' : ''
}

async function load() {
  if (!(await ensureSession())) return
  const fid = currentFamily.value!.id
  try {
    const [b, slots] = await Promise.all([
      menuApi.board(fid, session.date, session.mealType),
      gatheringApi.familySlots(fid, session.date, session.date).catch(() => []),
    ])
    board.value = b
    slotGatherings.value = slots.filter((x) => x.mealType === session.mealType && x.status !== 'CLOSED')
    const notes = await familyApi.notifications(fid, 1)
    latestNotice.value = notes[0] || null
    if (!isChild.value) members.value = await familyApi.members(fid).catch(() => [])
    applyTabBar()
  } finally {
    uni.stopPullDownRefresh()
  }
}

function openGathering(gs: FamilyGatheringSlot) {
  if (gs.joined) uni.navigateTo({ url: `/pages/gathering/detail?id=${gs.id}` })
  else uni.showToast({ title: `这是${gs.hostName}的聚餐，需要被邀请才能查看`, icon: 'none' })
}
function remind() {
  requestDinnerReminder()
}

function goWish(id?: number) {
  uni.navigateTo({ url: id ? `/pages/wish/edit?id=${id}` : '/pages/wish/edit' })
}
function goHelp() {
  const w = wards.value[0]
  if (!w) return
  if (wards.value.length === 1) {
    uni.navigateTo({ url: `/pages/wish/edit?memberId=${w.id}` })
    return
  }
  uni.showActionSheet({
    itemList: wards.value.map((x) => x.displayName),
    success: (r) => {
      const c = wards.value[r.tapIndex]
      if (c) uni.navigateTo({ url: `/pages/wish/edit?memberId=${c.id}` })
    },
  })
}
function goCook() {
  uni.navigateTo({ url: '/pages/cook/index' })
}
function goShopping() {
  uni.switchTab({ url: '/pages/shopping/index' })
}
function goDish(id: number, servings: number) {
  uni.navigateTo({ url: `/pages/dish/detail?id=${id}&servings=${servings}` })
}

onShow(() => {
  load()
  timer = setInterval(() => (now.value = Date.now()), 30000)
})
onHide(() => {
  if (timer) clearInterval(timer)
})
onPullDownRefresh(load)
</script>

<style lang="scss" scoped>
.cook-line { margin-top: 4rpx; }
.hint { padding: 4rpx 0; line-height: 1.5; }
.hint.danger { color: #c0392b; }
.hint.warn { color: #b4610f; }
.leftover-line { padding: 6rpx 0 0; }
.hello { margin: 4rpx 4rpx 16rpx; }
.family { font-size: 40rpx; font-weight: 700; }
.big { font-size: 36rpx; font-weight: 600; margin-bottom: 6rpx; }
.hero-btn { margin-top: 20rpx; }
.link { font-weight: normal; }
.menu-item { display: flex; align-items: center; gap: 20rpx; padding: 16rpx 0; border-bottom: 1rpx solid #f2f2f2; }
.menu-item:last-of-type { border-bottom: none; }
.cover { width: 96rpx; height: 96rpx; border-radius: 16rpx; flex-shrink: 0; }
.placeholder { background: $fm-primary-light; color: $fm-primary; display: flex; align-items: center; justify-content: center; font-size: 40rpx; font-weight: 600; }
.flex1 { flex: 1; }
.name { font-size: 30rpx; font-weight: 500; margin-bottom: 4rpx; }
.note { margin-top: 16rpx; }
.wish { padding: 14rpx 0; }
.vote { padding: 16rpx 0; border-bottom: 1rpx solid #f2f2f2; }
.members { margin-top: 20rpx; }
.notice { font-size: 26rpx; color: #666; }
.gathering-tip { background: #fff4e5; border: 2rpx solid #ffd9b0; }
.gt-title { font-size: 28rpx; font-weight: 600; color: #b4610f; margin-bottom: 6rpx; }
.child { font-size: 30rpx; }
.child .family { font-size: 48rpx; }
.child .big { font-size: 42rpx; }
.child .name { font-size: 34rpx; }
.child .btn { height: 96rpx; line-height: 96rpx; font-size: 32rpx; }
</style>
