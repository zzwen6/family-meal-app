<template>
  <view class="container">
    <view class="card">
      <view class="card-title">模板名称</view>
      <input class="input" v-model="name" placeholder="比如：清淡一周、冬天硬菜" maxlength="64" />
      <input class="input" v-model="note" placeholder="备注（可选）" maxlength="255" />
    </view>

    <view class="card">
      <view class="card-title">一周的菜</view>
      <view v-for="(it, idx) in items" :key="idx" class="item">
        <view class="row between">
          <picker :range="dowOptions" :value="it.dayOfWeek - 1" @change="(e: any) => (it.dayOfWeek = Number(e.detail.value) + 1)">
            <text class="chip">{{ DOW_LABELS[it.dayOfWeek] }}</text>
          </picker>
          <picker :range="mealOptions" :value="mealIndex(it.mealType)" @change="(e: any) => (it.mealType = meals[Number(e.detail.value)])">
            <text class="chip">{{ MEAL_LABELS[it.mealType] }}</text>
          </picker>
          <text class="link" @click="items.splice(idx, 1)">删除</text>
        </view>
        <view class="row gap" style="margin-top: 12rpx">
          <picker class="flex1" :range="dishNames" :value="dishIndex(it.dishId)" @change="(e: any) => pickDish(it, Number(e.detail.value))">
            <view class="input mini">{{ it.dishId ? dishName(it.dishId) : (it.customName || '选菜谱或手写') }}</view>
          </picker>
        </view>
        <input class="input mini" v-model="it.customName" placeholder="手写菜名（不选菜谱时）" maxlength="64" @input="() => { if (it.customName) it.dishId = null }" />
        <view class="row between">
          <text class="muted">份数</text>
          <view class="row stepper">
            <text class="step" @click="it.servings = Math.max(1, it.servings - 1)">−</text>
            <text class="val">{{ it.servings }}</text>
            <text class="step" @click="it.servings = Math.min(20, it.servings + 1)">＋</text>
          </view>
        </view>
      </view>
      <button class="btn ghost block" @click="addItem">加一道</button>
    </view>

    <button class="btn block" :loading="saving" @click="save">保存</button>
    <button v-if="editingId" class="btn ghost block" style="margin-top: 20rpx" @click="remove">删除模板</button>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { dishApi, templateApi } from '@/api'
import type { DishSummary, MealType } from '@/api/types'
import { currentFamily, ensureSession } from '@/store/session'
import { DOW_LABELS, MEAL_LABELS } from '@/utils/format'

const meals: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER']
const dowOptions = DOW_LABELS.slice(1)
const mealOptions = meals.map((m) => MEAL_LABELS[m])

const name = ref('')
const note = ref('')
const editingId = ref<number | null>(null)
const saving = ref(false)
const dishes = ref<DishSummary[]>([])
const items = reactive<{ dayOfWeek: number; mealType: MealType; dishId: number | null; customName: string; servings: number }[]>([])

const dishNames = computed(() => ['（手写菜名）', ...dishes.value.map((d) => d.name)])

function mealIndex(t: MealType) { return meals.indexOf(t) }
function dishName(id: number) { return dishes.value.find((d) => d.id === id)?.name || '菜谱' }
function dishIndex(id: number | null) {
  if (!id) return 0
  const i = dishes.value.findIndex((d) => d.id === id)
  return i < 0 ? 0 : i + 1
}
function pickDish(it: (typeof items)[0], index: number) {
  if (index <= 0) {
    it.dishId = null
    return
  }
  const d = dishes.value[index - 1]
  it.dishId = d.id
  it.customName = ''
}
function addItem() {
  items.push({ dayOfWeek: 1, mealType: 'DINNER', dishId: null, customName: '', servings: 2 })
}

onLoad(async (q) => {
  if (!(await ensureSession())) return
  const fid = currentFamily.value!.id
  dishes.value = await dishApi.list(fid)
  if (q?.id) {
    editingId.value = Number(q.id)
    const t = await templateApi.get(fid, editingId.value)
    name.value = t.name
    note.value = t.note || ''
    items.splice(0, items.length, ...t.items.map((i) => ({
      dayOfWeek: i.dayOfWeek,
      mealType: i.mealType,
      dishId: i.dishId ?? null,
      customName: i.dishId ? '' : (i.name || ''),
      servings: i.servings,
    })))
  } else if (!items.length) {
    addItem()
  }
})

async function save() {
  if (!name.value.trim()) return uni.showToast({ title: '请填写名称', icon: 'none' })
  const body = {
    name: name.value.trim(),
    note: note.value.trim() || undefined,
    items: items
      .filter((i) => i.dishId || i.customName.trim())
      .map((i) => ({
        dayOfWeek: i.dayOfWeek,
        mealType: i.mealType,
        dishId: i.dishId,
        customName: i.dishId ? null : i.customName.trim(),
        servings: i.servings,
      })),
  }
  saving.value = true
  try {
    if (editingId.value) await templateApi.update(currentFamily.value!.id, editingId.value, body)
    else await templateApi.create(currentFamily.value!.id, body)
    uni.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 500)
  } finally {
    saving.value = false
  }
}

function remove() {
  uni.showModal({
    title: '删除这个模板？',
    success: async (r) => {
      if (!r.confirm || !editingId.value) return
      await templateApi.remove(currentFamily.value!.id, editingId.value)
      uni.navigateBack()
    },
  })
}
</script>

<style lang="scss" scoped>
.item { padding: 16rpx 0; border-bottom: 1rpx solid #f2f2f2; margin-bottom: 8rpx; }
.chip { padding: 8rpx 20rpx; background: #f3f0ec; border-radius: 999rpx; margin-right: 12rpx; }
.flex1 { flex: 1; }
.input.mini { height: 64rpx; margin-bottom: 12rpx; }
.stepper { background: #f3f0ec; border-radius: 999rpx; }
.step { width: 56rpx; text-align: center; color: $fm-primary; line-height: 52rpx; font-size: 32rpx; }
.val { width: 48rpx; text-align: center; }
.link { color: $fm-primary; font-size: 26rpx; }
</style>
