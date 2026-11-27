<template>
  <view class="container">
    <view class="card intro">
      <view class="card-title">临时聚餐</view>
      <button class="btn block" style="margin-top: 16rpx" @click="create">发起一场聚餐</button>
    </view>

    <view class="seg tabs">
      <view class="seg-item" :class="{ active: tab === 'active' }" @click="tab = 'active'">进行中 {{ active.length || '' }}</view>
      <view class="seg-item" :class="{ active: tab === 'history' }" @click="tab = 'history'">历史 {{ history.length || '' }}</view>
    </view>

    <view v-if="loading && !list.length" class="empty">加载中…</view>
    <view v-else-if="!shown.length" class="empty">{{ tab === 'active' ? '还没有进行中的聚餐' : '还没有散场的聚餐' }}</view>
    <view v-for="g in shown" :key="g.id" class="card item" @click="open(g.id)">
      <view class="row between">
        <view class="title">{{ g.title }}</view>
        <text class="tag" :class="statusClass(g)">{{ g.readyAt && g.status !== 'CLOSED' ? '开饭啦' : GATHERING_STATUS_LABELS[g.status] }}</text>
      </view>
      <view class="muted line">{{ dateLabel(g.mealDate) }}{{ MEAL_LABELS[g.mealType] }}<text v-if="g.location"> · {{ g.location }}</text></view>
      <view class="row between line">
        <view>
          <text class="tag primary">{{ MODE_LABELS[g.mode] }}</text>
          <text class="tag">{{ g.host ? '我发起' : g.hostName + ' 发起' }}</text>
          <text v-if="!g.host" class="tag" :class="g.myRsvp === 'YES' ? 'success' : g.myRsvp === 'NO' ? '' : 'warn'">我：{{ RSVP_LABELS[g.myRsvp] }}</text>
        </view>
        <text class="muted">{{ g.headcount }} 人来</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { gatheringApi } from '@/api'
import type { GatheringSummary } from '@/api/types'
import { ensureSession } from '@/store/session'
import { dateLabel, GATHERING_STATUS_LABELS, MEAL_LABELS, MODE_LABELS, RSVP_LABELS } from '@/utils/format'

const list = ref<GatheringSummary[]>([])
const tab = ref<'active' | 'history'>('active')
const loading = ref(false)

const active = computed(() => list.value.filter((g) => g.status !== 'CLOSED').slice().reverse())
const history = computed(() => list.value.filter((g) => g.status === 'CLOSED'))
const shown = computed(() => (tab.value === 'active' ? active.value : history.value))

function statusClass(g: GatheringSummary) {
  if (g.status === 'CLOSED') return ''
  if (g.readyAt || g.status === 'CONFIRMED') return 'success'
  return 'primary'
}

async function load() {
  if (!(await ensureSession({ needFamily: false, redirect: '/pages/gathering/list' }))) return
  loading.value = true
  try {
    list.value = await gatheringApi.mine()
  } finally {
    loading.value = false
    uni.stopPullDownRefresh()
  }
}

function create() {
  uni.navigateTo({ url: '/pages/gathering/edit' })
}
function open(id: number) {
  uni.navigateTo({ url: `/pages/gathering/detail?id=${id}` })
}

onShow(load)
onPullDownRefresh(load)
</script>

<style lang="scss" scoped>
.intro .muted { line-height: 1.6; }
.tabs { margin-bottom: 24rpx; }
.item .title { font-size: 32rpx; font-weight: 600; }
.line { margin-top: 12rpx; }
</style>
