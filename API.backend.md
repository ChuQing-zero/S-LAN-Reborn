# 卡牌拍照识别系统 — 后端 API 规格说明书

> **版本：v3.0.0** | 更新日期：2026-06-14
>
> 本文档定义后端需实现的全部接口规格，包含路径、参数、返回值、错误码及业务逻辑说明。
> v3.0 重大变更：**本地库与账号绑定**（每个用户独享本地库），**云端库为公共库**（所有用户共享）。
> 后端开发请严格按此文档实现。

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
|----------|:---:|
| 登录 (`/auth/login`) | 否 |
| 注册 (`/auth/register`) | 否 |
| 健康检查 (`/health`) | 否 |
| 管理员登录 (`/auth/admin/login`) | 否 |
| 其余所有业务接口 | **是** |

Token 由登录/注册接口生成并返回（JWT，7天有效）。后续请求在 `Authorization` 头中携带：
```
Authorization: Bearer <token>
```

### 1.2 HTTP 状态码

| 状态码 | 含义 | 场景 |
|--------|------|------|
| 200 | 成功 | GET / PUT / DELETE 成功、登录成功 |
| 201 | 创建成功 | POST 创建资源、注册成功 |
| 400 | 参数错误 | 缺少必填参数、格式不正确 |
| 401 | 未授权 | Token 无效/过期、密码错误 |
| 404 | 不存在 | 资源未找到 |
| 409 | 冲突 | 邮箱已注册、邀请码已使用、库已存在 |
| 500 | 服务器错误 | 数据库异常 |

### 1.3 核心业务规则 ⭐

```
┌─────────────────────────────────────────────────┐
│                 本地库（local）                    │
│  · 与用户账号绑定（user_id）                       │
│  · 每个用户只能看到自己的本地库                      │
│  · 创建本地库时自动关联当前登录用户                   │
│  · 不同用户的本地库互不可见                         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                 云端库（cloud）                    │
│  · 全局公共库，所有账号可见                         │
│  · 不属于任何特定用户（user_id = NULL）             │
│  · 任何用户都可以从云端库下载卡牌到自己的本地库         │
│  · 任何用户都可以上传自己的卡牌到云端库               │
└─────────────────────────────────────────────────┘

上传（本地 → 云端）：卡牌从用户本地库移动到公共云端库
下载（云端 → 本地）：卡牌从公共云端库移动到用户本地库
```

---

## 二、数据库表设计

### 2.1 用户表 `users`

```sql
CREATE TABLE users (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  nickname    VARCHAR(50)  NOT NULL,
  email       VARCHAR(100) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,          -- bcrypt 哈希
  avatar      VARCHAR(300) DEFAULT '/static/icons/avatar.png',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 邀请码表 `invite_codes`

```sql
CREATE TABLE invite_codes (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  code        VARCHAR(20) NOT NULL UNIQUE,
  is_used     BOOLEAN DEFAULT FALSE,
  used_by     INT,                            -- 使用者 user id
  used_at     DATETIME,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (used_by) REFERENCES users(id)
);
```

### 2.3 游戏版本表 `versions`

```sql
CREATE TABLE versions (
  id    INT PRIMARY KEY AUTO_INCREMENT,
  name  VARCHAR(50)  NOT NULL,
  lang  VARCHAR(20)  NOT NULL,
  logo  VARCHAR(200)
);

-- 初始数据
INSERT INTO versions (id, name, lang) VALUES
  (1, '游戏王日文', '日文'),
  (2, '游戏王简中', '简中'),
  (3, '游戏王英文', '英文'),
  (4, '宝可梦日文', '日文'),
  (5, '宝可梦简中', '简中'),
  (6, '宝可梦英文', '英文');
```

### 2.4 库表 `libraries` ⭐

```sql
CREATE TABLE libraries (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  code        VARCHAR(10) NOT NULL,            -- 库编号，如 A001
  type        ENUM('local','cloud') NOT NULL,
  user_id     INT DEFAULT NULL,                -- ⭐ 本地库绑定用户，云端库为 NULL
  name        VARCHAR(50),
  card_count  INT DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_code_type_user (code, type, user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

> **关键设计**：
> - `type = 'local'` → `user_id` 必填，每个用户独立命名空间
> - `type = 'cloud'` → `user_id = NULL`，全局唯一 code
> - 用户 A 的本地库 `A001` 与用户 B 的本地库 `A001` 是两个不同记录（通过 user_id 区分）

### 2.5 卡牌表 `cards`

```sql
CREATE TABLE cards (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  library_code  VARCHAR(10) NOT NULL,
  library_type  ENUM('local','cloud') NOT NULL,
  user_id       INT DEFAULT NULL,              -- 本地库卡牌属于特定用户
  card_code     VARCHAR(30) NOT NULL,           -- AI识别编号，如 QCAC-JP001
  rarity        VARCHAR(20),                   -- 罕贵度
  `condition`   VARCHAR(20),                   -- 品相（condition 是保留字需反引号）
  serial        VARCHAR(20),                   -- 库内序号，如 A001-0002
  custom_name   VARCHAR(100),                  -- 用户自定义名称
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_library (library_code, library_type, user_id),
  INDEX idx_user (user_id),
  INDEX idx_card_code (card_code)
);
```

> `serial` 格式：`{library_code}-{4位自增序号}`，每个库独立自增。

### 2.6 🆕 卡牌信息主数据表 `card_info`

```sql
CREATE TABLE card_info (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  card_code   VARCHAR(30)  NOT NULL UNIQUE,    -- 卡牌编号（主KEY）
  version_id  INT          NOT NULL,
  jp_name     VARCHAR(200) NOT NULL,            -- 当前语种卡牌名称
  cn_name     VARCHAR(200) NOT NULL DEFAULT '', -- 简中官方名 / 别称
  image_url   VARCHAR(500) NOT NULL DEFAULT '', -- 卡图URL
  rarity      VARCHAR(20)  NOT NULL DEFAULT '', -- 该卡牌自身罕贵度
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_version (version_id),
  FOREIGN KEY (version_id) REFERENCES versions(id)
);
```

| 字段 | 说明 | 示例 |
|------|------|------|
| `card_code` | UNIQUE，AI 识别出的编号 | `QCAC-JP001` |
| `jp_name` | 当前语种名称 | `青眼の白龍` |
| `cn_name` | 中文官方名/别称 | `青眼白龙` |
| `image_url` | 卡图完整 URL | `https://cdn.xxx.com/cards/QCAC-JP001.png` |
| `rarity` | 卡牌自身罕贵度 | `SER` |

---

## 三、数据结构定义

### 3.1 User

```typescript
interface User {
  id: number;
  nickname: string;
  email: string;
  avatar: string;
}
```

### 3.2 Card（卡牌 — 在库中的记录）

```typescript
interface Card {
  id: number;
  jpName: string;       // 日文名（来自 card_info 或占位）
  cnName: string;       // 中文名（来自 card_info 或占位）
  code: string;         // 卡牌编号，如 QCAC-JP059
  rarity: string;       // 罕贵度
  condition: string;    // 品相
  serial: string;       // 库序号，如 A001-0002
  img: string;          // 图片URL（来自 card_info 或占位）
  libraryCode: string;
  versionId: number;
}
```

### 3.3 LibraryBrief（库简要）

```typescript
interface LibraryBrief {
  code: string;
  cardCount: number;
}
```

### 3.4 LibraryDetail（库详情）

```typescript
interface LibraryDetail {
  code: string;
  id: number;
  name: string;
  type: 'local' | 'cloud';
  cardCount: number;
  userId: number | null;    // ⭐ 本地库显示所属用户，云端库为 null
}
```

### 3.5 Version（游戏版本）

```typescript
interface Version {
  id: number;
  name: string;
  lang: string;
  logo: string;
}
```

### 3.6 Grade（品相）

```typescript
interface Grade {
  name: string;
  desc: string;
  hasSub: boolean;
}
```

### 3.7 CardInfo（卡牌主数据 — card_info 表）

```typescript
interface CardInfo {
  cardCode: string;
  versionId: number;
  jpName: string | null;
  cnName: string | null;
  imageUrl: string | null;
  rarity: string | null;
}
```

---

## 四、认证接口

### 4.1 登录

```
POST /v1/api/auth/login
```

**请求体**

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
    "id": 1,
    "nickname": "小明",
    "email": "user@example.com",
    "avatar": "/static/icons/avatar.png"
  }
}
```

**失败**

| 状态码 | error | 说明 |
|--------|-------|------|
| 400 | `email and password are required` | 缺少必填参数 |
| 401 | `Invalid email or password` | 邮箱或密码错误 |
| 500 | — | 服务器错误 |

---

### 4.2 注册

```
POST /v1/api/auth/register
```

**请求体**

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
  "user": { "id": 1, "nickname": "小明", "email": "user@example.com", "avatar": "/static/icons/avatar.png" }
}
```

**失败**

| 状态码 | error | 说明 |
|--------|-------|------|
| 400 | `nickname, email, password and inviteCode are required` | 缺少必填参数 |
| 400 | `Invalid email format` | 邮箱格式错误 |
| 409 | `Email already registered` | 邮箱已被注册 |
| 409 | `Invalid invite code` | 邀请码无效或已使用 |
| 500 | — | 服务器错误 |

**业务逻辑**：
1. 校验邮箱格式、唯一性
2. 校验邀请码存在且未使用
3. 密码 bcrypt 哈希
4. 创建用户 → 标记邀请码已使用 → 返回 JWT

---

### 4.3 获取用户信息

```
GET /v1/api/user/profile
Authorization: Bearer <token>
```

**成功 200**

```json
{ "id": 1, "nickname": "小明", "email": "user@example.com", "avatar": "/static/icons/avatar.png" }
```

---

### 4.4 管理员登录 🆕

```
POST /v1/api/auth/admin/login
```

**请求体**

```json
{ "password": "admin_secure_password" }
```

**成功 200**

```json
{ "adminToken": "eyJhbGciOiJIUzI1NiIs...", "expiresIn": 7200 }
```

> Admin Token 有效期 2 小时，仅用于 `/card-info` 写操作。密码通过环境变量 `ADMIN_PASSWORD` 配置。

---

## 五、库接口 ⭐

### 5.1 获取我的本地库列表

```
GET /v1/api/libraries/local
Authorization: Bearer <token>
```

**说明**：返回**当前登录用户**的所有本地库。

**成功 200**

```json
{
  "list": [
    { "code": "A001", "cardCount": 10 },
    { "code": "A002", "cardCount": 60 }
  ]
}
```

> ⚠️ 不同用户看到的是各自独立的本地库列表。

---

### 5.2 获取云端库列表（公共）

```
GET /v1/api/libraries/cloud
Authorization: Bearer <token>
```

**说明**：返回所有云端公共库，**所有用户看到的内容相同**。

**成功 200**

```json
{
  "list": [
    { "code": "A001", "cardCount": 50 },
    { "code": "A002", "cardCount": 30 }
  ]
}
```

---

### 5.3 获取库详情

```
GET /v1/api/libraries/:code?type=local
Authorization: Bearer <token>
```

**Query 参数**

| 参数 | 必填 | 默认 | 说明 |
|------|:---:|------|------|
| type | 否 | local | `local` 查当前用户的本地库；`cloud` 查公共云端库 |

**说明**：
- `type=local` 时，只查当前用户的本地库（自动带上 `user_id` 过滤）
- `type=cloud` 时，查公共云端库

**成功 200**

```json
{
  "code": "A001",
  "id": 1,
  "name": "A001",
  "type": "local",
  "cardCount": 10,
  "userId": 1
}
```

**失败**：404 `{ "error": "Library not found" }`

---

### 5.4 创建本地库

```
POST /v1/api/libraries
Authorization: Bearer <token>
```

**请求体**

```json
{
  "type": "local",
  "name": "A021"
}
```

**说明**：
- `type=local` → 自动绑定当前用户（`user_id` = 当前登录用户）
- `type=cloud` → 创建公共云端库（需要管理员权限）

**成功 201**

```json
{
  "code": "A021",
  "id": 21,
  "cardCount": 0,
  "type": "local",
  "userId": 1
}
```

**失败**：400 / 409 `{ "error": "Library already exists" }`

---

### 5.5 更新库

```
PUT /v1/api/libraries/:code?type=local
Authorization: Bearer <token>
```

```json
{ "name": "新库名" }
```

---

### 5.6 删除本地库

```
DELETE /v1/api/libraries/:code?type=local
Authorization: Bearer <token>
```

**说明**：只能删除自己的本地库，云端库删除需要管理员权限。

---

## 六、卡牌接口

### 6.1 获取库中卡牌列表

```
GET /v1/api/libraries/:code/cards?type=local&rarity=SR&condition=9品&page=1&pageSize=20
Authorization: Bearer <token>
```

**Query 参数**

| 参数 | 必填 | 默认 | 说明 |
|------|:---:|------|------|
| type | 否 | local | `local` 或 `cloud` |
| rarity | 否 | — | 罕贵度筛选 |
| condition | 否 | — | 品相筛选 |
| page | 否 | 1 | 页码 |
| pageSize | 否 | 20 | 每页条数 |

**说明**：`type=local` 时自动限定为当前用户的本地库。

**成功 200**

```json
{
  "list": [ Card, Card, ... ],
  "total": 8,
  "page": 1,
  "pageSize": 20
}
```

> 库不存在时返回空列表，不报 404。

---

### 6.2 搜索卡牌

```
GET /v1/api/cards/search?q=青眼&libraryCode=A001&type=local
Authorization: Bearer <token>
```

| 参数 | 必填 | 说明 |
|------|:---:|------|
| q | 是 | 关键词（匹配名称/编号/序号） |
| libraryCode | 否 | 限定库编号 |
| type | 否 | `local` 或 `cloud` |

---

### 6.3 添加卡牌（拍照识别后入库）⭐

```
POST /v1/api/cards
Authorization: Bearer <token>
```

**请求体**

```json
{
  "libraryCode": "A001",
  "type": "local",
  "jpName": "閃刀姫－レイ",
  "cnName": "闪刀姬-零",
  "code": "QCAC-JP059",
  "rarity": "QCSER",
  "condition": "9品",
  "versionId": 1
}
```

**说明**：
- `type=local` → 卡牌添加到当前用户的指定本地库，自动生成 `serial`
- `type=cloud` → 卡牌添加到公共云端库

**成功 201**

```json
{
  "id": 9,
  "serial": "A001-0009",
  "img": "/static/icons/YO-GI-OH-card_placeholder.png"
}
```

**业务逻辑**：
1. 自动生成 `serial`：`{libraryCode}-{4位自增}`，每个库独立计数
2. 后端根据 `code`（卡牌编号）联表 `card_info` 查询卡名和卡图
3. 如果 `card_info` 有数据 → 自动填充 `jpName`/`cnName`/`img`
4. 如果 `card_info` 无数据 → 使用请求体中的值或默认占位

---

### 6.4 删除卡牌

```
DELETE /v1/api/cards/:id
Authorization: Bearer <token>
```

**说明**：只能删除自己本地库中的卡牌。

---

## 七、上传/下载（库间转移）⭐

### 7.1 上传到云端库（本地 → 云端）

```
POST /v1/api/libraries/transfer/upload
Authorization: Bearer <token>
```

**业务含义**：将卡牌从**当前用户的本地库**移动到**公共云端库**。转移后卡牌变为公共可见。

**请求体**

```json
{
  "fromCode": "A001",
  "toCode": "C001",
  "cardIds": [1, 2, 3]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| fromCode | string | 是 | 源本地库编号（自动限定当前用户） |
| toCode | string | 是 | 目标云端库编号 |
| cardIds | number[] | 是 | 要转移的卡牌 ID 列表 |

**成功 200**

```json
{ "success": true, "transferredCount": 3 }
```

**业务逻辑**：
1. 校验 `fromCode` 属于当前用户
2. 校验所有 `cardIds` 属于该用户
3. **事务**：在云端库创建卡牌副本（生成新 ID 和序号）→ 删除源卡牌
4. 更新两个库的 `card_count`

**失败**

| 状态码 | error | 说明 |
|--------|-------|------|
| 400 | `fromCode, toCode and cardIds are required` | 缺少必填 |
| 404 | `Source library not found` | 源库不存在或不属于你 |
| 404 | `Target library not found` | 目标云端库不存在 |
| 404 | `Card not found` | 卡牌不存在或不属于你 |
| 500 | — | 服务器错误 |

---

### 7.2 下载到本地库（云端 → 本地）

```
POST /v1/api/libraries/transfer/download
Authorization: Bearer <token>
```

**业务含义**：将卡牌从**公共云端库**移动到**当前用户的本地库**。转移后卡牌变为该用户私有。

**请求体**

```json
{
  "fromCode": "C001",
  "toCode": "A001",
  "cardIds": [5, 6]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| fromCode | string | 是 | 源云端库编号（公共） |
| toCode | string | 是 | 目标本地库编号（自动限定当前用户） |
| cardIds | number[] | 是 | 要转移的卡牌 ID 列表 |

**成功 200**

```json
{ "success": true, "transferredCount": 2 }
```

**业务逻辑**：
1. 校验 `toCode` 属于当前用户
2. 校验 `fromCode` 是云端库（任何人可下载）
3. **事务**：在用户本地库创建卡牌副本 → 删除云端库中的原卡牌
4. 更新两个库的 `card_count`

---

### 7.3 转移规则总结

```
上传（local → cloud）：
  ┌──────────┐         ┌──────────┐
  │ 用户A本地库 │  ──→   │ 公共云端库  │   所有人可见
  │ (私有)    │  移动   │ (公共)    │
  └──────────┘         └──────────┘

下载（cloud → local）：
  ┌──────────┐         ┌──────────┐
  │ 公共云端库  │  ──→   │ 用户A本地库 │   用户A私有
  │ (公共)    │  移动   │ (私有)    │
  └──────────┘         └──────────┘
```

> 转移是**移动**（复制 + 删除源），不是复制。使用数据库事务保证原子性。

---

## 八、罕贵度 & 品相

### 8.1 获取罕贵度列表

```
GET /v1/api/rarities?versionId=1
Authorization: Bearer <token>
```

**成功 200**

```json
{
  "list": [
    "20SER","QCSER","PSER","HR","HPR","ESR","ESPR","SER",
    "SEMR","SEPR","PR","UPR","PGR","GSER","GMR","GR",
    "UTR","CR","UR","RR","USR","UMR","SR","SPR",
    "NPR","NMR","NKC","R","RKC","RPR","N","NR"
  ]
}
```

### 8.2 获取品相列表

```
GET /v1/api/grades?versionId=1
Authorization: Bearer <token>
```

**成功 200**

```json
{
  "list": [
    { "name": "99品", "desc": "完美全新", "hasSub": false },
    { "name": "9品",  "desc": "近新优品", "hasSub": false },
    { "name": "78品", "desc": "标准流通", "hasSub": false },
    { "name": "56品", "desc": "中小瑕疵", "hasSub": false },
    { "name": "34品", "desc": "重大次品", "hasSub": false },
    { "name": "评级卡", "desc": "", "hasSub": true },
    { "name": "自定义", "desc": "", "hasSub": true }
  ]
}
```

### 8.3 获取评级卡子选项

```
GET /v1/api/grades/psa
Authorization: Bearer <token>
```

**成功 200**

```json
{ "list": ["PSA 10","PSA 9","PSA 8","PSA 7","PSA 6","PSA 5","PSA 4","PSA 3","PSA 2","PSA 1"] }
```

---

## 九、卡牌信息主数据库（card_info）🆕

### 9.1 根据编号查询卡牌信息 ⭐

```
GET /v1/api/card-info/:cardCode
Authorization: Bearer <token>
```

**成功 200（有数据）**

```json
{
  "cardCode": "QCAC-JP001",
  "versionId": 1,
  "jpName": "青眼の白龍",
  "cnName": "青眼白龙",
  "imageUrl": "https://cdn.xxx.com/cards/QCAC-JP001.png",
  "rarity": "SER"
}
```

**成功 200（未收录）**

```json
{
  "cardCode": "UNKNOWN-001",
  "versionId": null,
  "jpName": null,
  "cnName": null,
  "imageUrl": null,
  "rarity": null
}
```

> 未收录时不报错，返回 `null` 字段，前端继续显示占位数据。

---

### 9.2 批量查询

```
POST /v1/api/card-info/batch
Authorization: Bearer <token>
```

**请求体**

```json
{ "cardCodes": ["QCAC-JP001", "QCDB-JP002", "SD42-JP003"] }
```

> 单次最多 100 条。

**成功 200**

```json
{
  "data": [
    { "cardCode": "QCAC-JP001", "jpName": "青眼の白龍", "cnName": "青眼白龙", "imageUrl": "…", "rarity": "SER" },
    { "cardCode": "QCDB-JP002", "jpName": "真紅眼の黒竜", "cnName": "真红眼黑龙", "imageUrl": "…", "rarity": "UR" },
    { "cardCode": "SD42-JP003", "jpName": null, "cnName": null, "imageUrl": null, "rarity": null }
  ]
}
```

---

### 9.3 分页列表（管理员）

```
GET /v1/api/card-info?versionId=1&search=青眼&page=1&pageSize=50
Authorization: Bearer <admin_token>
```

---

### 9.4 新增卡牌信息（管理员 — 单条）

```
POST /v1/api/card-info
Authorization: Bearer <admin_token>
```

```json
{
  "cardCode": "QCAC-JP001",
  "versionId": 1,
  "jpName": "青眼の白龍",
  "cnName": "青眼白龙",
  "rarity": "SER"
}
```

**成功 201** — 返回创建的 card_info 对象  
**失败 409** — `cardCode already exists`

---

### 9.5 更新卡牌信息（管理员）

```
PUT /v1/api/card-info/:cardCode
Authorization: Bearer <admin_token>
```

```json
{ "jpName": "青眼の白龍（复刻）", "cnName": "青眼白龙（复刻）" }
```

> 所有字段可选，只更新传入的字段。

---

### 9.6 删除卡牌信息（管理员）

```
DELETE /v1/api/card-info/:cardCode
Authorization: Bearer <admin_token>
```

---

### 9.7 上传卡牌图片（管理员）

```
POST /v1/api/card-info/:cardCode/image
Content-Type: multipart/form-data
Authorization: Bearer <admin_token>
```

| 表单字段 | 类型 | 必填 | 说明 |
|----------|------|:---:|------|
| image | File | 是 | png/jpg/webp，建议 ≤ 5MB |

**成功 200**

```json
{ "imageUrl": "https://cdn.xxx.com/uploads/cards/QCAC-JP001.png" }
```

**业务逻辑**：自动缩放到宽 400px → 保存 → 更新 `card_info.image_url`。

---

### 9.8 CSV 批量导入（管理员）

```
POST /v1/api/card-info/batch-import
Content-Type: multipart/form-data
Authorization: Bearer <admin_token>
```

| 表单字段 | 类型 | 必填 | 说明 |
|----------|------|:---:|------|
| file | File | 是 | CSV 文件（UTF-8） |
| versionId | string | 是 | 游戏版本 ID |

**CSV 格式**

```csv
cardCode,jpName,cnName,rarity
QCAC-JP001,青眼の白龍,青眼白龙,SER
QCAC-JP002,真紅眼の黒竜,真红眼黑龙,UR
```

**成功 200**

```json
{
  "total": 100,
  "success": 98,
  "failed": 2,
  "errors": [
    { "row": 45, "cardCode": "INVALID", "reason": "cardCode 格式不正确" },
    { "row": 72, "cardCode": "", "reason": "cardCode 为空" }
  ]
}
```

> 已存在的 cardCode → 更新；不存在 → 新增（upsert）。

---

## 十、其他接口

### 10.1 健康检查

```
GET /health
```

**成功 200**：`{ "status": "ok" }`（无需 Token）

### 10.2 游戏版本列表

```
GET /v1/api/versions
Authorization: Bearer <token>
```

**成功 200**

```json
{
  "list": [
    { "id": 1, "name": "游戏王日文", "lang": "日文", "logo": "/static/icons/version_logos/logo_yugioh_jp.png" },
    { "id": 2, "name": "游戏王简中", "lang": "简中", "logo": "/static/icons/version_logos/logo_yugioh_cn.png" }
  ]
}
```

---

## 十一、接口汇总表

### 认证

| # | 方法 | 路径 | 说明 | 鉴权 |
|----|------|------|------|:---:|
| A1 | POST | `/auth/login` | 登录 | — |
| A2 | POST | `/auth/register` | 注册 | — |
| A3 | GET | `/user/profile` | 用户信息 | Token |
| A4 | POST | `/auth/admin/login` | 管理员登录 | — |

### 库 ⭐

| # | 方法 | 路径 | 说明 | 鉴权 |
|----|------|------|------|:---:|
| L1 | GET | `/libraries/local` | 我的本地库列表 | Token |
| L2 | GET | `/libraries/cloud` | 云端公共库列表 | Token |
| L3 | GET | `/libraries/:code` | 库详情 | Token |
| L4 | POST | `/libraries` | 创建库 | Token |
| L5 | PUT | `/libraries/:code` | 更新库 | Token |
| L6 | DELETE | `/libraries/:code` | 删除本地库 | Token |

### 卡牌

| # | 方法 | 路径 | 说明 | 鉴权 |
|----|------|------|------|:---:|
| C1 | GET | `/libraries/:code/cards` | 库中卡牌列表 | Token |
| C2 | GET | `/cards/search` | 搜索卡牌 | Token |
| C3 | POST | `/cards` | 添加卡牌（入库） | Token |
| C4 | DELETE | `/cards/:id` | 删除卡牌 | Token |

### 上传/下载 ⭐

| # | 方法 | 路径 | 说明 | 鉴权 |
|----|------|------|------|:---:|
| T1 | POST | `/libraries/transfer/upload` | 本地→云端 | Token |
| T2 | POST | `/libraries/transfer/download` | 云端→本地 | Token |

### 罕贵度 & 品相

| # | 方法 | 路径 | 说明 | 鉴权 |
|----|------|------|------|:---:|
| R1 | GET | `/rarities` | 罕贵度列表 | Token |
| R2 | GET | `/grades` | 品相列表 | Token |
| R3 | GET | `/grades/psa` | 评级卡子选项 | Token |

### 卡牌信息数据库 🆕

| # | 方法 | 路径 | 说明 | 鉴权 |
|----|------|------|------|:---:|
| I1 | GET | `/card-info/:cardCode` | ⭐ 编号查卡牌信息 | Token |
| I2 | POST | `/card-info/batch` | 批量查询 | Token |
| I3 | GET | `/card-info` | 分页列表 | Admin |
| I4 | POST | `/card-info` | 新增卡牌信息 | Admin |
| I5 | PUT | `/card-info/:cardCode` | 更新卡牌信息 | Admin |
| I6 | DELETE | `/card-info/:cardCode` | 删除卡牌信息 | Admin |
| I7 | POST | `/card-info/:cardCode/image` | 上传卡图 | Admin |
| I8 | POST | `/card-info/batch-import` | CSV批量导入 | Admin |

### 其他

| # | 方法 | 路径 | 说明 | 鉴权 |
|----|------|------|------|:---:|
| 0 | GET | `/health` | 健康检查 | — |
| V1 | GET | `/versions` | 游戏版本列表 | Token |

---

## 十二、后端工作清单

### ✅ 阶段 1：数据库（已完成）

- [x] **1.1** 确认 `users` / `invite_codes` / `versions` 表结构正确
- [x] **1.2** 创建/修改 `libraries` 表，增加 `user_id` 字段，`type=local` 时 NOT NULL
- [x] **1.3** 创建/修改 `cards` 表，增加 `user_id` 字段
- [x] **1.4** 创建 `card_info` 表
- [x] **1.5** 插入默认版本数据
- [x] **1.6** 配置图片上传目录 `uploads/cards/`

### ✅ 阶段 2：认证 & 库 API（已完成）

- [x] **2.1** 登录/注册/用户信息
- [x] **2.2** `GET /libraries/local` — 按当前用户过滤
- [x] **2.3** `GET /libraries/cloud` — 查所有公共库
- [x] **2.4** `POST /libraries` — 创建本地库时自动绑定 `user_id`
- [x] **2.5** `PUT/DELETE /libraries/:code` — 校验所有权
- [x] **2.6** 库编号每个用户独立命名空间

### ✅ 阶段 3：卡牌 API（已完成）

- [x] **3.1** `GET /libraries/:code/cards` — 本地库限定当前用户
- [x] **3.2** `POST /cards` — 自动生成 serial，自动关联 `user_id`
- [x] **3.3** `DELETE /cards/:id` — 校验所有权
- [x] **3.4** `GET /cards/search` — 搜索限定用户范围

### ✅ 阶段 4：上传/下载 API（已完成）

- [x] **4.1** `POST /libraries/transfer/upload` — 本地→云端移动
- [x] **4.2** `POST /libraries/transfer/download` — 云端→本地移动
- [x] **4.3** 事务保证原子性（复制+删除）
- [x] **4.4** 所有权校验（只能转移自己的卡牌）

### ✅ 阶段 5：card_info API（已完成）

- [x] **5.1** `GET /card-info/:cardCode` — 核心查询
- [x] **5.2** `POST /card-info/batch` — 批量查询
- [x] **5.3** `GET /card-info` — 分页列表（Admin）
- [x] **5.4** `POST /card-info` — 单条新增（Admin）
- [x] **5.5** `PUT /card-info/:cardCode` — 更新（Admin）
- [x] **5.6** `DELETE /card-info/:cardCode` — 删除（Admin）

### ✅ 阶段 6：图片上传 & CSV 导入（已完成）

- [x] **6.1** `POST /card-info/:cardCode/image` — 卡图上传
- [ ] **6.2** 图片缩放/压缩（宽 400px）— 暂未实现
- [x] **6.3** `POST /card-info/batch-import` — CSV 解析 + upsert
- [x] **6.4** cardCode 正则校验 + 导入结果反馈

### ✅ 阶段 7：管理员鉴权（已完成）

- [x] **7.1** 用户表增加 `role` 字段（user/admin）
- [x] **7.2** 管理员登录通过普通登录接口
- [x] **7.3** Admin 鉴权中间件

### 🟡 阶段 8：联调 & 测试

- [ ] **8.1** Postman/Apifox 接口集合
- [ ] **8.2** 准备示例 CSV（游戏王卡牌 ~50 条）
- [ ] **8.3** 前端联调：拍照→识别→查 card_info→入库→显示

---

## 十三、前端改造清单

### ✅ 已完成

- [x] 登录接口支持 `role` 字段返回
- [x] 根据 `role` 字段判断管理员并跳转
- [x] 版本管理页面（增删改查）
- [x] 版本配置管理页面（罕贵度、品相）
- [x] 管理员权限检查

### 🟡 待完成

- [ ] 新增 `getCardInfo()` / `getCardInfoBatch()` API 函数
- [ ] `doRecognize()` 识别成功后调用 `getCardInfo(cardCode)` 获取真实名称和卡图
- [ ] 有数据→显示真实卡名+卡图；无数据→保持"待收录"占位
- [ ] 管理员页面：卡牌信息管理（CSV导入、单条录入、列表管理）

---

## 十四、管理员接口 🆕

> 以下接口需要 Admin Token 鉴权（`Authorization: Bearer <admin_token>`）。
> Admin Token 通过普通登录获取（管理员账号登录后 JWT 包含 admin role）。

### 14.1 版本配置管理

#### 获取所有版本配置

```
GET /v1/api/admin/version-config
Authorization: Bearer <admin_token>
```

**成功 200**：
```json
{
  "data": [
    {
      "versionId": 1,
      "rarities": ["QCSER", "PSER", "SER", "UR", "SR", "R", "N"],
      "grades": [
        { "name": "99品", "desc": "完美全新", "hasSub": false },
        { "name": "9品", "desc": "近新优品", "hasSub": false }
      ],
      "defaultRarity": "QCSER",
      "defaultGrade": "9品",
      "updatedAt": "2026-06-19T12:00:00Z"
    }
  ]
}
```

#### 获取单个版本配置

```
GET /v1/api/admin/version-config/:versionId
Authorization: Bearer <admin_token>
```

**成功 200**：返回单个 versionConfig 对象
**未配置 404**：`{ "error": "Version config not found" }`

#### 创建/更新版本配置（upsert）

```
PUT /v1/api/admin/version-config/:versionId
Authorization: Bearer <admin_token>
```

**请求体**：
```json
{
  "rarities": ["QCSER", "PSER", "SER", "UR", "SR"],
  "grades": [
    { "name": "99品", "desc": "完美全新", "hasSub": false },
    { "name": "9品", "desc": "近新优品", "hasSub": false }
  ],
  "defaultRarity": "QCSER",
  "defaultGrade": "9品"
}
```

**校验规则**：
- `defaultRarity` 必须在 `rarities` 数组中
- `defaultGrade` 必须在 `grades[].name` 中存在
- `rarities` 至少 1 项

**成功 200**：返回完整的 versionConfig 对象（含 `updatedAt`）

---

### 14.2 版本管理

#### 更新版本信息

```
PUT /v1/api/admin/versions/:versionId
Authorization: Bearer <admin_token>
```

**请求体**：
```json
{
  "name": "游戏王日文",
  "lang": "日文",
  "logo": "/uploads/versions/yugioh_jp.png"
}
```

**成功 200**：返回更新后的 version 对象

#### 上传版本 Logo

```
POST /v1/api/admin/versions/:versionId/logo
Content-Type: multipart/form-data
Authorization: Bearer <admin_token>
```

| 表单字段 | 类型 | 必填 | 说明 |
|----------|------|:---:|------|
| image | File | 是 | png/jpg/webp，建议 ≤ 2MB |

**业务逻辑**：自动缩放到宽 200px → 保存到 `uploads/versions/` → 更新 `versions.logo` 字段

**成功 200**：
```json
{ "logoUrl": "/uploads/versions/yugioh_jp.png" }
```

#### 新增版本

```
POST /v1/api/admin/versions
Authorization: Bearer <admin_token>
```

**请求体**：
```json
{
  "name": "新版本名称",
  "lang": "日文"
}
```

**成功 201**：返回新创建的 version 对象

#### 删除版本

```
DELETE /v1/api/admin/versions/:versionId
Authorization: Bearer <admin_token>
```

**成功 200**：`{ "success": true }`
**失败 409**：有关联数据时拒绝删除

---

### 14.3 管理员接口汇总

| # | 方法 | 路径 | 说明 |
|----|------|------|------|
| A1 | GET | `/admin/version-config` | 所有版本配置列表 |
| A2 | GET | `/admin/version-config/:versionId` | 单版本配置 |
| A3 | PUT | `/admin/version-config/:versionId` | 创建/更新版本配置 |
| V1 | PUT | `/admin/versions/:versionId` | 更新版本信息 |
| V2 | POST | `/admin/versions/:versionId/logo` | 上传版本 Logo |
| V3 | POST | `/admin/versions` | 新增版本 |
| V4 | DELETE | `/admin/versions/:versionId` | 删除版本 |

---

### 14.4 图片同步策略

| 层级 | 位置 | 说明 |
|------|------|------|
| 前端兜底 | `/static/icons/version_logos/` | 默认版本 logo，后端无数据时使用 |
| 后端存储 | `uploads/versions/` | 管理员上传的 logo |
| API 返回 | `GET /versions` 的 `logo` 字段 | 有则返回 URL，无则空字符串 |

**同步流程**：
```
管理员上传 logo → POST /admin/versions/:id/logo → 后端保存 + 更新 logo 字段
                                                  ↓
用户打开页面 → GET /versions → logo 已是新 URL → 前端自动显示
```

> 前端每次进页面都重新请求 `GET /versions`，无需额外同步机制。
