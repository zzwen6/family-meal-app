<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { bootstrap } from '@/store/session'

onLaunch(() => {
  bootstrap()
})
</script>

<style lang="scss">
page {
  background: $fm-bg;
  color: $fm-text;
  font-size: 28rpx;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif;
}
.container { padding: 24rpx 24rpx 48rpx; }
.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);
}
.card-title {
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.muted { color: $fm-muted; font-size: 24rpx; }
.row { display: flex; align-items: center; }
.between { justify-content: space-between; }
.wrap { flex-wrap: wrap; }
.gap { gap: 16rpx; }
.tag {
  display: inline-block;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  background: #f3f3f3;
  color: #666;
  margin-right: 10rpx;
  margin-bottom: 8rpx;
}
.tag.primary { background: $fm-primary-light; color: $fm-primary; }
.tag.success { background: #e8f6ee; color: #2f9e5e; }
.tag.warn { background: #fff3e0; color: #d9822b; }
.tag.danger { background: #fdecec; color: #d64545; }
.btn {
  background: $fm-primary;
  color: #fff;
  border-radius: 999rpx;
  font-size: 28rpx;
  line-height: 80rpx;
  height: 80rpx;
  border: none;
  padding: 0 40rpx;
  text-align: center;
}
.btn::after { border: none; }
.btn.ghost { background: #fff; color: $fm-primary; border: 2rpx solid $fm-primary; line-height: 76rpx; }
.btn.small { height: 60rpx; line-height: 60rpx; font-size: 24rpx; padding: 0 28rpx; }
.btn.ghost.small { line-height: 56rpx; }
.btn.block { width: 100%; }
.btn[disabled] { opacity: 0.5; }
.input {
  background: #f7f7f7;
  border-radius: 12rpx;
  height: 80rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  margin-bottom: 20rpx;
}
.empty { text-align: center; color: $fm-muted; padding: 60rpx 0; }
.seg { display: flex; background: #f3f0ec; border-radius: 999rpx; padding: 6rpx; }
.seg-item { flex: 1; text-align: center; padding: 12rpx 0; border-radius: 999rpx; font-size: 26rpx; color: #666; }
.seg-item.active { background: #fff; color: $fm-primary; font-weight: 600; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06); }
</style>
