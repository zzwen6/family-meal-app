<template>
  <view v-if="dish" class="page">
    <image v-if="dish.coverUrl" :src="mediaSrc(dish.coverUrl)" class="hero" mode="aspectFill" />
    <view v-else class="hero ph">{{ dish.name.slice(0, 1) }}</view>
    <view class="container">
      <view class="card">
        <view class="title">{{ dish.name }}</view>
        <view class="muted meta">{{ dish.category }} · {{ DIFFICULTY_LABELS[dish.difficulty] }} · 约 {{ dish.durationMinutes }} 分钟 · {{ servings || dish.defaultServings }} 人份</view>
        <expand-section
          v-if="dish.nutrition || dish.description"
          title="营养与简介"
          :boxed="false"
          :hint="nutritionHint"
        >
          <view v-if="dish.nutrition" class="muted">
            {{ kcalLabel(dish.nutrition.total?.kcal) }}（整道） / {{ kcalLabel(dish.nutrition.perServing?.kcal) }}（每人份）
          </view>
          <view v-if="dish.nutrition?.excluded?.length" class="muted">未计入：{{ dish.nutrition.excluded.join('；') }}</view>
          <view v-if="dish.description" class="muted">{{ dish.description }}</view>
        </expand-section>
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
      </view>

      <expand-section v-if="dish.tips" title="小贴士" :boxed="true">
        <view class="tips">{{ dish.tips }}</view>
      </expand-section>

      <button v-if="canCook" class="btn block" :disabled="adding" @click="addToFamily">加入家庭菜谱</button>
      <view v-else class="muted center">加入家庭后，由掌厨把这道菜加入自家菜谱，就可以按口味微调了。</view>
    </view>
  </view>
  <view v-else class="empty">加载中…</view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { dishApi, publicDishApi } from '@/api'
import type { DishDetail } from '@/api/types'
import { canCook, currentFamily, ensureSession } from '@/store/session'
import { amountLabel, DIFFICULTY_LABELS, kcalLabel } from '@/utils/format'
import { mediaSrc } from '@/utils/media'
import ExpandSection from '@/components/ExpandSection.vue'

const dish = ref<DishDetail | null>(null)
const servings = ref(0)
const adding = ref(false)
let publicDishId = 0
const nutritionHint = computed(() => {
  const d = dish.value
  if (!d?.nutrition) return d?.description || ''
  return kcalLabel(d.nutrition.total?.kcal)
})

async function load() {
  dish.value = await publicDishApi.detail(publicDishId, servings.value || undefined)
  servings.value = dish.value.servings
  uni.setNavigationBarTitle({ title: dish.value.name })
}

function changeServings(n: number) {
  const v = Math.min(50, Math.max(1, servings.value + n))
  if (v === servings.value) return
  servings.value = v
  load()
}

async function addToFamily() {
  const fid = currentFamily.value?.id
  if (!fid) {
    uni.showToast({ title: '请先加入一个家庭', icon: 'none' })
    return
  }
  if (adding.value) return
  adding.value = true
  try {
    const res = await dishApi.copyFromPublic(fid, publicDishId)
    const id = res.dish.id
    if (res.alreadyExists) {
      uni.showModal({
        title: '已经在家庭菜谱里了',
        content: '之前已经加过这道菜，要打开家里的这份看看吗？改动不会影响到公共菜谱。',
        confirmText: '去看看',
        success: (r) => {
          if (r.confirm) {
            uni.redirectTo({ url: `/pages/dish/detail?id=${id}` })
          }
        },
      })
      return
    }
    uni.showToast({ title: '已加入，可以按家里口味改', icon: 'none' })
    setTimeout(() => {
      uni.redirectTo({ url: `/pages/dish/edit?id=${id}` })
    }, 400)
  } finally {
    adding.value = false
  }
}

onLoad(async (q) => {
  if (!(await ensureSession())) return
  publicDishId = Number(q?.id)
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
.meta { margin-top: 10rpx; }
.center { text-align: center; padding: 12rpx 0 24rpx; }
</style>
