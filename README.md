# family-meal-app · 家庭点餐（微信小程序 + H5）

家人提前说「今晚想吃什么」，掌厨统一定菜单、自动出采购清单；约朋友来吃饭时发起「临时聚餐」，发卡片邀请、大家应邀点菜。一个代码库同时出 **微信小程序** 和 **H5**（uni-app · Vue 3 · TypeScript）。

后端与管理后台在 [zzwen6/family-meal-api](https://github.com/zzwen6/family-meal-api)。

## 页面

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 今晚（tab） | `pages/index/index` | 选日期和餐次，看截止倒计时、指定掌厨、在家人数、吃腻/公平/剩菜提示、我的意愿、全家想吃、已确认菜单、最新通知；这餐有家人发起的临时聚餐时显示提示（参与者可点进去）；小程序里可「🔔 提醒我开饭」 |
| 我想吃 | `pages/wish/edit` | 从菜谱选或直接写菜名；很想吃 / 都可以 / 别做这个；份数；这餐不在家吃；最近吃过达到阈值时提示可能吃腻；掌厨可替孩子点；截止前可改可删 |
| 菜谱（tab） | `pages/dish/list` | 分类、搜索 |
| 菜谱详情 | `pages/dish/detail` | 按份数换算主料、配料调味（标出家里常备），步骤与小贴士 |
| 掌厨工作台 | `pages/cook/index` | 指定掌厨与改派、吃腻/忌口/公平提示、谁没点、谁不在家、过敏提醒；采纳 / 换一道 / 从菜谱加 / 临时菜名；确认前预览提示；勾选用掉剩菜；确认后可登记剩菜；开饭啦；提前截止 / 重新开放。指定掌厨即使不是 COOK 角色也可以进工作台 |
| 采购（tab） | `pages/shopping/index` | 要买的（勾已买）、不必买（常备 / 家里已有，带库存对照说明）、手动加一样、复制清单发家庭群 |
| 我的（tab） | `pages/me/index` | 掌厨安排 / 库存和剩菜入口、临时聚餐入口、切换家庭、邀请码、称呼 / 过敏 / 忌口、加入或创建家庭、最近通知、退出 |
| 掌厨安排 | `pages/rotation/index` | 本周掌厨日历、改派；管理员设置参与轮换的家人、适用餐次，生成本周安排 |
| 库存和剩菜 | `pages/inventory/index` | 家庭库存与剩菜的查看 / 登记 / 用掉（管理员和掌厨可改，普通成员只读） |
| 登录 | `pages/login/index` | 小程序：微信一键登录；H5：用户名密码登录 / 注册（可填邀请码）；带 `?redirect=` 时登录后回到原页面（比如聚餐邀请） |
| 我的聚餐 | `pages/gathering/list` | 进行中 / 历史（已散场），发起聚餐 |
| 发起 / 编辑聚餐 | `pages/gathering/edit` | 标题、日期、餐次、地点、玩法、点菜截止、自己几个人、是否在家庭日历占位；`?id=` 编辑，`?from=` 复用这波人 |
| 聚餐详情 | `pages/gathering/detail?id=` | 信息、我的应邀（来不来、几个人、忌口）、邀请（小程序分享卡片 / 复制链接 / 代登记）、参与者；**按玩法**：想吃汇总 / 提议+投票 / 认领与未认领；确认菜单（份数留空按人数）、采购清单（按人数换算）、开饭、重新开放、编辑、复用这波人、散场、本场通知 |
| 邀请落地页 | `pages/gathering/join?token=` | 预览（标题、日期、主人、玩法）→ 应邀加入；未登录先去登录再回来；已散场 / 链接无效会提示 |

### 登录方式（条件编译）

- **微信小程序**（`#ifdef MP-WEIXIN`）：启动时静默 `uni.login` 拿 code → 后端 `POST /api/auth/wx-login` 换 openid → JWT。没有 token 时自动登录，无需注册。
- **H5**（`#ifdef H5`）：个人主体没有公众号，**不能用微信网页授权登录**。H5 用用户名密码登录；新用户注册时填家庭邀请码即可入家；管理员也可以在后台给孩子 / 老人建账号。

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
3. 后端地址：`.env` 里 `VITE_API_BASE` 填 **HTTPS** 地址（如 `https://meal.example.com`），并在小程序后台「开发管理 → 开发设置 → 服务器域名」加到 request 合法域名。开发阶段可在开发者工具「详情 → 本地设置」里勾「不校验合法域名」。
4. 预览 / 上传 / 提审在开发者工具里操作。

> **小程序上传不能在 CI 里自动完成。** 本仓库没有 GitHub Actions 构建 / 发布流程：上传需要小程序代码上传密钥和 IP 白名单（miniprogram-ci），目前按约定在本机用开发者工具手动上传。H5 构建产物也请手动部署（例如放到 NAS 的 nginx）。

## 目录

```
src/
  api/         请求封装（uni.request + JWT + 统一错误提示）和接口、类型
  store/       登录态、当前家庭、当前选中的日期/餐次
  components/  日期餐次选择、无家庭提示
  pages/       页面（见上表）
  utils/       日期、文案、用量格式化；subscribe.ts 订阅消息授权，invite.ts 邀请链接 / 分享路径
  config.ts    API 地址（VITE_API_BASE）
```

吃腻默认看最近 14 天、同一道菜出现 2 次会提示（家庭规则里可改）。采购清单会按名称对照库存和未用完剩菜，少买家里已有的；对照只影响建议购买量，不会自动改库存数字。规则详见 [family-meal-api README](https://github.com/zzwen6/family-meal-api#吃腻公平与库存对照规则)。

## 已知限制

- 订阅消息是一次性授权，点一次「提醒我开饭」只能收一条；需要后端配置 AppID / Secret / 模板 ID 才会真正推送。
- 小程序里「复制邀请链接」复制的是小程序页面路径，发给微信好友请用分享卡片；H5 复制的是可直接打开的网址。
- 库存数量需要掌厨在「库存和剩菜」里手工维护；勾选已买或用掉剩菜不会自动加减库存。

## License

MIT
