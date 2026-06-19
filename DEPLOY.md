# JesusGift.org Deployment Guide

## 部署到 Hostinger VPS

### 1. 准备工作

确保你有：
- Hostinger VPS 或 Cloud Hosting
- MySQL 数据库已创建
- Node.js 支持（Hostinger 支持 Node.js 应用）

### 2. 数据库配置

在 Hostinger 控制面板创建 MySQL 数据库：
- 数据库名：`jesusgift_db`
- 用户名：`jesusgift_user`
- 密码：设置一个强密码

### 3. 上传代码

```bash
# 通过 Git 或 FTP 上传代码到服务器
git clone https://github.com/yourusername/jesusgift.git
cd jesusgift/server
```

### 4. 安装依赖

```bash
npm install --production
```

### 5. 配置环境变量

复制 `.env.example` 为 `.env` 并填写实际配置：

```bash
cp .env.example .env
nano .env
```

修改以下配置：
- `DB_HOST` - Hostinger MySQL 主机地址
- `DB_USER` - 数据库用户名
- `DB_PASSWORD` - 数据库密码
- `DB_NAME` - 数据库名
- `JWT_SECRET` - 设置一个随机字符串（用于 JWT 加密）
- `ADMIN_EMAIL` - 管理员邮箱
- `ADMIN_PASSWORD` - 管理员初始密码

### 6. 初始化数据库

```bash
npm run init-db
```

### 7. 启动服务

使用 PM2（推荐）：
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

或直接启动：
```bash
npm start
```

### 8. 配置反向代理（Nginx）

如果使用 Nginx，添加以下配置：

```nginx
server {
    listen 80;
    server_name jesusgift.org www.jesusgift.org;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /var/www/jesusgift/public;
        try_files $uri $uri/ /index.html;
    }
}
```

### 9. 前端文件部署

将以下文件放到 `public` 目录（或网站根目录）：
- index.html
- gift-share.html
- login.html
- profile.html
- admin.html

### 10. SSL 配置

使用 Let's Encrypt：
```bash
certbot --nginx -d jesusgift.org -d www.jesusgift.org
```

## 本地开发

```bash
cd server
npm install
npm run init-db  # 初始化数据库
npm run dev      # 启动开发服务器
```

## API 端点

### 公开 API
- `GET /api/health` - 健康检查
- `GET /api/gifts` - 获取礼物列表
- `GET /api/gifts/blessings` - 获取祝福语列表
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录

### 用户 API（需要认证）
- `GET /api/auth/profile` - 获取用户信息
- `PUT /api/auth/profile` - 更新用户信息
- `PUT /api/auth/password` - 修改密码
- `GET /api/auth/shares` - 获取分享历史
- `POST /api/gifts/share` - 记录礼物分享

### 管理员 API（需要管理员权限）
- `GET /api/admin/stats` - 获取统计数据
- `GET /api/admin/users` - 获取用户列表
- `PUT /api/admin/users/:id` - 更新用户
- `DELETE /api/admin/users/:id` - 删除用户
- `GET /api/admin/gifts` - 获取礼物列表
- `POST /api/admin/gifts` - 添加礼物
- `PUT /api/admin/gifts/:id` - 更新礼物
- `DELETE /api/admin/gifts/:id` - 删除礼物

## 默认管理员账户

初始化后，管理员账户：
- 邮箱：`admin@jesusgift.org`（可在 .env 中修改）
- 密码：`admin123`（可在 .env 中修改）

**重要：首次登录后请立即修改密码！**