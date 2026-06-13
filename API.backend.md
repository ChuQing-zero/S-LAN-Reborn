# 卡牌拍照识别系统 — 后端 API 规格说明书

> **版本：v1.0.0** | 更新日期：2026-06-13
>基于nodejs的后端项目链接方式mongodb://root:8lY9LH7159Ah26sd@s-lan-relorn-db-mongodb.ns-3mbo57k2.svc:27017
> 本文档定义后端需实现的全部接口规格，包含路径、参数、返回值、错误码及业务逻辑说明。后端开发/AI 请严格按此文档实现。

---

## 一、基础规范

| 项目 | 值 |
|------|-----|
| 服务端口 | `8080` |
| API 前缀 | `/v1/api`（兼容 `/api`） |
| Content-Type | `application/json`（文件上传除外） |
| 认证方式 | Bearer Token（请求头 `Authorization: Bearer <token>`） |
| 错误响应格式 | `{ "error": "错误描述" }` |

### 1.1 认证说明

| 接口类型 | 是否需要 Token |
|----------|---------------|
| 登录 (`/auth/login`) | **否** |
| 注册 (`/auth/register`) | **否** |
| 健康检查 (`/health`) | **否** |
| 其余所有业务接口 | **是** |

Token 由登录/注册接口生成并返回，前端存储在本地。后续请求在 `Authorization` 头中携带。

### 1.2 HTTP 状态码规范

| 状态码 | 含义 | 触发场景 |
|--------|------|----------|
| 200 | 成功 | GET/PUT 成功、DELETE 成功、登录成功 |
| 201 | 创建成功 | POST 创建资源成功、注册成功 |
| 400 | 参数错误 | 缺少必填参数、格式不正确 |
| 401 | 未授权 | 未携带 Token、Token 无效/过期、邮箱或密码错误 |
| 404 | 资源不存在 | 库/卡牌/用户不存在 |
| 409 | 冲突 | 邮箱已注册、邀请码无效/已使用、库已存在 |
| 500 | 服务器错误 | 数据库异常等 |

---

## 二、数据结构定义

### 2.1 User（用户对象）

```typescript
interface User {
  id: string;       // 用户ID，如 "001"
  nickname: string; // 昵称
  email: string;    // 邮箱
  avatar: string;   // 头像URL，默认 "/static/icons/avatar.png"
}
```

### 2.2 Card（卡牌对象）

```typescript
interface Card {
  id: number;           // 卡牌ID
  jpName: string;       // 日文名
  cnName: string;       // 中文名
  code: string;         // 卡牌编号，如 QCAC-JP059
  rarity: string;       // 罕贵度，如 QCSER
  condition: string;    // 品相，如 9品
  serial: string;       // 库序号，如 A001-0001
  img: string;          // 图片URL
  libraryCode: string;  // 所属库编号
  versionId: number;    // 游戏版本ID
}
```

### 2.3 LibraryBrief（库简要对象）

```typescript
interface LibraryBrief {
  code: string;       // 库编号，如 A001
  cardCount: number;  // 卡牌数量
}
```

### 2.4 LibraryDetail（库详情对象）

```typescript
interface LibraryDetail {
  code: string;
  id: string;         // 库ID，如 MX00000001
  name: string;
  type: 'local' | 'cloud';
  cardCount: number;
}
```

### 2.5 Version（游戏版本对象）

```typescript
interface Version {
  id: number;
  name: string;   // 如 "游戏王日文"
  lang: string;   // 如 "日文"
  logo: string;   // Logo 路径
}
```

### 2.6 Grade（品相对象）

```typescript
interface Grade {
  name: string;
  desc: string;
  hasSub: boolean;  // 是否有子选项（评级卡、自定义）
}
```

---

## 三、认证接口

### 3.1 登录

```
POST /v1/api/auth/login
```

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 邮箱 |
| password | string | 是 | 密码 |

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

**成功 200**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "001",
    "nickname": "小明",
    "email": "user@example.com",
    "avatar": "/static/icons/avatar.png"
  }
}
```

**失败**

| 状态码 | 响应 | 说明 |
|--------|------|------|
| 400 | `{ "error": "email and password are required" }` | 缺少必填参数 |
| 401 | `{ "error": "Invalid email or password" }` | 邮箱或密码错误 |
| 500 | `{ "error": "..." }` | 服务器内部错误 |

**业务逻辑**
- 根据邮箱查找用户，校验密码（需哈希比对）
- 校验通过后生成 JWT Token 并返回用户信息
- Token 有效期建议 7 天

---

### 3.2 注册

```
POST /v1/api/auth/register
```

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | string | 是 | 昵称 |
| email | string | 是 | 邮箱 |
| password | string | 是 | 密码 |
| inviteCode | string | 是 | 邀请码 |

```json
{
  "nickname": "小明",
  "email": "user@example.com",
  "password": "123456",
  "inviteCode": "ABC123"
}
```

**成功 201**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "001",
    "nickname": "小明",
    "email": "user@example.com",
    "avatar": "/static/icons/avatar.png"
  }
}
```

**失败**

| 状态码 | 响应 | 说明 |
|--------|------|------|
| 400 | `{ "error": "nickname, email, password and inviteCode are required" }` | 缺少必填参数 |
| 400 | `{ "error": "Invalid email format" }` | 邮箱格式不正确 |
| 409 | `{ "error": "Email already registered" }` | 邮箱已被注册 |
| 409 | `{ "error": "Invalid invite code" }` | 邀请码无效或已被使用 |
| 500 | `{ "error": "..." }` | 服务器内部错误 |

**业务逻辑**
1. 校验邮箱格式
2. 检查邮箱是否已被注册（409）
3. 校验邀请码是否有效且未被使用（409）
4. 密码需哈希存储，不可明文
5. 创建用户，默认头像设为 `/static/icons/avatar.png`
6. 自动生成 JWT Token 并返回（注册即登录）
7. 将邀请码标记为"已使用"

---

### 3.3 获取用户信息

```
GET /v1/api/user/profile
```

**请求头**：`Authorization: Bearer <token>`（必填）

**请求参数**：无

**成功 200**

```json
{
  "id": "001",
  "nickname": "小明",
  "email": "user@example.com",
  "avatar": "/static/icons/avatar.png"
}
```

**失败**

| 状态码 | 响应 | 说明 |
|--------|------|------|
| 401 | `{ "error": "Unauthorized" }` | Token 无效或过期 |
| 404 | `{ "error": "User not found" }` | 用户不存在 |
| 500 | `{ "error": "..." }` | 服务器错误 |

**业务逻辑**
- 从 Token 中解析用户 ID，查询并返回用户信息

---

## 四、业务接口

### 4.1 健康检查

```
GET /health
```

**认证**：无需 Token

**成功 200**

```json
{ "status": "ok" }
```

---

### 4.2 获取游戏版本列表

```
GET /v1/api/versions
```

**认证**：需要 Token

**请求参数**：无

**成功 200**

```json
{
  "list": [
    { "id": 1, "name": "游戏王日文", "lang": "日文", "logo": "/static/icons/version_logos/logo_yugioh_jp.png" },
    { "id": 2, "name": "游戏王简中", "lang": "简中", "logo": "/static/icons/version_logos/logo_yugioh_cn.png" },
    { "id": 3, "name": "游戏王英文", "lang": "英文", "logo": "/static/icons/version_logos/logo_yugioh_en.png" },
    { "id": 4, "name": "游戏王测试", "lang": "测试", "logo": "/static/icons/version_logos/logo_yugioh_test.png" },
    { "id": 5, "name": "宝可梦日文", "lang": "日文", "logo": "/static/icons/version_logos/logo_pokemon_jp.png" },
    { "id": 6, "name": "宝可梦简中", "lang": "简中", "logo": "/static/icons/version_logos/logo_pokemon_cn.png" },
    { "id": 7, "name": "宝可梦英文", "lang": "英文", "logo": "/static/icons/version_logos/logo_pokemon_en.png" },
    { "id": 8, "name": "宝可梦繁中", "lang": "繁中", "logo": "/static/icons/version_logos/logo_pokemon_tw.png" }
  ]
}
```

**失败**：401 / 500

---

### 4.3 获取本地库列表

```
GET /v1/api/libraries/local
```

**认证**：需要 Token

**请求参数**：无

**成功 200**

```json
{
  "list": [
    { "code": "A001", "cardCount": 10 },
    { "code": "A002", "cardCount": 60 }
  ]
}
```

**失败**：401 / 500

---

### 4.4 获取云端库列表

```
GET /v1/api/libraries/cloud
```

**认证**：需要 Token

**请求参数**：无

**成功 200**

```json
{
  "list": [
    { "code": "A001", "cardCount": 50 },
    { "code": "A002", "cardCount": 30 }
  ]
}
```

**失败**：401 / 500

---

### 4.5 获取库详情

```
GET /v1/api/libraries/:code
```

**认证**：需要 Token

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | 库编号，如 A001 |

**Query 参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| type | string | 否 | local | `local` 或 `cloud` |

**成功 200**

```json
{
  "code": "A001",
  "id": "MX00000001",
  "name": "A001",
  "type": "local",
  "cardCount": 10
}
```

**失败**：401 / 404 `{ "error": "Library not found" }` / 500

---

### 4.6 创建新库

```
POST /v1/api/libraries
```

**认证**：需要 Token

**请求体**

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| type | string | 否 | local | `local` 或 `cloud` |
| name | string | 是 | — | 库名称/编号，如 A021 |

```json
{
  "type": "local",
  "name": "A021"
}
```

**成功 201**

```json
{
  "code": "A021",
  "id": "MX00000021",
  "cardCount": 0
}
```

**失败**：400 `{ "error": "name is required" }` / 401 / 409 `{ "error": "Library already exists" }` / 500

---

### 4.7 更新库设置

```
PUT /v1/api/libraries/:code
```

**认证**：需要 Token

**路径参数**：`code` (string, 必填)

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 新库名 |
| type | string | 否 | `local` 或 `cloud` |

```json
{ "name": "新库名" }
```

**成功 200**

```json
{
  "code": "A001",
  "id": "MX00000001",
  "name": "新库名",
  "type": "local",
  "cardCount": 10
}
```

**失败**：400 / 401 / 404 `{ "error": "Library not found" }` / 500

---

### 4.8 获取库中卡牌列表

```
GET /v1/api/libraries/:code/cards
```

**认证**：需要 Token

**路径参数**：`code` (string, 必填)

**Query 参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| type | string | 否 | local | `local` 或 `cloud` |
| rarity | string | 否 | — | 罕贵度筛选 |
| condition | string | 否 | — | 品相筛选 |
| versionId | number | 否 | — | 游戏版本ID |
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 20 | 每页条数 |

**成功 200**

```json
{
  "list": [ Card, ... ],
  "total": 8,
  "page": 1,
  "pageSize": 20
}
```

> **注意**：库不存在时返回空列表 `{ "list": [], "total": 0, "page": 1, "pageSize": 20 }`，不返回 404。

**失败**：401 / 500

---

### 4.9 搜索卡牌

```
GET /v1/api/cards/search
```

**认证**：需要 Token

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| q | string | 是 | 关键词（匹配日文名、中文名、编号、序号） |
| libraryCode | string | 否 | 限定库编号 |
| type | string | 否 | `local` 或 `cloud` |

**成功 200**

```json
{ "list": [ Card, ... ] }
```

**失败**：400 `{ "error": "q is required" }` / 401 / 500

---

### 4.10 创建卡牌（拍照识别后入库）

```
POST /v1/api/cards
```

**认证**：需要 Token

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| libraryCode | string | 是 | 目标本地库编号 |
| jpName | string | 否 | 日文名 |
| cnName | string | 否 | 中文名 |
| code | string | 否 | 卡牌编号 |
| rarity | string | 否 | 罕贵度 |
| condition | string | 否 | 品相 |
| versionId | number | 否 | 游戏版本ID |

```json
{
  "libraryCode": "A001",
  "jpName": "閃刀姫－レイ",
  "cnName": "闪刀姬-零",
  "code": "QCAC-JP059",
  "rarity": "QCSER",
  "condition": "9品",
  "versionId": 1
}
```

**成功 201**

```json
{
  "id": 9,
  "serial": "A001-0009",
  "img": "https://cdn.example.com/cards/qcac-jp059.png"
}
```

**失败**：400 `{ "error": "libraryCode is required" }` / 401 / 404 `{ "error": "Local library not found" }` / 500

**业务逻辑**：仅支持本地库。自动生成序号（格式 `{库编号}-{自增序号}`）。

---

### 4.11 删除卡牌

```
DELETE /v1/api/cards/:id
```

**认证**：需要 Token

**路径参数**：`id` (number, 必填)

**成功 200**：`{ "success": true }`

**失败**：401 / 404 `{ "error": "Card not found" }` / 500

---

### 4.12 上传到云端库（本地 → 云端）

```
POST /v1/api/libraries/transfer/upload
```

**认证**：需要 Token

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| fromCode | string | 是 | 源本地库编号 |
| toCode | string | 是 | 目标云端库编号 |
| cardIds | number[] | 是 | 要转移的卡牌ID列表 |

```json
{ "fromCode": "A001", "toCode": "A001", "cardIds": [1, 2, 3] }
```

**成功 200**：`{ "success": true }`

**失败**：400 / 401 / 404（源库/目标库/卡牌不存在）/ 500

**业务逻辑**：将卡牌从源库复制到目标库（生成新 ID 和序号），并删除源库中的原卡牌。

---

### 4.13 下载到本地库（云端 → 本地）

```
POST /v1/api/libraries/transfer/download
```

**认证**：需要 Token

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| fromCode | string | 是 | 源云端库编号 |
| toCode | string | 是 | 目标本地库编号 |
| cardIds | number[] | 是 | 要转移的卡牌ID列表 |

```json
{ "fromCode": "A001", "toCode": "A001", "cardIds": [1, 2, 3] }
```

**成功 200**：`{ "success": true }`

**失败**：400 / 401 / 404 / 500

**业务逻辑**：同上传，方向相反。

---

### 4.14 获取罕贵度列表

```
GET /v1/api/rarities
```

**认证**：需要 Token

**Query 参数**：`versionId` (number, 可选)

**成功 200**

```json
{
  "list": [
    "20SER", "QCSER", "PSER", "HR", "HPR", "ESR", "ESPR", "SER",
    "SEMR", "SEPR", "PR", "UPR", "PGR", "GSER", "GMR", "GR",
    "UTR", "CR", "UR", "RR", "USR", "UMR", "SR", "SPR",
    "NPR", "NMR", "NKC", "R", "RKC", "RPR", "N", "NR"
  ]
}
```

**失败**：401

---

### 4.15 获取品相列表

```
GET /v1/api/grades
```

**认证**：需要 Token

**Query 参数**：`versionId` (number, 可选)

**成功 200**

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

**失败**：401

---

### 4.16 获取评级卡子选项

```
GET /v1/api/grades/psa
```

**认证**：需要 Token

**请求参数**：无

**成功 200**

```json
{
  "list": [
    "PSA 10", "PSA 9", "PSA 8", "PSA 7", "PSA 6",
    "PSA 5", "PSA 4", "PSA 3", "PSA 2", "PSA 1"
  ]
}
```

**失败**：401

---

### 4.17 拍照识别卡牌

```
POST /v1/api/vision/recognize
```

**认证**：需要 Token

**Content-Type**：`multipart/form-data`

**表单字段**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image | File | 是 | 卡牌照片 |
| versionId | number/string | 否 | 游戏版本ID |

**成功 200**

```json
{
  "jpName": "閃刀姫－レイ",
  "cnName": "闪刀姬-零",
  "code": "QCAC-JP059",
  "rarity": "QCSER",
  "confidence": 0.95
}
```

**失败**：400 `{ "error": "image is required" }` / 401

---

## 五、接口汇总表

| 序号 | 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|------|
| 1 | POST | `/v1/api/auth/login` | 登录 | 无需 |
| 2 | POST | `/v1/api/auth/register` | 注册 | 无需 |
| 3 | GET | `/v1/api/user/profile` | 用户信息 | 需要 |
| 0 | GET | `/health` | 健康检查 | 无需 |
| 1 | GET | `/v1/api/versions` | 游戏版本列表 | 需要 |
| 2 | GET | `/v1/api/libraries/local` | 本地库列表 | 需要 |
| 3 | GET | `/v1/api/libraries/cloud` | 云端库列表 | 需要 |
| 4 | GET | `/v1/api/libraries/:code` | 库详情 | 需要 |
| 5 | POST | `/v1/api/libraries` | 创建新库 | 需要 |
| 6 | PUT | `/v1/api/libraries/:code` | 更新库设置 | 需要 |
| 7 | GET | `/v1/api/libraries/:code/cards` | 库中卡牌列表 | 需要 |
| 8 | GET | `/v1/api/cards/search` | 搜索卡牌 | 需要 |
| 9 | POST | `/v1/api/cards` | 创建卡牌 | 需要 |
| 10 | DELETE | `/v1/api/cards/:id` | 删除卡牌 | 需要 |
| 11 | POST | `/v1/api/libraries/transfer/upload` | 上传到云端 | 需要 |
| 12 | POST | `/v1/api/libraries/transfer/download` | 下载到本地 | 需要 |
| 13 | GET | `/v1/api/rarities` | 罕贵度列表 | 需要 |
| 14 | GET | `/v1/api/grades` | 品相列表 | 需要 |
| 15 | GET | `/v1/api/grades/psa` | 评级卡子选项 | 需要 |
| 16 | POST | `/v1/api/vision/recognize` | 拍照识别 | 需要 |

---

## 六、后端实现要点

1. **密码安全**：密码必须哈希存储（推荐 bcrypt），不可明文。
2. **Token 机制**：使用 JWT，有效期 7 天，过期返回 401。
3. **邀请码**：需要独立的邀请码表，注册时将邀请码标记为"已使用"并绑定用户。
4. **邮箱唯一性**：邮箱字段需建立唯一索引。
5. **库编号**：`local` 和 `cloud` 类型共用同一套编号体系，创建时检查唯一性。
6. **卡牌序号**：`serial` 格式为 `{库编号}-{4位自增序号}`，如 `A001-0001`。
7. **转移操作**：需要事务保证原子性——复制卡牌到目标库 + 删除源库卡牌。
8. **分页**：`page` 从 1 开始，`pageSize` 默认 20。
9. **视觉识别**：当前为模拟，后续接入真实 OCR 模型。
