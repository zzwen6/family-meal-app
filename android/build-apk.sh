#!/usr/bin/env bash
# 构建已签名的 release APK，输出到 ../dist-android/家庭点餐.apk
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
DIST_DIR="$ROOT/dist-android"

export JAVA_HOME="${JAVA_HOME:-/home/box/tools/jdk-21.0.13+9}"
export ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/home/box/Android/Sdk}}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$PATH"

if [[ ! -x "$JAVA_HOME/bin/java" ]]; then
  echo "找不到 JDK：请设置 JAVA_HOME（需要 17+，当前值：$JAVA_HOME）" >&2
  exit 1
fi
if [[ ! -d "$ANDROID_HOME/platforms/android-34" ]]; then
  echo "找不到 Android SDK platforms/android-34。请设置 ANDROID_HOME，并安装 platform-34 和 build-tools。" >&2
  exit 1
fi

mkdir -p "$DIST_DIR"
# 每次写入，不提交到 Git
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > "$ANDROID_DIR/local.properties"

PROPS="$DIST_DIR/keystore.properties"
if [[ ! -f "$PROPS" && -z "${FAMILY_MEAL_STORE_FILE:-}" && ! -f "$ANDROID_DIR/keystore.properties" ]]; then
  echo "未找到签名配置：$PROPS" >&2
  echo "请按 README「Android 应用（APK）」一节生成证书，或设置 FAMILY_MEAL_STORE_FILE 等环境变量。" >&2
  exit 1
fi

cd "$ANDROID_DIR"
chmod +x ./gradlew
./gradlew :app:assembleRelease --no-daemon "$@"

OUT_DIR="$ANDROID_DIR/app/build/outputs/apk/release"
shopt -s nullglob
APKS=("$OUT_DIR"/*-release.apk)
if [[ ${#APKS[@]} -eq 0 ]]; then
  echo "Gradle 没有产出 *-release.apk（见 $OUT_DIR）" >&2
  exit 1
fi
APK_SRC="${APKS[0]}"

APKSIGNER=""
if [[ -x "$ANDROID_HOME/build-tools/34.0.0/apksigner" ]]; then
  APKSIGNER="$ANDROID_HOME/build-tools/34.0.0/apksigner"
else
  for c in "$ANDROID_HOME"/build-tools/*/apksigner; do
    APKSIGNER="$c"
  done
fi
if [[ -n "$APKSIGNER" ]]; then
  "$APKSIGNER" verify --min-sdk-version 24 "$APK_SRC"
  echo "apksigner 校验通过：$APK_SRC"
else
  echo "警告：找不到 apksigner，跳过签名校验" >&2
fi

DEST="$DIST_DIR/家庭点餐.apk"
cp -f "$APK_SRC" "$DEST"
echo "已生成：$DEST"
echo "大小：$(wc -c < "$DEST") 字节"
sha256sum "$DEST"
