<template>
  <view v-if="menuId" class="rate-box">
    <view class="card-title">{{ title }}</view>
    <view class="muted" style="margin-bottom: 16rpx">开饭以后给这餐打个分，1 到 5 颗星，写一句也可以。</view>
    <view class="row stars">
      <text
        v-for="n in 5"
        :key="n"
        class="star"
        :class="{ on: n <= score }"
        @click="score = n"
      >{{ n <= score ? '★' : '☆' }}</text>
    </view>
    <input class="input" v-model="comment" placeholder="想说一句（可以不写）" maxlength="255" />
    <button class="btn block small-btn" :loading="saving" @click="submit">{{ current ? '改一下评价' : '提交评价' }}</button>
    <view v-if="others.length" class="others">
      <view v-for="r in others" :key="r.id" class="muted line">
        {{ r.memberName }}：{{ r.score }} 分<text v-if="r.comment"> · {{ r.comment }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ratingApi } from '@/api'
import type { RatingView } from '@/api/types'
import { currentFamily } from '@/store/session'

const props = defineProps<{
  menuId?: number | null
  ratings?: RatingView[]
  myRating?: RatingView | null
  memberId?: number | null
  title?: string
}>()
const emit = defineEmits<{ (e: 'saved'): void }>()

const score = ref(props.myRating?.score || 5)
const comment = ref(props.myRating?.comment || '')
const saving = ref(false)
const title = computed(() => props.title || '这顿怎么样？')
const current = computed(() => {
  if (props.memberId) return (props.ratings || []).find((r) => r.memberId === props.memberId) || null
  return props.myRating || null
})
const others = computed(() => (props.ratings || []).filter((r) => r.memberId !== (props.memberId || currentFamily.value?.myMemberId)))

watch(
  () => current.value,
  (v) => {
    if (v) {
      score.value = v.score
      comment.value = v.comment || ''
    }
  },
  { immediate: true },
)

async function submit() {
  if (!currentFamily.value || !props.menuId) return
  saving.value = true
  try {
    await ratingApi.upsert(currentFamily.value.id, props.menuId, {
      score: score.value,
      comment: comment.value.trim() || undefined,
      memberId: props.memberId || undefined,
    })
    uni.showToast({ title: '谢谢你的评价', icon: 'success' })
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.stars { gap: 12rpx; margin-bottom: 16rpx; justify-content: center; }
.star { font-size: 56rpx; color: #ddd; }
.star.on { color: #e6772e; }
.small-btn { margin-top: 8rpx; }
.others { margin-top: 20rpx; }
.line { padding: 8rpx 0; }
</style>
