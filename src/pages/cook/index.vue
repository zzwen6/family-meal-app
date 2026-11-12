<template>
  <view class="container">
    <slot-picker @change="load" />
    <view v-if="!canCook" class="card empty">只有掌厨或管理员可以使用工作台</view>
    <template v-else-if="board">
      <view class="card">
        <view class="row between">
          <view>
            <view class="big">{{ dateLabel(board.mealDate) }}{{ MEAL_LABELS[board.mealType] }}</view>
            <view class="muted">截止 {{ deadlineLabel(board.deadline) }} · 预计 {{ board.headcount }} 人在家吃</view>
          </view>
          <text class="tag" :class="statusTag">{{ STATUS_LABELS[status] }}</text>
        </view>
        <view v-if="notSubmitted.length" class="muted line">还没点：{{ notSubmitted.join('、') }}</view>
        <view v-if="away.length" class="muted line">不在家：{{ away.join('、') }}</view>
        <view v-if="allergyNotes.length" class="allergy">⚠️ {{ allergyNotes.join('；') }}</view>
      </view>

      <view class="card">
        <view class="card-title">家人想吃</view>
        <view v-if="!board.votes.length" class="muted">还没人点，可以直接从菜谱里加</view>
        <view v-for="v in board.votes" :key="v.name" class="vote">
          <view class="row between">
            <view class="flex1">
              <text class="name">{{ v.name }}</text>
              <text v-if="!v.dishId" class="tag" style="margin-left: 8rpx">菜谱外</text>
              <view class="muted">
                <text v-if="v.wantCount">{{ v.wantBy.join('、') }} 很想吃</text>
                <text v-if="v.okCount"> · {{ v.okCount }} 人都可以</text>
                <text v-if="v.avoidCount" class="danger"> · {{ v.avoidBy.join('、') }} 不想吃</text>
              </view>
            </view>
            <view class="row gap">
              <picker v-if="v.dishId" mode="selector" :range="dishNames" @change="(e: any) => substitute(v.dishId!, Number(e.detail.value))">
                <text class="link">换一道</text>
              </picker>
              <button class="btn small" :class="{ ghost: picked(v) }" @click="toggleVote(v)">{{ picked(v) ? '移出' : '采纳' }}</button>
            </view>
          </view>
        </view>
      </view>

      <view class="card">
        <view class="card-title">
          <text>{{ MEAL_LABELS[board.mealType] }}菜单（{{ picks.length }} 道）</text>
        </view>
        <view v-if="!picks.length" class="muted">采纳家人的意愿，或从菜谱里加菜</view>
        <view v-for="(p, i) in picks" :key="p.key" class="pick">
          <view class="row between">
            <view class="flex1">
              <text class="name">{{ p.name }}</text>
              <text class="tag" :class="p.source === 'WISH' ? 'primary' : p.source === 'SUBSTITUTE' ? 'warn' : ''" style="margin-left: 8rpx">{{ SOURCE_LABELS[p.source] }}</text>
              <view v-if="p.substituteForName" class="muted">替代：{{ p.substituteForName }}</view>
            </view>
            <view class="row stepper">
              <text class="step" @click="p.servings = Math.max(1, p.servings - 1)">−</text>
              <text class="val">{{ p.servings }}份</text>
              <text class="step" @click="p.servings = Math.min(100, p.servings + 1)">＋</text>
            </view>
            <text class="remove" @click="picks.splice(i, 1)">✕</text>
          </view>
          <input class="input mini" v-model="p.note" placeholder="备注（可选）" maxlength="255" />
        </view>
        <view class="row gap add-row">
          <picker mode="selector" :range="dishNames" @change="(e: any) => addFromLibrary(Number(e.detail.value))">
            <button class="btn ghost small">+ 从菜谱加</button>
          </picker>
          <input class="input mini flex1" v-model="customName" placeholder="或写个菜名" maxlength="64" @confirm="addCustom" />
          <button class="btn ghost small" @click="addCustom">加</button>
        </view>
        <textarea class="textarea" v-model="note" placeholder="给家人的话，比如「6 点半开饭」" maxlength="500" />
      </view>

      <view class="actions">
        <button v-if="status !== 'READY'" class="btn block" :loading="busy" @click="confirm">
          {{ status === 'CONFIRMED' ? '更新菜单并重新生成采购清单' : '确认菜单，生成采购清单' }}
        </button>
        <view class="row gap">
          <button v-if="status === 'CONFIRMED'" class="btn ghost flex1" @click="ready">🍚 开饭啦</button>
          <button v-if="status === 'CONFIRMED' || status === 'READY'" class="btn ghost flex1" @click="goShopping">采购清单</button>
          <button v-if="status === 'OPEN' && board.menu" class="btn ghost flex1" @click="lock">提前截止</button>
          <button v-if="status === 'LOCKED' || status === 'CONFIRMED'" class="btn ghost flex1" @click="reopen">重新开放点餐</button>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { dishApi, menuApi } from '@/api'
import type { BoardView, DishSummary, DishVote, MenuItemSource, MenuStatus } from '@/api/types'
import { canCook, currentFamily, ensureSession, session } from '@/store/session'
import { dateLabel, deadlineLabel, MEAL_LABELS, STATUS_LABELS } from '@/utils/format'
import SlotPicker from '@/components/SlotPicker.vue'

interface Pick {
  key: string
  dishId: number | null
  customName: string | null
  name: string
  servings: number
  source: MenuItemSource
  substituteForDishId: number | null
  substituteForName?: string
  note: string
}

const SOURCE_LABELS: Record<MenuItemSource, string> = { WISH: '家人点的', COOK_ADDED: '掌厨加的', SUBSTITUTE: '替代菜' }

const board = ref<BoardView | null>(null)
const dishes = ref<DishSummary[]>([])
const picks = ref<Pick[]>([])
const customName = ref('')
const note = ref('')
const busy = ref(false)
let seq = 0

const status = computed<MenuStatus>(() => board.value?.menu?.status || 'OPEN')
const statusTag = computed(() => ({ OPEN: 'primary', LOCKED: 'warn', CONFIRMED: 'success', READY: 'success' })[status.value])
const dishNames = computed(() => dishes.value.map((d) => d.name))
const notSubmitted = computed(() => board.value?.members.filter((m) => !m.submitted).map((m) => m.displayName) || [])
const away = computed(() => board.value?.members.filter((m) => m.notEatingHome).map((m) => m.displayName) || [])
const allergyNotes = computed(() =>
  (board.value?.members || [])
    .filter((m) => !m.notEatingHome && (m.allergies || m.dietaryNotes))
    .map((m) => `${m.displayName}：${[m.allergies && '过敏 ' + m.allergies, m.dietaryNotes].filter(Boolean).join('，')}`),
)

function key() {
  return `p${++seq}`
}

function picked(v: DishVote) {
  return picks.value.some((p) => (v.dishId ? p.dishId === v.dishId : p.customName === v.name))
}

function toggleVote(v: DishVote) {
  const idx = picks.value.findIndex((p) => (v.dishId ? p.dishId === v.dishId : p.customName === v.name))
  if (idx >= 0) {
    picks.value.splice(idx, 1)
    return
  }
  picks.value.push({
    key: key(),
    dishId: v.dishId ?? null,
    customName: v.dishId ? null : v.name,
    name: v.name,
    servings: board.value?.headcount || 1,
    source: 'WISH',
    substituteForDishId: null,
    note: '',
  })
}

function substitute(forDishId: number, index: number) {
  const d = dishes.value[index]
  if (!d) return
  const forName = board.value?.votes.find((v) => v.dishId === forDishId)?.name
  picks.value = picks.value.filter((p) => p.dishId !== forDishId)
  picks.value.push({
    key: key(), dishId: d.id, customName: null, name: d.name, servings: board.value?.headcount || d.defaultServings,
    source: 'SUBSTITUTE', substituteForDishId: forDishId, substituteForName: forName, note: '',
  })
}

function addFromLibrary(index: number) {
  const d = dishes.value[index]
  if (!d) return
  if (picks.value.some((p) => p.dishId === d.id)) {
    uni.showToast({ title: '已经在菜单里了', icon: 'none' })
    return
  }
  const wished = board.value?.votes.some((v) => v.dishId === d.id)
  picks.value.push({
    key: key(), dishId: d.id, customName: null, name: d.name, servings: board.value?.headcount || d.defaultServings,
    source: wished ? 'WISH' : 'COOK_ADDED', substituteForDishId: null, note: '',
  })
}

function addCustom() {
  const name = customName.value.trim()
  if (!name) return
  picks.value.push({
    key: key(), dishId: null, customName: name, name, servings: board.value?.headcount || 1,
    source: 'COOK_ADDED', substituteForDishId: null, note: '',
  })
  customName.value = ''
}

async function load() {
  if (!(await ensureSession())) return
  if (!canCook.value) return
  const fid = currentFamily.value!.id
  try {
    const [b, list] = await Promise.all([menuApi.board(fid, session.date, session.mealType), dishApi.list(fid)])
    board.value = b
    dishes.value = list
    note.value = b.menu?.note || ''
    if (b.menu?.items.length) {
      picks.value = b.menu.items.map((it) => ({
        key: key(), dishId: it.dishId ?? null, customName: it.dishId ? null : it.name, name: it.name,
        servings: it.servings, source: it.source, substituteForDishId: it.substituteForDishId ?? null,
        substituteForName: it.substituteForName, note: it.note || '',
      }))
    } else {
      // 默认采纳「很想吃」且没人反对的菜
      picks.value = []
      b.votes.filter((v) => v.wantCount > 0 && v.avoidCount === 0).forEach((v) => toggleVote(v))
    }
  } finally {
    uni.stopPullDownRefresh()
  }
}

async function confirm() {
  if (!picks.value.length) {
    uni.showToast({ title: '至少选一道菜', icon: 'none' })
    return
  }
  busy.value = true
  try {
    await menuApi.confirm(currentFamily.value!.id, {
      mealDate: session.date,
      mealType: session.mealType,
      note: note.value,
      items: picks.value.map((p) => ({
        dishId: p.dishId, customName: p.customName, servings: p.servings, source: p.source,
        substituteForDishId: p.substituteForDishId, note: p.note,
      })),
    })
    uni.showToast({ title: '菜单已确认', icon: 'success' })
    await load()
  } finally {
    busy.value = false
  }
}

async function ready() {
  await menuApi.ready(currentFamily.value!.id, board.value!.menu!.id)
  uni.showToast({ title: '已通知家人开饭', icon: 'success' })
  load()
}

async function lock() {
  await menuApi.lock(currentFamily.value!.id, board.value!.menu!.id)
  load()
}

function reopen() {
  uni.showModal({
    title: '重新开放点餐',
    content: '家人可以再改 1 小时，已确认的菜单需要重新确认。',
    success: async (r) => {
      if (!r.confirm) return
      await menuApi.reopen(currentFamily.value!.id, session.date, session.mealType)
      load()
    },
  })
}

function goShopping() {
  uni.switchTab({ url: '/pages/shopping/index' })
}

onShow(load)
onPullDownRefresh(load)
</script>

<style lang="scss" scoped>
.big { font-size: 34rpx; font-weight: 600; margin-bottom: 6rpx; }
.line { margin-top: 12rpx; }
.allergy { margin-top: 16rpx; background: #fdecec; color: #c0392b; border-radius: 12rpx; padding: 14rpx 18rpx; font-size: 24rpx; }
.vote, .pick { padding: 18rpx 0; border-bottom: 1rpx solid #f2f2f2; }
.flex1 { flex: 1; min-width: 0; }
.name { font-size: 30rpx; font-weight: 500; }
.danger { color: #d64545; }
.link { color: $fm-primary; font-size: 26rpx; }
.btn.small { margin: 0; }
.stepper { background: #f3f0ec; border-radius: 999rpx; margin-left: 12rpx; }
.step { width: 52rpx; text-align: center; font-size: 30rpx; color: $fm-primary; line-height: 52rpx; }
.val { font-size: 24rpx; padding: 0 4rpx; }
.remove { color: #bbb; padding: 0 0 0 20rpx; font-size: 28rpx; }
.input.mini { height: 64rpx; font-size: 24rpx; margin: 12rpx 0 0; }
.add-row { margin-top: 20rpx; }
.add-row .input.mini { margin: 0; }
.textarea { width: 100%; box-sizing: border-box; background: #f7f7f7; border-radius: 12rpx; padding: 20rpx; height: 140rpx; font-size: 26rpx; margin-top: 20rpx; }
.actions .btn { margin-bottom: 20rpx; }
.actions .row .btn { margin: 0 0 20rpx; }
</style>
