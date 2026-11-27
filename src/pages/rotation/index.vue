<template>
  <view class="container">
    <view class="card">
      <view class="row between">
        <view class="card-title" style="margin: 0">本周掌厨</view>
        <view class="row gap">
          <text class="link" @click="shift(-7)">上一周</text>
          <text class="link" @click="goToday">本周</text>
          <text class="link" @click="shift(7)">下一周</text>
        </view>
      </view>
      <view class="muted">{{ from }} 至 {{ to }}</view>
      <view v-if="!assignments.length && loaded" class="muted" style="margin-top: 16rpx">这周还没有安排。管理员或掌厨可以生成本周安排。</view>
      <view v-for="a in assignments" :key="a.mealDate + a.mealType" class="slot row between">
        <view>
          <view>{{ dateLabel(a.mealDate) }}{{ MEAL_LABELS[a.mealType] }}</view>
          <view class="muted">
            {{ a.memberName || '未指定' }}
            <text v-if="a.source === 'MANUAL'"> · 手工指定</text>
            <text v-if="a.proxyConfirm"> · {{ a.confirmedByName }} 代做</text>
          </view>
        </view>
        <picker v-if="canManage(a)" mode="selector" :range="memberNames" @change="(e: any) => assign(a, Number(e.detail.value))">
          <text class="link">改派</text>
        </picker>
      </view>
    </view>

    <view v-if="canGenerate" class="card">
      <button class="btn block" :loading="busy" @click="generate">生成本周安排</button>
      <view class="muted" style="margin-top: 12rpx">不会覆盖已经手工指定的安排</view>
    </view>

    <expand-section
      v-if="rotation"
      title="轮换设置"
      :hint="(rotation.enabled ? '已启用' : '未启用') + ' · ' + (rotation.members.map((m) => m.displayName).join('、') || '还没有人')"
    >
      <view class="muted">适用餐次：{{ rotation.mealTypes.map((t) => MEAL_LABELS[t]).join('、') || '未设置' }}</view>
      <template v-if="isAdmin">
        <view class="muted label">适用餐次</view>
        <view class="row wrap">
          <text v-for="t in MEAL_TYPES" :key="t" class="chip" :class="{ active: form.mealTypes.includes(t) }" @click="toggleMeal(t)">{{ MEAL_LABELS[t] }}</text>
        </view>
        <view class="muted label">参与成员和顺序（点一下加入或移出）</view>
        <view class="row wrap">
          <text
            v-for="m in members"
            :key="m.id"
            class="chip"
            :class="{ active: form.memberIds.includes(m.id) }"
            @click="toggleMember(m.id)"
          >{{ m.displayName }}</text>
        </view>
        <view class="row between">
          <text>启用自动安排</text>
          <switch :checked="form.enabled" color="#e6772e" @change="(e: any) => (form.enabled = e.detail.value)" />
        </view>
        <button class="btn block" style="margin-top: 24rpx" @click="save">保存设置</button>
      </template>
    </expand-section>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { familyApi, rotationApi } from '@/api'
import type { AssignmentView, MealType, MemberView, RotationView } from '@/api/types'
import { canCook, currentFamily, ensureSession, isAdmin, session } from '@/store/session'
import { addDays, dateLabel, fmtDate, MEAL_LABELS, MEAL_TYPES } from '@/utils/format'
import ExpandSection from '@/components/ExpandSection.vue'

const rotation = ref<RotationView | null>(null)
const assignments = ref<AssignmentView[]>([])
const members = ref<MemberView[]>([])
const loaded = ref(false)
const busy = ref(false)
const start = ref(monday(session.date))
const form = reactive({ enabled: false, mealTypes: ['DINNER'] as MealType[], memberIds: [] as number[] })

const from = computed(() => start.value)
const to = computed(() => addDays(start.value, 6))
const memberNames = computed(() => members.value.map((m) => m.displayName))
const canGenerate = computed(() => isAdmin.value || canCook.value)

function monday(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const x = new Date(y, m - 1, d)
  const dow = (x.getDay() + 6) % 7
  x.setDate(x.getDate() + -dow)
  return fmtDate(x)
}
function shift(n: number) {
  start.value = addDays(start.value, n)
  load()
}
function goToday() {
  start.value = monday(session.date)
  load()
}
function canManage(a: AssignmentView) {
  if (isAdmin.value) return true
  return a.memberId === currentFamily.value?.myMemberId
}

async function load() {
  if (!(await ensureSession())) return
  const fid = currentFamily.value!.id
  try {
    const [r, list, mem] = await Promise.all([
      rotationApi.get(fid),
      rotationApi.assignments(fid, from.value, to.value),
      familyApi.members(fid),
    ])
    rotation.value = r
    assignments.value = list
    members.value = mem
    form.enabled = r.enabled
    form.mealTypes = r.mealTypes.length ? [...r.mealTypes] : ['DINNER']
    form.memberIds = r.members.map((m) => m.memberId)
    loaded.value = true
  } finally {
    uni.stopPullDownRefresh()
  }
}

function toggleMeal(t: MealType) {
  if (form.mealTypes.includes(t)) form.mealTypes = form.mealTypes.filter((x) => x !== t)
  else form.mealTypes = [...form.mealTypes, t]
}
function toggleMember(id: number) {
  if (form.memberIds.includes(id)) form.memberIds = form.memberIds.filter((x) => x !== id)
  else form.memberIds = [...form.memberIds, id]
}

async function save() {
  if (!form.mealTypes.length) {
    uni.showToast({ title: '至少选一个餐次', icon: 'none' })
    return
  }
  const r = await rotationApi.update(currentFamily.value!.id, { ...form })
  rotation.value = r
  uni.showToast({ title: '已保存', icon: 'success' })
  load()
}

async function generate() {
  busy.value = true
  try {
    assignments.value = await rotationApi.generate(currentFamily.value!.id, { from: from.value, to: to.value })
    uni.showToast({ title: '已生成安排', icon: 'success' })
  } finally {
    busy.value = false
  }
}

async function assign(a: AssignmentView, index: number) {
  const m = members.value[index]
  if (!m) return
  await rotationApi.assign(currentFamily.value!.id, { mealDate: a.mealDate, mealType: a.mealType, memberId: m.id })
  load()
}

onShow(load)
onPullDownRefresh(load)
</script>

<style lang="scss" scoped>
.link { color: $fm-primary; font-size: 26rpx; }
.slot { padding: 18rpx 0; border-bottom: 1rpx solid #f2f2f2; }
.chip { padding: 10rpx 24rpx; border-radius: 999rpx; background: #f3f0ec; margin: 0 12rpx 12rpx 0; font-size: 26rpx; }
.chip.active { background: $fm-primary; color: #fff; }
.label { margin: 20rpx 0 10rpx; }
</style>
