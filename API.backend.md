# 卡牌拍照识别系统 — 后端 API 对接文档

> 本文档供后端开发人员参考，列出了前端期望的所有接口、请求格式和响应格式。
> 按照本文档实现接口后，前端无需额外适配即可正常工作。

---

## 基础信息

| 项目 | 值 |
|------|-----|
| 基础 URL | `http://localhost:8080/v1/api` |
| Content-Type | `application/json` |
| 认证方式 | Bearer Token，请求头 `Authorization: Bearer <token>` |
| Token 生命周期 | 7 天（前端存储于 `uni.storage`/`localStorage`，key 为 `token`） |
| 401 行为 | 前端自动清除 Token，提示"登录已过期"，跳转登录页（登录页自身的 401 除外） |

### 通用说明

- 所有接口默认使用 `Content-Type: application/json`
- 除 `/health`、登录、注册外，所有接口需要携带 Bearer Token
- 参数过滤：GET 请求中值为 `undefined`/`null`/`''` 的参数不会拼接到 query string
- 错误响应统一格式：`{ "error": "错误描述（英文）" }`
- 前端已内置英文错误消息的中文翻译映射，见本文档末尾

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_API_HOST` | `localhost` | API 主机 |
| `VITE_API_PORT` | `8080` | API 端口 |
| `VITE_API_PREFIX` | `/v1/api` | API 前缀 |
| `VITE_API_BASE_URL` | `http://localhost:8080/v1/api` | 完整 API 基础地址 |
| `VITE_API_TOKEN` | `test` | 视觉识别接口专用 Token（非用户 JWT） |

---

## 接口列表

---

### 1. 健康检查

```
GET /health
```

> 注意：此接口在基础 URL 之外，直接挂载在根路径（不经过 `/v1/api` 前缀）

| 项目 | 值 |
|------|-----|
| 认证 | 不需要 |
| 请求参数 | 无 |

**成功响应（200）**
```json
{
  "status": "ok"
}
```

---

### 2. 用户注册

```
POST /auth/register
```

| 项目 | 值 |
|------|-----|
| 认证 | 不需要 |

**请求体**
```json
{
  "nickname": "小明",
  "email": "user@example.com",
  "password": "123456",
  "inviteCode": "XK7P2M9Q"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `nickname` | string | 是 | 用户昵称 |
| `email` | string | 是 | 邮箱地址，需校验格式 |
| `password` | string | 是 | 密码（明文传输） |
| `inviteCode` | string | 是 | 邀请码，必须是有效且未被使用过的 |

**成功响应（201）**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "001",
    "nickname": "小明",
    "email": "user@example.com",
    "avatar": "/static/icons/avatar.png"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `token` | string | JWT Token |
| `user.id` | string | 用户 ID（零填充，最小 3 位，如 "001"） |
| `user.nickname` | string | 昵称 |
| `user.email` | string | 邮箱 |
| `user.avatar` | string | 头像路径（默认 `/static/icons/avatar.png`） |

**错误响应**

| 状态码 | error | 说明 |
|--------|-------|------|
| 400 | `nickname, email, password and inviteCode are required` | 缺少必填参数 |
| 400 | `Invalid email format` | 邮箱格式不正确 |
| 409 | `Email already registered` | 邮箱已被注册 |
| 409 | `Invalid invite code` | 邀请码无效或已被使用 |
| 500 | `Internal server error` | 服务器内部错误 |

**前端行为**：注册成功后自动登录，存储 `token` 和 `user`，跳转主页。

---

### 3. 用户登录

```
POST /auth/login
```

| 项目 | 值 |
|------|-----|
| 认证 | 不需要 |

**请求体**
```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | 是 | 邮箱地址 |
| `password` | string | 是 | 密码 |

**成功响应（200）**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "001",
    "nickname": "小明",
    "email": "user@example.com",
    "avatar": "/static/icons/avatar.png"
  }
}
```

**错误响应**

| 状态码 | error | 说明 |
|--------|-------|------|
| 400 | `email and password are required` | 缺少必填参数 |
| 401 | `Invalid email or password` | 邮箱或密码错误 |
| 500 | `Internal server error` | 服务器内部错误 |

**前端行为**：登录成功后存储 `token` 和 `user`，跳转主页。

---

### 4. 获取用户信息

```
GET /user/profile
```

| 项目 | 值 |
|------|-----|
| 认证 | Bearer Token |

**请求参数**：无

**成功响应（200）**
```json
{
  "id": "001",
  "nickname": "小明",
  "email": "user@example.com",
  "avatar": "/static/icons/avatar.png"
}
```

**错误响应**

| 状态码 | error | 说明 |
|--------|-------|------|
| 401 | `Unauthorized` | Token 无效或已过期 |
| 404 | `User not found` | 用户不存在 |
| 500 | `Internal server error` | 服务器内部错误 |

**前端调用位置**：主页 `index.vue` 加载时获取当前用户信息，用于显示头像、昵称。

---

### 5. 获取游戏版本列表

```
GET /versions
```

| 项目 | 值 |
|------|-----|
| 认证 | Bearer Token |

**请求参数**：无

**成功响应（200）**
```json
{
  "list": [
    {
      "id": 1,
      "name": "游戏王日文",
      "lang": "日文",
      "logo": "/static/versions/ocg.png"
    },
    {
      "id": 2,
      "name": "游戏王简中",
      "lang": "简中",
      "logo": "/static/versions/sc.png"
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `list[].id` | number | 版本 ID |
| `list[].name` | string | 版本名称 |
| `list[].lang` | string | 语言 |
| `list[].logo` | string | 版本 Logo 图片路径 |

**前端调用位置**：`VersionPicker.vue` 组件，用于下拉选择游戏版本。

---

### 6. 获取本地库列表

```
GET /libraries/local
```

| 项目 | 值 |
|------|-----|
| 认证 | Bearer Token |

**请求参数**：无

**成功响应（200）**
```json
{
  "list": [
    { "code": "A001", "cardCount": 42 },
    { "code": "B003", "cardCount": 128 }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `list[].code` | string | 库编号（唯一标识） |
| `list[].cardCount` | number | 库内卡牌数量 |

**前端调用位置**：`LocationPicker.vue` 组件，用于展示用户的本地库列表。

---

### 7. 获取云端库列表

```
GET /libraries/cloud
```

| 项目 | 值 |
|------|-----|
| 认证 | Bearer Token |

**请求参数**：无

**成功响应（200）**
```json
{
  "list": [
    { "code": "C001", "cardCount": 56 },
    { "code": "C002", "cardCount": 203 }
  ]
}
```

> 响应结构与本地库相同。

**前端调用位置**：`LocationPicker.vue` 组件，用于展示用户的云端库列表。

---

### 8. 获取库详情

```
GET /libraries/:code
```

| 项目 | 值 |
|------|-----|
| 认证 | Bearer Token |

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string | 是 | 库编号 |

**Query 参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `type` | string | 否 | `local` | 库类型：`local` 或 `cloud` |

**成功响应（200）**
```json
{
  "code": "A001",
  "id": "MX00000001",
  "name": "我的卡组",
  "type": "local",
  "cardCount": 42
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | string | 库编号 |
| `id` | string | 库唯一 ID（如 `MX00000001`） |
| `name` | string | 库名称 |
| `type` | string | 库类型：`local` 或 `cloud` |
| `cardCount` | number | 库内卡牌数量 |

**错误响应**

| 状态码 | error | 说明 |
|--------|-------|------|
| 404 | `Library not found` | 库不存在 |

**前端调用位置**：`SettingsDialog.vue` 组件，用于查看库的设置详情。

---

### 9. 创建库

```
POST /libraries
```

| 项目 | 值 |
|------|-----|
| 认证 | Bearer Token |

**请求体**
```json
{
  "name": "新卡组",
  "type": "local"
}
```

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `name` | string | 是 | — | 库名称 |
| `type` | string | 否 | `local` | 库类型：`local` 或 `cloud` |

**成功响应（201）**
```json
{
  "code": "A005",
  "id": "MX00000005",
  "cardCount": 0
}
```

> 注意：响应体中可能不包含 `name`/`type`，仅返回自动生成的 `code`、`id` 和初始 `cardCount: 0`。

**错误响应**

| 状态码 | error | 说明 |
|--------|-------|------|
| 400 | `name is required` | 缺少名称 |
| 409 | `Library already exists` | 同名库已存在 |

**前端调用位置**：`LocationPicker.vue` 组件，用户新建库时调用。

---

### 10. 更新库

```
PUT /libraries/:code
```

| 项目 | 值 |
|------|-----|
| 认证 | Bearer Token |

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string | 是 | 库编号 |

**请求体**
```json
{
  "name": "重命名的卡组",
  "type": "cloud"
}
```

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `name` | string | 是 | — | 新名称 |
| `type` | string | 否 | — | 新类型（`local` 或 `cloud`） |

**成功响应（200）**
```json
{
  "code": "A005",
  "id": "MX00000005",
  "name": "重命名的卡组",
  "type": "cloud",
  "cardCount": 42
}
```

**前端状态**：接口已定义但尚未在前端页面中调用，预留功能。

---

### 11. 获取库内卡牌列表

```
GET /libraries/:code/cards
```

| 项目 | 值 |
|------|-----|
| 认证 | Bearer Token |

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string | 是 | 库编号 |

**Query 参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `rarity` | string | 否 | — | 按罕贵度筛选 |
| `condition` | string | 否 | — | 按品相筛选 |
| `versionId` | number | 否 | — | 按游戏版本筛选 |
| `page` | number | 否 | `1` | 页码 |
| `pageSize` | number | 否 | `20` | 每页数量（最大 100） |

**成功响应（200）**
```json
{
  "list": [
    {
      "id": 1,
      "jpName": "閃刀姫－レイ",
      "cnName": "闪刀姬-零",
      "code": "QCAC-JP059",
      "rarity": "QCSER",
      "condition": "99品",
      "serial": "A001-0001",
      "img": "/static/cards/1.jpg",
      "libraryCode": "A001",
      "versionId": 1
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `list[].id` | number | 卡牌 ID |
| `list[].jpName` | string | 日文名称 |
| `list[].cnName` | string | 中文名称 |
| `list[].code` | string | 卡牌编号（如 `QCAC-JP059`） |
| `list[].rarity` | string | 罕贵度 |
| `list[].condition` | string | 品相 |
| `list[].serial` | string | 序列号（如 `A001-0001`，由库编号 + 序号组成） |
| `list[].img` | string | 卡牌图片路径 |
| `list[].libraryCode` | string | 所属库编号 |
| `list[].versionId` | number | 所属游戏版本 ID |
| `total` | number | 总卡牌数 |
| `page` | number | 当前页码 |
| `pageSize` | number | 每页数量 |

**前端调用位置**：`upload.vue` 上传页面，用于展示库内卡牌列表。

---

### 12. 搜索卡牌

```
GET /cards/search
```

| 项目 | 值 |
|------|-----|
| 认证 | Bearer Token |

**Query 参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `q` | string | 是 | — | 搜索关键词（匹配卡牌名称、编号等） |
| `libraryCode` | string | 否 | — | 限定在某个库内搜索 |
| `type` | string | 否 | — | 库类型筛选（`local` 或 `cloud`，配合 `libraryCode` 使用） |

**成功响应（200）**
```json
{
  "list": [
    {
      "id": 1,
      "jpName": "閃刀姫－レイ",
      "cnName": "闪刀姬-零",
      "code": "QCAC-JP059",
      "rarity": "QCSER",
      "condition": "99品",
      "serial": "A001-0001",
      "img": "/static/cards/1.jpg",
      "libraryCode": "A001",
      "versionId": 1
    }
  ]
}
```

> 注意：搜索接口不返回分页信息（仅 `list`），卡牌对象结构与库内卡牌列表一致。

**错误响应**

| 状态码 | error | 说明 |
|--------|-------|------|
| 400 | `q is required` | 缺少搜索关键词 |

**前端调用位置**：`upload.vue` 上传页面，用于搜索已有卡牌。

---

### 13. 创建卡牌

```
POST /cards
```

| 项目 | 值 |
|------|-----|
| 认证 | Bearer Token |

**请求体**
```json
{
  "libraryCode": "A001",
  "jpName": "閃刀姫－レイ",
  "cnName": "闪刀姬-零",
  "code": "QCAC-JP059",
  "rarity": "QCSER",
  "condition": "99品",
  "versionId": 1
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `libraryCode` | string | 是 | 所属库编号 |
| `jpName` | string | 否 | 日文名称 |
| `cnName` | string | 否 | 中文名称 |
| `code` | string | 否 | 卡牌编号 |
| `rarity` | string | 否 | 罕贵度 |
| `condition` | string | 否 | 品相 |
| `versionId` | number | 否 | 游戏版本 ID |

**成功响应（201）**
```json
{
  "id": 100,
  "serial": "A001-0042",
  "img": ""
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | number | 卡牌 ID |
| `serial` | string | 自动生成的序列号（`{库编号}-{序号}`） |
| `img` | string | 卡牌图片路径（初始为空字符串） |

**错误响应**

| 状态码 | error | 说明 |
|--------|-------|------|
| 400 | `libraryCode is required` | 缺少库编号 |

**前端状态**：接口已定义但尚未在前端页面中调用，预留功能。

---

### 14. 删除卡牌

```
DELETE /cards/:id
```

| 项目 | 值 |
|------|-----|
| 认证 | Bearer Token |

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | number | 是 | 卡牌 ID |

**成功响应（200）**
```json
{
  "success": true
}
```

**错误响应**

| 状态码 | error | 说明 |
|--------|-------|------|
| 404 | `Card not found` | 卡牌不存在 |

**前端状态**：接口已定义但尚未在前端页面中调用，预留功能。

---

### 15. 上传转移（本地 → 云端）

```
POST /libraries/transfer/upload
```

| 项目 | 值 |
|------|-----|
| 认证 | Bearer Token |

**请求体**
```json
{
  "fromCode": "A001",
  "toCode": "C001",
  "cardIds": [1, 2, 3, 5, 8]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `fromCode` | string | 是 | 源库编号（本地库） |
| `toCode` | string | 是 | 目标库编号（云端库） |
| `cardIds` | number[] | 是 | 要转移的卡牌 ID 数组 |

**成功响应（200）**
```json
{
  "success": true
}
```

**错误响应**

| 状态码 | error | 说明 |
|--------|-------|------|
| 400 | `fromCode, toCode and cardIds are required` | 缺少必填参数 |
| 404 | `Source library not found` | 源库不存在 |
| 404 | `Target library not found` | 目标库不存在 |
| 404 | `Local library not found` | 本地库不存在 |

**前端调用位置**：`ConfirmDialog.vue` 组件，用户确认上传卡牌到云端时调用。

---

### 16. 下载转移（云端 → 本地）

```
POST /libraries/transfer/download
```

| 项目 | 值 |
|------|-----|
| 认证 | Bearer Token |

**请求体**
```json
{
  "fromCode": "C001",
  "toCode": "A001",
  "cardIds": [10, 20, 30]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `fromCode` | string | 是 | 源库编号（云端库） |
| `toCode` | string | 是 | 目标库编号（本地库） |
| `cardIds` | number[] | 是 | 要转移的卡牌 ID 数组 |

**成功响应（200）**
```json
{
  "success": true
}
```

> 错误响应与上传转移一致。

**前端调用位置**：`ConfirmDialog.vue` 组件，用户确认下载卡牌到本地时调用。

---

### 17. 获取罕贵度列表

```
GET /rarities
```

| 项目 | 值 |
|------|-----|
| 认证 | Bearer Token |

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `versionId` | number | 否 | 按游戏版本筛选 |

**成功响应（200）**
```json
{
  "list": [
    "20SER", "QCSER", "PSER", "HR", "HPR", "ESR", "ESPR",
    "SER", "SEMR", "SEPR", "PR", "UPR", "PGR", "GSER",
    "GMR", "GR", "UTR", "CR", "UR", "RR", "USR", "UMR",
    "SR", "SPR", "NPR", "NMR", "NKC", "R", "RKC", "RPR",
    "N", "NR"
  ]
}
```

> `list` 为字符串数组，每个元素是一种罕贵度名称。

**前端调用位置**：`ParamsPicker.vue` 组件，用于罕贵度下拉筛选。

---

### 18. 获取品相列表

```
GET /grades
```

| 项目 | 值 |
|------|-----|
| 认证 | Bearer Token |

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `versionId` | number | 否 | 按游戏版本筛选 |

**成功响应（200）**
```json
{
  "list": [
    { "name": "99品", "desc": "完美全新", "hasSub": false },
    { "name": "9品", "desc": "近新优品", "hasSub": false },
    { "name": "78品", "desc": "标准流通", "hasSub": false },
    { "name": "56品", "desc": "中小瑕疵", "hasSub": false },
    { "name": "34品", "desc": "重大次品", "hasSub": false },
    { "name": "评级卡", "desc": "", "hasSub": true },
    { "name": "自定义", "desc": "", "hasSub": true }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `list[].name` | string | 品相名称（用于筛选和显示） |
| `list[].desc` | string | 品相描述 |
| `list[].hasSub` | boolean | 是否有子选项（`评级卡` 展开 PSA 分级，`自定义` 展开自定义输入） |

**前端调用位置**：`ParamsPicker.vue` 组件，用于品相下拉筛选。当 `hasSub: true` 时会展开子级选项。

---

### 19. 获取 PSA 评级列表

```
GET /grades/psa
```

| 项目 | 值 |
|------|-----|
| 认证 | Bearer Token |

**请求参数**：无

**成功响应（200）**
```json
{
  "list": [
    "PSA 10", "PSA 9", "PSA 8", "PSA 7", "PSA 6",
    "PSA 5", "PSA 4", "PSA 3", "PSA 2", "PSA 1"
  ]
}
```

> 此接口在用户选择品相为"评级卡"时调用，作为二级选项展示。

**前端调用位置**：`ParamsPicker.vue` 组件，用于 PSA 评级下拉选择。

---

### 20. 卡牌视觉识别

```
POST /vision/recognize
```

| 项目 | 值 |
|------|-----|
| 认证 | Bearer Token（使用配置中的 `apiToken`，非用户 JWT） |
| Content-Type | `multipart/form-data` |

> 注意：此接口使用 `uni.uploadFile()` 上传图片文件，请求格式为 multipart/form-data，与其他 JSON 接口不同。

**Form Data**

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `image` | File | 是 | — | 卡牌图片文件（`name="image"`） |
| `versionId` | string | 否 | `"1"` | 游戏版本 ID |

**成功响应（200）**
```json
{
  "jpName": "閃刀姫－レイ",
  "cnName": "闪刀姬-零",
  "code": "QCAC-JP059",
  "rarity": "QCSER",
  "confidence": 0.95,
  "serial": ""
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `jpName` | string | 识别出的日文卡名 |
| `cnName` | string | 识别出的中文卡名 |
| `code` | string | 识别出的卡牌编号 |
| `rarity` | string | 识别出的罕贵度 |
| `confidence` | number | 置信度（0-1） |
| `serial` | string | 序列号（识别阶段为空字符串） |

**前端状态**：接口已定义但尚未在前端页面中调用，预留功能。

---

## 完整接口汇总表

| # | 方法 | 路径 | 认证 | 前端已调用 | 调用位置 |
|---|------|------|------|------------|----------|
| 1 | GET | `/health` | — | ❌ | 仅文档 |
| 2 | POST | `/auth/register` | — | ✅ | `login.vue` |
| 3 | POST | `/auth/login` | — | ✅ | `login.vue` |
| 4 | GET | `/user/profile` | JWT | ✅ | `index.vue` |
| 5 | GET | `/versions` | JWT | ✅ | `VersionPicker.vue` |
| 6 | GET | `/libraries/local` | JWT | ✅ | `LocationPicker.vue` |
| 7 | GET | `/libraries/cloud` | JWT | ✅ | `LocationPicker.vue` |
| 8 | GET | `/libraries/:code` | JWT | ✅ | `SettingsDialog.vue` |
| 9 | POST | `/libraries` | JWT | ✅ | `LocationPicker.vue` |
| 10 | PUT | `/libraries/:code` | JWT | ❌ | 预留 |
| 11 | GET | `/libraries/:code/cards` | JWT | ✅ | `upload.vue` |
| 12 | GET | `/cards/search` | JWT | ✅ | `upload.vue` |
| 13 | POST | `/cards` | JWT | ❌ | 预留 |
| 14 | DELETE | `/cards/:id` | JWT | ❌ | 预留 |
| 15 | POST | `/libraries/transfer/upload` | JWT | ✅ | `ConfirmDialog.vue` |
| 16 | POST | `/libraries/transfer/download` | JWT | ✅ | `ConfirmDialog.vue` |
| 17 | GET | `/rarities` | JWT | ✅ | `ParamsPicker.vue` |
| 18 | GET | `/grades` | JWT | ✅ | `ParamsPicker.vue` |
| 19 | GET | `/grades/psa` | JWT | ✅ | `ParamsPicker.vue` |
| 20 | POST | `/vision/recognize` | apiToken | ❌ | 预留 |

---

## 前端错误消息映射表

后端返回的 `error` 字段为英文，前端会自动翻译为以下中文：

| 后端错误（英文） | 前端显示（中文） |
|------------------|-------------------|
| `email and password are required` | 请输入邮箱和密码 |
| `Invalid email or password` | 邮箱或密码错误 |
| `nickname, email, password and inviteCode are required` | 请填写所有必填项 |
| `Invalid email format` | 邮箱格式不正确 |
| `Email already registered` | 该邮箱已被注册 |
| `Invalid invite code` | 邀请码无效或已被使用 |
| `Internal server error` | 服务器内部错误，请稍后重试 |
| `Unauthorized` | 未授权，请重新登录 |
| `User not found` | 用户不存在 |
| `Library not found` | 库不存在 |
| `Card not found` | 卡牌不存在 |
| `name is required` | 名称为必填项 |
| `libraryCode is required` | 库代码为必填项 |
| `q is required` | 搜索关键词为必填项 |
| `fromCode, toCode and cardIds are required` | 缺少必填参数 |
| `Source library not found` | 源库不存在 |
| `Target library not found` | 目标库不存在 |
| `Library already exists` | 库已存在 |
| `Local library not found` | 本地库不存在 |

> 如果后端返回了不在上述列表中的错误消息，前端将直接显示英文原文。

---

## 状态码约定

| 状态码 | 含义 | 前端处理 |
|--------|------|----------|
| 200 | 请求成功 | 正常解析数据 |
| 201 | 创建成功 | 正常解析数据 |
| 400 | 参数错误 | Toast 提示错误信息 |
| 401 | 未授权 | 非登录页：清除登录态 → 提示过期 → 跳转登录页 |
| 404 | 资源不存在 | Toast 提示错误信息 |
| 409 | 资源冲突 | Toast 提示冲突信息 |
| 500 | 服务器错误 | Toast 提示"服务器内部错误，请稍后重试" |

---

## 前端源文件对应关系

| 文件 | 说明 |
|------|------|
| `uni-preset-vue-vite/src/api/index.js` | API 函数定义（20 个接口函数） |
| `uni-preset-vue-vite/src/api/request.js` | HTTP 客户端封装（uni.request 包装） |
| `uni-preset-vue-vite/src/config/index.js` | 环境配置（baseURL / apiToken） |
| `uni-preset-vue-vite/.env` | 环境变量默认值 |

---

## 第十二章 后端已实现接口文档

> 本章汇总后端已实现并可测试的接口，以及对接测试步骤。

---

### 12.1 认证接口

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/auth/register` | — | 用户注册（需 nickname, email, password, inviteCode） |
| POST | `/auth/login` | — | 用户登录（需 email, password）→ 返回 token + user |
| GET | `/user/profile` | JWT | 获取当前用户信息 |

**管理员账号**：`admin@s-lan.com` / `Admin@2026!`

---

### 12.2 库管理接口

**本地库**：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/libraries/local` | 本地库列表 → `{ list: [{ code, cardCount }] }` |
| GET | `/libraries/:code?type=local` | 本地库详情 |
| GET | `/libraries/:code/cards?type=local` | 库内卡牌列表（支持 rarity/condition/versionId 筛选 + page/pageSize 分页） |
| POST | `/libraries` | 创建库（`{ name, type: "local" }`）→ `{ code, id, cardCount }` |
| PUT | `/libraries/:code` | 更新库名称 |
| DELETE | `/libraries/:code?type=local` | 删除库 |

**云端库**：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/libraries/cloud` | 云端库列表 |
| GET | `/libraries/:code?type=cloud` | 云端库详情 |
| GET | `/libraries/:code/cards?type=cloud` | 云端库卡牌列表 |
| POST | `/libraries` | 创建云端库（`{ name, type: "cloud" }`） |
| PUT | `/libraries/:code` | 更新云端库 |
| DELETE | `/libraries/:code?type=cloud` | 删除云端库 |

**库间转移**：

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/libraries/transfer/upload` | 上传转移（本地 → 云端）`{ fromCode, toCode, cardIds }` |
| POST | `/libraries/transfer/download` | 下载转移（云端 → 本地）`{ fromCode, toCode, cardIds }` |

---

### 12.3 游戏版本接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/versions` | 游戏版本列表 → `{ list: [{ id, name, lang, logo }] }` |

**默认版本**：
- 游戏王日文（id: 1）、游戏王简中（id: 2）

---

### 12.4 视觉识别接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/vision/recognize` | 拍照识别卡牌（multipart/form-data） |

**请求**：
- `image`：File（卡牌图片文件）
- `versionId`：string（游戏版本 ID，默认 "1"）
- Authorization：`Bearer <apiToken>`（配置值 `test`）

**响应**：
```json
{
  "jpName": "閃刀姫－レイ",
  "cnName": "闪刀姬-零",
  "code": "QCAC-JP059",
  "rarity": "QCSER",
  "confidence": 0.95,
  "serial": ""
}
```

> ⚠️ 当前为模拟数据，真实 OCR 识别待后续接入。

---

### 12.5 管理员接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/version-config` | 获取所有版本配置 |
| GET | `/admin/version-config/:versionId` | 获取单个版本配置 |
| PUT | `/admin/version-config/:versionId` | 更新版本配置（rarities/grades/defaultRarity/defaultGrade） |
| PUT | `/admin/versions/:versionId` | 更新版本信息（名称、语言、logo） |
| POST | `/admin/versions` | 新增版本 |
| DELETE | `/admin/versions/:versionId` | 删除版本（级联删除关联配置） |
| POST | `/admin/versions/:versionId/logo` | 上传版本 Logo（multipart `image`） |

**管理员鉴权**：管理员登录走普通 `/auth/login`，后端根据 user.role 判断权限。

---

### 12.6 测试方法

#### curl 测试

```bash
# 1. 健康检查
curl http://localhost:8080/health

# 2. 用户登录（获取 token）
curl -X POST http://localhost:8080/v1/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@s-lan.com","password":"Admin@2026!"}'

# 3. 获取游戏版本（使用 token）
curl http://localhost:8080/v1/api/versions \
  -H "Authorization: Bearer <token>"

# 4. 获取本地库列表
curl http://localhost:8080/v1/api/libraries/local \
  -H "Authorization: Bearer <token>"

# 5. 创建库
curl -X POST http://localhost:8080/v1/api/libraries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"我的新卡组","type":"local"}'

# 6. 获取库内卡牌（分页 + 筛选）
curl "http://localhost:8080/v1/api/libraries/A001/cards?page=1&pageSize=20&rarity=SR" \
  -H "Authorization: Bearer <token>"

# 7. 搜索卡牌
curl "http://localhost:8080/v1/api/cards/search?q=闪刀" \
  -H "Authorization: Bearer <token>"

# 8. 上传转移
curl -X POST http://localhost:8080/v1/api/libraries/transfer/upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"fromCode":"A001","toCode":"C001","cardIds":[1,2,3]}'

# 9. 视觉识别（模拟）
curl -X POST http://localhost:8080/v1/api/vision/recognize \
  -H "Authorization: Bearer test" \
  -F "image=@card.jpg" \
  -F "versionId=1"
```

#### Postman 测试

1. 导入 Collection → 设置 Base URL 为 `http://localhost:8080/v1/api`
2. 先调用 `POST /auth/login` → 将返回的 `token` 设为 Collection 的 Bearer Token
3. 依次测试其他接口

---

### 12.7 通用说明

| 项目 | 值 |
|------|-----|
| 基础 URL | `http://localhost:8080/v1/api` |
| Content-Type | `application/json`（`/vision/recognize` 除外） |
| 认证方式 | `Authorization: Bearer <token>` |
| Token 生命周期 | 7 天 |
| 编码 | UTF-8（需确保 Express `res.setHeader('Content-Type', 'application/json; charset=utf-8')`） |
| 错误格式 | `{ "error": "英文错误描述" }` |
| 参数过滤 | GET 请求中 `undefined`/`null`/`''` 不会拼接到 query string |

---

### 12.8 待实现功能

| 功能 | 说明 | 优先级 |
|------|------|:---:|
| 视觉识别 OCR | 当前 `/vision/recognize` 为模拟数据，需接入真实 OCR（豆包/百度/腾讯） | P1 |
| 第三方云端接入 | 按 `后端问题.md` 中的标准接口清单实现第三方平台支持 | P1 |
| 邀请码管理 | 后台邀请码生成/管理界面 | P2 |
| 卡牌图片存储 | 上传识别后保存卡牌图片到服务器/OSS | P2 |

---

## 第十三章 第三方云端服务器对接接口规范

> 本章供后端团队实现第三方云端服务器时参考。前端已预留 `cloud-request.js` 模块，通过用户配置的云端服务器地址自动路由请求。

### 13.1 架构说明

```
前端 (uni-app)
  ├── request.js      → 本地后端（用户私有库）
  └── cloud-request.js → 云端服务器（共享库）
                            ↓
                    第三方后端需实现以下标准接口
```

### 13.2 必须实现的接口

#### 健康检查

```
GET /health
```

**响应 (200):**
```json
{ "status": "ok" }
```

---

#### 用户认证

第三方云端服务器需 **接受与主服务器相同的 JWT Token**。前端发送的请求都携带 `Authorization: Bearer <token>`。

> JWT 密钥需与主服务器一致，或第三方实现独立的 Token 验证逻辑。

**认证请求头:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

#### 云端库列表

```
GET /v1/api/libraries/cloud
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "list": [
    { "code": "C001", "cardCount": 56 },
    { "code": "C002", "cardCount": 203 }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `list[].code` | string | 库编号 |
| `list[].cardCount` | number | 库内卡牌数量 |

---

#### 云端库详情

```
GET /v1/api/libraries/:code?type=cloud
Authorization: Bearer <token>
```

**响应 (200):**
```json
{
  "code": "C001",
  "id": "MX00000001",
  "name": "C001",
  "type": "cloud",
  "cardCount": 42
}
```

---

#### 创建云端库

```
POST /v1/api/libraries
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体:**
```json
{ "name": "新云端库", "type": "cloud" }
```

**响应 (201):**
```json
{ "code": "C005", "id": "MX00000005", "cardCount": 0 }
```

**错误:**
| 状态码 | error | 说明 |
|--------|-------|------|
| 400 | `name is required` | 缺少名称 |
| 409 | `Library already exists` | 库已存在 |

---

#### 云端库卡牌列表

```
GET /v1/api/libraries/:code/cards?type=cloud&page=1&pageSize=20
Authorization: Bearer <token>
```

**Query 参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | 固定 `cloud` |
| `rarity` | string | 否 | 罕贵度筛选 |
| `condition` | string | 否 | 品相筛选 |
| `versionId` | number | 否 | 版本筛选 |
| `page` | number | 否 | 页码，默认 1 |
| `pageSize` | number | 否 | 每页数，默认 20，最大 100 |

**响应 (200):**
```json
{
  "list": [
    {
      "id": 1,
      "jpName": "閃刀姫－レイ",
      "cnName": "闪刀姬-零",
      "code": "QCAC-JP059",
      "rarity": "QCSER",
      "condition": "99品",
      "serial": "C001-0001",
      "img": "/static/catalog/qcac-jp059.png",
      "libraryCode": "C001",
      "versionId": 1
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

---

#### 接收上传（本地 → 云端）

```
POST /v1/api/libraries/transfer/upload
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体:**
```json
{
  "fromCode": "A001",
  "toCode": "C001",
  "cardIds": [1, 2, 3]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `fromCode` | string | 是 | 源库编号（本地库） |
| `toCode` | string | 是 | 目标库编号（云端库） |
| `cardIds` | number[] | 是 | 卡牌 ID 数组 |

**响应 (200):**
```json
{ "success": true }
```

> 后端需将卡牌数据存入目标库，并从源库删除（移动操作）。

---

#### 处理下载（云端 → 本地）

```
POST /v1/api/libraries/transfer/download
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体:**
```json
{
  "fromCode": "C001",
  "toCode": "A001",
  "cardIds": [10, 20]
}
```

**响应 (200):**
```json
{ "success": true }
```

---

### 13.3 卡牌数据表结构参考

```sql
CREATE TABLE cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jp_name TEXT DEFAULT '',       -- 日文名称
  cn_name TEXT DEFAULT '',       -- 中文名称
  code TEXT DEFAULT '',          -- 卡牌编号（如 QCAC-JP059）
  rarity TEXT DEFAULT '',        -- 罕贵度
  condition TEXT DEFAULT '',     -- 品相
  serial TEXT DEFAULT '',        -- 序列号（库编号-序号）
  img TEXT DEFAULT '',           -- 图片URL
  library_code TEXT NOT NULL,    -- 所属库编号
  version_id INTEGER DEFAULT 1,  -- 游戏版本ID
  user_id INTEGER,               -- NULL=云端卡牌（共享）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 13.4 通用规范

| 项目 | 值 |
|------|-----|
| Content-Type | `application/json` |
| 认证方式 | `Authorization: Bearer <token>` |
| 编码 | UTF-8 |
| 错误格式 | `{ "error": "英文错误描述" }` |
| 状态码 | 200 成功 / 201 创建 / 400 参数 / 401 未授权 / 404 不存在 / 409 冲突 / 500 服务器错误 |

---

## 对接测试步骤

### 启动后端

```bash
cd <后端项目目录>
npm start
# 后端启动在 http://localhost:8080
# 验证: curl http://localhost:8080/health → {"status":"ok"}
```

### 登录获取 Token

```bash
curl -X POST http://localhost:8080/v1/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@s-lan.com","password":"Admin@2026!"}'
```

返回示例：
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "001", "nickname": "管理员", "email": "admin@s-lan.com", "avatar": "/static/icons/avatar.png" }
}
```

### 使用 Token 访问其他接口

```bash
# 设置 token 变量
TOKEN="<上面获取到的token>"

# 获取版本列表
curl http://localhost:8080/v1/api/versions -H "Authorization: Bearer $TOKEN"

# 获取本地库列表
curl http://localhost:8080/v1/api/libraries/local -H "Authorization: Bearer $TOKEN"

# 获取库内卡牌
curl "http://localhost:8080/v1/api/libraries/A001/cards?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN"
```

### 启动前端

```bash
cd uni-preset-vue-vite
npm run dev:h5
# 前端启动在 http://localhost:5173
# Vite proxy 自动转发 /v1/api → http://localhost:8080
```
