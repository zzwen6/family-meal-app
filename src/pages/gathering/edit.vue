<template>
  <view class="container">
    <view v-if="copyFrom" class="card copy-tip">
      复用「{{ copyFrom.title }}」的 {{ copyFrom.participants.length - 1 }} 位参与者，将设为待定。
    </view>

    <view class="card">
      <view class="card-title">聚餐信息</view>
      <input class="input" v-model="form.title" placeholder="标题，比如：周五老同学聚餐" maxlength="64" />
      <picker mode="date" :value="form.mealDate" :start="todayStr" @change="(e: any) => (form.mealDate = e.detail.value)">
        <view class="input picker row between"><text>日期</text><text>{{ form.mealDate }}（{{ dateLabel(form.mealDate) }}）</text></view>
      </picker>
      <view class="seg meal">
        <view v-for="m in MEAL_TYPES" :key="m" class="seg-item" :class="{ active: form.mealType === m }" @click="form.mealType = m">{{ MEAL_LABELS[m] }}</view>
      </view>
      <input class="input" v-model="form.location" placeholder="地点（可选），比如：我家 / 某某饭店" maxlength="128" />
      <textarea class="input area" v-model="form.note" placeholder="备注（可选），比如：6 点开饭，记得带酒" maxlength="500" />
    </view>

    <view v-if="!editingId" class="card">
      <view class="card-title">玩法</view>
      <view
        v-for="m in modes"
        :key="m"
        class="mode"
        :class="{ active: form.mode === m }"
        @click="form.mode = m"
      >
        <view class="name">{{ MODE_LABELS[m] }}</view>
        <view class="muted">{{ MODE_HINTS[m] }}</view>
      </view>
    </view>
    <view v-else class="card row between">
      <text>玩法</text><text class="tag primary">{{ MODE_LABELS[form.mode] }}（创建后不能改）</text>
    </view>

    <view class="card">
      <view class="row between">
        <view>
          <view>点菜截止时间</view>
          <view class="muted">截止后大家不能再改点菜</view>
        </view>
        <switch :checked="hasDeadline" color="#e6772e" @change="(e: any) => (hasDeadline = e.detail.value)" />
      </view>
      <view v-if="hasDeadline" class="row gap deadline">
        <picker mode="date" :value="deadlineDate" :start="todayStr" @change="(e: any) => (deadlineDate = e.detail.value)">
          <view class="input picker">{{ deadlineDate }}</view>
        </picker>
        <picker mode="time" :value="deadlineTime" @change="(e: any) => (deadlineTime = e.detail.value)">
          <view class="input picker">{{ deadlineTime }}</view>
        </picker>
      </view>
    </view>

    <view v-if="!editingId" class="card">
      <view class="row between">
        <text>我这边来几个人</text>
        <view class="row stepper">
          <text class="step" @click="form.headcount = Math.max(1, (form.headcount || 1) - 1)">−</text>
          <text class="val">{{ form.headcount }}</text>
          <text class="step" @click="form.headcount = Math.min(50, (form.headcount || 1) + 1)">＋</text>
        </view>
      </view>
    </view>

    <view v-if="session.families.length" class="card">
      <view class="row between">
        <view>
          <view>在家庭日历上占位</view>
          <view class="muted">家人只会看到标题，避免和家里的饭冲突</view>
        </view>
        <switch :checked="placeInFamily" color="#e6772e" @change="(e: any) => (placeInFamily = e.detail.value)" />
      </view>
      <view v-if="placeInFamily && session.families.length > 1" class="row wrap families">
        <text
          v-for="f in session.families"
          :key="f.id"
          class="chip"
          :class="{ active: form.hostFamilyId === f.id }"
          @click="form.hostFamilyId = f.id"
        >{{ f.name }}</text>
      </view>
    </view>

    <button class="btn block" :loading="busy" @click="submit">{{ editingId ? '保存' : copyFrom ? '用这波人新建' : '创建并去邀请' }}</button>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { gatheringApi } from '@/api'
import type { GatheringDetail, GatheringForm, GatheringMode } from '@/api/types'
import { currentFamily, ensureSession, session } from '@/store/session'
import { addDays, dateLabel, MEAL_LABELS, MEAL_TYPES, MODE_HINTS, MODE_LABELS, today } from '@/utils/format'

const modes: GatheringMode[] = ['HOST_COOK', 'VOTE', 'POTLUCK']
const todayStr = today()
const editingId = ref<number | null>(null)
const copyFrom = ref<GatheringDetail | null>(null)
const busy = ref(false)
const hasDeadline = ref(false)
const deadlineDate = ref(todayStr)
const deadlineTime = ref('18:00')
const placeInFamily = ref(false)

const form = reactive<Required<Pick<GatheringForm, 'title' | 'mealDate' | 'mealType'>> & GatheringForm & { mode: GatheringMode }>({
  title: '',
  mealDate: addDays(todayStr, 1),
  mealType: 'DINNER',
  location: '',
  mode: 'HOST_COOK',
  note: '',
  headcount: 1,
  hostFamilyId: null,
})

watch(placeInFamily, (v) => {
  if (v && !form.hostFamilyId) form.hostFamilyId = currentFamily.value?.id ?? session.families[0]?.id ?? null
})

function fill(g: GatheringDetail, asCopy: boolean) {
  form.title = g.title
  form.mealDate = asCopy ? addDays(todayStr, 1) : g.mealDate
  form.mealType = g.mealType
  form.location = g.location || ''
  form.mode = g.mode
  form.note = asCopy ? '' : g.note || ''
  form.hostFamilyId = g.hostFamilyId ?? null
  placeInFamily.value = !!g.hostFamilyId
  if (!asCopy && g.deadlineAt) {
    hasDeadline.value = true
    deadlineDate.value = g.deadlineAt.slice(0, 10)
    deadlineTime.value = g.deadlineAt.slice(11, 16)
  }
}

onLoad(async (q) => {
  const query = (q || {}) as Record<string, string>
  const back = query.id ? `/pages/gathering/edit?id=${query.id}` : query.from ? `/pages/gathering/edit?from=${query.from}` : '/pages/gathering/edit'
  if (!(await ensureSession({ needFamily: false, redirect: back }))) return
  if (query.id) {
    editingId.value = Number(query.id)
    uni.setNavigationBarTitle({ title: '编辑聚餐' })
    fill(await gatheringApi.get(editingId.value), false)
  } else if (query.from) {
    copyFrom.value = await gatheringApi.get(Number(query.from))
    uni.setNavigationBarTitle({ title: '复用这波人' })
    fill(copyFrom.value, true)
  } else if (currentFamily.value) {
    placeInFamily.value = false
  }
})

async function submit() {
  if (!form.title.trim()) {
    uni.showToast({ title: '请填写标题', icon: 'none' })
    return
  }
  const body: GatheringForm = {
    title: form.title.trim(),
    mealDate: form.mealDate,
    mealType: form.mealType,
    location: form.location?.trim() || null,
    mode: form.mode,
    note: form.note?.trim() || null,
    deadlineAt: hasDeadline.value ? `${deadlineDate.value}T${deadlineTime.value}:00` : null,
    hostFamilyId: placeInFamily.value ? form.hostFamilyId : null,
  }
  busy.value = true
  try {
    let g: GatheringDetail
    if (editingId.value) g = await gatheringApi.update(editingId.value, body)
    else if (copyFrom.value) g = await gatheringApi.copy(copyFrom.value.id, body)
    else g = await gatheringApi.create({ ...body, headcount: form.headcount })
    uni.showToast({ title: editingId.value ? '已保存' : '已创建', icon: 'success' })
    if (editingId.value) uni.navigateBack()
    else uni.redirectTo({ url: `/pages/gathering/detail?id=${g.id}` })
  } finally {
    busy.value = false
  }
}
</script>

<style lang="scss" scoped>
.copy-tip { background: $fm-primary-light; color: $fm-primary; line-height: 1.6; }
.picker { display: flex; align-items: center; color: #333; }
.meal { margin-bottom: 20rpx; }
.area { height: 160rpx; padding-top: 16rpx; width: auto; }
.mode { padding: 20rpx; border-radius: 16rpx; border: 2rpx solid #f0ece8; margin-bottom: 16rpx; }
.mode.active { border-color: $fm-primary; background: $fm-primary-light; }
.mode .name { font-size: 30rpx; font-weight: 600; margin-bottom: 6rpx; }
.deadline { margin-top: 20rpx; }
.deadline picker { flex: 1; }
.stepper { background: #f3f0ec; border-radius: 999rpx; }
.step { width: 64rpx; text-align: center; font-size: 34rpx; color: $fm-primary; line-height: 60rpx; }
.val { width: 60rpx; text-align: center; font-weight: 600; }
.families { margin-top: 20rpx; }
.chip { padding: 10rpx 24rpx; border-radius: 999rpx; background: #f3f0ec; margin: 0 12rpx 12rpx 0; font-size: 26rpx; }
.chip.active { background: $fm-primary; color: #fff; }
</style>
