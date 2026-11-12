<template>
  <view class="container">
    <template v-if="session.ready && session.token && !currentFamily"><no-family /></template>
    <template v-else>
      <view class="card">
        <view class="card-title">周菜单模板</view>
        <view class="muted">把一周各天各餐的菜存下来，应用到某周作为计划。掌厨确认时会带出这些菜，还可以改。已确认或已开饭的餐次不会被覆盖。</view>
        <view class="row gap" style="margin-top: 20rpx">
          <button v-if="canCook" class="btn small flex1" @click="goEdit()">新建模板</button>
          <button v-if="canCook" class="btn ghost small flex1" @click="fromLast">把上周另存为模板</button>
        </view>
      </view>

      <view v-if="!templates.length" class="card muted">还没有模板。</view>
      <view v-for="t in templates" :key="t.id" class="card">
        <view class="row between">
          <view class="name">{{ t.name }}</view>
          <text class="muted">{{ t.items.length }} 道</text>
        </view>
        <view class="muted preview">{{ preview(t) }}</view>
        <view class="row gap" style="margin-top: 16rpx">
          <button v-if="canCook" class="btn small flex1" @click="apply(t.id)">应用到某周</button>
          <button v-if="canCook" class="btn ghost small flex1" @click="goEdit(t.id)">编辑</button>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { templateApi } from '@/api'
import type { TemplateView } from '@/api/types'
import { canCook, currentFamily, ensureSession, session } from '@/store/session'
import { addDays, DOW_LABELS, MEAL_LABELS, mondayOf, today } from '@/utils/format'
import NoFamily from '@/components/NoFamily.vue'

const templates = ref<TemplateView[]>([])

async function load() {
  if (!(await ensureSession())) return
  try {
    templates.value = await templateApi.list(currentFamily.value!.id)
  } finally {
    uni.stopPullDownRefresh()
  }
}

function preview(t: TemplateView) {
  return t.items.slice(0, 6).map((i) => `${DOW_LABELS[i.dayOfWeek]}${MEAL_LABELS[i.mealType]} ${i.name}`).join(' · ')
    + (t.items.length > 6 ? '…' : '')
}

function goEdit(id?: number) {
  uni.navigateTo({ url: id ? `/pages/template/edit?id=${id}` : '/pages/template/edit' })
}

function fromLast() {
  const start = mondayOf(addDays(today(), -7))
  uni.showModal({
    title: '把上周另存为模板？',
    content: `会把 ${start} 那一周已确认的日常菜单存成模板（不含聚餐）。`,
    success: async (r) => {
      if (!r.confirm) return
      await templateApi.fromWeek(currentFamily.value!.id, { weekStart: start, name: '上周家常' })
      uni.showToast({ title: '已保存', icon: 'success' })
      load()
    },
  })
}

function apply(id: number) {
  const next = mondayOf(addDays(today(), 7))
  const thisMon = mondayOf()
  uni.showActionSheet({
    itemList: [`应用到本周（${thisMon} 起，不覆盖已有）`, `应用到下周（${next} 起）`, '应用到下周并覆盖已有计划'],
    success: async (r) => {
      const weekStart = r.tapIndex === 0 ? thisMon : next
      const overwrite = r.tapIndex === 2
      const res = await templateApi.apply(currentFamily.value!.id, id, { weekStart, overwrite })
      uni.showModal({
        title: '已应用',
        content: `写入 ${res.appliedSlots} 个餐次、${res.itemsWritten} 道菜。跳过已确认 ${res.skippedConfirmed}、已有计划 ${res.skippedExistingPlan}。`,
        showCancel: false,
      })
    },
  })
}

onShow(load)
onPullDownRefresh(load)
</script>

<style lang="scss" scoped>
.name { font-size: 32rpx; font-weight: 600; }
.preview { margin-top: 8rpx; line-height: 1.5; }
.flex1 { flex: 1; }
.btn.small { margin: 0; }
</style>
