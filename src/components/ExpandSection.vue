<template>
  <view :class="boxed ? 'card' : 'expand-block'">
    <view class="expand-head row between" @click="open = !open">
      <view class="expand-title-wrap">
        <view class="expand-title">{{ title }}</view>
        <view v-if="!open && hint" class="muted expand-hint">{{ hint }}</view>
      </view>
      <text class="expand-caret">{{ open ? '收起' : (toggleText || '展开') }}</text>
    </view>
    <view v-if="open" class="expand-body">
      <slot />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  hint?: string
  defaultOpen?: boolean
  boxed?: boolean
  toggleText?: string
}>(), {
  defaultOpen: false,
  boxed: true,
  toggleText: '展开',
})

const open = ref(props.defaultOpen)
</script>

<style lang="scss" scoped>
.expand-head { padding: 4rpx 0; }
.expand-title-wrap { flex: 1; min-width: 0; padding-right: 16rpx; }
.expand-title { font-size: 30rpx; font-weight: 600; }
.expand-hint { margin-top: 6rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.expand-caret { color: $fm-primary; font-size: 24rpx; font-weight: normal; flex-shrink: 0; }
.expand-body { margin-top: 12rpx; }
.expand-block { padding: 8rpx 0; }
.expand-block .expand-title { font-size: 26rpx; }
</style>
