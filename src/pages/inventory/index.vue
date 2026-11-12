<template>
  <view class="container">
    <view class="card">
      <view class="card-title">
        <text>家庭库存</text>
        <text v-if="canEdit" class="link" @click="editInv()">登记</text>
      </view>
      <view class="muted">生成采购清单时会对照这里的数量、少买家里已有的，但生成时不改库存数字。勾选已买会入账，用掉对得上食材的剩菜、以及开饭时会按「家里已有」的量扣库存，也可以随时手工改。</view>
      <view v-if="!inventory.length" class="muted" style="margin-top: 16rpx">还没有库存</view>
      <view v-for="it in inventory" :key="it.id" class="item row between">
        <view>
          <view>{{ it.name }} <text v-if="it.staple" class="tag">常备</text></view>
          <view class="muted">{{ amountLabel(it.amount, it.unit) }}<text v-if="it.note"> · {{ it.note }}</text></view>
        </view>
        <view v-if="canEdit" class="row gap">
          <text class="link" @click="editInv(it)">改</text>
          <text class="remove" @click="removeInv(it)">删</text>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="card-title">
        <text>剩菜</text>
        <text v-if="canEdit" class="link" @click="editLo()">登记</text>
      </view>
      <view class="row wrap" style="margin-bottom: 12rpx">
        <text class="chip small" :class="{ active: !showUsed }" @click="showUsed = false; load()">未用完</text>
        <text class="chip small" :class="{ active: showUsed }" @click="showUsed = true; load()">全部</text>
      </view>
      <view v-if="!leftovers.length" class="muted">没有剩菜</view>
      <view v-for="l in leftovers" :key="l.id" class="item row between">
        <view>
          <view>{{ l.name }} <text class="tag" :class="l.used ? '' : 'success'">{{ l.used ? '已用完' : '可先吃' }}</text></view>
          <view class="muted">
            {{ amountLabel(l.amount, l.unit) }}
            <text v-if="l.expiresOn"> · 保鲜到 {{ l.expiresOn }}</text>
          </view>
        </view>
        <view v-if="canEdit" class="row gap">
          <text v-if="!l.used" class="link" @click="useLo(l)">用掉</text>
          <text v-if="!l.used" class="link" @click="editLo(l)">改</text>
          <text class="remove" @click="removeLo(l)">删</text>
        </view>
      </view>
    </view>

    <view v-if="ledger.length" class="card">
      <view class="card-title">最近变动</view>
      <view v-for="l in ledger" :key="l.id" class="item">
        <view class="row between">
          <text>{{ LEDGER_LABELS[l.sourceType] || l.sourceType }} · {{ l.name }}</text>
          <text>{{ l.delta > 0 ? '+' : '' }}{{ l.delta }}{{ l.unit || '' }}</text>
        </view>
        <view class="muted">{{ l.note || '' }}<text v-if="l.balanceAfter != null"> · 结余 {{ l.balanceAfter }}{{ l.unit || '' }}</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { inventoryApi, leftoverApi } from '@/api'
import type { InventoryView, LedgerView, LeftoverView } from '@/api/types'
import { canCook, currentFamily, ensureSession } from '@/store/session'
import { amountLabel, LEDGER_LABELS } from '@/utils/format'

const inventory = ref<InventoryView[]>([])
const leftovers = ref<LeftoverView[]>([])
const ledger = ref<LedgerView[]>([])
const showUsed = ref(false)
const canEdit = computed(() => canCook.value)

async function load() {
  if (!(await ensureSession())) return
  const fid = currentFamily.value!.id
  try {
    const [inv, lo, led] = await Promise.all([
      inventoryApi.list(fid),
      leftoverApi.list(fid, showUsed.value ? undefined : false),
      inventoryApi.ledger(fid, 15),
    ])
    inventory.value = inv
    leftovers.value = lo
    ledger.value = led
  } finally {
    uni.stopPullDownRefresh()
  }
}

function promptFields(title: string, fields: { k: string; t: string; v: string }[]): Promise<Record<string, string> | null> {
  // 小程序没有多字段对话框，用连续 prompt 简化录入
  return new Promise(async (resolve) => {
    const out: Record<string, string> = {}
    for (const f of fields) {
      const r = await new Promise<UniApp.ShowModalRes>((ok) => {
        uni.showModal({ title, editable: true, placeholderText: f.t, content: f.v, success: ok, fail: () => ok({ confirm: false, cancel: true } as UniApp.ShowModalRes) })
      })
      if (!r.confirm) {
        resolve(null)
        return
      }
      out[f.k] = (r.content ?? f.v ?? '').trim()
    }
    resolve(out)
  })
}

async function editInv(it?: InventoryView) {
  const v = await promptFields(it ? '改库存' : '登记库存', [
    { k: 'name', t: '名称', v: it?.name || '' },
    { k: 'amount', t: '数量（可空）', v: it?.amount != null ? String(it.amount) : '' },
    { k: 'unit', t: '单位', v: it?.unit || '' },
  ])
  if (!v || !v.name) return
  const amount = v.amount ? Number(v.amount) : null
  const body = { name: v.name, amount: Number.isFinite(amount as number) ? amount : null, unit: v.unit || undefined, staple: it?.staple || false, note: it?.note }
  const fid = currentFamily.value!.id
  if (it) await inventoryApi.update(fid, it.id, body)
  else await inventoryApi.create(fid, body)
  load()
}

async function removeInv(it: InventoryView) {
  uni.showModal({
    title: `删除库存「${it.name}」？`,
    success: async (r) => {
      if (!r.confirm) return
      await inventoryApi.remove(currentFamily.value!.id, it.id)
      load()
    },
  })
}

async function editLo(it?: LeftoverView) {
  const v = await promptFields(it ? '改剩菜' : '登记剩菜', [
    { k: 'name', t: '名称', v: it?.name || '' },
    { k: 'amount', t: '数量（可空）', v: it?.amount != null ? String(it.amount) : '' },
    { k: 'unit', t: '单位', v: it?.unit || '' },
    { k: 'expiresOn', t: '保鲜到期日 YYYY-MM-DD', v: it?.expiresOn || '' },
  ])
  if (!v || !v.name) return
  const amount = v.amount ? Number(v.amount) : null
  const body = { name: v.name, amount: Number.isFinite(amount as number) ? amount : null, unit: v.unit || undefined, expiresOn: v.expiresOn || null, note: it?.note }
  const fid = currentFamily.value!.id
  if (it) await leftoverApi.update(fid, it.id, body)
  else await leftoverApi.create(fid, body)
  uni.showToast({ title: '已保存', icon: 'success' })
  load()
}

async function useLo(it: LeftoverView) {
  await leftoverApi.use(currentFamily.value!.id, it.id)
  uni.showToast({ title: '已标记用完', icon: 'success' })
  load()
}

async function removeLo(it: LeftoverView) {
  uni.showModal({
    title: `删除剩菜「${it.name}」？`,
    success: async (r) => {
      if (!r.confirm) return
      await leftoverApi.remove(currentFamily.value!.id, it.id)
      load()
    },
  })
}

onShow(load)
onPullDownRefresh(load)
</script>

<style lang="scss" scoped>
.link { color: $fm-primary; font-size: 26rpx; font-weight: normal; }
.remove { color: #bbb; font-size: 26rpx; }
.item { padding: 18rpx 0; border-bottom: 1rpx solid #f2f2f2; }
.chip { padding: 8rpx 22rpx; border-radius: 999rpx; background: #f3f0ec; margin: 0 12rpx 12rpx 0; font-size: 24rpx; }
.chip.small { padding: 6rpx 20rpx; }
.chip.active { background: $fm-primary; color: #fff; }
</style>
