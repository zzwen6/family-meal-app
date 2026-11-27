<template>
  <view class="container">
    <view v-if="invalid" class="card center">
      <view class="big">邀请链接无效</view>
      <view class="muted">可能复制不完整，请让发起人重新发一次。</view>
      <button class="btn ghost block" style="margin-top: 32rpx" @click="goHome">回首页</button>
    </view>

    <template v-else-if="p">
      <view class="card hero">
        <view class="emoji">🎉</view>
        <view class="muted">{{ p.hostName }} 邀请你参加</view>
        <view class="big">{{ p.title }}</view>
        <view class="muted line">{{ dateLabel(p.mealDate) }}{{ MEAL_LABELS[p.mealType] }}<text v-if="p.location"> · 📍{{ p.location }}</text></view>
        <view class="line">
          <text class="tag primary">{{ MODE_LABELS[p.mode] }}</text>
          <text v-if="p.deadlineAt" class="tag">{{ deadlineLabel(p.deadlineAt) }} 截止点菜</text>
        </view>
      </view>

      <view v-if="!p.joinable" class="card center">
        <view>{{ p.reason || '这场聚餐已经不能加入了' }}</view>
        <button v-if="p.joined && p.gatheringId" class="btn ghost block" style="margin-top: 24rpx" @click="goDetail(p.gatheringId)">查看这场聚餐</button>
      </view>

      <view v-else-if="p.joined && p.gatheringId" class="card center">
        <view>你已经在这场聚餐里了</view>
        <button class="btn block" style="margin-top: 24rpx" @click="goDetail(p.gatheringId)">进入聚餐</button>
      </view>

      <view v-else class="card">
        <view class="card-title">应邀</view>
        <view class="seg">
          <view v-for="r in rsvps" :key="r" class="seg-item" :class="{ active: form.rsvp === r }" @click="form.rsvp = r">{{ RSVP_LABELS[r] }}</view>
        </view>
        <view class="row between line">
          <text>一共来几个人（含自己）</text>
          <view class="row stepper">
            <text class="step" @click="form.headcount = Math.max(1, form.headcount - 1)">−</text>
            <text class="val">{{ form.headcount }}</text>
            <text class="step" @click="form.headcount = Math.min(20, form.headcount + 1)">＋</text>
          </view>
        </view>
        <input class="input line" v-model="form.guestName" placeholder="怎么称呼你" maxlength="64" />
        <input class="input" v-model="form.dietaryNotes" placeholder="忌口 / 过敏（可选，只有发起人能看到）" maxlength="255" />
        <button class="btn block" :loading="busy" @click="join">加入聚餐</button>
      </view>
    </template>
    <view v-else class="empty">加载中…</view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { gatheringApi } from '@/api'
import { RequestError } from '@/api/request'
import type { InvitePreview, Rsvp } from '@/api/types'
import { ensureSession, session } from '@/store/session'
import { dateLabel, deadlineLabel, MEAL_LABELS, MODE_HINTS, MODE_LABELS, RSVP_LABELS } from '@/utils/format'
import { sharePath } from '@/utils/invite'

const rsvps: Rsvp[] = ['YES', 'MAYBE', 'NO']
const token = ref('')
const p = ref<InvitePreview | null>(null)
const invalid = ref(false)
const busy = ref(false)
const form = reactive({ rsvp: 'YES' as Rsvp, headcount: 1, guestName: '', dietaryNotes: '' })

onLoad(async (q) => {
  token.value = decodeURIComponent((q as Record<string, string> | undefined)?.token || '')
  if (!token.value) {
    invalid.value = true
    return
  }
  // 未登录：先去登录（小程序会自动微信登录），登录后回到这个邀请页
  if (!(await ensureSession({ needFamily: false, redirect: sharePath(token.value) }))) return
  form.guestName = session.user?.nickname || ''
  try {
    p.value = await gatheringApi.preview(token.value)
  } catch (e) {
    if (e instanceof RequestError && e.status === 404) invalid.value = true
    else uni.showToast({ title: (e as Error).message, icon: 'none' })
  }
})

async function join() {
  busy.value = true
  try {
    const d = await gatheringApi.join(token.value, {
      rsvp: form.rsvp,
      headcount: form.headcount,
      guestName: form.guestName.trim() || undefined,
      dietaryNotes: form.dietaryNotes.trim() || undefined,
    })
    uni.showToast({ title: '已加入', icon: 'success' })
    goDetail(d.id)
  } finally {
    busy.value = false
  }
}

function goDetail(id: number) {
  uni.redirectTo({ url: `/pages/gathering/detail?id=${id}` })
}
function goHome() {
  uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>
.center { text-align: center; }
.hero { text-align: center; padding: 48rpx 32rpx; background: linear-gradient(180deg, #fff1e6 0%, #ffffff 100%); }
.emoji { font-size: 80rpx; }
.big { font-size: 40rpx; font-weight: 700; margin: 10rpx 0; }
.line { margin-top: 16rpx; }
.hint { line-height: 1.6; }
.stepper { background: #f3f0ec; border-radius: 999rpx; }
.step { width: 64rpx; text-align: center; font-size: 34rpx; color: $fm-primary; line-height: 60rpx; }
.val { width: 60rpx; text-align: center; font-weight: 600; }
.tip { margin-top: 20rpx; line-height: 1.6; }
</style>
