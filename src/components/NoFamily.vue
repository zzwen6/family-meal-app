<template>
  <view class="card no-family">
    <view class="title">还没有加入家庭</view>
    <view class="muted">让家里的管理员给你邀请码，或者自己建一个家。</view>
    <button class="btn block" style="margin-top: 32rpx" @click="go">去加入 / 创建家庭</button>
  </view>
</template>

<script setup lang="ts">
function go() {
  uni.switchTab({ url: '/pages/me/index' })
}
</script>

<style scoped>
.no-family { text-align: center; padding: 60rpx 32rpx; }
.title { font-size: 34rpx; font-weight: 600; margin-bottom: 12rpx; }
</style>
