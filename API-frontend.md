# 前端对接文档

> **版本：v1.0.0** | 更新日期：2026-06-13
>
> 本文档是前端与后端对接的完整指南，包含接口调用示例、认证流程、错误处理等。

---

## 一、快速开始

### 1.1 基础配置

```javascript
// API 基础配置
const API_BASE = 'http://localhost:8080';
const API_PREFIX = '/v1/api';

// 请求超时时间 (ms)
const TIMEOUT = 10000;
```

### 1.2 请求封装示例

```javascript
class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('token');
  }

  // 设置 Token
  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  // 清除 Token
  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  // 通用请求方法
  async request(method, path, data = null, isFormData = false) {
    const url = `${this.baseUrl}${path}`;
    const headers = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const options = { method, headers };

    if (data) {
      if (isFormData) {
        options.body = data;
      } else {
        options.body = JSON.stringify(data);
      }
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '请求失败');
      }

      return result;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // GET 请求
  get(path) {
    return this.request('GET', path);
  }

  // POST 请求
  post(path, data, isFormData = false) {
    return this.request('POST', path, data, isFormData);
  }

  // PUT 请求
  put(path, data) {
    return this.request('PUT', path, data);
  }

  // DELETE 请求
  delete(path) {
    return this.request('DELETE', path);
  }
}

// 创建实例
const api = new ApiClient(API_BASE);
```

---

## 二、认证相关

### 2.1 登录

```javascript
// POST /v1/api/auth/login
async function login(email, password) {
  const result = await api.post('/v1/api/auth/login', {
    email,
    password
  });

  // 保存 Token
  api.setToken(result.token);

  // 保存用户信息
  localStorage.setItem('user', JSON.stringify(result.user));

  return result;
}

// 使用示例
try {
  const { token, user } = await login('user@example.com', '123456');
  console.log('登录成功:', user);
} catch (error) {
  console.error('登录失败:', error.message);
}
```

**请求体：**
```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

**成功响应：**
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

**错误响应：**
| 状态码 | 错误信息 |
|--------|----------|
| 400 | `email and password are required` |
| 401 | `Invalid email or password` |
| 500 | 服务器内部错误 |

---

### 2.2 注册

```javascript
// POST /v1/api/auth/register
async function register(nickname, email, password, inviteCode) {
  const result = await api.post('/v1/api/auth/register', {
    nickname,
    email,
    password,
    inviteCode
  });

  api.setToken(result.token);
  localStorage.setItem('user', JSON.stringify(result.user));

  return result;
}

// 使用示例
try {
  const { token, user } = await register('小明', 'user@example.com', '123456', 'ABC123');
  console.log('注册成功:', user);
} catch (error) {
  console.error('注册失败:', error.message);
}
```

**请求体：**
```json
{
  "nickname": "小明",
  "email": "user@example.com",
  "password": "123456",
  "inviteCode": "ABC123"
}
```

**成功响应：**
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

**错误响应：**
| 状态码 | 错误信息 |
|--------|----------|
| 400 | `nickname, email, password and inviteCode are required` |
| 400 | `Invalid email format` |
| 409 | `Email already registered` |
| 409 | `Invalid invite code` |

---

### 2.3 获取用户信息

```javascript
// GET /v1/api/user/profile
async function getProfile() {
  const user = await api.get('/v1/api/user/profile');
  return user;
}

// 使用示例
try {
  const user = await getProfile();
  console.log('用户信息:', user);
} catch (error) {
  console.error('获取失败:', error.message);
}
```

**成功响应：**
```json
{
  "id": "001",
  "nickname": "小明",
  "email": "user@example.com",
  "avatar": "/static/icons/avatar.png"
}
```

---

### 2.4 退出登录

```javascript
function logout() {
  api.clearToken();
  localStorage.removeItem('user');
  // 跳转到登录页
  window.location.href = '/login';
}
```

---

## 三、游戏版本

### 3.1 获取版本列表

```javascript
// GET /v1/api/versions
async function getVersions() {
  const { list } = await api.get('/v1/api/versions');
  return list;
}

// 使用示例
const versions = await getVersions();
// 返回: [{ id: 1, name: "游戏王日文", lang: "日文", logo: "..." }, ...]
```

---

## 四、库管理

### 4.1 获取本地库列表

```javascript
// GET /v1/api/libraries/local
async function getLocalLibraries() {
  const { list } = await api.get('/v1/api/libraries/local');
  return list;
}

// 返回示例
// [{ code: "A001", cardCount: 10 }, { code: "A002", cardCount: 60 }]
```

### 4.2 获取云端库列表

```javascript
// GET /v1/api/libraries/cloud
async function getCloudLibraries() {
  const { list } = await api.get('/v1/api/libraries/cloud');
  return list;
}
```

### 4.3 获取库详情

```javascript
// GET /v1/api/libraries/:code
async function getLibraryDetail(code, type = 'local') {
  const detail = await api.get(`/v1/api/libraries/${code}?type=${type}`);
  return detail;
}

// 使用示例
const library = await getLibraryDetail('A001', 'local');
// 返回: { code: "A001", id: "MX00000001", name: "A001", type: "local", cardCount: 10 }
```

### 4.4 创建新库

```javascript
// POST /v1/api/libraries
async function createLibrary(name, type = 'local') {
  const library = await api.post('/v1/api/libraries', { type, name });
  return library;
}

// 使用示例
const newLibrary = await createLibrary('A021', 'local');
// 返回: { code: "A021", id: "MX00000021", cardCount: 0 }
```

**错误响应：**
| 状态码 | 错误信息 |
|--------|----------|
| 400 | `name is required` |
| 409 | `Library already exists` |

### 4.5 更新库设置

```javascript
// PUT /v1/api/libraries/:code
async function updateLibrary(code, name, type) {
  const library = await api.put(`/v1/api/libraries/${code}`, { name, type });
  return library;
}

// 使用示例
await updateLibrary('A001', '新库名', 'local');
```

---

## 五、卡牌管理

### 5.1 获取库中卡牌列表

```javascript
// GET /v1/api/libraries/:code/cards
async function getLibraryCards(code, options = {}) {
  const params = new URLSearchParams({
    type: options.type || 'local',
    page: options.page || 1,
    pageSize: options.pageSize || 20,
  });

  if (options.rarity) params.append('rarity', options.rarity);
  if (options.condition) params.append('condition', options.condition);
  if (options.versionId) params.append('versionId', options.versionId);

  const result = await api.get(`/v1/api/libraries/${code}/cards?${params}`);
  return result;
}

// 使用示例
const { list, total, page, pageSize } = await getLibraryCards('A001', {
  type: 'local',
  page: 1,
  pageSize: 20,
  rarity: 'QCSER'
});
```

**响应格式：**
```json
{
  "list": [
    {
      "id": 1,
      "jpName": "閃刀姫－レイ",
      "cnName": "闪刀姬-零",
      "code": "QCAC-JP059",
      "rarity": "QCSER",
      "condition": "9品",
      "serial": "A001-0001",
      "img": "",
      "libraryCode": "A001",
      "versionId": 1
    }
  ],
  "total": 8,
  "page": 1,
  "pageSize": 20
}
```

> **注意**：库不存在时返回空列表 `{ "list": [], "total": 0, "page": 1, "pageSize": 20 }`

---

### 5.2 搜索卡牌

```javascript
// GET /v1/api/cards/search
async function searchCards(keyword, options = {}) {
  const params = new URLSearchParams({ q: keyword });

  if (options.libraryCode) params.append('libraryCode', options.libraryCode);
  if (options.type) params.append('type', options.type);

  const { list } = await api.get(`/v1/api/cards/search?${params}`);
  return list;
}

// 使用示例
const cards = await searchCards('闪刀', { type: 'local' });
```

---

### 5.3 创建卡牌（拍照识别后入库）

```javascript
// POST /v1/api/cards
async function createCard(cardData) {
  const card = await api.post('/v1/api/cards', cardData);
  return card;
}

// 使用示例
const newCard = await createCard({
  libraryCode: 'A001',
  jpName: '閃刀姫－レイ',
  cnName: '闪刀姬-零',
  code: 'QCAC-JP059',
  rarity: 'QCSER',
  condition: '9品',
  versionId: 1
});

// 返回: { id: 9, serial: "A001-0009", img: "" }
```

**请求体：**
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

**成功响应：**
```json
{
  "id": 9,
  "serial": "A001-0009",
  "img": ""
}
```

---

### 5.4 删除卡牌

```javascript
// DELETE /v1/api/cards/:id
async function deleteCard(cardId) {
  await api.delete(`/v1/api/cards/${cardId}`);
}

// 使用示例
await deleteCard(9);
```

**成功响应：** `{ "success": true }`

---

## 六、云端同步

### 6.1 上传到云端（本地 → 云端）

```javascript
// POST /v1/api/libraries/transfer/upload
async function uploadToCloud(fromCode, toCode, cardIds) {
  const result = await api.post('/v1/api/libraries/transfer/upload', {
    fromCode,
    toCode,
    cardIds
  });
  return result;
}

// 使用示例
await uploadToCloud('A001', 'A001', [1, 2, 3]);
```

**请求体：**
```json
{
  "fromCode": "A001",
  "toCode": "A001",
  "cardIds": [1, 2, 3]
}
```

### 6.2 下载到本地（云端 → 本地）

```javascript
// POST /v1/api/libraries/transfer/download
async function downloadToLocal(fromCode, toCode, cardIds) {
  const result = await api.post('/v1/api/libraries/transfer/download', {
    fromCode,
    toCode,
    cardIds
  });
  return result;
}

// 使用示例
await downloadToLocal('A001', 'A001', [4, 5, 6]);
```

---

## 七、参考数据

### 7.1 获取罕贵度列表

```javascript
// GET /v1/api/rarities
async function getRarities() {
  const { list } = await api.get('/v1/api/rarities');
  return list;
}

// 返回: ["20SER", "QCSER", "PSER", "HR", ...]
```

### 7.2 获取品相列表

```javascript
// GET /v1/api/grades
async function getGrades() {
  const { list } = await api.get('/v1/api/grades');
  return list;
}

// 返回:
// [
//   { name: "99品", desc: "完美全新", hasSub: false },
//   { name: "9品", desc: "近新优品", hasSub: false },
//   ...
//   { name: "评级卡", desc: "", hasSub: true },
//   { name: "自定义", desc: "", hasSub: true }
// ]
```

### 7.3 获取评级卡子选项

```javascript
// GET /v1/api/grades/psa
async function getPsaGrades() {
  const { list } = await api.get('/v1/api/grades/psa');
  return list;
}

// 返回: ["PSA 10", "PSA 9", "PSA 8", ...]
```

---

## 八、拍照识别

### 8.1 识别卡牌

```javascript
// POST /v1/api/vision/recognize
async function recognizeCard(imageFile, versionId = 1) {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('versionId', versionId);

  const result = await api.post('/v1/api/vision/recognize', formData, true);
  return result;
}

// 使用示例
const fileInput = document.querySelector('#cardImage');
const file = fileInput.files[0];

const result = await recognizeCard(file, 1);
// 返回:
// {
//   jpName: "閃刀姫－レイ",
//   cnName: "闪刀姬-零",
//   code: "QCAC-JP059",
//   rarity: "QCSER",
//   confidence: 0.95
// }
```

---

## 九、健康检查

### 9.1 检查后端状态

```javascript
// GET /health
async function healthCheck() {
  const response = await fetch(`${API_BASE}/health`);
  const result = await response.json();
  return result;
}

// 返回: { "status": "ok" }
```

---

## 十、错误处理

### 10.1 统一错误处理

```javascript
async function apiRequest(method, path, data) {
  try {
    const result = await api.request(method, path, data);
    return { success: true, data: result };
  } catch (error) {
    // 根据错误类型做不同处理
    if (error.message.includes('Unauthorized')) {
      // Token 过期，跳转登录
      logout();
      return { success: false, redirect: '/login' };
    }

    return { success: false, error: error.message };
  }
}
```

### 10.2 错误码速查

| HTTP 状态码 | 含义 | 处理建议 |
|-------------|------|----------|
| 200 | 成功 | 正常处理响应 |
| 201 | 创建成功 | 正常处理响应 |
| 400 | 参数错误 | 提示用户检查输入 |
| 401 | 未授权 | 清除 Token，跳转登录页 |
| 404 | 资源不存在 | 提示用户资源不存在 |
| 409 | 冲突 | 根据错误信息提示（如邮箱已注册） |
| 500 | 服务器错误 | 提示用户稍后重试 |

---

## 十一、完整调用示例

### 11.1 登录流程

```javascript
async function handleLogin(email, password) {
  try {
    // 调用登录接口
    const { token, user } = await login(email, password);

    // 保存登录状态
    localStorage.setItem('userId', user.id);
    localStorage.setItem('nickname', user.nickname);

    // 跳转主页
    window.location.href = '/home';

    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
```

### 11.2 创建库并添加卡牌

```javascript
async function handleAddCard(cardData) {
  try {
    // 1. 确保库存在
    let libraries = await getLocalLibraries();
    const libraryExists = libraries.find(l => l.code === cardData.libraryCode);

    if (!libraryExists) {
      await createLibrary(cardData.libraryCode, 'local');
    }

    // 2. 创建卡牌
    const newCard = await createCard(cardData);

    // 3. 刷新卡牌列表
    const cards = await getLibraryCards(cardData.libraryCode);

    return { success: true, card: newCard, cards };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
```

---

## 十二、环境配置

| 环境 | 后端地址 |
|------|----------|
| 开发环境 | `http://localhost:8080` |
| 测试环境 | `http://test-api.example.com` |
| 生产环境 | `https://api.example.com` |

---

## 十三、接口汇总

| 序号 | 方法 | 路径 | 说明 | 需认证 |
|------|------|------|------|--------|
| 1 | POST | `/v1/api/auth/login` | 登录 | 否 |
| 2 | POST | `/v1/api/auth/register` | 注册 | 否 |
| 3 | GET | `/v1/api/user/profile` | 用户信息 | 是 |
| 4 | GET | `/health` | 健康检查 | 否 |
| 5 | GET | `/v1/api/versions` | 游戏版本列表 | 是 |
| 6 | GET | `/v1/api/libraries/local` | 本地库列表 | 是 |
| 7 | GET | `/v1/api/libraries/cloud` | 云端库列表 | 是 |
| 8 | GET | `/v1/api/libraries/:code` | 库详情 | 是 |
| 9 | POST | `/v1/api/libraries` | 创建新库 | 是 |
| 10 | PUT | `/v1/api/libraries/:code` | 更新库设置 | 是 |
| 11 | GET | `/v1/api/libraries/:code/cards` | 库中卡牌列表 | 是 |
| 12 | GET | `/v1/api/cards/search` | 搜索卡牌 | 是 |
| 13 | POST | `/v1/api/cards` | 创建卡牌 | 是 |
| 14 | DELETE | `/v1/api/cards/:id` | 删除卡牌 | 是 |
| 15 | POST | `/v1/api/libraries/transfer/upload` | 上传到云端 | 是 |
| 16 | POST | `/v1/api/libraries/transfer/download` | 下载到本地 | 是 |
| 17 | GET | `/v1/api/rarities` | 罕贵度列表 | 是 |
| 18 | GET | `/v1/api/grades` | 品相列表 | 是 |
| 19 | GET | `/v1/api/grades/psa` | 评级卡子选项 | 是 |
| 20 | POST | `/v1/api/vision/recognize` | 拍照识别 | 是 |
