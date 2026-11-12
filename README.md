# family-meal-app · 家庭点餐（微信小程序 + H5 + Android）

家人提前说「今晚想吃什么」，掌厨统一定菜单、自动出采购清单；约朋友来吃饭时发起「临时聚餐」，发卡片邀请、大家应邀点菜。一个代码库同时出 **微信小程序**、**H5** 和可侧载安装的 **Android APK**（uni-app · Vue 3 · TypeScript；APK 用系统 WebView 加载同套 H5）。

后端与管理后台在 [zzwen6/family-meal-api](https://github.com/zzwen6/family-meal-api)。

## 页面

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 今晚（tab） | `pages/index/index` | 选日期和餐次，看截止倒计时、指定掌厨、本餐计划、在家人数、吃腻/公平/剩菜提示、我的意愿、全家想吃、已确认菜单和本餐营养估算、开饭后评价、最新通知；这餐有家人发起的临时聚餐时显示提示；小程序里可「🔔 提醒我开饭」。儿童界面字号更大、文案更口语（可用更简单的「大约多少热量」），不进掌厨工作台和采购 |
| 我想吃 | `pages/wish/edit` | 从菜谱选或直接写菜名；很想吃 / 都可以 / 别做这个；份数；这餐不在家吃；最近吃过达到阈值时提示可能吃腻；掌厨或监护人可替孩子点（`?memberId=`）；儿童和「帮孩子点」用简化流程（我想吃 / 不吃这个 / 今晚不在家，大卡片和 +/- 份数）；截止前可改可删 |
| 菜谱（tab） | `pages/dish/list` | 分类、搜索；掌厨和管理员可新建菜谱。儿童账号下这个 tab 显示为「我想吃」，点封面卡片就去点餐 |
| 菜谱详情 | `pages/dish/detail` | 封面、按份数换算主料、配料调味（标出家里常备），步骤图和短视频（小程序用 video 组件，H5 用 video），营养估算（整道菜 / 每人份，列出未计入的用料）；掌厨可进入编辑 |
| 编辑菜谱 | `pages/dish/edit` | 管理员和掌厨：写菜名和用料，上传封面，给步骤配图或短视频，可选手工覆盖整道菜的营养 |
| 掌厨工作台 | `pages/cook/index` | 指定掌厨与改派、吃腻/忌口/公平提示、谁没点、谁不在家、过敏提醒；采纳 / 换一道 / 从菜谱加 / 临时菜名；确认前预览提示；勾选用掉剩菜；确认后可登记剩菜；开饭啦；提前截止 / 重新开放。指定掌厨即使不是 COOK 角色也可以进工作台 |
| 采购（tab） | `pages/shopping/index` | 要买的（勾已买）、不必买（常备 / 家里已有，带库存对照说明）、手动加一样、复制清单发家庭群。儿童账号下这个 tab 显示为「吃过」，只看最近吃了什么 |
| 我的（tab） | `pages/me/index` | 本周与统计、周菜单模板、家人与孩子、掌厨安排 / 库存和剩菜、临时聚餐入口、切换家庭、邀请码、称呼 / 过敏 / 忌口、加入或创建家庭、最近通知、退出。儿童账号隐藏管理类入口，只保留口味资料、「我们吃过什么」和退出 |
| 掌厨安排 | `pages/rotation/index` | 本周掌厨日历、改派；管理员设置参与轮换的家人、适用餐次，生成本周安排 |
| 库存和剩菜 | `pages/inventory/index` | 家庭库存与剩菜的查看 / 登记 / 用掉，以及最近库存流水（勾已买入账、撤回、用掉剩菜、开饭扣减、手工调整）。管理员和掌厨可改，普通成员只读；儿童不能勾已买、不能改库存 |
| 本周与统计 | `pages/stats/index` | 每天吃了什么、谁掌厨、常做/常点的菜、心愿兑现、吃腻；可切换本周或最近 30 天。不含聚餐。儿童看到更简单的「我们吃过什么」 |
| 周菜单模板 | `pages/template/index` · `edit` | 管理员和掌厨维护一周模板，把上周另存，应用到本周/下周（默认不覆盖已确认菜单和已有计划） |
| 家人与孩子 | `pages/family/members` | 把孩子设为小朋友、指定监护人、给孩子建/改账号；监护人可「帮 TA 点餐」 |
| 登录 | `pages/login/index` | 小程序：微信一键登录；H5：用户名密码登录 / 注册（可填邀请码）；带 `?redirect=` 时登录后回到原页面（比如聚餐邀请） |
| 我的聚餐 | `pages/gathering/list` | 进行中 / 历史（已散场），发起聚餐 |
| 发起 / 编辑聚餐 | `pages/gathering/edit` | 标题、日期、餐次、地点、玩法、点菜截止、自己几个人、是否在家庭日历占位；`?id=` 编辑，`?from=` 复用这波人 |
| 聚餐详情 | `pages/gathering/detail?id=` | 信息、我的应邀（来不来、几个人、忌口）、邀请（小程序分享卡片 / 复制链接 / 代登记）、参与者；**按玩法**：想吃汇总 / 提议+投票 / 认领与未认领；确认菜单（份数留空按人数）、采购清单（按人数换算）、开饭、重新开放、编辑、复用这波人、散场、本场通知 |
| 邀请落地页 | `pages/gathering/join?token=` | 预览（标题、日期、主人、玩法）→ 应邀加入；未登录先去登录再回来；已散场 / 链接无效会提示 |

### 登录方式（条件编译）

- **微信小程序**（`#ifdef MP-WEIXIN`）：启动时静默 `uni.login` 拿 code → 后端 `POST /api/auth/wx-login` 换 openid → JWT。没有 token 时自动登录，无需注册。
- **H5**（`#ifdef H5`）：个人主体没有公众号，**不能用微信网页授权登录**。H5 用用户名密码登录；新用户注册时填家庭邀请码即可入家；管理员也可以在后台给孩子 / 老人建账号。


### 儿童界面与监护

儿童账号由家长在「家人与孩子」或管理后台创建（用户名密码），并指定监护人（默认是操作的管理员，之后可改）。监护人即使只是普通成员，也可以替该孩子点餐和评价，截止规则与孩子自己点一样。

儿童登录后（H5 和小程序一样）：tab 变为「今晚 / 我想吃 / 吃过 / 我的」；用更大的封面卡片点「我想吃 / 不吃这个 / 今晚不在家」。看不到掌厨工作台、轮换设置、库存维护、菜谱编辑、采购管理、发起聚餐和管理类设置。服务端也会拒绝这些写操作，不只靠前端隐藏。

### 周菜单模板和统计

掌厨可以把一周的菜存成模板，或把过去一周已确认的日常菜单另存，再应用到某周作为计划。计划会出现在今晚概况、工作台和日历上，确认菜单时会预填，仍可改；已确认或已开饭的餐次不会被覆盖。统计在「我的 → 本周与统计」，管理后台也有统计页和模板页。评价入口在今晚概况（已开饭后）和工作台。聚餐数据不进入模板和统计。

### 临时聚餐

和家庭完全分开：受邀的人只是「这一场」的参与者，不会加入家庭，也看不到家里的菜谱、日常菜单和通知（后端接口在 `/api/gatherings`，只有发起人和本场参与者能看详情）。

- **三种玩法**：主人掌厨（大家说想吃，主人定菜单、手填采购）、众筹投票（提议 + 一人一菜一票，主人按票数定）、各带一道（每人认领一道，看谁还没认领）。
- **邀请**：小程序里点「发给微信好友 / 群」或右上角分享，生成小程序卡片，打开就是邀请页；H5 点「复制邀请链接」（`<H5 地址>#/pages/gathering/join?token=…`）。
- **人数变了**：份数没填的菜按出席总人数自动换算，采购清单里填了「几人份」的用量也跟着换算，页面会提示「确认时 X 人，现在 Y 人」。
- **散场**后邀请失效、只读；「复用这波人」从任意一场新建，参与者全部带过去并设为「待定」。

### 微信订阅消息（开饭提醒）

小程序里「今晚」和聚餐详情页有「🔔 提醒我开饭」：先从后端 `GET /api/wechat/subscribe-config` 取模板 ID，再调用 `wx.requestSubscribeMessage`（`#ifdef MP-WEIXIN`）拿一次性授权，授权一次能收到一条开饭提醒（家里的饭和聚餐共用）。后端没配模板时只提示「开饭时会有站内通知」。H5 不调用任何微信 API。模板和字段映射在后端配置，见 [family-meal-api README](https://github.com/zzwen6/family-meal-api#微信订阅消息开饭提醒)。

## 本地运行

需要 Node 18+（推荐 20），先把后端跑起来（默认 `http://localhost:8080`）。

```bash
npm install
cp .env.example .env        # 按需修改

# H5 开发（http://localhost:5173，/api 自动代理到 VITE_DEV_PROXY_TARGET）
npm run dev:h5

# H5 生产构建 → dist/build/h5，可以放到任意静态服务器 / nginx（hash 路由，相对路径）
npm run build:h5

# 类型检查
npm run type-check
```

本地没有小程序 AppID 时，可以给后端设 `WECHAT_MOCK_ENABLED=true`，在开发者工具里也能「登录」（服务端用假 openid，仅限开发）。

## 微信小程序

```bash
# 开发：监听改动，输出到 dist/dev/mp-weixin
npm run dev:mp-weixin
# 发布构建：输出到 dist/build/mp-weixin
npm run build:mp-weixin
```

1. 打开 **微信开发者工具** → 导入项目 → 选择 `dist/dev/mp-weixin`（或 `dist/build/mp-weixin`）。
2. AppID：在 `src/manifest.json` 的 `mp-weixin.appid` 填你自己的（个人主体即可）；没有可先用测试号。后端同时配置 `WECHAT_APPID` / `WECHAT_SECRET`。
3. 后端地址：`.env` 里 `VITE_API_BASE` 填 **HTTPS** 地址（如 `https://meal.example.com`），并在小程序后台「开发管理 → 开发设置 → 服务器域名」把该域名同时加到 **request、uploadFile、downloadFile** 合法域名（上传封面/步骤媒体和展示图片视频都走同一个 API HTTPS 域名）。开发阶段可在开发者工具「详情 → 本地设置」里勾「不校验合法域名」。
4. 预览 / 上传 / 提审在开发者工具里操作。

> **小程序上传不能在 CI 里自动完成。** 本仓库没有 GitHub Actions 构建 / 发布流程：上传需要小程序代码上传密钥和 IP 白名单（miniprogram-ci），目前按约定在本机用开发者工具手动上传。H5 构建产物也请手动部署（例如放到 NAS 的 nginx）。

## Android 应用（APK）

没有走 HBuilderX / DCloud 云打包，而是：先用现有 `build:h5` 打出 H5，再由 `android/` 里的原生 WebView 壳加载。登录沿用 H5 的账号密码，没有微信 App 登录。「提醒我开饭」是小程序订阅消息，App 里和 H5 一样没有这项。

WebView 不能直接打开 `file://` 去请求 HTTPS 接口（会被 CORS / 浏览器安全策略拦住），所以 App 会在本机 **只监听 127.0.0.1** 起一个小 HTTP 服务（NanoHTTPD）：一边提供打包进来的 H5 静态文件，一边把 `/api`（含菜谱图片和视频）反代到上游 HTTPS。H5 构建时 **`VITE_API_BASE` 必须留空**，请求走同源。默认上游是 `https://meal.six666.qzz.io`，可在打包时用 `-PapiUpstream=https://你的域名` 覆盖。明文 HTTP 仅允许 127.0.0.1，上游仍是 HTTPS。

后端前面的 nginx 需要把 `/api/`、`/admin/`、`/actuator/` 反代到本机 Spring Boot（默认容器映射 `http://127.0.0.1:8090`），并设置足够的 `client_max_body_size`（视频上限 30MB，建议 32m）。示例见 [family-meal-api docs/DEPLOY.md](https://github.com/zzwen6/family-meal-api/blob/main/docs/DEPLOY.md)。如果打开域名根路径还是 nginx 欢迎页、访问 `/api` 是 404，说明还没配好反代，App 能装能开，但登录和数据会失败。

### 在手机上安装

1. 把 `dist-android/家庭点餐.apk` 发到手机（网盘、USB、浏览器下载均可）。
2. 打开 APK 前，允许当前来源安装未知应用（设置里搜「安装未知应用」或「未知来源」）。
3. 包名是 `com.zzwen6.familymeal`。以后升级必须用**同一份签名证书**打的新包才能覆盖安装。

需要 Android 7.0（API 24）及以上。

### 本地打 APK

需要 JDK 17+、Android SDK（`platforms;android-34` 和对应 build-tools）、Node 18+。本仓库不包含 SDK、keystore 和 APK。

```bash
# 如有需要：安装 commandlinetools 后
# sdkmanager "platforms;android-34" "build-tools;34.0.0" "platform-tools"

export JAVA_HOME=/path/to/jdk
export ANDROID_HOME=/path/to/Android/Sdk

# 首次：生成发布证书（只做一次，请备份，不要提交到 Git）
mkdir -p dist-android
# 把下面的密码换成你自己的强随机密码，store 和 key 请保持一致
keytool -genkeypair -v \
  -keystore dist-android/family-meal-release.jks \
  -storetype PKCS12 -keyalg RSA -keysize 2048 -validity 10950 \
  -alias familymeal \
  -storepass '你的密码' -keypass '你的密码' \
  -dname "CN=Family Meal, OU=zzwen6, O=zzwen6, C=CN"

cat > dist-android/keystore.properties << EOF
storeFile=family-meal-release.jks
storePassword=你的密码
keyAlias=familymeal
keyPassword=你的密码
EOF
# 建议同时把证书位置、alias、密码和「升级必须用同一证书」写进
# dist-android/keystore-info.txt，和 jks 一起放到安全的地方。

# 构建（会先跑 npm run build:h5，VITE_API_BASE 置空，再 assembleRelease）
npm run build:apk
# 产物：dist-android/家庭点餐.apk
```

也可以在 `android/` 目录直接执行 `./gradlew :app:assembleRelease`（同样会先构建 H5）。若 H5 已经打好、只想重签或重编壳，可加 `-PskipH5`。

`dist-android/`、`*.jks`、`*.keystore`、`android/keystore.properties`、`android/local.properties` 和 APK 都已写入 `.gitignore`，不要强制加进版本库。

### 换签名证书 / 以后升级

- **覆盖安装、应用商店更新**：必须使用生成第一份 APK 时的同一 keystore 和同一 alias。丢掉证书等于无法升级，只能让用户卸载重装（本地数据会清空）。
- 换一台机器构建：把 `family-meal-release.jks` 和 `keystore.properties`（或环境变量 `FAMILY_MEAL_STORE_FILE` / `FAMILY_MEAL_STORE_PASSWORD` / `FAMILY_MEAL_KEY_ALIAS` / `FAMILY_MEAL_KEY_PASSWORD`）放到同样约定的位置即可。
- 只有在确定要放弃旧包、让用户重新安装时，才生成一份新证书。


## 目录

```
src/
  api/         请求封装（uni.request + JWT + 统一错误提示）和接口、类型
  store/       登录态、当前家庭、当前选中的日期/餐次
  components/  日期餐次选择、无家庭提示
  pages/       页面（见上表）
  utils/       日期、文案、用量格式化；media.ts 给图片/视频补登录参数，subscribe.ts 订阅消息授权，invite.ts 邀请链接 / 分享路径
  config.ts    API 地址（VITE_API_BASE）
android/      原生 WebView 壳（本地代理 + 签名打包，不改业务逻辑）
```

吃腻默认看最近 14 天、同一道菜出现 2 次会提示（家庭规则里可改）。采购清单会按名称对照库存和未用完剩菜，少买家里已有的；生成清单时仍然只计算建议购买量、不改库存数字。勾选已买会把购买量加进库存，取消则撤回；用掉能对上库存食材的剩菜会扣库存；开饭时扣除生成时算作「家里已有」的那部分。菜谱营养是按用料估算的近似值，不是检测结果。规则详见 [family-meal-api README](https://github.com/zzwen6/family-meal-api#吃腻公平与库存对照规则)。

## 已知限制

- 订阅消息是一次性授权，点一次「提醒我开饭」只能收一条；需要后端配置 AppID / Secret / 模板 ID 才会真正推送。
- 小程序里「复制邀请链接」复制的是小程序页面路径，发给微信好友请用分享卡片；H5 复制的是可直接打开的网址。
- 营养数字是估算，找不到的食材、不能换算的单位和手写菜会跳过，不要当成检测报告。
- 小程序要能上传和播放菜谱媒体，除了 request 合法域名，还需要配置同一 API 域名的 uploadFile / downloadFile 合法域名。
- Android App 没有微信登录和「提醒我开饭」订阅消息，请用账号密码登录；后台接口必须经 nginx 把 `/api/` 反代出去，否则 App 里会提示请求失败。

## License

MIT
