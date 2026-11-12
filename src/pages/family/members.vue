<template>
  <view class="container">
    <view class="card">
      <view class="card-title">家人与孩子</view>
      <view class="muted">可以把孩子设为「小朋友」，指定监护人。监护人（普通成员也可以）能帮孩子点餐和评价。</view>
      <button v-if="isAdmin" class="btn block" style="margin-top: 16rpx" @click="openCreate">给孩子或老人建账号</button>
    </view>

    <view v-for="m in members" :key="m.id" class="card">
      <view class="row between">
        <view>
          <view class="name">{{ m.displayName }}</view>
          <view class="muted">{{ ROLE_LABELS[m.role] }}<text v-if="m.username"> · {{ m.username }}</text></view>
          <view v-if="m.role === 'CHILD'" class="muted">监护人：{{ m.guardianName || '还没指定' }}</view>
        </view>
      </view>
      <view class="row gap wrap" style="margin-top: 16rpx">
        <button v-if="canHelp(m)" class="btn small" @click="helpWish(m.id)">帮TA点餐</button>
        <button v-if="isAdmin && m.id !== myId" class="btn ghost small" @click="openEdit(m)">编辑</button>
      </view>
    </view>

    <view v-if="showCreate" class="card">
      <view class="card-title">新建账号</view>
      <input class="input" v-model="createForm.displayName" placeholder="称呼，比如小宝" maxlength="64" />
      <view class="row wrap" style="margin-bottom: 16rpx">
        <text v-for="(l, k) in ROLE_LABELS" :key="k" class="chip" :class="{ active: createForm.role === k }" @click="createForm.role = k">{{ l }}</text>
      </view>
      <input class="input" v-model="createForm.username" placeholder="用户名（至少 3 位）" maxlength="32" />
      <input class="input" v-model="createForm.password" password placeholder="密码（至少 6 位）" maxlength="64" />
      <view v-if="createForm.role === 'CHILD'" class="muted" style="margin-bottom: 12rpx">监护人</view>
      <view v-if="createForm.role === 'CHILD'" class="row wrap" style="margin-bottom: 16rpx">
        <text v-for="g in adults" :key="g.id" class="chip" :class="{ active: createForm.guardianMemberId === g.id }" @click="createForm.guardianMemberId = g.id">{{ g.displayName }}</text>
      </view>
      <input class="input" v-model="createForm.allergies" placeholder="过敏（可选）" maxlength="255" />
      <button class="btn block" @click="create">创建</button>
      <button class="btn ghost block" style="margin-top: 16rpx" @click="showCreate = false">取消</button>
    </view>

    <view v-if="edit" class="card">
      <view class="card-title">编辑 {{ edit.displayName }}</view>
      <input class="input" v-model="edit.displayName" maxlength="64" />
      <view class="row wrap" style="margin-bottom: 16rpx">
        <text v-for="(l, k) in ROLE_LABELS" :key="k" class="chip" :class="{ active: edit.role === k }" @click="edit.role = k">{{ l }}</text>
      </view>
      <view v-if="edit.role === 'CHILD'" class="muted" style="margin-bottom: 12rpx">监护人</view>
      <view v-if="edit.role === 'CHILD'" class="row wrap" style="margin-bottom: 16rpx">
        <text v-for="g in adults" :key="g.id" class="chip" :class="{ active: edit.guardianMemberId === g.id }" @click="edit.guardianMemberId = g.id">{{ g.displayName }}</text>
      </view>
      <input class="input" v-model="edit.allergies" placeholder="过敏" maxlength="255" />
      <input class="input" v-model="edit.dietaryNotes" placeholder="忌口 / 口味" maxlength="255" />
      <input class="input" v-model="edit.password" password placeholder="重设密码（不改请留空）" maxlength="64" />
      <button class="btn block" @click="saveEdit">保存</button>
      <button class="btn ghost block" style="margin-top: 16rpx" @click="edit = null">取消</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { familyApi } from '@/api'
import type { MemberView, Role } from '@/api/types'
import { currentFamily, ensureSession, isAdmin, session } from '@/store/session'
import { ROLE_LABELS } from '@/utils/format'

const members = ref<MemberView[]>([])
const showCreate = ref(false)
const edit = ref<(MemberView & { password?: string }) | null>(null)
const myId = computed(() => currentFamily.value?.myMemberId)
const adults = computed(() => members.value.filter((m) => m.role !== 'CHILD'))

const createForm = reactive({
  displayName: '',
  role: 'CHILD' as Role,
  username: '',
  password: '',
  allergies: '',
  guardianMemberId: null as number | null,
})

async function load() {
  if (!(await ensureSession())) return
  members.value = await familyApi.members(currentFamily.value!.id)
}

function canHelp(m: MemberView) {
  if (m.role !== 'CHILD') return false
  if (['ADMIN', 'COOK'].includes(currentFamily.value?.myRole || '')) return true
  return m.guardianMemberId === myId.value
}

function helpWish(memberId: number) {
  uni.navigateTo({ url: `/pages/wish/edit?memberId=${memberId}` })
}

function openCreate() {
  showCreate.value = true
  createForm.displayName = ''
  createForm.role = 'CHILD'
  createForm.username = ''
  createForm.password = ''
  createForm.allergies = ''
  createForm.guardianMemberId = myId.value || null
}
function openEdit(m: MemberView) {
  edit.value = { ...m, password: '', allergies: m.allergies || '', dietaryNotes: m.dietaryNotes || '' }
}

async function create() {
  if (!createForm.displayName.trim() || !createForm.username.trim() || createForm.password.length < 6) {
    return uni.showToast({ title: '请填写称呼、用户名和至少 6 位密码', icon: 'none' })
  }
  await familyApi.createMember(currentFamily.value!.id, {
    ...createForm,
    guardianMemberId: createForm.role === 'CHILD' ? createForm.guardianMemberId : undefined,
  })
  uni.showToast({ title: '已创建', icon: 'success' })
  showCreate.value = false
  load()
}

async function saveEdit() {
  if (!edit.value) return
  const body: Parameters<typeof familyApi.updateMember>[2] = {
    displayName: edit.value.displayName,
    role: edit.value.role,
    allergies: edit.value.allergies,
    dietaryNotes: edit.value.dietaryNotes,
  }
  if (edit.value.role === 'CHILD') body.guardianMemberId = edit.value.guardianMemberId
  if (edit.value.password && edit.value.password.length >= 6) body.password = edit.value.password
  await familyApi.updateMember(currentFamily.value!.id, edit.value.id, body)
  uni.showToast({ title: '已保存', icon: 'success' })
  edit.value = null
  load()
}

onShow(load)
</script>

<style lang="scss" scoped>
.name { font-size: 32rpx; font-weight: 600; }
.chip { padding: 8rpx 20rpx; border-radius: 999rpx; background: #f3f0ec; margin: 0 12rpx 12rpx 0; }
.chip.active { background: $fm-primary; color: #fff; }
.btn.small { margin: 0; }
</style>
