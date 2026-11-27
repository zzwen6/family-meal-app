<template>
  <view v-if="visible" class="sheet-root">
    <view class="sheet-mask" @click="emit('close')" @touchmove.stop.prevent />
    <view class="sheet-panel" @click.stop>
      <view class="sheet-title">{{ title }}</view>
      <scroll-view scroll-y class="sheet-list" :show-scrollbar="false">
        <view
          v-for="opt in options"
          :key="opt"
          class="sheet-item"
          :class="{ active: opt === selected }"
          @click="emit('select', opt)"
        >{{ opt }}</view>
      </scroll-view>
      <view class="sheet-cancel" @click="emit('close')">取消</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onUnmounted, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  title: string
  options: string[]
  selected?: string
}>()

const emit = defineEmits<{
  (e: 'select', value: string): void
  (e: 'close'): void
}>()

function lockPage(lock: boolean) {
  // #ifdef H5
  if (typeof document !== 'undefined') {
    document.body.style.overflow = lock ? 'hidden' : ''
  }
  // #endif
}

watch(() => props.visible, (show) => lockPage(show), { immediate: true })
onUnmounted(() => lockPage(false))
</script>

<style lang="scss" scoped>
.sheet-root {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 9999;
}
.sheet-mask {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
}
.sheet-panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}
.sheet-title {
  text-align: center;
  font-size: 28rpx;
  font-weight: 600;
  padding: 28rpx 32rpx 16rpx;
  color: $fm-text;
}
.sheet-list {
  height: 55vh;
}
.sheet-item {
  padding: 28rpx 40rpx;
  font-size: 30rpx;
  color: #333;
  border-top: 1rpx solid #f3f0ec;
}
.sheet-item.active {
  color: $fm-primary;
  font-weight: 600;
}
.sheet-cancel {
  margin: 12rpx 24rpx 0;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  border-radius: 999rpx;
  background: #f3f0ec;
  color: #666;
  font-size: 28rpx;
}
</style>
