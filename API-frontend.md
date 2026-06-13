# 前端对接文档

## 基础信息

| 项目 | 值 |
|------|-----|
| 基础 URL | `http://localhost:8080` |
| Content-Type | `application/json` |
| 认证方式 | Bearer Token（登录后获取，放在请求头 `Authorization: Bearer <token>`） |

---

## 接口列表

### 1. 健康检查

**请求**
```
GET /health
```

**成功响应 (200)**
```json
{
  "status": "ok"
}
```

---

### 2. 用户注册

**请求**
```
POST /v1/api/auth/register
```

**请求体**
```json
{
  "nickname": "小明",
  "email": "user@example.com",
  "password": "123456",
  "inviteCode": "XK7P2M9Q"
}
```

**成功响应 (201)**
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

**失败响应**
| 状态码 | 响应 | 说明 |
|--------|------|------|
| 400 | `{"error": "nickname, email, password and inviteCode are required"}` | 缺少必填参数 |
| 400 | `{"error": "Invalid email format"}` | 邮箱格式不正确 |
| 409 | `{"error": "Email already registered"}` | 邮箱已被注册 |
| 409 | `{"error": "Invalid invite code"}` | 邀请码无效或已被使用 |
| 500 | `{"error": "Internal server error"}` | 服务器内部错误 |

---

### 3. 用户登录

**请求**
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

**成功响应 (200)**
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

**失败响应**
| 状态码 | 响应 | 说明 |
|--------|------|------|
| 400 | `{"error": "email and password are required"}` | 缺少必填参数 |
| 401 | `{"error": "Invalid email or password"}` | 邮箱或密码错误 |
| 500 | `{"error": "Internal server error"}` | 服务器内部错误 |

---

## 邀请码说明

邀请码用于注册，共 100 个可用邀请码，每个只能使用一次。

详细列表请查看：[邀请码列表.md](./邀请码列表.md)

---

## 前端调用示例

### 注册示例 (JavaScript/Fetch)
```javascript
const register = async () => {
  try {
    const response = await fetch('http://localhost:8080/v1/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nickname: '小明',
        email: 'user@example.com',
        password: '123456',
        inviteCode: 'XK7P2M9Q'
      })
    });

    const data = await response.json();

    if (response.ok) {
      // 保存 token
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      console.log('注册成功', data.user);
      window.location.href = '/'; // 跳转主页
    } else {
      console.error('注册失败', data.error);
    }
  } catch (error) {
    console.error('请求错误', error);
  }
};
```

### 登录示例 (JavaScript/Fetch)
```javascript
const login = async () => {
  try {
    const response = await fetch('http://localhost:8080/v1/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'user@example.com',
        password: '123456'
      })
    });

    const data = await response.json();

    if (response.ok) {
      // 保存 token - 持久存储
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      console.log('登录成功', data.user);
      window.location.href = '/'; // 跳转主页
    } else {
      console.error('登录失败', data.error);
    }
  } catch (error) {
    console.error('请求错误', error);
  }
};
```

### 带认证的请求示例
```javascript
const getUserProfile = async () => {
  const token = localStorage.getItem('token');

  try {
    const response = await fetch('http://localhost:8080/v1/api/user/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      // Token 过期或无效，跳转到登录页
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return;
    }

    const data = await response.json();

    if (response.ok) {
      console.log('用户信息', data);
    } else {
      console.error('获取失败', data.error);
    }
  } catch (error) {
    console.error('请求错误', error);
  }
};
```

---

## Token 使用说明

1. **存储**：登录成功后，将 `token` 存储到 `localStorage`（持久存储，关闭浏览器后仍可使用）
2. **使用**：后续所有需要认证的请求，在请求头中添加 `Authorization: Bearer <token>`
3. **过期处理**：当收到 401 响应时，清除本地存储的 token 并跳转到登录页

```javascript
// 请求拦截器示例
const apiRequest = async (url, options = {}) => {
  const token = localStorage.getItem('token');

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return response;
};
```

---

## 错误处理

后端返回的错误信息为英文，前端可自行映射：

```javascript
const errorMessages = {
  'email and password are required': '请输入邮箱和密码',
  'nickname, email, password and inviteCode are required': '请填写完整信息',
  'Invalid email format': '邮箱格式不正确',
  'Invalid email or password': '邮箱或密码错误',
  'Email already registered': '该邮箱已被注册',
  'Invalid invite code': '邀请码无效或已被使用'
};
```

---

## 状态码说明

| 状态码 | 含义 | 处理方式 |
|--------|------|----------|
| 200 | 成功 | 解析返回的 JSON 数据 |
| 201 | 创建成功 | 解析返回的 JSON 数据 |
| 400 | 参数错误 | 提示用户检查输入 |
| 401 | 未授权 | 清除登录状态，跳转登录页 |
| 409 | 冲突 | 提示用户具体冲突信息 |
| 500 | 服务器错误 | 提示用户稍后重试 |

---

## 备注

- 头像上传功能将在后续版本添加
- 邀请码每个只能使用一次
