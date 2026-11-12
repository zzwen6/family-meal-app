<template>
  <view class="container" v-if="ready">
    <view class="card">
      <view class="card-title">基本信息</view>
      <view class="label">菜名</view>
      <input class="input" v-model="form.name" maxlength="64" placeholder="比如：红烧猪脚" />
      <view class="label">分类</view>
      <input class="input" v-model="form.category" maxlength="32" placeholder="家常菜 / 汤 / 孩子爱吃…" />
      <view class="row wrap gap">
        <view class="flex1">
          <view class="label">难度</view>
          <view class="row wrap">
            <text v-for="(l, k) in DIFFICULTY_LABELS" :key="k" class="chip" :class="{ active: form.difficulty === k }" @click="form.difficulty = k">{{ l }}</text>
          </view>
        </view>
      </view>
      <view class="row gap">
        <view class="flex1">
          <view class="label">用时（分钟）</view>
          <input class="input" type="number" v-model.number="form.durationMinutes" />
        </view>
        <view class="flex1">
          <view class="label">默认份数</view>
          <input class="input" type="number" v-model.number="form.defaultServings" />
        </view>
      </view>
      <view class="label">封面</view>
      <view class="row gap" style="align-items: flex-start">
        <image v-if="form.coverUrl" :src="mediaSrc(form.coverUrl)" class="cover" mode="aspectFill" @click="chooseCover" />
        <view v-else class="cover ph" @click="chooseCover">选一张图</view>
        <view class="flex1 muted">也可以粘贴外链</view>
      </view>
      <input class="input" v-model="form.coverUrl" placeholder="封面图地址（上传或外链，可选）" />
      <view class="label">简介</view>
      <textarea class="input area" v-model="form.description" maxlength="500" auto-height />
      <view class="label">小贴士</view>
      <textarea class="input area" v-model="form.tips" maxlength="1000" auto-height placeholder="比如：猪脚要提前焯水" />
    </view>

    <view class="card">
      <view class="card-title">主料</view>
      <view v-for="(i, idx) in form.ingredients" :key="'i'+idx" class="ing">
        <input class="input" v-model="i.name" placeholder="名称" />
        <view class="row gap">
          <input class="input flex1" type="digit" :value="i.amount ?? ''" placeholder="适量" @blur="e => i.amount = num(e)" />
          <input class="input unit" v-model="i.unit" placeholder="单位" />
        </view>
        <view class="row between">
          <text class="chip" :class="{ active: i.staple }" @click="i.staple = !i.staple">家里常备</text>
          <text class="remove" @click="form.ingredients.splice(idx, 1)">删</text>
        </view>
      </view>
      <text class="link" @click="form.ingredients.push(emptyIng())">+ 添加主料</text>
    </view>

    <view class="card">
      <view class="card-title">配料与调味</view>
      <view v-for="(i, idx) in form.seasonings" :key="'s'+idx" class="ing">
        <input class="input" v-model="i.name" placeholder="名称" />
        <view class="row gap">
          <input class="input flex1" type="digit" :value="i.amount ?? ''" placeholder="适量" @blur="e => i.amount = num(e)" />
          <input class="input unit" v-model="i.unit" placeholder="单位" />
        </view>
        <view class="row between">
          <text class="chip" :class="{ active: i.staple }" @click="i.staple = !i.staple">家里常备</text>
          <text class="remove" @click="form.seasonings.splice(idx, 1)">删</text>
        </view>
      </view>
      <text class="link" @click="form.seasonings.push(emptyIng())">+ 添加配料</text>
    </view>

    <view class="card">
      <view class="card-title">做法步骤</view>
      <view v-for="(s, idx) in form.steps" :key="'st'+idx" class="step-edit">
        <view class="row between">
          <text class="no">{{ idx + 1 }}</text>
          <text class="remove" @click="form.steps.splice(idx, 1)">删</text>
        </view>
        <textarea class="input area" v-model="s.content" placeholder="这一步怎么做" auto-height />
        <view class="row gap wrap">
          <input class="input flex1" type="number" v-model.number="s.durationMinutes" placeholder="用时（分钟）" />
          <text class="link" @click="chooseStepImage(idx)">配图</text>
          <text class="link" @click="chooseStepVideo(idx)">短视频</text>
        </view>
        <image v-if="s.imageUrl" :src="mediaSrc(s.imageUrl)" class="step-img" mode="aspectFill" />
        <!-- #ifdef MP-WEIXIN -->
        <video v-if="s.videoUrl" :src="mediaSrc(s.videoUrl)" :poster="mediaSrc(s.videoCoverUrl)" class="step-video" object-fit="contain" />
        <!-- #endif -->
        <!-- #ifdef H5 -->
        <video v-if="s.videoUrl" :src="mediaSrc(s.videoUrl)" :poster="mediaSrc(s.videoCoverUrl)" class="step-video" controls />
        <!-- #endif -->
      </view>
      <text class="link" @click="form.steps.push(emptyStep())">+ 添加步骤</text>
    </view>

    <view class="card">
      <view class="card-title">营养估算（可选手工覆盖）</view>
      <view class="muted">默认按用料估算，是约数不是检测。打开覆盖后，以你填的整道菜（默认份数）为准。</view>
      <view class="row between" style="margin: 16rpx 0" @click="overrideOn = !overrideOn">
        <text>手工填写整道菜营养</text>
        <text class="chip" :class="{ active: overrideOn }">{{ overrideOn ? '已开启' : '关闭' }}</text>
      </view>
      <view v-if="overrideOn" class="row wrap gap">
        <view class="flex1"><view class="label">热量（千卡）</view><input class="input" type="digit" v-model="ov.kcal" /></view>
        <view class="flex1"><view class="label">蛋白质（克）</view><input class="input" type="digit" v-model="ov.protein" /></view>
        <view class="flex1"><view class="label">脂肪（克）</view><input class="input" type="digit" v-model="ov.fat" /></view>
        <view class="flex1"><view class="label">碳水（克）</view><input class="input" type="digit" v-model="ov.carb" /></view>
      </view>
    </view>

    <button class="btn block" :loading="saving" @click="save">保存</button>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { dishApi } from '@/api'
import type { DishRequest } from '@/api/types'
import { canCook, currentFamily, ensureSession } from '@/store/session'
import { DIFFICULTY_LABELS } from '@/utils/format'
import { mediaSrc } from '@/utils/media'

type Ing = { name: string; amount: number | null; unit: string; staple: boolean; note: string }
type Step = { content: string; durationMinutes: number | null; imageUrl: string; videoUrl: string; videoCoverUrl: string; videoDurationSeconds: number | null }

const ready = ref(false)
const saving = ref(false)
const overrideOn = ref(false)
const ov = reactive({ kcal: '', protein: '', fat: '', carb: '' })
let dishId = 0

const form = reactive({
  name: '',
  category: '家常菜',
  difficulty: 'MEDIUM' as string,
  durationMinutes: 30,
  defaultServings: 3,
  coverUrl: '',
  description: '',
  tips: '',
  ingredients: [] as Ing[],
  seasonings: [] as Ing[],
  steps: [] as Step[],
})

function emptyIng(): Ing { return { name: '', amount: null, unit: '', staple: false, note: '' } }
function emptyStep(): Step { return { content: '', durationMinutes: null, imageUrl: '', videoUrl: '', videoCoverUrl: '', videoDurationSeconds: null } }
function num(e: Event): number | null {
  const v = (e.target as HTMLInputElement)?.value
  if (v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

async function upload(kind: 'image' | 'video'): Promise<string | null> {
  const fid = currentFamily.value!.id
  if (kind === 'image') {
    const res = await uni.chooseImage({ count: 1, sizeType: ['compressed'] })
    const path = res.tempFilePaths[0]
    const up = await dishApi.upload(fid, path)
    return up.url
  }
  const res = await uni.chooseVideo({ maxDuration: 60, compressed: true })
  const up = await dishApi.upload(fid, res.tempFilePath)
  return up.url
}

async function chooseCover() {
  try { form.coverUrl = (await upload('image')) || form.coverUrl } catch { /* toast already */ }
}
async function chooseStepImage(i: number) {
  try { const u = await upload('image'); if (u) form.steps[i].imageUrl = u } catch { /* */ }
}
async function chooseStepVideo(i: number) {
  try { const u = await upload('video'); if (u) form.steps[i].videoUrl = u } catch { /* */ }
}

async function load(id: number) {
  const d = await dishApi.detail(currentFamily.value!.id, id)
  form.name = d.name
  form.category = d.category
  form.difficulty = d.difficulty
  form.durationMinutes = d.durationMinutes
  form.defaultServings = d.defaultServings
  form.coverUrl = d.coverUrl || ''
  form.description = d.description || ''
  form.tips = d.tips || ''
  form.ingredients = d.ingredients.map((i) => ({ name: i.name, amount: i.amount ?? null, unit: i.unit || '', staple: i.staple, note: i.note || '' }))
  form.seasonings = d.seasonings.map((i) => ({ name: i.name, amount: i.amount ?? null, unit: i.unit || '', staple: i.staple, note: i.note || '' }))
  form.steps = d.steps.map((s) => ({
    content: s.content, durationMinutes: s.durationMinutes ?? null,
    imageUrl: s.imageUrl || '', videoUrl: s.videoUrl || '', videoCoverUrl: s.videoCoverUrl || '',
    videoDurationSeconds: s.videoDurationSeconds ?? null,
  }))
  overrideOn.value = !!d.nutritionOverride
  if (d.nutritionOverride && d.nutrition?.total) {
    ov.kcal = String(d.nutrition.total.kcal ?? '')
    ov.protein = String(d.nutrition.total.protein ?? '')
    ov.fat = String(d.nutrition.total.fat ?? '')
    ov.carb = String(d.nutrition.total.carb ?? '')
  }
  uni.setNavigationBarTitle({ title: '编辑菜谱' })
}

function cleanIng(list: Ing[]) {
  return list.filter((i) => i.name.trim()).map((i) => ({ ...i, name: i.name.trim(), unit: i.unit || undefined, note: i.note || undefined }))
}

async function save() {
  if (!form.name.trim() || !form.category.trim()) {
    uni.showToast({ title: '请填写菜名和分类', icon: 'none' })
    return
  }
  const body: DishRequest = {
    name: form.name.trim(),
    category: form.category.trim(),
    difficulty: form.difficulty,
    durationMinutes: Number(form.durationMinutes) || 1,
    defaultServings: Number(form.defaultServings) || 1,
    coverUrl: form.coverUrl || null,
    description: form.description,
    tips: form.tips,
    ingredients: cleanIng(form.ingredients),
    seasonings: cleanIng(form.seasonings),
    steps: form.steps.filter((s) => s.content.trim()).map((s) => ({
      content: s.content.trim(),
      durationMinutes: s.durationMinutes || null,
      imageUrl: s.imageUrl || null,
      videoUrl: s.videoUrl || null,
      videoCoverUrl: s.videoCoverUrl || null,
      videoDurationSeconds: s.videoDurationSeconds,
    })),
    nutrition: overrideOn.value ? {
      enabled: true,
      kcal: ov.kcal === '' ? null : Number(ov.kcal),
      protein: ov.protein === '' ? null : Number(ov.protein),
      fat: ov.fat === '' ? null : Number(ov.fat),
      carb: ov.carb === '' ? null : Number(ov.carb),
    } : { enabled: false },
  }
  saving.value = true
  try {
    const fid = currentFamily.value!.id
    if (dishId) await dishApi.update(fid, dishId, body)
    else await dishApi.create(fid, body)
    uni.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 400)
  } finally {
    saving.value = false
  }
}

onLoad(async (q) => {
  if (!(await ensureSession())) return
  if (!canCook.value) {
    uni.showToast({ title: '只有掌厨或管理员可以改菜谱', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 800)
    return
  }
  dishId = Number(q?.id) || 0
  if (dishId) await load(dishId)
  else {
    form.ingredients.push(emptyIng())
    form.steps.push(emptyStep())
  }
  ready.value = true
})
</script>

<style lang="scss" scoped>
.label { font-size: 24rpx; color: $fm-muted; margin: 16rpx 0 8rpx; }
.area { min-height: 80rpx; }
.cover { width: 160rpx; height: 160rpx; border-radius: 12rpx; background: #eee; }
.ph { display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: $fm-primary; background: $fm-primary-light; }
.unit { width: 140rpx; }
.ing { padding-bottom: 16rpx; margin-bottom: 16rpx; border-bottom: 1rpx dashed #eee; }
.step-edit { margin-bottom: 24rpx; }
.no { width: 44rpx; height: 44rpx; border-radius: 50%; background: $fm-primary; color: #fff; text-align: center; line-height: 44rpx; }
.step-img { width: 100%; height: 280rpx; border-radius: 12rpx; margin-top: 12rpx; }
.step-video { width: 100%; height: 320rpx; margin-top: 12rpx; }
.remove { color: #c0392b; font-size: 26rpx; }
.flex1 { flex: 1; }
</style>
