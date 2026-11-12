<template>
  <view class="container">
    <slot-picker v-if="!editingId" />
    <view v-else class="card row between">
      <text>{{ dateLabel(form.mealDate) }}{{ MEAL_LABELS[form.mealType] }}</text>
      <text class="muted">修改意愿</text>
    </view>

    <view v-if="canCook && members.length > 1 && !editingId" class="card">
      <view class="card-title">替谁点</view>
      <view class="row wrap">
        <text
          v-for="m in members"
          :key="m.id"
          class="chip"
          :class="{ active: (form.memberId || myMemberId) === m.id }"
          @click="form.memberId = m.id"
        >{{ m.displayName }}</text>
      </view>
    </view>

    <view class="card row between">
      <view>
        <view>这餐不在家吃</view>
        <view class="muted">掌厨会少做一份</view>
      </view>
      <switch :checked="form.notEatingHome" color="#e6772e" @change="(e: any) => (form.notEatingHome = e.detail.value)" />
    </view>

    <template v-if="!form.notEatingHome">
      <view class="card">
        <view class="card-title">想吃什么</view>
        <input
          class="input"
          v-model="form.freeText"
          placeholder="菜谱里没有？直接写，比如「猪脚」"
          maxlength="64"
          @input="onFreeText"
        />
        <view v-if="freeTextFatigue" class="warn" style="margin-top: 12rpx">{{ freeTextFatigue }}</view>
        <view class="row wrap cats">
          <text class="chip small" :class="{ active: !category }" @click="category = ''">全部</text>
          <text v-for="c in categories" :key="c" class="chip small" :class="{ active: category === c }" @click="category = c">{{ c }}</text>
        </view>
        <view v-if="!filteredDishes.length" class="muted">菜谱里还没有菜，掌厨可以在管理后台添加。</view>
        <view
          v-for="d in filteredDishes"
          :key="d.id"
          class="dish"
          :class="{ active: form.dishId === d.id }"
          @click="pickDish(d.id)"
        >
          <image v-if="d.coverUrl" :src="d.coverUrl" class="cover" mode="aspectFill" />
          <view v-else class="cover ph">{{ d.name.slice(0, 1) }}</view>
          <view class="flex1">
            <view class="name">{{ d.name }}</view>
            <view class="muted">{{ d.category }} · {{ d.durationMinutes }} 分钟</view>
            <view v-if="fatigueOf(d.id, d.name)" class="warn">{{ fatigueOf(d.id, d.name) }}</view>
          </view>
          <text v-if="form.dishId === d.id" class="check">✓</text>
        </view>
      </view>

      <view class="card">
        <view class="card-title">有多想吃</view>
        <view class="seg">
          <view
            v-for="i in intensities"
            :key="i"
            class="seg-item"
            :class="{ active: form.intensity === i }"
            @click="form.intensity = i"
          >{{ INTENSITY_LABELS[i] }}</view>
        </view>
        <view class="row between servings">
          <text>份数</text>
          <view class="row stepper">
            <text class="step" @click="form.servings = Math.max(1, form.servings - 1)">−</text>
            <text class="val">{{ form.servings }}</text>
            <text class="step" @click="form.servings = Math.min(20, form.servings + 1)">＋</text>
          </view>
        </view>
        <input class="input" v-model="form.note" placeholder="备注（少辣、多放点汤…）" maxlength="255" style="margin: 20rpx 0 0" />
      </view>
    </template>

    <button class="btn block" :loading="saving" @click="submit">{{ editingId ? '保存修改' : '提交' }}</button>
    <button v-if="editingId" class="btn ghost block" style="margin-top: 20rpx" @click="remove">删除这条</button>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { dishApi, familyApi, menuApi, wishApi } from '@/api'
import type { DishSummary, HintView, Intensity, MemberView, WishRequest } from '@/api/types'
import { canCook, currentFamily, ensureSession, session } from '@/store/session'
import { addDays, dateLabel, INTENSITY_LABELS, MEAL_LABELS, today } from '@/utils/format'
import SlotPicker from '@/components/SlotPicker.vue'

const intensities: Intensity[] = ['WANT', 'OK', 'AVOID']
const dishes = ref<DishSummary[]>([])
const members = ref<MemberView[]>([])
const category = ref('')
const editingId = ref<number | null>(null)
const saving = ref(false)
const hints = ref<HintView[]>([])
const myMemberId = computed(() => currentFamily.value?.myMemberId)

const form = reactive({
  mealDate: session.date,
  mealType: session.mealType,
  dishId: null as number | null,
  freeText: '',
  intensity: 'WANT' as Intensity,
  servings: 1,
  notEatingHome: false,
  note: '',
  memberId: null as number | null,
})

const categories = computed(() => [...new Set(dishes.value.map((d) => d.category))])
const filteredDishes = computed(() => dishes.value.filter((d) => !category.value || d.category === category.value))
const freeTextFatigue = computed(() => (form.freeText && !form.dishId ? fatigueOf(undefined, form.freeText) : ''))

function fatigueOf(dishId?: number, name?: string) {
  const h = hints.value.find((x) => x.type === 'FATIGUE' && (
    (dishId && x.dishId === dishId) || (name && x.dishName && name.replace(/\s/g, '') && x.dishName.includes(name.trim()))
  ))
  return h?.message || ''
}

function pickDish(id: number) {
  form.dishId = form.dishId === id ? null : id
  if (form.dishId) form.freeText = ''
}
function onFreeText() {
  if (form.freeText) form.dishId = null
}

onLoad(async (q) => {
  if (!(await ensureSession())) return
  const fid = currentFamily.value!.id
  const [list, mem] = await Promise.all([
    dishApi.list(fid),
    canCook.value ? familyApi.members(fid) : Promise.resolve([]),
  ])
  dishes.value = list
  members.value = mem
  if (q?.dishId) form.dishId = Number(q.dishId)
  if (q?.id) {
    editingId.value = Number(q.id)
    const mine = await wishApi.mine(fid, today(), addDays(today(), 14))
    let w = mine.find((x) => x.id === editingId.value)
    if (!w && canCook.value) {
      w = (await wishApi.list(fid, session.date, session.mealType)).find((x) => x.id === editingId.value)
    }
    if (w) {
      Object.assign(form, {
        mealDate: w.mealDate,
        mealType: w.mealType,
        dishId: w.dishId ?? null,
        freeText: w.freeText || '',
        intensity: w.intensity,
        servings: w.servings,
        notEatingHome: w.notEatingHome,
        note: w.note || '',
        memberId: w.memberId,
      })
    }
  }
  hints.value = await menuApi.hints(fid, form.mealDate, form.mealType).catch(() => [])
})

async function submit() {
  if (!form.notEatingHome && !form.dishId && !form.freeText.trim()) {
    uni.showToast({ title: '选一道菜或写下想吃什么', icon: 'none' })
    return
  }
  const fid = currentFamily.value!.id
  const body: WishRequest = {
    mealDate: editingId.value ? form.mealDate : session.date,
    mealType: editingId.value ? form.mealType : session.mealType,
    dishId: form.dishId,
    freeText: form.dishId ? null : form.freeText.trim() || null,
    intensity: form.intensity,
    servings: form.servings,
    notEatingHome: form.notEatingHome,
    note: form.note,
    memberId: form.memberId,
  }
  saving.value = true
  try {
    if (editingId.value) await wishApi.update(fid, editingId.value, body)
    else await wishApi.create(fid, body)
    uni.showToast({ title: '已提交', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } finally {
    saving.value = false
  }
}

function remove() {
  uni.showModal({
    title: '删除这条意愿？',
    success: async (r) => {
      if (!r.confirm || !editingId.value) return
      await wishApi.remove(currentFamily.value!.id, editingId.value)
      uni.navigateBack()
    },
  })
}
</script>

<style lang="scss" scoped>
.chip { padding: 10rpx 24rpx; border-radius: 999rpx; background: #f3f0ec; margin: 0 12rpx 12rpx 0; font-size: 26rpx; }
.chip.small { padding: 6rpx 20rpx; font-size: 24rpx; }
.chip.active { background: $fm-primary; color: #fff; }
.cats { margin-bottom: 8rpx; }
.dish { display: flex; align-items: center; gap: 20rpx; padding: 16rpx; border-radius: 16rpx; border: 2rpx solid transparent; }
.dish.active { border-color: $fm-primary; background: $fm-primary-light; }
.cover { width: 88rpx; height: 88rpx; border-radius: 14rpx; flex-shrink: 0; }
.ph { background: $fm-primary-light; color: $fm-primary; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 36rpx; }
.flex1 { flex: 1; }
.name { font-size: 30rpx; }
.warn { color: #b4610f; font-size: 22rpx; margin-top: 6rpx; }
.check { color: $fm-primary; font-size: 36rpx; font-weight: 700; }
.servings { margin-top: 28rpx; }
.stepper { background: #f3f0ec; border-radius: 999rpx; }
.step { width: 64rpx; text-align: center; font-size: 34rpx; color: $fm-primary; line-height: 60rpx; }
.val { width: 60rpx; text-align: center; font-weight: 600; }
</style>
