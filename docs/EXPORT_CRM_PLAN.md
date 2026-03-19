# 外贸 CRM 改造方案

## 一、项目适配改造方案

### 1.1 登录与权限隔离

- **User 表**：新增 `tenant` 字段，取值 `domestic` | `export`
- **Session**：增加 `tenant`，登录时写入
- **登录页**：先选择「内贸」或「外贸」，再输入账号密码；后端校验 tenant 匹配
- **路由守卫**：内贸路由 `/dashboard`、`/orders` 等仅允许 `tenant=domestic`；外贸路由 `/export/*` 仅允许 `tenant=export`

### 1.2 路由结构

| 内贸 (domestic) | 外贸 (export) |
|-----------------|---------------|
| /dashboard      | /export/dashboard |
| /orders         | /export/leads |
| /suppliers      | /export/customers |
| /admin/*        | /export/contacts (嵌入 Customer 详情) |
|                 | /export/activities |
|                 | /export/quotes |
|                 | /export/orders |
|                 | /export/tasks |

### 1.3 复用策略

- 复用：Header、表格样式、表单样式、按钮、分页、筛选、Prisma 连接、auth 逻辑
- 新建：export 专用 API、页面、组件（按 export 业务结构组织）

---

## 二、新增数据模型设计

### 2.1 ExportLead (export_leads)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | cuid |
| companyName | String | |
| website | String? | |
| country | String? | |
| city | String? | |
| address | String? | |
| customerType | String? | 枚举 |
| sourceChannel | String? | |
| sourceKeyword | String? | |
| email | String? | |
| phone | String? | |
| whatsapp | String? | |
| linkedin | String? | |
| mainBusiness | String? | |
| interestedProducts | String? | 枚举 |
| priority | String? | |
| ownerId | String | |
| status | String | new/pending_review/valid/invalid/converted |
| notes | String? | |
| convertedToCustomerId | String? | 转客户后关联 |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### 2.2 ExportCustomer (export_customers)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | cuid |
| customerCode | String | unique |
| companyName | String | |
| website | String? | |
| country | String? | |
| city | String? | |
| address | String? | |
| customerType | String? | |
| industry | String? | |
| marketPriority | String? | |
| valueLevel | String? | |
| interestedProducts | String? | |
| sourceChannel | String? | |
| ownerId | String | |
| status | String | to_develop/developing/... |
| lastFollowUpAt | DateTime? | |
| nextFollowUpAt | DateTime? | |
| isWon | Boolean | |
| notes | String? | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### 2.3 ExportContact (export_contacts)

| 字段 | 类型 |
|------|------|
| id | String |
| customerId | String |
| name | String |
| title | String? |
| email | String? |
| phone | String? |
| whatsapp | String? |
| linkedin | String? |
| language | String? |
| isPrimary | Boolean |
| notes | String? |
| createdAt | DateTime |
| updatedAt | DateTime |

### 2.4 ExportActivity (export_activities)

| 字段 | 类型 |
|------|------|
| id | String |
| customerId | String |
| contactId | String? |
| type | String | email/call/whatsapp/... |
| subject | String? |
| content | String? |
| customerFeedback | String? |
| nextFollowUpAt | DateTime? |
| ownerId | String |
| createdAt | DateTime |
| updatedAt | DateTime |

### 2.5 ExportQuote (export_quotes)

| 字段 | 类型 |
|------|------|
| id | String |
| quoteNo | String | unique |
| customerId | String |
| contactId | String? |
| quoteDate | DateTime |
| currency | String? |
| incoterm | String? |
| validityDate | DateTime? |
| productSummary | String? |
| totalAmount | Decimal? |
| status | String | draft/sent/... |
| isWon | Boolean |
| notes | String? |
| createdAt | DateTime |
| updatedAt | DateTime |

### 2.6 ExportOrder (export_orders)

| 字段 | 类型 |
|------|------|
| id | String |
| orderNo | String | unique |
| customerId | String |
| quoteId | String? |
| orderDate | DateTime |
| currency | String? |
| totalAmount | Decimal? |
| paymentTerm | String? |
| paymentStatus | String | unpaid/partial_paid/paid |
| productionStatus | String | pending/in_production/completed |
| shippingStatus | String | pending/ready_to_ship/shipped/completed |
| eta | DateTime? |
| actualShipDate | DateTime? |
| notes | String? |
| createdAt | DateTime |
| updatedAt | DateTime |

### 2.7 ExportTask (export_tasks)

| 字段 | 类型 |
|------|------|
| id | String |
| title | String |
| customerId | String? |
| contactId | String? |
| dueDate | DateTime? |
| priority | String | low/medium/high/urgent |
| status | String | todo/in_progress/done/overdue |
| ownerId | String |
| notes | String? |
| createdAt | DateTime |
| updatedAt | DateTime |

---

## 三、新增/修改页面与 API 清单

### 3.1 修改

- `src/app/login/page.tsx` - 增加内贸/外贸选择
- `src/lib/auth.ts` - Session 增加 tenant
- `src/app/api/auth/login/route.ts` - 校验 tenant
- `prisma/schema.prisma` - User 增加 tenant
- `src/app/(dashboard)/layout.tsx` - 校验 tenant=domestic

### 3.2 新增

**API:**
- /api/export/leads (GET, POST)
- /api/export/leads/[id] (GET, PATCH, DELETE)
- /api/export/leads/[id]/convert (POST)
- /api/export/customers (GET, POST)
- /api/export/customers/[id] (GET, PATCH, DELETE)
- /api/export/contacts (GET, POST)
- /api/export/contacts/[id] (GET, PATCH, DELETE)
- /api/export/activities (GET, POST)
- /api/export/activities/[id] (GET, PATCH, DELETE)
- /api/export/quotes (GET, POST)
- /api/export/quotes/[id] (GET, PATCH, DELETE)
- /api/export/quotes/[id]/convert (POST)
- /api/export/orders (GET, POST)
- /api/export/orders/[id] (GET, PATCH, DELETE)
- /api/export/tasks (GET, POST)
- /api/export/tasks/[id] (GET, PATCH, DELETE)
- /api/export/dashboard (GET)
- /api/export/leads/import (POST)
- /api/export/customers/export (GET)
- /api/export/quotes/export (GET)
- /api/export/orders/export (GET)

**页面:**
- /export/dashboard
- /export/leads
- /export/leads/new
- /export/leads/[id]
- /export/customers
- /export/customers/new
- /export/customers/[id] (工作台)
- /export/quotes
- /export/quotes/new
- /export/quotes/[id]
- /export/orders
- /export/orders/new
- /export/orders/[id]
- /export/tasks

**Layout:**
- /export 布局，带外贸专用 Header

---

## 四、使用说明

### 4.1 创建外贸用户

1. 使用内贸管理员账号登录（选择「内贸」入口）
2. 进入「用户管理」
3. 点击「新建用户」，填写信息并选择「入口」= 外贸
4. 该用户即可使用外贸入口登录

### 4.2 首次使用

1. 在登录页选择「外贸」
2. 使用已创建的外贸用户登录
3. 进入 Dashboard，开始使用 Leads → Customers → Quotes → Orders 流程

### 4.3 CSV 导入

Leads 支持 CSV 批量导入，表头需包含 `companyName` 或 `company_name` 或 `company`。其他可选字段：website, country, city, address, email, phone, whatsapp, linkedin, customerType, sourceChannel, sourceKeyword, mainBusiness, interestedProducts, priority, notes。
