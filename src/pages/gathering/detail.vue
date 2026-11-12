<template>
  <view class="container">
    <view v-if="denied" class="card empty-card">
      <view class="title">看不了这场聚餐</view>
      <view class="muted">只有发起人和本场参与者能查看。收到邀请的话，请从邀请卡片 / 链接进入。</view>
      <button class="btn ghost block" style="margin-top: 32rpx" @click="goList">我的聚餐</button>
    </view>

    <template v-else-if="g">
      <!-- 基本信息 -->
      <view class="card head">
        <view class="row between">
          <view class="title">{{ g.title }}</view>
          <text class="tag" :class="statusClass">{{ statusText }}</text>
        </view>
        <view class="muted line">
          {{ dateLabel(g.mealDate) }}{{ MEAL_LABELS[g.mealType] }}<text v-if="g.location"> · 📍{{ g.location }}</text>
        </view>
        <view class="line">
          <text class="tag primary">{{ MODE_LABELS[g.mode] }}</text>
          <text class="tag">{{ g.host ? '我发起' : g.hostName + ' 发起' }}</text>
          <text v-if="g.deadlineAt" class="tag" :class="g.canEditWishes ? '' : 'warn'">{{ deadlineLabel(g.deadlineAt) }} 截止点菜</text>
        </view>
        <view v-if="g.note" class="muted line">📝 {{ g.note }}</view>
        <view class="muted line mode-hint">{{ MODE_HINTS[g.mode] }}</view>
        <view class="row gap stats">
          <view class="stat"><view class="num">{{ g.headcount }}</view><view class="muted">人来</view></view>
          <view class="stat"><view class="num">{{ g.yesCount }}</view><view class="muted">位确认</view></view>
          <view class="stat"><view class="num">{{ g.maybeCount }}</view><view class="muted">待定</view></view>
          <view class="stat"><view class="num">{{ g.noCount }}</view><view class="muted">不来</view></view>
        </view>
        <view v-if="closed" class="muted closed-tip">这场已经散场，只能查看，不能再修改。</view>
      </view>

      <!-- 我的应邀 -->
      <view class="card">
        <view class="card-title"><text>我的应邀</text><text v-if="g.me.rsvp" class="muted">当前：{{ RSVP_LABELS[g.me.rsvp] }}</text></view>
        <view class="seg">
          <view
            v-for="r in rsvps"
            :key="r"
            class="seg-item"
            :class="{ active: my.rsvp === r, disabled: closed || (g.host && r === 'NO') }"
            @click="pickRsvp(r)"
          >{{ RSVP_LABELS[r] }}</view>
        </view>
        <view class="row between line">
          <text>一共来几个人（含自己）</text>
          <view class="row stepper">
            <text class="step" @click="!closed && (my.headcount = Math.max(1, my.headcount - 1))">−</text>
            <text class="val">{{ my.headcount }}</text>
            <text class="step" @click="!closed && (my.headcount = Math.min(20, my.headcount + 1))">＋</text>
          </view>
        </view>
        <input class="input line" v-model="my.dietaryNotes" :disabled="closed" placeholder="忌口 / 过敏（只有发起人能看到）" maxlength="255" />
        <input class="input" v-model="my.guestName" :disabled="closed" placeholder="在这场里的称呼" maxlength="64" />
        <view class="row gap">
          <button v-if="!closed" class="btn flex1" @click="saveRsvp">保存应邀</button>
          <!-- #ifdef MP-WEIXIN -->
          <button v-if="!closed && !g.readyAt" class="btn ghost flex1" @click="remind">🔔 提醒我开饭</button>
          <!-- #endif -->
        </view>
      </view>

      <!-- 邀请 -->
      <view v-if="g.inviteToken" class="card">
        <view class="card-title">邀请大家</view>
        <view class="muted">对方打开后登录即可应邀，不会加入你的家庭，也看不到你家的菜谱和日常菜单。</view>
        <view class="row gap line">
          <!-- #ifdef MP-WEIXIN -->
          <button class="btn flex1" open-type="share">发给微信好友 / 群</button>
          <!-- #endif -->
          <button class="btn ghost flex1" @click="copyInvite">复制邀请链接</button>
        </view>
        <view v-if="g.host" class="add-guest">
          <view class="muted">有人没有微信 / 账号？帮他登记一下：</view>
          <view class="row gap">
            <input class="input flex1" v-model="guestName" placeholder="称呼，比如：外婆" maxlength="64" />
            <button class="btn small" @click="addGuest">登记</button>
          </view>
        </view>
      </view>

      <!-- 参与者 -->
      <view class="card">
        <view class="card-title">参与者（{{ g.participants.length }}）</view>
        <view v-for="p in g.participants" :key="p.id" class="person row between">
          <view class="flex1">
            <text class="name">{{ p.name }}</text>
            <text v-if="p.host" class="tag primary" style="margin-left: 12rpx">发起人</text>
            <text v-if="p.me && !p.host" class="tag" style="margin-left: 12rpx">我</text>
            <text v-if="p.guest" class="tag" style="margin-left: 12rpx">代登记</text>
            <view v-if="p.dietaryNotes" class="muted">忌口：{{ p.dietaryNotes }}</view>
          </view>
          <text class="tag" :class="p.rsvp === 'YES' ? 'success' : p.rsvp === 'MAYBE' ? 'warn' : ''">{{ RSVP_LABELS[p.rsvp] }}{{ p.rsvp === 'YES' ? ' ' + p.headcount + '人' : '' }}</text>
          <text v-if="g.host && !p.host && !closed" class="remove" @click="removePerson(p.id, p.name)">✕</text>
        </view>
      </view>

      <!-- 按玩法：主人掌厨 -->
      <view v-if="g.mode === 'HOST_COOK'" class="card">
        <view class="card-title">大家想吃</view>
        <view v-if="!g.tally.length" class="muted">还没人说想吃什么</view>
        <view v-for="t in g.tally" :key="t.dishName" class="vote row between">
          <view class="flex1">
            <view class="name">{{ t.dishName }}</view>
            <view class="muted">{{ t.by.join('、') }} 想吃</view>
          </view>
          <text class="tag primary">{{ t.count }} 人</text>
        </view>
        <view v-if="myWishes.length" class="sub">
          <view class="muted">我点的</view>
          <view v-for="w in myWishes" :key="w.id" class="row between mine">
            <text>{{ w.dishName }}<text v-if="w.note" class="muted">（{{ w.note }}）</text></text>
            <text v-if="w.editable" class="link" @click="removeWish(w.id)">删除</text>
          </view>
        </view>
        <view v-if="g.canEditWishes" class="row gap add">
          <input class="input flex1" v-model="dishInput" placeholder="我想吃…" maxlength="64" />
          <button class="btn small" @click="addWish">提交</button>
        </view>
      </view>

      <!-- 按玩法：众筹投票 -->
      <view v-if="g.mode === 'VOTE'" class="card">
        <view class="card-title"><text>提议与投票</text><text class="muted">一人一菜一票</text></view>
        <view v-if="!g.wishes.length" class="muted">还没人提议，先提一个吧</view>
        <view v-for="(w, i) in g.wishes" :key="w.id" class="vote row between">
          <text class="rank">{{ i + 1 }}</text>
          <view class="flex1">
            <view class="name">{{ w.dishName }}</view>
            <view class="muted">{{ w.participantName }} 提议<text v-if="w.note"> · {{ w.note }}</text></view>
          </view>
          <text class="count">{{ w.votes }} 票</text>
          <button
            v-if="g.canEditWishes"
            class="btn small"
            :class="{ ghost: w.votedByMe }"
            @click="toggleVote(w.id, w.votedByMe)"
          >{{ w.votedByMe ? '已投' : '投一票' }}</button>
          <text v-if="(w.mine && w.editable) || (g.host && !closed)" class="remove" @click="removeWish(w.id)">✕</text>
        </view>
        <view v-if="g.canEditWishes" class="row gap add">
          <input class="input flex1" v-model="dishInput" placeholder="提议一道菜…" maxlength="64" />
          <button class="btn small" @click="addWish">提议</button>
        </view>
      </view>

      <!-- 按玩法：各带一道 -->
      <view v-if="g.mode === 'POTLUCK'" class="card">
        <view class="card-title">谁带什么</view>
        <view v-if="!g.wishes.length" class="muted">还没人认领，先认领一道吧</view>
        <view v-for="w in g.wishes" :key="w.id" class="vote row between">
          <view class="flex1">
            <view class="name">{{ w.dishName }}</view>
            <view class="muted">{{ w.participantName }} 带<text v-if="w.note"> · {{ w.note }}</text></view>
          </view>
          <text v-if="w.mine" class="tag primary">我带</text>
          <text v-if="(w.mine && w.editable) || (g.host && !closed)" class="remove" @click="removeWish(w.id)">✕</text>
        </view>
        <view v-if="g.unclaimed.length" class="muted sub">还没认领：{{ g.unclaimed.join('、') }}</view>
        <view v-if="g.canEditWishes" class="row gap add">
          <input class="input flex1" v-model="dishInput" placeholder="我来带…" maxlength="64" />
          <button class="btn small" @click="addWish">认领</button>
        </view>
      </view>

      <!-- 已确认菜单 -->
      <view v-if="g.menu.length" class="card">
        <view class="card-title"><text>{{ g.readyAt ? '开饭啦，今天吃这些' : '确认的菜单' }}</text></view>
        <view v-if="g.headcountChanged" class="tip warn-tip">
          确认菜单时是 {{ g.confirmedHeadcount }} 人，现在 {{ g.headcount }} 人。按人数算的份量和采购用量已自动按新人数换算。
        </view>
        <view v-for="m in g.menu" :key="m.id" class="menu-item row between">
          <view class="flex1">
            <view class="name">{{ m.dishName }}</view>
            <view class="muted">
              {{ m.servings }} 人份<text v-if="m.autoServings">（按出席人数）</text>
              <text v-if="m.bringByName"> · {{ m.bringByName }} 带</text>
              <text v-else-if="g.mode === 'POTLUCK'"> · 主人准备</text>
            </view>
            <view v-if="m.note" class="muted">{{ m.note }}</view>
          </view>
        </view>
      </view>

      <!-- 发起人：确认 / 修改菜单 -->
      <view v-if="g.host && !closed" class="card">
        <view class="card-title">
          <text>{{ g.menu.length ? '修改菜单' : '确认菜单' }}</text>
          <text class="link" @click="toggleEditor">{{ editor ? '收起' : '展开' }}</text>
        </view>
        <template v-if="editor">
          <view class="muted">勾选要做的菜；份数留空就按出席总人数（人数变了会自动跟着变）。</view>
          <view v-for="(c, i) in candidates" :key="i" class="cand row">
            <switch :checked="c.picked" color="#e6772e" @change="(e: any) => (c.picked = e.detail.value)" style="transform: scale(0.8)" />
            <view class="flex1">
              <input v-if="c.custom" class="input slim" v-model="c.dishName" placeholder="菜名" maxlength="64" />
              <view v-else class="name">{{ c.dishName }}</view>
              <view v-if="c.hint" class="muted">{{ c.hint }}</view>
            </view>
            <input class="input slim servings" type="number" v-model="c.servings" placeholder="份数" />
          </view>
          <view class="link add-row" @click="addCustom">＋ 加一道（主人自己准备）</view>
          <button class="btn block" style="margin-top: 20rpx" @click="confirmMenu">确认菜单</button>
        </template>
      </view>

      <!-- 采购清单：主人掌厨 / 众筹投票 -->
      <view v-if="g.mode !== 'POTLUCK' && (g.host || (shop && shop.items.length))" class="card">
        <view class="card-title">
          <text>采购清单</text>
          <text v-if="shop" class="muted">{{ shop.purchasedCount }}/{{ shop.total }} 已买 · 按 {{ shop.headcount }} 人</text>
        </view>
        <view v-if="shop && !shop.items.length" class="muted">还没有采购项。聚餐的菜是临时写的菜名，不套用家里的菜谱，请手动加。</view>
        <view v-for="it in shop?.items || []" :key="it.id" class="shop-item row between">
          <view class="row flex1" @click="g.host && !closed && togglePurchased(it.id, !it.purchased)">
            <text class="box" :class="{ on: it.purchased }">{{ it.purchased ? '✓' : '' }}</text>
            <view class="flex1">
              <view :class="{ done: it.purchased }">{{ it.name }} <text class="amount">{{ amountLabel(it.scaledAmount, it.unit) }}</text></view>
              <view class="muted">
                <text v-if="it.baseServings">{{ it.baseServings }} 人份 {{ amountLabel(it.amount, it.unit) }}，按 {{ shop?.headcount }} 人换算</text>
                <text v-if="it.forDish"> · 用于 {{ it.forDish }}</text>
                <text v-if="it.note"> · {{ it.note }}</text>
              </view>
            </view>
          </view>
          <text v-if="g.host && !closed" class="link" @click="editItem(it)">改</text>
          <text v-if="g.host && !closed" class="remove" @click="removeItem(it.id)">✕</text>
        </view>
        <view v-if="g.host && !closed" class="shop-form">
          <view class="row gap">
            <input class="input flex2" v-model="itemForm.name" placeholder="食材，如：草鱼" maxlength="64" />
            <input class="input flex1" type="digit" v-model="itemForm.amount" placeholder="用量" />
            <input class="input flex1" v-model="itemForm.unit" placeholder="单位" maxlength="16" />
          </view>
          <view class="row gap">
            <input class="input flex1" type="number" v-model="itemForm.baseServings" placeholder="几人份的量（留空不换算）" />
            <input class="input flex1" v-model="itemForm.forDish" placeholder="用于哪道菜（可选）" maxlength="64" />
          </view>
          <view class="row gap">
            <button class="btn small flex1" @click="saveItem">{{ itemForm.id ? '保存修改' : '加入清单' }}</button>
            <button v-if="itemForm.id" class="btn ghost small" @click="resetItem">取消</button>
          </view>
        </view>
      </view>

      <!-- 通知 -->
      <view v-if="notices.length" class="card">
        <view class="card-title">本场通知</view>
        <view v-for="n in notices" :key="n.id" class="notice">
          <view>{{ n.title }}</view>
          <view class="muted">{{ n.content }} · {{ n.createdAt.replace('T', ' ').slice(5, 16) }}</view>
        </view>
      </view>

      <!-- 发起人操作 -->
      <view v-if="g.host" class="card">
        <view class="card-title">发起人操作</view>
        <view class="row gap wrap ops">
          <button v-if="g.status === 'CONFIRMED' && !g.readyAt" class="btn" @click="ready">🍽 开饭啦</button>
          <button v-if="g.status === 'CONFIRMED' && !g.readyAt" class="btn ghost" @click="reopen">重新开放点菜</button>
          <button v-if="!closed" class="btn ghost" @click="edit">编辑信息</button>
          <button class="btn ghost" @click="copy">复用这波人</button>
          <button v-if="!closed" class="btn ghost danger" @click="close">散场</button>
        </view>
      </view>
    </template>
    <view v-else class="empty">加载中…</view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad, onPullDownRefresh, onShareAppMessage, onShow } from '@dcloudio/uni-app'
import { gatheringApi } from '@/api'
import { RequestError } from '@/api/request'
import type {
  GatheringConfirmItem, GatheringDetail, GatheringNotificationView, GatheringShoppingItemView, GatheringShoppingView, Rsvp,
} from '@/api/types'
import { ensureSession } from '@/store/session'
import {
  amountLabel, dateLabel, deadlineLabel, GATHERING_STATUS_LABELS, MEAL_LABELS, MODE_HINTS, MODE_LABELS, RSVP_LABELS,
} from '@/utils/format'
import { requestDinnerReminder } from '@/utils/subscribe'
import { inviteLink, sharePath } from '@/utils/invite'

const rsvps: Rsvp[] = ['YES', 'MAYBE', 'NO']
const id = ref(0)
const g = ref<GatheringDetail | null>(null)
const denied = ref(false)
const shop = ref<GatheringShoppingView | null>(null)
const notices = ref<GatheringNotificationView[]>([])
const my = reactive({ rsvp: 'YES' as Rsvp, headcount: 1, dietaryNotes: '', guestName: '' })
const dishInput = ref('')
const guestName = ref('')
const editor = ref(false)

interface Candidate { picked: boolean; custom: boolean; dishName: string; wishId?: number; servings: string; hint?: string }
const candidates = ref<Candidate[]>([])
const itemForm = reactive({ id: 0, name: '', amount: '', unit: '', baseServings: '', forDish: '' })

const closed = computed(() => g.value?.status === 'CLOSED')
const myWishes = computed(() => g.value?.wishes.filter((w) => w.mine) || [])
const statusText = computed(() => (g.value?.readyAt && !closed.value ? '开饭啦' : g.value ? GATHERING_STATUS_LABELS[g.value.status] : ''))
const statusClass = computed(() => (closed.value ? '' : g.value?.status === 'CONFIRMED' ? 'success' : 'primary'))

function apply(d: GatheringDetail) {
  g.value = d
  Object.assign(my, {
    rsvp: d.me.rsvp,
    headcount: d.me.headcount,
    dietaryNotes: d.me.dietaryNotes || '',
    guestName: d.me.name,
  })
  if (editor.value) buildCandidates()
  if (d.mode !== 'POTLUCK') loadShopping()
}

async function load() {
  if (!id.value) return
  if (!(await ensureSession({ needFamily: false, redirect: `/pages/gathering/detail?id=${id.value}` }))) return
  try {
    apply(await gatheringApi.get(id.value, true))
    denied.value = false
    notices.value = await gatheringApi.notifications(id.value, 5).catch(() => [])
  } catch (e) {
    if (e instanceof RequestError && (e.status === 403 || e.status === 404)) denied.value = true
    else uni.showToast({ title: (e as Error).message, icon: 'none' })
  } finally {
    uni.stopPullDownRefresh()
  }
}

async function loadShopping() {
  shop.value = await gatheringApi.shopping(id.value).catch(() => null)
}

function pickRsvp(r: Rsvp) {
  if (closed.value || (g.value?.host && r === 'NO')) return
  my.rsvp = r
}

async function saveRsvp() {
  apply(await gatheringApi.rsvp(id.value, {
    rsvp: my.rsvp,
    headcount: my.headcount,
    dietaryNotes: my.dietaryNotes.trim(),
    guestName: my.guestName.trim() || undefined,
  }))
  uni.showToast({ title: '已保存', icon: 'success' })
}

function remind() {
  requestDinnerReminder()
}

function copyInvite() {
  if (!g.value?.inviteToken) return
  uni.setClipboardData({ data: `${g.value.hostName}邀请你参加「${g.value.title}」（${dateLabel(g.value.mealDate)}${MEAL_LABELS[g.value.mealType]}），打开链接应邀：${inviteLink(g.value.inviteToken)}` })
}

async function addGuest() {
  if (!guestName.value.trim()) return
  apply(await gatheringApi.addGuest(id.value, { guestName: guestName.value.trim() }))
  guestName.value = ''
}

function removePerson(pid: number, name: string) {
  uni.showModal({
    title: `移除 ${name}？`,
    content: '他提交的菜和投票也会一起删掉',
    success: async (r) => {
      if (r.confirm) apply(await gatheringApi.removeParticipant(id.value, pid))
    },
  })
}

async function addWish() {
  const name = dishInput.value.trim()
  if (!name) return
  apply(await gatheringApi.addWish(id.value, { dishName: name }))
  dishInput.value = ''
}

async function removeWish(wishId: number) {
  apply(await gatheringApi.deleteWish(id.value, wishId))
}

async function toggleVote(wishId: number, voted: boolean) {
  apply(voted ? await gatheringApi.unvote(id.value, wishId) : await gatheringApi.vote(id.value, wishId))
}

/** 按玩法给出候选：主人掌厨按想吃的人数，众筹按票数（默认勾有票的），各带一道默认勾所有认领。 */
function buildCandidates() {
  const d = g.value
  if (!d) return
  const inMenu = new Map(d.menu.map((m) => [m.wishId ? `w${m.wishId}` : `n${m.dishName}`, m]))
  const list: Candidate[] = []
  if (d.mode === 'HOST_COOK') {
    d.tally.forEach((t) => {
      const m = inMenu.get(`n${t.dishName}`)
      list.push({ picked: d.menu.length ? !!m : true, custom: false, dishName: t.dishName, servings: m && !m.autoServings ? String(m.servings) : '', hint: `${t.count} 人想吃` })
    })
  } else {
    d.wishes.forEach((w) => {
      const m = inMenu.get(`w${w.id}`)
      const def = d.mode === 'VOTE' ? w.votes > 0 : true
      list.push({
        picked: d.menu.length ? !!m : def,
        custom: false,
        dishName: w.dishName,
        wishId: w.id,
        servings: m && !m.autoServings ? String(m.servings) : '',
        hint: d.mode === 'VOTE' ? `${w.votes} 票 · ${w.participantName} 提议` : `${w.participantName} 带`,
      })
    })
  }
  // 之前确认过、但不在候选里的菜（主人自己加的）
  d.menu.forEach((m) => {
    const known = m.wishId ? list.some((c) => c.wishId === m.wishId) : list.some((c) => c.dishName === m.dishName)
    if (!known) list.push({ picked: true, custom: true, dishName: m.dishName, servings: m.autoServings ? '' : String(m.servings) })
  })
  candidates.value = list
}

function toggleEditor() {
  editor.value = !editor.value
  if (editor.value) buildCandidates()
}

function addCustom() {
  candidates.value.push({ picked: true, custom: true, dishName: '', servings: '' })
}

async function confirmMenu() {
  const items: GatheringConfirmItem[] = candidates.value
    .filter((c) => c.picked && c.dishName.trim())
    .map((c) => ({
      wishId: c.wishId ?? null,
      dishName: c.wishId ? null : c.dishName.trim(),
      servings: c.servings ? Number(c.servings) : null,
    }))
  if (!items.length) {
    uni.showToast({ title: '至少选一道菜', icon: 'none' })
    return
  }
  apply(await gatheringApi.confirm(id.value, items))
  editor.value = false
  uni.showToast({ title: '菜单已确认', icon: 'success' })
}

async function togglePurchased(itemId: number, purchased: boolean) {
  shop.value = await gatheringApi.markPurchased(id.value, itemId, purchased)
}

function editItem(it: GatheringShoppingItemView) {
  Object.assign(itemForm, {
    id: it.id,
    name: it.name,
    amount: it.amount === undefined || it.amount === null ? '' : String(it.amount),
    unit: it.unit || '',
    baseServings: it.baseServings ? String(it.baseServings) : '',
    forDish: it.forDish || '',
  })
}

function resetItem() {
  Object.assign(itemForm, { id: 0, name: '', amount: '', unit: '', baseServings: '', forDish: '' })
}

async function saveItem() {
  if (!itemForm.name.trim()) {
    uni.showToast({ title: '请填写食材', icon: 'none' })
    return
  }
  const body = {
    name: itemForm.name.trim(),
    amount: itemForm.amount === '' ? null : Number(itemForm.amount),
    unit: itemForm.unit.trim() || null,
    baseServings: itemForm.baseServings === '' ? null : Number(itemForm.baseServings),
    forDish: itemForm.forDish.trim() || null,
  }
  shop.value = itemForm.id
    ? await gatheringApi.updateShoppingItem(id.value, itemForm.id, body)
    : await gatheringApi.addShoppingItem(id.value, body)
  resetItem()
}

async function removeItem(itemId: number) {
  shop.value = await gatheringApi.deleteShoppingItem(id.value, itemId)
}

async function ready() {
  apply(await gatheringApi.ready(id.value))
  notices.value = await gatheringApi.notifications(id.value, 5).catch(() => [])
  uni.showToast({ title: '已通知大家开饭', icon: 'success' })
}

async function reopen() {
  apply(await gatheringApi.reopen(id.value))
  uni.showToast({ title: '已重新开放', icon: 'none' })
}

function edit() {
  uni.navigateTo({ url: `/pages/gathering/edit?id=${id.value}` })
}

function copy() {
  uni.navigateTo({ url: `/pages/gathering/edit?from=${id.value}` })
}

function close() {
  uni.showModal({
    title: '散场？',
    content: '散场后邀请失效，大家只能查看，不能再修改。',
    success: async (r) => {
      if (!r.confirm) return
      apply(await gatheringApi.close(id.value))
      uni.showToast({ title: '已散场', icon: 'none' })
    },
  })
}

function goList() {
  uni.redirectTo({ url: '/pages/gathering/list' })
}

onLoad((q) => {
  id.value = Number((q as Record<string, string> | undefined)?.id || 0)
})
onShow(load)
onPullDownRefresh(load)

// 微信里右上角 / open-type="share" 分享成小程序卡片，落到邀请页
onShareAppMessage(() => {
  const d = g.value
  if (!d?.inviteToken) return { title: '家庭点餐', path: '/pages/index/index' }
  return {
    title: `${d.hostName}邀请你：${d.title}（${dateLabel(d.mealDate)}${MEAL_LABELS[d.mealType]}）`,
    path: sharePath(d.inviteToken),
  }
})
</script>

<style lang="scss" scoped>
.title { font-size: 36rpx; font-weight: 700; }
.line { margin-top: 14rpx; }
.mode-hint { line-height: 1.6; }
.stats { margin-top: 24rpx; }
.stat { flex: 1; text-align: center; background: $fm-bg; border-radius: 16rpx; padding: 14rpx 0; }
.num { font-size: 36rpx; font-weight: 700; color: $fm-primary; }
.closed-tip { margin-top: 20rpx; }
.empty-card { text-align: center; padding: 60rpx 32rpx; }
.empty-card .title { margin-bottom: 12rpx; }
.seg-item.disabled { opacity: 0.4; }
.stepper { background: #f3f0ec; border-radius: 999rpx; }
.step { width: 64rpx; text-align: center; font-size: 34rpx; color: $fm-primary; line-height: 60rpx; }
.val { width: 60rpx; text-align: center; font-weight: 600; }
.flex1 { flex: 1; }
.flex2 { flex: 2; }
.btn.flex1 { margin: 0; }
.add-guest { margin-top: 24rpx; padding-top: 20rpx; border-top: 1rpx solid #f2f2f2; }
.add-guest .muted { margin-bottom: 12rpx; }
.person { padding: 16rpx 0; border-bottom: 1rpx solid #f2f2f2; gap: 12rpx; }
.person:last-child { border-bottom: none; }
.name { font-size: 30rpx; font-weight: 500; }
.remove { color: #c0c0c0; font-size: 28rpx; padding: 0 8rpx 0 16rpx; }
.vote { padding: 16rpx 0; border-bottom: 1rpx solid #f2f2f2; gap: 12rpx; }
.rank { width: 40rpx; color: $fm-primary; font-weight: 700; }
.count { color: $fm-primary; font-weight: 600; margin-right: 8rpx; }
.btn.small { margin: 0; }
.sub { margin-top: 20rpx; }
.mine { padding: 8rpx 0; }
.add { margin-top: 20rpx; }
.add .input { margin-bottom: 0; }
.link { color: $fm-primary; font-size: 26rpx; font-weight: normal; }
.tip { padding: 16rpx 20rpx; border-radius: 12rpx; font-size: 24rpx; line-height: 1.6; margin-bottom: 16rpx; }
.warn-tip { background: #fff3e0; color: #b4610f; }
.menu-item { padding: 16rpx 0; border-bottom: 1rpx solid #f2f2f2; }
.cand { padding: 12rpx 0; gap: 12rpx; border-bottom: 1rpx solid #f6f6f6; }
.slim { height: 64rpx; margin-bottom: 0; font-size: 26rpx; }
.servings { width: 140rpx; }
.add-row { margin-top: 20rpx; }
.shop-item { padding: 16rpx 0; border-bottom: 1rpx solid #f2f2f2; gap: 12rpx; }
.box { width: 40rpx; height: 40rpx; border: 2rpx solid #ccc; border-radius: 8rpx; margin-right: 16rpx; text-align: center; line-height: 40rpx; color: #fff; flex-shrink: 0; }
.box.on { background: $fm-primary; border-color: $fm-primary; }
.done { text-decoration: line-through; color: #aaa; }
.amount { color: $fm-primary; margin-left: 8rpx; }
.shop-form { margin-top: 24rpx; }
.notice { padding: 14rpx 0; border-bottom: 1rpx solid #f2f2f2; }
.ops .btn { margin: 0 0 16rpx; }
.btn.ghost.danger { color: #d64545; border-color: #d64545; }
</style>
