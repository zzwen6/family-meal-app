<template>
  <view v-if="dish" class="page">
    <image v-if="dish.coverUrl" :src="mediaSrc(dish.coverUrl)" class="hero" mode="aspectFill" />
    <view v-else class="hero ph">{{ dish.name.slice(0, 1) }}</view>
    <view class="container">
      <view class="card">
        <view class="title">{{ dish.name }}</view>
        <view class="row wrap" style="margin: 12rpx 0">
          <text class="tag primary">{{ dish.category }}</text>
          <text class="tag">{{ DIFFICULTY_LABELS[dish.difficulty] }}</text>
          <text class="tag">约 {{ dish.durationMinutes }} 分钟</text>
        </view>
        <view v-if="dish.nutrition" class="muted nutri">
          {{ isChild ? kcalLabel(dish.nutrition.total?.kcal, true) : (kcalLabel(dish.nutrition.total?.kcal) + '（整道） / ' + kcalLabel(dish.nutrition.perServing?.kcal) + '（每人份）') }}
          <text v-if="dish.nutrition.override"> · 掌厨填写</text>
          <text v-else> · 按用料估算</text>
        </view>
        <view v-if="!isChild && dish.nutrition?.excluded?.length" class="muted">未计入：{{ dish.nutrition.excluded.join('；') }}</view>
        <view v-if="dish.description" class="muted">{{ dish.description }}</view>
      </view>

      <view class="card">
        <view class="card-title">
          <text>食材</text>
          <view class="row stepper">
            <text class="step" @click="changeServings(-1)">−</text>
            <text class="val">{{ servings }} 人份</text>
            <text class="step" @click="changeServings(1)">＋</text>
          </view>
        </view>
        <view class="sub">主料</view>
        <view v-for="i in dish.ingredients" :key="i.id" class="ing row between">
          <text>{{ i.name }}<text v-if="i.note" class="muted">（{{ i.note }}）</text></text>
          <text>{{ amountLabel(i.amount, i.unit) }}</text>
        </view>
        <view v-if="!dish.ingredients.length" class="muted">未填写</view>
        <view class="sub" style="margin-top: 20rpx">配料与调味</view>
        <view v-for="i in dish.seasonings" :key="i.id" class="ing row between">
          <text>{{ i.name }}<text v-if="i.staple" class="tag" style="margin-left: 10rpx">家里常备</text></text>
          <text>{{ amountLabel(i.amount, i.unit) }}</text>
        </view>
        <view v-if="!dish.seasonings.length" class="muted">未填写</view>
      </view>

      <view class="card">
        <view class="card-title">做法</view>
        <view v-for="s in dish.steps" :key="s.stepNo" class="step-row">
          <view class="no">{{ s.stepNo }}</view>
          <view class="flex1">
            <view>{{ s.content }}</view>
            <view v-if="s.durationMinutes" class="muted">⏱ {{ s.durationMinutes }} 分钟</view>
            <image v-if="s.imageUrl" :src="mediaSrc(s.imageUrl)" class="step-img" mode="widthFix" />
            <!-- #ifdef MP-WEIXIN -->
            <video v-if="s.videoUrl" :src="mediaSrc(s.videoUrl)" :poster="mediaSrc(s.videoCoverUrl)" class="step-video" object-fit="contain" />
            <!-- #endif -->
            <!-- #ifdef H5 -->
            <video v-if="s.videoUrl" :src="mediaSrc(s.videoUrl)" :poster="mediaSrc(s.videoCoverUrl)" class="step-video" controls />
            <!-- #endif -->
          </view>
        </view>
        <view v-if="!dish.steps.length" class="muted">还没写做法</view>
        <view v-if="dish.tips" class="tips">💡 {{ dish.tips }}</view>
      </view>

      <button v-if="canCook" class="btn ghost block" style="margin-bottom: 16rpx" @click="edit">编辑菜谱</button>
      <button class="btn block" @click="want">我想吃这个</button>
    </view>
  </view>
  <view v-else class="empty">加载中…</view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { dishApi } from '@/api'
import type { DishDetail } from '@/api/types'
import { canCook, currentFamily, ensureSession, isChild } from '@/store/session'
import { amountLabel, DIFFICULTY_LABELS, kcalLabel } from '@/utils/format'
import { mediaSrc } from '@/utils/media'

const dish = ref<DishDetail | null>(null)
const servings = ref(0)
let dishId = 0

async function load() {
  dish.value = await dishApi.detail(currentFamily.value!.id, dishId, servings.value || undefined)
  servings.value = dish.value.servings
  uni.setNavigationBarTitle({ title: dish.value.name })
}

function changeServings(n: number) {
  const v = Math.min(50, Math.max(1, servings.value + n))
  if (v === servings.value) return
  servings.value = v
  load()
}

function want() {
  uni.navigateTo({ url: `/pages/wish/edit?dishId=${dishId}` })
}
function edit() {
  uni.navigateTo({ url: `/pages/dish/edit?id=${dishId}` })
}

onLoad(async (q) => {
  if (!(await ensureSession())) return
  dishId = Number(q?.id)
  if (q?.servings) servings.value = Number(q.servings)
  load()
})
</script>

<style lang="scss" scoped>
.hero { width: 100%; height: 420rpx; display: block; }
.ph { background: $fm-primary-light; color: $fm-primary; display: flex; align-items: center; justify-content: center; font-size: 120rpx; font-weight: 700; }
.title { font-size: 40rpx; font-weight: 700; }
.sub { font-size: 24rpx; color: $fm-muted; margin-bottom: 8rpx; }
.ing { padding: 14rpx 0; border-bottom: 1rpx dashed #eee; }
.stepper { background: #f3f0ec; border-radius: 999rpx; font-weight: normal; }
.step { width: 56rpx; text-align: center; font-size: 32rpx; color: $fm-primary; line-height: 52rpx; }
.val { padding: 0 8rpx; font-size: 24rpx; }
.step-row { display: flex; gap: 20rpx; margin-bottom: 24rpx; line-height: 1.6; }
.no { width: 44rpx; height: 44rpx; border-radius: 50%; background: $fm-primary; color: #fff; font-size: 24rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4rpx; }
.flex1 { flex: 1; }
.tips { background: #fff8e6; padding: 20rpx; border-radius: 12rpx; font-size: 26rpx; color: #8a6d1f; }
.step-img { width: 100%; border-radius: 12rpx; margin-top: 12rpx; }
.step-video { width: 100%; height: 360rpx; margin-top: 12rpx; }
.nutri { margin-top: 8rpx; }
</style>
