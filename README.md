# 外采加工询价管理系统

钢格板公司专用的「内部建单 + 外协匿名报价回收」系统。

## 技术栈

- 框架：Next.js 16 + TypeScript
- 数据库：PostgreSQL + Prisma
- 样式：Tailwind CSS

## 快速开始

### 1. 配置数据库

确保已安装并启动 PostgreSQL，在 `.env` 中配置连接：

```env
DATABASE_URL="postgresql://用户名:密码@localhost:5432/数据库名"
```

或使用 Prisma 本地数据库：

```bash
npx prisma dev
```

### 2. 初始化数据库

```bash
# 创建表结构
npx prisma db push

# 创建测试账号（admin@example.com / admin123）
npx prisma db seed
# 或单独初始化管理员：npm run init-admin
```

> 若 `db seed` 失败，可先确认 PostgreSQL 已启动，再执行 `npm run init-admin`

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 测试账号

- 管理员：admin@example.com / admin123
- 业务员：sales@example.com / sales123

## 项目结构

```
docs/           # 产品需求文档、Sitemap、数据库设计、API 设计等
prisma/         # 数据库模型与迁移
src/
  app/          # 页面与 API
  components/   # 可复用组件
  lib/          # 工具、Prisma、认证等
```

## 文档

- [01-PRD-产品需求文档](docs/01-PRD-产品需求文档.md)
- [02-Sitemap-页面结构](docs/02-Sitemap-页面结构.md)
- [03-数据库表设计](docs/03-数据库表设计.md)
- [04-API设计](docs/04-API设计.md)
- [05-项目目录结构](docs/05-项目目录结构.md)
- [06-V1最小可用版本范围](docs/06-V1最小可用版本范围.md)
- [07-开发步骤拆解](docs/07-开发步骤拆解.md)

## 当前进度 (V1)

- [x] 项目基础结构
- [x] 数据库 Schema
- [x] 登录模块
- [x] 订单列表页
- [x] 新建订单页（动态多明细）
- [x] 订单详情页
- [x] 附件上传（订单级 + 明细级）
- [x] 外协链接生成与管理
- [x] 外协填写页 `/quote/[token]`
- [x] 报价回收与比价
- [x] 订单状态更新

## 常用命令

```bash
npm run dev
npm run build
npx prisma generate
npx prisma db push
npx prisma db seed
```
