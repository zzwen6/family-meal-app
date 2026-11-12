# family-meal-app · 家庭点餐（微信小程序 + H5）

家人提前说「今晚想吃什么」，掌厨统一定菜单、自动出采购清单。一个代码库同时出 **微信小程序** 和 **H5**（uni-app · Vue 3 · TypeScript）。

后端与管理后台在 [zzwen6/family-meal-api](https://github.com/zzwen6/family-meal-api)。

## 页面

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 今晚（tab） | `pages/index/index` | 选日期和餐次，看截止倒计时、在家人数、我的意愿、全家想吃、已确认菜单、最新通知 |
| 我想吃 | `pages/wish/edit` | 从菜谱选或直接写菜名；很想吃 / 都可以 / 别做这个；份数；这餐不在家吃；掌厨可替孩子点；截止前可改可删 |
| 菜谱（tab） | `pages/dish/list` | 分类、搜索 |
| 菜谱详情 | `pages/dish/detail` | 按份数换算主料、配料调味（标出家里常备），步骤与小贴士 |
| 掌厨工作台 | `pages/cook/index` | 谁没点、谁不在家、过敏提醒；采纳 / 换一道 / 从菜谱加 / 临时菜名；确认菜单；开饭啦；提前截止 / 重新开放 |
| 采购（tab） | `pages/shopping/index` | 要买的（勾已买）、家里常备（默认不买，掌厨可勾回）、手动加一样、复制清单发家庭群 |
| 我的（tab） | `pages/me/index` | 切换家庭、邀请码、称呼 / 过敏 / 忌口、加入或创建家庭、最近通知、退出 |
| 登录 | `pages/login/index` | 小程序：微信一键登录；H5：用户名密码登录 / 注册（可填邀请码） |

### 登录方式（条件编译）

- **微信小程序**（`#ifdef MP-WEIXIN`）：启动时静默 `uni.login` 拿 code → 后端 `POST /api/auth/wx-login` 换 openid → JWT。没有 token 时自动登录，无需注册。
- **H5**（`#ifdef H5`）：个人主体没有公众号，**不能用微信网页授权登录**。H5 用用户名密码登录；新用户注册时填家庭邀请码即可入家；管理员也可以在后台给孩子 / 老人建账号。

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
  utils/       日期、文案、用量格式化
  config.ts    API 地址（VITE_API_BASE）
```

## 后续

- 微信订阅消息「开饭提醒」：后端已留接口，前端需在用户点「提醒我」时调用 `wx.requestSubscribeMessage`。
- 临时聚餐（组队）：后端已预留数据表，下一版做建队、邀请卡片、点菜和散场。

## License

MIT
