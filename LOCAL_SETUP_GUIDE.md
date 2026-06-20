# S-LAN 后端本地部署指南

## 一、准备工作

### 1. 安装 Node.js 18+
下载地址：https://nodejs.org/
```bash
# 验证安装
node -v  # 应显示 v18.x.x
npm -v   # 应显示 9.x.x
```

### 2. 安装 MongoDB Community Edition（任选一种方式）

#### 方式A：官方安装包（推荐）
下载地址：https://www.mongodb.com/try/download/community
选择 Windows x64，下载后一路下一步安装

#### 方式B：Windows 版 MongoDB（免安装）
https://www.mongodb.com/try/download/community

#### 启动 MongoDB
```powershell
# 创建数据目录
mkdir C:\data\db

# 启动 mongod（保持这个窗口开着）
mongod --dbpath C:\data\db
```

## 二、获取项目代码

### 1. 克隆代码
```bash
git clone https://github.com/ChuQing-zero/S-LAN-Reborn.git
cd S-LAN-Reborn
```

### 2. 安装依赖
```bash
npm install
```

## 三、配置数据库

### 选项A：使用本地 MongoDB（推荐）

1. 启动 MongoDB 后，创建数据库用户和导入数据：
```powershell
# 连接 MongoDB
mongosh

# 在 mongosh 中执行：
use admin
db.createUser({
  user: "root",
  pwd: "test123456",
  roles: [{ role: "root", db: "admin" }]
})
use s-lan
db.createUser({
  user: "root", 
  pwd: "test123456",
  roles: [{ role: "readWrite", db: "s-lan" }]
})
exit
```

2. 编辑 `src/config/index.js`，修改：
```javascript
mongodbUri: 'mongodb://root:test123456@localhost:27017/s-lan?authSource=admin'
```

3. 导入数据（如果之前导出了）：
```powershell
mongorestore --uri="mongodb://root:test123456@localhost:27017/s-lan?authSource=admin" --dir=./s-lan-backup
```

### 选项B：使用远程 MongoDB（需要VPN保持连接）
```javascript
mongodbUri: 'mongodb://root:8lY9LH7159Ah26sd@s-lan-relorn-db-mongodb.ns-3mbo57k2.svc:27017'
```
⚠️ 注意：Sealos 集群内网地址，本地需要 VPN 才能访问

## 四、启动后端

```bash
npm start
```

看到 `Server running on port 8080` 表示成功

## 五、连接前端

### 前端配置
在 `前端项目/.env` 或设置页面中：

```env
# 主服务器地址（本地后端）
VITE_API_BASE_URL=http://localhost:8080

# 或者在前端设置页面填入：
# http://localhost:8080
```

### 测试接口
```bash
# 健康检查
curl http://localhost:8080/health

# 登录测试
curl -X POST http://localhost:8080/v1/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"test123456"}'
```

## 六、云端服务器地址（生产环境）

| 服务 | 地址 |
|------|------|
| 主服务器（Sealos） | https://api.s-lan.online |
| 云端库服务器（Sealos） | https://elqqcpqzjzes.sealosbja.site |
| 数据库 | Sealos 集群内 MongoDB |

## 七、常见问题

### 1. MongoDB 连接失败
- 检查 MongoDB 是否启动
- 检查端口 27017 是否被占用
- 检查用户名密码是否正确

### 2. 端口被占用
8080 端口被占用时，修改 `src/config/index.js`：
```javascript
port: 3000,  // 改成其他端口
```

### 3. CORS 跨域
后端已配置 CORS，前端正常访问即可

---

## 联系信息
如有问题，请联系后端开发者
