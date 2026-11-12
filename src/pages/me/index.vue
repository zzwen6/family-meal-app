<template>
  <view class="container">
    <view class="card profile row">
      <view class="avatar">{{ (session.user?.nickname || '我').slice(0, 1) }}</view>
      <view class="flex1">
        <view class="nick">{{ session.user?.nickname || '未登录' }}</view>
        <view class="muted">
          <text v-if="session.user?.wechatBound">微信登录</text>
          <text v-if="session.user?.username"> · 账号 {{ session.user.username }}</text>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="card-title">临时聚餐</view>
      <view class="muted">约朋友、亲戚来吃饭，发邀请让大家应邀点菜；和家里的点餐分开，客人看不到家里的数据。</view>
      <view class="row gap gathering-actions">
        <button class="btn ghost small flex1" @click="goGatherings">我的聚餐</button>
        <button class="btn small flex1" @click="newGathering">发起聚餐</button>
      </view>
    </view>

    <view v-if="session.families.length" class="card">
      <view class="card-title">我的家庭</view>
      <view
        v-for="f in session.families"
        :key="f.id"
        class="family row between"
        :class="{ active: currentFamily?.id === f.id }"
        @click="switchTo(f.id)"
      >
        <view>
          <view class="fname">{{ f.name }}</view>
          <view class="muted">{{ ROLE_LABELS[f.myRole] }} · {{ f.memberCount }} 人</view>
        </view>
        <text v-if="currentFamily?.id === f.id" class="tag primary">当前</text>
      </view>
      <view v-if="currentFamily?.inviteCode" class="invite row between">
        <view>
          <view class="muted">邀请码（发给家人加入）</view>
          <view class="code">{{ currentFamily.inviteCode }}</view>
        </view>
        <button class="btn ghost small" @click="copyInvite">复制</button>
      </view>
      <view v-if="currentFamily" class="muted rules">
        点餐截止：早餐前一天 {{ currentFamily.breakfastDeadline }}，午餐 {{ currentFamily.lunchDeadline }}，晚餐 {{ currentFamily.dinnerDeadline }}
      </view>
    </view>

    <view v-if="me" class="card">
      <view class="card-title">我的口味</view>
      <view class="muted label">在家里的称呼</view>
      <input class="input" v-model="profile.displayName" maxlength="64" />
      <view class="muted label">过敏（掌厨确认菜单时会看到）</view>
      <input class="input" v-model="profile.allergies" placeholder="比如：花生、海鲜" maxlength="255" />
      <view class="muted label">忌口 / 口味</view>
      <input class="input" v-model="profile.dietaryNotes" placeholder="比如：不吃香菜、少辣" maxlength="255" />
      <button class="btn block" @click="saveProfile">保存</button>
    </view>

    <view class="card">
      <view class="card-title">加入或创建家庭</view>
      <input class="input" v-model="inviteCode" placeholder="输入邀请码" maxlength="16" />
      <button class="btn ghost block" @click="join">加入家庭</button>
      <view class="divider" />
      <input class="input" v-model="familyName" placeholder="新家庭名称，比如：周家" maxlength="64" />
      <button class="btn ghost block" @click="create">创建家庭（我当管理员）</button>
    </view>

    <view v-if="notices.length" class="card">
      <view class="card-title">最近通知</view>
      <view v-for="n in notices" :key="n.id" class="notice">
        <view>{{ n.title }}</view>
        <view class="muted">{{ n.content }} · {{ n.createdAt.replace('T', ' ').slice(5, 16) }}</view>
      </view>
    </view>

    <button class="btn ghost block" @click="doLogout">退出登录</button>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { familyApi } from '@/api'
import type { MemberView, NotificationView } from '@/api/types'
import { currentFamily, ensureSession, logout, refreshFamily, refreshMe, selectFamily, session } from '@/store/session'
import { ROLE_LABELS } from '@/utils/format'

const members = ref<MemberView[]>([])
const notices = ref<NotificationView[]>([])
const inviteCode = ref('')
const familyName = ref('')
const profile = reactive({ displayName: '', allergies: '', dietaryNotes: '' })
const me = computed(() => members.value.find((m) => m.id === currentFamily.value?.myMemberId) || null)

async function load() {
  if (!(await ensureSession({ needFamily: false }))) return
  if (!currentFamily.value) {
    members.value = []
    notices.value = []
    return
  }
  const fid = currentFamily.value.id
  await refreshFamily()
  const [mem, notes] = await Promise.all([familyApi.members(fid), familyApi.notifications(fid, 5)])
  members.value = mem
  notices.value = notes
  if (me.value) {
    Object.assign(profile, {
      displayName: me.value.displayName,
      allergies: me.value.allergies || '',
      dietaryNotes: me.value.dietaryNotes || '',
    })
  }
}

function switchTo(id: number) {
  selectFamily(id)
  load()
}

function copyInvite() {
  const f = currentFamily.value
  if (!f?.inviteCode) return
  uni.setClipboardData({ data: `来「${f.name}」一起点菜吧！打开家庭点餐，输入邀请码：${f.inviteCode}` })
}

async function saveProfile() {
  if (!me.value) return
  await familyApi.updateMember(currentFamily.value!.id, me.value.id, { ...profile })
  uni.showToast({ title: '已保存', icon: 'success' })
  load()
}

async function join() {
  if (!inviteCode.value.trim()) return
  const f = await familyApi.join(inviteCode.value.trim())
  await refreshMe()
  selectFamily(f.id)
  inviteCode.value = ''
  uni.showToast({ title: `已加入${f.name}`, icon: 'success' })
  load()
}

async function create() {
  if (!familyName.value.trim()) return
  const f = await familyApi.create(familyName.value.trim())
  await refreshMe()
  selectFamily(f.id)
  familyName.value = ''
  uni.showToast({ title: '家庭已创建', icon: 'success' })
  load()
}

function goGatherings() {
  uni.navigateTo({ url: '/pages/gathering/list' })
}
function newGathering() {
  uni.navigateTo({ url: '/pages/gathering/edit' })
}

function doLogout() {
  uni.showModal({
    title: '退出登录？',
    success: (r) => {
      if (!r.confirm) return
      logout()
      uni.reLaunch({ url: '/pages/login/index' })
    },
  })
}

onShow(load)
</script>

<style lang="scss" scoped>
.profile { gap: 24rpx; }
.avatar { width: 100rpx; height: 100rpx; border-radius: 50%; background: $fm-primary; color: #fff; font-size: 44rpx; display: flex; align-items: center; justify-content: center; }
.flex1 { flex: 1; }
.nick { font-size: 34rpx; font-weight: 600; }
.family { padding: 18rpx 20rpx; border-radius: 14rpx; margin-bottom: 12rpx; background: #faf8f6; }
.family.active { background: $fm-primary-light; }
.fname { font-size: 30rpx; font-weight: 500; }
.invite { margin-top: 20rpx; padding-top: 20rpx; border-top: 1rpx solid #f2f2f2; }
.code { font-size: 40rpx; font-weight: 700; letter-spacing: 6rpx; color: $fm-primary; }
.rules { margin-top: 16rpx; line-height: 1.6; }
.label { margin-bottom: 10rpx; }
.divider { height: 1rpx; background: #f2f2f2; margin: 28rpx 0; }
.notice { padding: 14rpx 0; border-bottom: 1rpx solid #f2f2f2; }
.btn.small { margin: 0; }
.gathering-actions { margin-top: 20rpx; }
.gathering-actions .btn { flex: 1; }
</style>
