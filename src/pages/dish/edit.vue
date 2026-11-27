<template>
  <view>
  <view class="container" v-if="ready">
    <view class="card">
      <view class="card-title">基本信息</view>
      <view class="label">菜名</view>
      <input class="input" v-model="form.name" maxlength="64" placeholder="比如：红烧猪脚" />
      <view class="label">分类</view>
      <view v-if="!categoryCustom" class="field-picker" @click="openCategorySheet">
        <view class="input picker row between">
          <text>{{ form.category || '请选择分类' }}</text>
          <text class="caret">▾</text>
        </view>
      </view>
      <input v-else class="input" v-model="form.category" maxlength="32" placeholder="输入分类，比如：烘焙" :focus="true" @blur="onCategoryCustomBlur" />
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
          <input class="input flex1" type="digit" v-model="i.amountInput" placeholder="数量" />
          <view v-if="!i.customUnit" class="unit-picker" @click="openUnitSheet(i)">
            <view class="input unit picker" :class="{ placeholder: !i.unit }">{{ i.unit || '单位' }}</view>
          </view>
          <input v-else class="input unit" v-model="i.unit" maxlength="16" placeholder="单位" :focus="true" @blur="onUnitCustomBlur(i)" />
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
          <input class="input flex1" type="digit" v-model="i.amountInput" placeholder="数量" />
          <view v-if="!i.customUnit" class="unit-picker" @click="openUnitSheet(i)">
            <view class="input unit picker" :class="{ placeholder: !i.unit }">{{ i.unit || '单位' }}</view>
          </view>
          <input v-else class="input unit" v-model="i.unit" maxlength="16" placeholder="单位" :focus="true" @blur="onUnitCustomBlur(i)" />
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
  <select-sheet
    :visible="sheet.show"
    :title="sheet.title"
    :options="sheet.options"
    :selected="sheet.selected"
    @select="onSheetSelect"
    @close="sheet.show = false"
  />
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { dishApi } from '@/api'
import type { DishRequest } from '@/api/types'
import { canCook, currentFamily, ensureSession } from '@/store/session'
import { DIFFICULTY_LABELS } from '@/utils/format'
import { mediaSrc } from '@/utils/media'
import SelectSheet from '@/components/SelectSheet.vue'

type Ing = { name: string; amountInput: string; unit: string; staple: boolean; note: string; customUnit?: boolean }
type Step = { content: string; durationMinutes: number | null; imageUrl: string; videoUrl: string; videoCoverUrl: string; videoDurationSeconds: number | null }

const UNIT_PRESETS = ['克', '千克', '斤', '两', '毫升', '升', '个', '只', '根', '片', '颗', '粒', '棵', '块', '瓣', '条', '把', '勺', '茶匙', '汤匙', '杯', '袋', '包', '盒', '罐', '瓶', '滴', '适量', '少许']
const CATEGORY_PRESETS = ['家常菜', '热菜', '凉菜', '汤羹', '主食', '面食', '粥', '早餐', '炒菜', '炖煮', '蒸菜', '煎炸', '海鲜', '肉类', '素菜', '孩子爱吃', '下饭菜', '甜品', '饮品']
const CUSTOM_OPTION = '自定义'

const ready = ref(false)
const saving = ref(false)
const overrideOn = ref(false)
const categoryCustom = ref(false)
const familyCategories = ref<string[]>([])
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

function emptyIng(): Ing { return { name: '', amountInput: '', unit: '', staple: false, note: '' } }
function emptyStep(): Step { return { content: '', durationMinutes: null, imageUrl: '', videoUrl: '', videoCoverUrl: '', videoDurationSeconds: null } }

function unitOptions(current: string): string[] {
  const list = [...UNIT_PRESETS]
  const v = (current || '').trim()
  if (v && !list.includes(v)) list.push(v)
  list.push(CUSTOM_OPTION)
  return list
}
const sheet = reactive({
  show: false,
  title: '',
  options: [] as string[],
  selected: '',
  kind: 'category' as 'category' | 'unit',
  unitItem: null as Ing | null,
})

function openCategorySheet() {
  sheet.show = true
  sheet.title = '选择分类'
  sheet.options = categoryOptions.value
  sheet.selected = form.category
  sheet.kind = 'category'
  sheet.unitItem = null
}
function openUnitSheet(item: Ing) {
  sheet.show = true
  sheet.title = '选择单位'
  sheet.options = unitOptions(item.unit)
  sheet.selected = item.unit
  sheet.kind = 'unit'
  sheet.unitItem = item
}
function onSheetSelect(picked: string) {
  sheet.show = false
  if (sheet.kind === 'unit' && sheet.unitItem) applyUnit(sheet.unitItem, picked)
  else applyCategory(picked)
}
function applyUnit(item: Ing, picked: string) {
  if (picked === CUSTOM_OPTION) {
    if (UNIT_PRESETS.includes(item.unit)) item.unit = ''
    item.customUnit = true
    return
  }
  item.customUnit = false
  item.unit = picked || ''
}
function onUnitCustomBlur(item: Ing) {
  item.unit = (item.unit || '').trim()
  item.customUnit = false
}

const categoryOptions = computed(() => {
  const seen = new Set<string>()
  const list: string[] = []
  for (const c of CATEGORY_PRESETS) {
    if (!seen.has(c)) { seen.add(c); list.push(c) }
  }
  for (const c of familyCategories.value) {
    const t = (c || '').trim()
    if (t && !seen.has(t)) { seen.add(t); list.push(t) }
  }
  const cur = form.category.trim()
  if (cur && !seen.has(cur)) list.push(cur)
  list.push(CUSTOM_OPTION)
  return list
})
function applyCategory(picked: string) {
  if (picked === CUSTOM_OPTION) {
    const known = new Set([...CATEGORY_PRESETS, ...familyCategories.value])
    if (known.has(form.category)) form.category = ''
    categoryCustom.value = true
    return
  }
  categoryCustom.value = false
  if (picked) form.category = picked
}
function onCategoryCustomBlur() {
  const v = form.category.trim().slice(0, 32)
  form.category = v || '家常菜'
  categoryCustom.value = false
}

async function loadCategories() {
  try {
    familyCategories.value = await dishApi.categories(currentFamily.value!.id)
  } catch {
    familyCategories.value = []
  }
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
  form.ingredients = d.ingredients.map((i) => ({ name: i.name, amountInput: i.amount == null ? '' : String(i.amount), unit: i.unit || '', staple: i.staple, note: i.note || '' }))
  form.seasonings = d.seasonings.map((i) => ({ name: i.name, amountInput: i.amount == null ? '' : String(i.amount), unit: i.unit || '', staple: i.staple, note: i.note || '' }))
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

function parseAmount(raw: string): number | null {
  const s = (raw ?? '').trim()
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function cleanIng(list: Ing[]) {
  return list.filter((i) => i.name.trim()).map((i) => ({
    name: i.name.trim(),
    amount: parseAmount(i.amountInput),
    unit: i.unit || undefined,
    staple: i.staple,
    note: i.note || undefined,
  }))
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
  const catsPromise = loadCategories()
  if (dishId) await load(dishId)
  else {
    form.ingredients.push(emptyIng())
    form.steps.push(emptyStep())
  }
  await catsPromise
  ready.value = true
})
</script>

<style lang="scss" scoped>
.label { font-size: 24rpx; color: $fm-muted; margin: 16rpx 0 8rpx; }
.area { min-height: 80rpx; }
.cover { width: 160rpx; height: 160rpx; border-radius: 12rpx; background: #eee; }
.ph { display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: $fm-primary; background: $fm-primary-light; }
.field-picker { display: block; width: 100%; }
.unit-picker { flex-shrink: 0; width: 176rpx; }
.picker { display: flex; align-items: center; box-sizing: border-box; color: #333; width: 100%; }
.caret { color: $fm-muted; font-size: 24rpx; margin-left: 12rpx; }
.placeholder { color: $fm-muted; }
.unit { box-sizing: border-box; width: 176rpx; padding: 0 16rpx; flex-shrink: 0; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ing { padding-bottom: 16rpx; margin-bottom: 16rpx; border-bottom: 1rpx dashed #eee; }
.step-edit { margin-bottom: 24rpx; }
.no { width: 44rpx; height: 44rpx; border-radius: 50%; background: $fm-primary; color: #fff; text-align: center; line-height: 44rpx; }
.step-img { width: 100%; height: 280rpx; border-radius: 12rpx; margin-top: 12rpx; }
.step-video { width: 100%; height: 320rpx; margin-top: 12rpx; }
.remove { color: #c0392b; font-size: 26rpx; }
.flex1 { flex: 1; }
</style>
