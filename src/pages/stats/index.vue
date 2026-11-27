<template>
  <view class="container" :class="{ child: isChild }">
    <template v-if="session.ready && session.token && !currentFamily"><no-family /></template>
    <template v-else>
      <view class="card row between wrap">
        <view>
          <view class="card-title" style="margin: 0">{{ isChild ? '我们吃过什么' : '本周与统计' }}</view>
          <view class="muted">{{ data?.from }} 至 {{ data?.to }}</view>
        </view>
        <view class="row gap">
          <text class="link" @click="shift(-7)">上一周</text>
          <text class="link" @click="goThis">本周</text>
          <text class="link" @click="shift(7)">下一周</text>
        </view>
      </view>

      <view v-if="!isChild" class="seg" style="margin-bottom: 20rpx">
        <view class="seg-item" :class="{ active: range === 'week' }" @click="useWeek">本周</view>
        <view class="seg-item" :class="{ active: range === '30' }" @click="use30">最近 30 天</view>
      </view>

      <view v-if="meals.length" class="card">
        <view class="card-title">{{ isChild ? '这几天吃了这些' : '每天吃了什么' }}</view>
        <view v-for="d in meals" :key="d.date + d.mealType" class="day">
          <view class="row between">
            <text class="name">{{ dateLabel(d.date) }}{{ MEAL_LABELS[d.mealType] }}</text>
            <text class="tag" :class="d.plannedOnly ? '' : 'success'">{{ d.plannedOnly ? '计划' : (d.status === 'READY' ? '开过饭' : '已定菜单') }}</text>
          </view>
          <view class="muted">
            <text v-if="d.items.length">{{ d.items.map((i) => i.name).join('、') }}</text>
            <text v-else>还没定菜</text>
          </view>
          <view class="muted">
            <text v-if="d.assignedMemberName">安排：{{ d.assignedMemberName }}</text>
            <text v-if="d.confirmedByName"> · 实际掌厨：{{ d.confirmedByName }}</text>
            <text v-if="d.averageScore"> · 评分 {{ scoreLabel(d.averageScore) }}（{{ d.ratingCount }} 人）</text>
          </view>
        </view>
      </view>
      <view v-else class="card muted">这一段还没有记下吃过的饭。</view>

      <view v-if="!isChild && data" class="card">
        <view class="card-title">常做的菜</view>
        <view v-if="!data.frequentDishes.length" class="muted">还没有已确认的菜单</view>
        <view v-for="d in data.frequentDishes" :key="d.name" class="row between line">
          <view>
            <view class="name">{{ d.name }}</view>
            <view class="muted">做了 {{ d.times }} 次 · 最近 {{ d.lastCooked }}</view>
          </view>
          <text class="tag primary">{{ scoreLabel(d.averageScore) }}</text>
        </view>
      </view>

      <view v-if="!isChild && data" class="card">
        <view class="card-title">常点的菜</view>
        <view v-if="!data.frequentWishes.length" class="muted">还没有「很想吃」的记录</view>
        <view v-for="d in data.frequentWishes" :key="'w' + d.name" class="line">
          <view class="row between">
            <text class="name">{{ d.name }}</text>
            <text class="muted">想吃 {{ d.wantCount }} 次，选中 {{ pct(d.selectedRate) }}</text>
          </view>
          <view class="bar"><view class="fill" :style="{ width: pct(d.selectedRate) }" /></view>
        </view>
      </view>

      <view v-if="!isChild && data" class="card">
        <view class="card-title">心愿公平和掌厨次数</view>
        <view v-for="m in data.fairness" :key="m.memberId" class="line">
          <view class="row between">
            <text class="name">{{ m.displayName }}</text>
            <text class="muted">想吃兑现 {{ m.fulfilledCount }}/{{ m.wantCount }}（{{ pct(m.fulfillmentRate) }}）</text>
          </view>
          <view class="muted">安排掌厨 {{ m.assignedCookCount }} 次 · 实际确认 {{ m.confirmedCookCount }} 次</view>
        </view>
      </view>

      <view v-if="!isChild && data?.fatigue?.length" class="card">
        <view class="card-title">可能吃腻了</view>
        <view v-for="d in data.fatigue" :key="'f' + d.name" class="muted line">
          {{ d.name }} 在 {{ d.windowDays }} 天里做了 {{ d.times }} 次（阈值 {{ d.threshold }}）
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { statsApi } from '@/api'
import type { DayMeal, StatsView } from '@/api/types'
import { currentFamily, ensureSession, isChild, session } from '@/store/session'
import { addDays, dateLabel, MEAL_LABELS, mondayOf, pct, scoreLabel, today } from '@/utils/format'
import NoFamily from '@/components/NoFamily.vue'

const data = ref<StatsView | null>(null)
const range = ref<'week' | '30'>('week')
const weekStart = ref(mondayOf())

const meals = computed<DayMeal[]>(() => data.value?.days || [])

async function load() {
  if (!(await ensureSession())) return
  try {
    if (range.value === '30') {
      data.value = await statsApi.get(currentFamily.value!.id, addDays(today(), -29), today())
    } else {
      data.value = await statsApi.get(currentFamily.value!.id, weekStart.value, addDays(weekStart.value, 6))
    }
  } finally {
    uni.stopPullDownRefresh()
  }
}
function useWeek() {
  range.value = 'week'
  weekStart.value = mondayOf()
  load()
}
function use30() {
  range.value = '30'
  load()
}
function goThis() {
  range.value = 'week'
  weekStart.value = mondayOf()
  load()
}
function shift(days: number) {
  range.value = 'week'
  weekStart.value = addDays(weekStart.value, days)
  load()
}

onShow(load)
onPullDownRefresh(load)
</script>

<style lang="scss" scoped>
.child .name, .child .card-title { font-size: 34rpx; }
.day, .line { padding: 16rpx 0; border-bottom: 1rpx solid #f2f2f2; }
.day:last-child, .line:last-child { border-bottom: none; }
.name { font-weight: 600; }
.link { color: $fm-primary; font-size: 24rpx; }
.bar { height: 12rpx; background: #f3f0ec; border-radius: 999rpx; margin-top: 10rpx; overflow: hidden; }
.fill { height: 100%; background: $fm-primary; border-radius: 999rpx; }
</style>
