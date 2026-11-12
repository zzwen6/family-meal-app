<template>
  <view class="container">
    <template v-if="session.ready && session.token && !currentFamily"><no-family /></template>
    <template v-else-if="isChild">
      <view class="card">
        <view class="card-title">我们吃过什么</view>
        <view class="muted">这是家里最近做过的饭，开饭以后可以去「今晚」给它打分。</view>
      </view>
      <view v-if="!childMeals.length" class="card muted">这一周还没有记下吃过的饭。</view>
      <view v-for="d in childMeals" :key="d.date + d.mealType" class="card">
        <view class="name">{{ dateLabel(d.date) }}{{ MEAL_LABELS[d.mealType] }}</view>
        <view class="muted">{{ d.items.map((i) => i.name).join('、') || '还没定菜' }}</view>
        <view v-if="d.averageScore" class="muted">大家觉得 {{ scoreLabel(d.averageScore) }}</view>
        <button v-if="d.status === 'READY' && d.menuId" class="btn ghost small" style="margin-top: 16rpx" @click="goTonight">去打分</button>
      </view>
      <button class="btn ghost block" @click="goStats">看更多</button>
    </template>
    <template v-else>
      <slot-picker @change="load" />
      <view v-if="loaded && !list" class="card empty">
        <view>{{ dateLabel(session.date) }}{{ MEAL_LABELS[session.mealType] }}还没有确认菜单</view>
        <view class="muted" style="margin-top: 12rpx">掌厨确认菜单后，这里会自动生成采购清单</view>
      </view>
      <template v-if="list">
        <view class="card">
          <view class="row between">
            <view>
              <view class="big">要买 {{ list.toBuyCount }} 样</view>
              <view class="muted">已买 {{ list.purchasedCount }} 样 · 用于：{{ dishNames }}</view>
            </view>
            <button class="btn ghost small" @click="share">复制清单</button>
          </view>
          <progress :percent="percent" active-color="#e6772e" background-color="#f3f0ec" stroke-width="6" class="progress" />
        </view>

        <view class="card">
          <view class="card-title">
            <text>要买的</text>
            <text v-if="canCook" class="link" @click="regenerate">按菜单重新生成</text>
          </view>
          <view v-if="!list.buyItems.length" class="muted">家里都有，不用买 🎉</view>
          <view v-for="it in list.buyItems" :key="it.id" class="item" :class="{ done: it.purchased }" @click="togglePurchased(it)">
            <view class="checkbox" :class="{ on: it.purchased }">{{ it.purchased ? '✓' : '' }}</view>
            <view class="flex1">
              <view class="name">{{ it.name }}</view>
              <view v-if="it.sourceDishes" class="muted">{{ it.sourceDishes }}</view>
              <view v-if="it.note" class="muted note">{{ it.note }}</view>
            </view>
            <text class="amount">{{ amountLabel(it.amount, it.unit) }}</text>
            <text v-if="canCook" class="op" @click.stop="setToBuy(it, false)">不买</text>
          </view>
          <view v-if="canCook" class="row gap add">
            <input class="input mini flex1" v-model="newItem.name" placeholder="加一样，比如：葱" maxlength="64" />
            <input class="input mini amt" v-model="newItem.amount" type="digit" placeholder="数量" />
            <input class="input mini unit" v-model="newItem.unit" placeholder="单位" maxlength="16" />
            <button class="btn small" @click="addItem">加</button>
          </view>
        </view>

        <view v-if="list.stapleItems.length" class="card">
          <view class="card-title"><text>不必买（常备 / 家里已有）（默认不买）</text></view>
          <view v-for="it in list.stapleItems" :key="it.id" class="item staple">
            <view class="flex1">
              <view class="name">{{ it.name }}</view>
              <view v-if="it.sourceDishes" class="muted">{{ it.sourceDishes }}</view>
              <view v-if="it.note" class="muted note">{{ it.note }}</view>
            </view>
            <text class="amount">{{ amountLabel(it.amount, it.unit) }}</text>
            <text v-if="canCook" class="op add-back" @click="setToBuy(it, true)">要买</text>
          </view>
        </view>
      </template>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { menuApi, shoppingApi, statsApi } from '@/api'
import { RequestError } from '@/api/request'
import type { DayMeal, MenuView, ShoppingItemView, ShoppingListView } from '@/api/types'
import { applyTabBar, canCook, currentFamily, ensureSession, isChild, session } from '@/store/session'
import { addDays, amountLabel, dateLabel, MEAL_LABELS, mondayOf, scoreLabel } from '@/utils/format'
import SlotPicker from '@/components/SlotPicker.vue'
import NoFamily from '@/components/NoFamily.vue'

const list = ref<ShoppingListView | null>(null)
const menu = ref<MenuView | null>(null)
const loaded = ref(false)
const childMeals = ref<DayMeal[]>([])
const newItem = reactive({ name: '', amount: '', unit: '' })

const percent = computed(() => (list.value && list.value.toBuyCount ? Math.round((list.value.purchasedCount / list.value.toBuyCount) * 100) : 0))
const dishNames = computed(() => menu.value?.items.map((i) => i.name).join('、') || '')

function goTonight() {
  uni.switchTab({ url: '/pages/index/index' })
}
function goStats() {
  uni.navigateTo({ url: '/pages/stats/index' })
}

async function load() {
  if (!(await ensureSession())) return
  const fid = currentFamily.value!.id
  applyTabBar()
  if (isChild.value) {
    try {
      const s = await statsApi.get(fid, mondayOf(), addDays(mondayOf(), 6))
      childMeals.value = s.days.filter((d) => !d.plannedOnly)
    } finally {
      uni.stopPullDownRefresh()
    }
    return
  }
  try {
    const board = await menuApi.board(fid, session.date, session.mealType)
    menu.value = board.menu || null
    list.value = null
    if (board.menu && (board.menu.status === 'CONFIRMED' || board.menu.status === 'READY')) {
      try {
        list.value = await shoppingApi.get(fid, board.menu.id)
      } catch (e) {
        if (!(e instanceof RequestError && e.status === 404)) throw e
      }
    }
    loaded.value = true
  } finally {
    uni.stopPullDownRefresh()
  }
}

function patchLocal(updated: ShoppingItemView) {
  if (!list.value) return
  const all = [...list.value.buyItems, ...list.value.stapleItems].map((i) => (i.id === updated.id ? updated : i))
  const buy = all.filter((i) => i.toBuy)
  list.value = {
    ...list.value,
    buyItems: buy,
    stapleItems: all.filter((i) => !i.toBuy),
    toBuyCount: buy.length,
    purchasedCount: buy.filter((i) => i.purchased).length,
  }
}

async function togglePurchased(it: ShoppingItemView) {
  patchLocal(await shoppingApi.update(currentFamily.value!.id, it.id, { purchased: !it.purchased }))
}

async function setToBuy(it: ShoppingItemView, toBuy: boolean) {
  patchLocal(await shoppingApi.update(currentFamily.value!.id, it.id, { toBuy }))
}

async function regenerate() {
  if (!menu.value) return
  list.value = await shoppingApi.regenerate(currentFamily.value!.id, menu.value.id)
  uni.showToast({ title: '已重新生成', icon: 'success' })
}

async function addItem() {
  const name = newItem.name.trim()
  if (!name || !menu.value) return
  const amount = newItem.amount ? Number(newItem.amount) : null
  await shoppingApi.add(currentFamily.value!.id, menu.value.id, { name, amount: Number.isFinite(amount) ? amount : null, unit: newItem.unit })
  Object.assign(newItem, { name: '', amount: '', unit: '' })
  load()
}

/** 复制成文本，方便发到家庭群 */
function share() {
  if (!list.value) return
  const lines = list.value.buyItems.map((i) => `${i.purchased ? '✅' : '⬜'} ${i.name} ${amountLabel(i.amount, i.unit)}`)
  const text = `【${dateLabel(session.date)}${MEAL_LABELS[session.mealType]}采购清单】\n${lines.join('\n')}${dishNames.value ? `\n菜单：${dishNames.value}` : ''}`
  uni.setClipboardData({ data: text, success: () => uni.showToast({ title: '已复制，可以发到家庭群', icon: 'none' }) })
}

onShow(load)
onPullDownRefresh(load)
</script>

<style lang="scss" scoped>
.big { font-size: 34rpx; font-weight: 600; margin-bottom: 6rpx; }
.btn.small { margin: 0; }
.progress { margin-top: 24rpx; }
.link { color: $fm-primary; font-size: 24rpx; font-weight: normal; }
.item { display: flex; align-items: center; gap: 20rpx; padding: 20rpx 0; border-bottom: 1rpx solid #f2f2f2; }
.item.done .name { text-decoration: line-through; color: #aaa; }
.checkbox { width: 40rpx; height: 40rpx; border-radius: 50%; border: 2rpx solid #ccc; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 24rpx; flex-shrink: 0; }
.checkbox.on { background: $fm-primary; border-color: $fm-primary; }
.flex1 { flex: 1; min-width: 0; }
.name { font-size: 30rpx; }
.note { color: #b4610f; }
.amount { font-size: 28rpx; color: #555; }
.op { font-size: 22rpx; color: #aaa; padding-left: 8rpx; }
.add-back { color: $fm-primary; }
.add { margin-top: 20rpx; }
.input.mini { height: 64rpx; font-size: 24rpx; margin: 0; }
.amt { width: 110rpx; }
.unit { width: 90rpx; }
</style>
