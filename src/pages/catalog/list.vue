<template>
  <view class="container">
    <input class="input search" v-model="keyword" placeholder="搜菜名" confirm-type="search" @confirm="load" />
    <view class="toolbar">
      <scroll-view scroll-x class="cats" :show-scrollbar="false">
        <text class="cat" :class="{ active: !category }" @click="pick('')">全部</text>
        <text v-for="c in categories" :key="c" class="cat" :class="{ active: category === c }" @click="pick(c)">{{ c }}</text>
      </scroll-view>
    </view>
    <view v-if="loaded && !dishes.length" class="empty">没有找到这道菜</view>
    <view class="grid">
      <view v-for="d in dishes" :key="d.id" class="item" @click="open(d.id)">
        <image v-if="d.coverUrl" :src="mediaSrc(d.coverUrl)" class="cover" mode="aspectFill" />
        <view v-else class="cover ph">{{ d.name.slice(0, 1) }}</view>
        <view class="info">
          <view class="name">{{ d.name }}</view>
          <view class="muted">{{ d.category }} · {{ DIFFICULTY_LABELS[d.difficulty] }} · {{ d.durationMinutes }} 分钟</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { publicDishApi } from '@/api'
import type { DishSummary } from '@/api/types'
import { ensureSession } from '@/store/session'
import { DIFFICULTY_LABELS } from '@/utils/format'
import { mediaSrc } from '@/utils/media'

const dishes = ref<DishSummary[]>([])
const categories = ref<string[]>([])
const category = ref('')
const keyword = ref('')
const loaded = ref(false)

async function load() {
  if (!(await ensureSession())) return
  try {
    const [list, cats] = await Promise.all([
      publicDishApi.list({ category: category.value, keyword: keyword.value.trim() }),
      publicDishApi.categories(),
    ])
    dishes.value = list
    categories.value = cats
    loaded.value = true
  } finally {
    uni.stopPullDownRefresh()
  }
}

function pick(c: string) {
  category.value = c
  load()
}

function open(id: number) {
  uni.navigateTo({ url: `/pages/catalog/detail?id=${id}` })
}

onShow(load)
onPullDownRefresh(load)
</script>

<style lang="scss" scoped>
.search { background: #fff; }
.toolbar { display: flex; align-items: center; margin-bottom: 20rpx; }
.cats { flex: 1; width: 0; white-space: nowrap; }
.cat { display: inline-block; padding: 8rpx 24rpx; margin-right: 12rpx; border-radius: 999rpx; background: #fff; font-size: 26rpx; color: #555; }
.cat.active { background: $fm-primary; color: #fff; }
.grid { display: flex; flex-wrap: wrap; justify-content: space-between; }
.item { width: 48.5%; background: #fff; border-radius: 20rpx; overflow: hidden; margin-bottom: 20rpx; }
.cover { width: 100%; height: 240rpx; display: block; }
.ph { background: $fm-primary-light; color: $fm-primary; display: flex; align-items: center; justify-content: center; font-size: 72rpx; font-weight: 700; }
.info { padding: 16rpx 20rpx 20rpx; }
.name { font-size: 30rpx; font-weight: 600; margin-bottom: 6rpx; }
</style>
