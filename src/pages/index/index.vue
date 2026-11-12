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
          <view>
            <view class="big">{{ dateLabel(board.mealDate) }}{{ MEAL_LABELS[board.mealType] }}</view>
            <view class="muted">
              <text v-if="status === 'OPEN'">{{ isChild ? (countdown + '前告诉家里你想吃什么') : (countdown + '截止（' + deadlineLabel(board.deadline) + '）') }}</text>
              <text v-else-if="status === 'LOCKED'">{{ isChild ? '点餐已经截止啦，等大人定菜单' : '点餐已截止，等掌厨定菜单' }}</text>
              <text v-else-if="status === 'CONFIRMED'">菜单已定 · {{ board.menu?.confirmedByName || '掌厨' }}<text v-if="board.proxyConfirm">（代做）</text></text>
              <text v-else>{{ isChild ? '开饭啦，快去吃！吃完记得打个分～' : '开饭啦，快去吃！' }}</text>
            </view>
            <view v-if="board.assignedCook" class="muted cook-line">今晚掌厨：{{ board.assignedCook.displayName }}</view>
          </view>
          <text class="tag" :class="statusClass">{{ STATUS_LABELS[status] }}</text>
        </view>
        <view class="row gap stats">
          <view class="stat"><view class="num">{{ board.headcount }}</view><view class="muted">在家吃</view></view>
          <view class="stat"><view class="num">{{ submittedCount }}</view><view class="muted">已点</view></view>
          <view class="stat"><view class="num">{{ board.votes.length }}</view><view class="muted">道想吃</view></view>
        </view>
        <view class="row gap actions">
          <button class="btn" :disabled="!board.canEditWish" @click="goWish()">{{ isChild ? '我想吃这个！' : '我想吃…' }}</button>
          <button v-if="board.canRunKitchen" class="btn ghost" @click="goCook">掌厨工作台</button>
          <button v-if="!isChild && wards.length" class="btn ghost" @click="goHelp">帮孩子点餐</button>
        </view>
        <!-- #ifdef MP-WEIXIN -->
        <view v-if="status !== 'READY'" class="remind link" @click="remind">🔔 提醒我开饭（微信消息）</view>
        <!-- #endif -->
      </view>

      <view v-if="board?.hints?.length" class="card hints">
        <view class="card-title">温馨提示</view>
        <view v-for="h in board.hints" :key="h.type + (h.dishName || '') + (h.memberId || '') + (h.leftoverId || '')" class="hint" :class="hintClass(h.type)">
          {{ h.message }}
        </view>
      </view>

      <view v-if="unusedLeftovers.length" class="card">
        <view class="card-title">有剩菜可以先吃掉</view>
        <view v-for="l in unusedLeftovers" :key="l.id" class="muted leftover-line">
          {{ l.name }}<text v-if="l.amount"> {{ l.amount }}{{ l.unit || '' }}</text><text v-if="l.expiresOn"> · 大约保鲜到 {{ l.expiresOn }}</text>
        </view>
      </view>

      <view v-if="board?.planItems?.length && !board?.menu?.items?.length" class="card">
        <view class="card-title">本餐计划</view>
        <view class="muted" style="margin-bottom: 12rpx">{{ isChild ? '家里打算做这些，还没最终定下来。' : '模板预填的计划，掌厨确认时会带出来，还可以改。' }}</view>
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
          <text>{{ status === 'READY' ? (isChild ? '今天吃这些哟' : '今天吃这些') : '确认的菜单' }}</text>
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
            <view v-if="it.note" class="muted">{{ it.note }}</view>
          </view>
          <text v-if="it.source === 'WISH'" class="tag primary">家人点的</text>
        </view>
        <view v-if="board.menu.nutrition" class="muted note">
          {{ isChild ? kcalLabel(board.menu.nutrition.total?.kcal, true) : ('本餐大约 ' + kcalLabel(board.menu.nutrition.total?.kcal).replace('约 ','') + '（按菜谱用料估算，不是检测）') }}
        </view>
        <view v-if="!isChild && board.menu.nutrition?.excluded?.length" class="muted">未计入：{{ board.menu.nutrition.excluded.join('；') }}</view>
        <view v-if="board.menu.note" class="muted note">📝 {{ board.menu.note }}</view>
      </view>

      <view v-if="status === 'READY' && board?.menu?.id" class="card">
        <rate-meal :menu-id="board.menu.id" :ratings="board.ratings" :my-rating="board.myRating" @saved="load" />
      </view>

      <view v-if="board" class="card">
        <view class="card-title"><text>{{ isChild ? '我点的' : '我的意愿' }}</text></view>
        <view v-if="!myWishes.length" class="muted">还没点，{{ board.canEditWish ? '点一个吧' : '这餐已经不能点了' }}</view>
        <view v-for="w in myWishes" :key="w.id" class="wish row between">
          <view>
            <text v-if="w.notEatingHome">🚪 这餐不在家吃</text>
            <text v-else>{{ w.dishName || w.freeText }}</text>
            <text v-if="!w.notEatingHome" class="tag" :class="intensityClass(w.intensity)" style="margin-left: 12rpx">{{ INTENSITY_LABELS[w.intensity] }}</text>
            <text v-if="!w.notEatingHome && w.servings > 1" class="muted"> × {{ w.servings }}</text>
          </view>
          <text v-if="w.editable" class="link" @click="goWish(w.id)">修改</text>
        </view>
      </view>

      <view v-if="board" class="card">
        <view class="card-title"><text>全家想吃</text></view>
        <view v-if="!board.votes.length" class="muted">还没人点</view>
        <view v-for="v in board.votes" :key="v.name" class="vote">
          <view class="row between">
            <text class="name">{{ v.name }}</text>
            <view>
              <text v-if="v.wantCount" class="tag primary">很想吃 {{ v.wantCount }}</text>
              <text v-if="v.okCount" class="tag">都可以 {{ v.okCount }}</text>
              <text v-if="v.avoidCount" class="tag danger">别做 {{ v.avoidCount }}</text>
            </view>
          </view>
          <view v-if="v.wantBy.length" class="muted">{{ v.wantBy.join('、') }} 想吃</view>
        </view>
        <view class="members">
          <text
            v-for="m in board.members"
            :key="m.memberId"
            class="tag"
            :class="m.notEatingHome ? '' : m.submitted ? 'success' : 'warn'"
          >{{ m.displayName }}{{ m.notEatingHome ? ' 不在家' : m.submitted ? ' ✓' : ' 未点' }}</text>
        </view>
      </view>

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
import { dateLabel, deadlineLabel, GATHERING_STATUS_LABELS, INTENSITY_LABELS, kcalLabel, MEAL_LABELS, parseLocal, STATUS_LABELS } from '@/utils/format'
import { mediaSrc } from '@/utils/media'
import { requestDinnerReminder } from '@/utils/subscribe'
import SlotPicker from '@/components/SlotPicker.vue'
import NoFamily from '@/components/NoFamily.vue'
import RateMeal from '@/components/RateMeal.vue'

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
.cook-line { margin-top: 8rpx; }
.hint { padding: 12rpx 0; font-size: 26rpx; line-height: 1.5; border-bottom: 1rpx solid #f2f2f2; }
.hint:last-child { border-bottom: none; }
.hint.danger { color: #c0392b; }
.hint.warn { color: #b4610f; }
.leftover-line { padding: 8rpx 0; }
.hello { margin: 8rpx 4rpx 24rpx; }
.family { font-size: 40rpx; font-weight: 700; }
.big { font-size: 36rpx; font-weight: 600; margin-bottom: 6rpx; }
.stats { margin: 28rpx 0; }
.stat { flex: 1; text-align: center; background: $fm-bg; border-radius: 16rpx; padding: 16rpx 0; }
.num { font-size: 40rpx; font-weight: 700; color: $fm-primary; }
.actions .btn { flex: 1; margin: 0; }
.link { color: $fm-primary; font-size: 26rpx; font-weight: normal; }
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
.remind { margin-top: 20rpx; text-align: center; }
.child { font-size: 30rpx; }
.child .family { font-size: 48rpx; }
.child .big { font-size: 42rpx; }
.child .name { font-size: 34rpx; }
.child .btn { height: 96rpx; line-height: 96rpx; font-size: 32rpx; }
</style>
