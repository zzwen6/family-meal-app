<template>
  <view class="login">
    <view class="brand">
      <view class="logo">🍲</view>
      <view class="title">家庭点餐</view>
      <view class="muted">今晚想吃什么，提前说一声</view>
      <view v-if="redirect" class="muted redirect-tip">登录后继续刚才的聚餐邀请</view>
    </view>

    <!-- #ifdef MP-WEIXIN -->
    <view class="card">
      <button class="btn block" :loading="busy" @click="wx">微信一键登录</button>
          </view>
    <!-- #endif -->

    <view class="card">
      <view class="seg">
        <view class="seg-item" :class="{ active: mode === 'login' }" @click="mode = 'login'">账号登录</view>
        <view class="seg-item" :class="{ active: mode === 'register' }" @click="mode = 'register'">注册</view>
      </view>
      <view class="form">
        <input class="input" v-model="form.username" placeholder="用户名（字母/数字）" maxlength="32" />
        <input class="input" v-model="form.password" password placeholder="密码（至少 6 位）" maxlength="64" />
        <template v-if="mode === 'register'">
          <input class="input" v-model="form.nickname" placeholder="昵称，比如：妈妈、小宝" maxlength="64" />
          <input class="input" v-model="form.inviteCode" placeholder="家庭邀请码（可选，问家里管理员要）" maxlength="16" />
        </template>
        <button class="btn block" :loading="busy" @click="submit">{{ mode === 'login' ? '登录' : '注册并进入' }}</button>
      </view>
      <!-- #ifdef H5 -->
      <view class="muted tip">请用账号登录</view>
      <!-- #endif -->
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { authApi } from '@/api'
import { onLoggedIn, safeRedirect, wechatLogin } from '@/store/session'

const mode = ref<'login' | 'register'>('login')
const busy = ref(false)
const form = reactive({ username: '', password: '', nickname: '', inviteCode: '' })
/** 从邀请页等地方跳过来时，登录后回到原页面 */
const redirect = ref<string | null>(null)

onLoad((q) => {
  redirect.value = safeRedirect((q as Record<string, string> | undefined)?.redirect)
})

function done() {
  uni.reLaunch({ url: redirect.value || '/pages/index/index' })
}

async function submit() {
  if (!form.username.trim() || !form.password) {
    uni.showToast({ title: '请输入用户名和密码', icon: 'none' })
    return
  }
  if (mode.value === 'register' && !form.nickname.trim()) {
    uni.showToast({ title: '请填写昵称', icon: 'none' })
    return
  }
  busy.value = true
  try {
    const res = mode.value === 'login'
      ? await authApi.login(form.username.trim(), form.password)
      : await authApi.register({
          username: form.username.trim(),
          password: form.password,
          nickname: form.nickname.trim(),
          inviteCode: form.inviteCode.trim() || undefined,
        })
    onLoggedIn(res)
    done()
  } finally {
    busy.value = false
  }
}

async function wx() {
  busy.value = true
  try {
    await wechatLogin()
    done()
  } catch (e) {
    console.warn(e)
  } finally {
    busy.value = false
  }
}
</script>

<style lang="scss" scoped>
.login { padding: 80rpx 40rpx; min-height: 100vh; box-sizing: border-box; background: linear-gradient(180deg, #fff1e6 0%, #f6f4f1 50%); }
.brand { text-align: center; margin-bottom: 60rpx; }
.logo { font-size: 100rpx; }
.title { font-size: 48rpx; font-weight: 700; margin: 10rpx 0; }
.form { margin-top: 32rpx; }
.tip { margin-top: 20rpx; line-height: 1.6; }
.redirect-tip { margin-top: 12rpx; color: $fm-primary; }
</style>
