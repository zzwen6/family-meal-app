<template>
  <view class="slot-picker">
    <scroll-view scroll-x class="dates" :show-scrollbar="false">
      <view
        v-for="d in dates"
        :key="d"
        class="date"
        :class="{ active: d === session.date }"
        @click="pickDate(d)"
      >{{ dateLabel(d) }}</view>
    </scroll-view>
    <view class="seg">
      <view
        v-for="m in MEAL_TYPES"
        :key="m"
        class="seg-item"
        :class="{ active: m === session.mealType }"
        @click="pickMeal(m)"
      >{{ MEAL_LABELS[m] }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { session } from '@/store/session'
import type { MealType } from '@/api/types'
import { addDays, dateLabel, MEAL_LABELS, MEAL_TYPES, today } from '@/utils/format'

const emit = defineEmits<{ (e: 'change'): void }>()

const dates = computed(() => Array.from({ length: 7 }, (_, i) => addDays(today(), i)))

function pickDate(d: string) {
  if (d === session.date) return
  session.date = d
  emit('change')
}
function pickMeal(m: MealType) {
  if (m === session.mealType) return
  session.mealType = m
  emit('change')
}
</script>

<style lang="scss" scoped>
.slot-picker { margin-bottom: 24rpx; }
.dates { white-space: nowrap; margin-bottom: 16rpx; }
.date {
  display: inline-block;
  padding: 10rpx 26rpx;
  margin-right: 12rpx;
  border-radius: 999rpx;
  background: #fff;
  font-size: 26rpx;
  color: #555;
}
.date.active { background: $fm-primary; color: #fff; }
</style>
