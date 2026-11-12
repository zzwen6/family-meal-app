<template>
  <view class="container" :class="{ child: isChild }">
    <template v-if="session.ready && session.token && !currentFamily"><no-family /></template>
    <template v-else>
      <input class="input search" v-model="keyword" :placeholder="isChild ? '找你想吃的菜' : '搜菜名'" confirm-type="search" @confirm="load" />
      <scroll-view scroll-x class="cats" :show-scrollbar="false">
        <text class="cat" :class="{ active: !category }" @click="pick('')">全部</text>
        <text v-for="c in categories" :key="c" class="cat" :class="{ active: category === c }" @click="pick(c)">{{ c }}</text>
      </scroll-view>
      <view v-if="canCook" class="btn ghost block" style="margin-bottom: 20rpx" @click="goEdit()">录入菜谱</view>
      <view v-if="loaded && !dishes.length" class="empty">{{ isChild ? '家里还没有菜谱，让大人先加一些吧。' : '还没有菜，掌厨可以点上面的「录入菜谱」或在管理后台添加' }}</view>
      <view class="grid">
        <view v-for="d in dishes" :key="d.id" class="item" :class="{ big: isChild }" @click="open(d.id)">
          <image v-if="d.coverUrl" :src="mediaSrc(d.coverUrl)" class="cover" mode="aspectFill" />
          <view v-else class="cover ph">{{ d.name.slice(0, 1) }}</view>
          <view class="info">
            <view class="name">{{ d.name }}</view>
            <view v-if="!isChild" class="muted">{{ DIFFICULTY_LABELS[d.difficulty] }} · {{ d.durationMinutes }} 分钟 · {{ d.defaultServings }} 人份</view>
            <view v-else class="muted">点一下告诉家里我想吃 · <text class="link" @click.stop="openDetail(d.id)">看做法</text></view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { dishApi } from '@/api'
import type { DishSummary } from '@/api/types'
import { applyTabBar, canCook, currentFamily, ensureSession, isChild, session } from '@/store/session'
import { DIFFICULTY_LABELS } from '@/utils/format'
import { mediaSrc } from '@/utils/media'
import NoFamily from '@/components/NoFamily.vue'

const dishes = ref<DishSummary[]>([])
const categories = ref<string[]>([])
const category = ref('')
const keyword = ref('')
const loaded = ref(false)

async function load() {
  if (!(await ensureSession())) return
  const fid = currentFamily.value!.id
  try {
    const [list, cats] = await Promise.all([
      dishApi.list(fid, { category: category.value, keyword: keyword.value.trim() }),
      dishApi.categories(fid),
    ])
    dishes.value = list
    categories.value = cats
    loaded.value = true
    applyTabBar()
  } finally {
    uni.stopPullDownRefresh()
  }
}

function pick(c: string) {
  category.value = c
  load()
}
function open(id: number) {
  if (isChild.value) {
    uni.navigateTo({ url: `/pages/wish/edit?dishId=${id}` })
    return
  }
  uni.navigateTo({ url: `/pages/dish/detail?id=${id}` })
}
function openDetail(id: number) {
  uni.navigateTo({ url: `/pages/dish/detail?id=${id}` })
}
function goEdit() {
  uni.navigateTo({ url: '/pages/dish/edit' })
}

onShow(load)
onPullDownRefresh(load)
</script>

<style lang="scss" scoped>
.search { background: #fff; }
.cats { white-space: nowrap; margin-bottom: 20rpx; }
.cat { display: inline-block; padding: 8rpx 24rpx; margin-right: 12rpx; border-radius: 999rpx; background: #fff; font-size: 26rpx; color: #555; }
.cat.active { background: $fm-primary; color: #fff; }
.grid { display: flex; flex-wrap: wrap; justify-content: space-between; }
.item { width: 48.5%; background: #fff; border-radius: 20rpx; overflow: hidden; margin-bottom: 20rpx; }
.cover { width: 100%; height: 240rpx; display: block; }
.ph { background: $fm-primary-light; color: $fm-primary; display: flex; align-items: center; justify-content: center; font-size: 72rpx; font-weight: 700; }
.info { padding: 16rpx 20rpx 20rpx; }
.name { font-size: 30rpx; font-weight: 600; margin-bottom: 6rpx; }
.child .item.big { width: 100%; }
.child .cover { height: 320rpx; }
.child .name { font-size: 40rpx; }
.child .ph { font-size: 96rpx; }
</style>
