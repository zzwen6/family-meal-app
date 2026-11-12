<template>
  <view class="container">
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
              <text v-if="status === 'OPEN'">{{ countdown }}截止（{{ deadlineLabel(board.deadline) }}）</text>
              <text v-else-if="status === 'LOCKED'">点餐已截止，等掌厨定菜单</text>
              <text v-else-if="status === 'CONFIRMED'">菜单已定 · {{ board.menu?.confirmedByName || '掌厨' }}</text>
              <text v-else>开饭啦，快去吃！</text>
            </view>
          </view>
          <text class="tag" :class="statusClass">{{ STATUS_LABELS[status] }}</text>
        </view>
        <view class="row gap stats">
          <view class="stat"><view class="num">{{ board.headcount }}</view><view class="muted">在家吃</view></view>
          <view class="stat"><view class="num">{{ submittedCount }}</view><view class="muted">已点</view></view>
          <view class="stat"><view class="num">{{ board.votes.length }}</view><view class="muted">道想吃</view></view>
        </view>
        <view class="row gap actions">
          <button class="btn" :disabled="!board.canEditWish" @click="goWish()">我想吃…</button>
          <button v-if="canCook" class="btn ghost" @click="goCook">掌厨工作台</button>
        </view>
        <!-- #ifdef MP-WEIXIN -->
        <view v-if="status !== 'READY'" class="remind link" @click="remind">🔔 提醒我开饭（微信消息）</view>
        <!-- #endif -->
      </view>

      <view v-if="board?.menu?.items?.length" class="card">
        <view class="card-title">
          <text>{{ status === 'READY' ? '今天吃这些' : '确认的菜单' }}</text>
          <text class="link" @click="goShopping">采购清单 ›</text>
        </view>
        <view v-for="it in board.menu.items" :key="it.id" class="menu-item" @click="it.dishId && goDish(it.dishId, it.servings)">
          <image v-if="it.coverUrl" :src="it.coverUrl" class="cover" mode="aspectFill" />
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
        <view v-if="board.menu.note" class="muted note">📝 {{ board.menu.note }}</view>
      </view>

      <view v-if="board" class="card">
        <view class="card-title"><text>我的意愿</text></view>
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
import type { BoardView, FamilyGatheringSlot, Intensity, MenuStatus, NotificationView } from '@/api/types'
import { canCook, currentFamily, ensureSession, session } from '@/store/session'
import { dateLabel, deadlineLabel, GATHERING_STATUS_LABELS, INTENSITY_LABELS, MEAL_LABELS, parseLocal, STATUS_LABELS } from '@/utils/format'
import { requestDinnerReminder } from '@/utils/subscribe'
import SlotPicker from '@/components/SlotPicker.vue'
import NoFamily from '@/components/NoFamily.vue'

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
</style>
