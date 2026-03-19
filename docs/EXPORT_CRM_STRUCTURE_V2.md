# 外贸 CRM 底层可扩展结构设计 V2

## 一、数据隔离增强

### 1.1 Tenant 模型

```prisma
model ExportTenant {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique  // 如 "default"
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  leads     ExportLead[]
  customers ExportCustomer[]
  // ... 其他关联
  @@map("export_tenants")
}
```

### 1.2 User 表调整

- 新增 `tenantId` (String?, 可选)：当 `tenant=export` 时必填，指向 ExportTenant
- 保留 `tenant` 枚举：用于登录路由（domestic/export）

### 1.3 所有 Export 表增加 tenantId

| 表 | tenantId | 说明 |
|----|----------|------|
| ExportLead | 必填 | 创建时写入 user.tenantId |
| ExportCustomer | 必填 | 同上 |
| ExportContact | 必填 | 继承自 Customer |
| ExportActivity | 必填 | 继承自 Customer |
| ExportQuote | 必填 | 继承自 Customer |
| ExportQuoteItem | 必填 | 继承自 Quote |
| ExportOrder | 必填 | 继承自 Customer |
| ExportOrderItem | 必填 | 继承自 Order |
| ExportTask | 必填 | 创建时写入 user.tenantId |

### 1.4 查询与创建规则

- **查询**：所有 export API 的 `where` 必须包含 `tenantId: user.tenantId`
- **创建**：自动写入 `tenantId: user.tenantId`
- **ownerId**：保留，用于「仅看自己」或「看团队」权限扩展

---

## 二、字段结构优化

### 2.1 interestedProducts 多选

- **存储**：PostgreSQL 原生 `String[]`，Prisma 类型 `String[]`
- **封装**：`src/lib/export/interested-products.ts`
  - `parseInterestedProducts(val: string | string[] | null): string[]`
  - `serializeInterestedProducts(arr: string[]): string[]`（存库）
  - `toDisplayString(arr: string[]): string`（展示）
- **兼容**：若传入逗号分隔字符串，自动 split 为数组

### 2.2 ExportActivity 历史快照

| 字段 | 类型 | 说明 |
|------|------|------|
| customerNameSnapshot | String? | 创建时的客户名 |
| contactNameSnapshot | String? | 创建时的联系人名 |
| contactEmailSnapshot | String? | 创建时的联系人邮箱 |

### 2.3 ExportCustomer 新增

| 字段 | 类型 | 说明 |
|------|------|------|
| lastStageChangedAt | DateTime? | 状态最后变更时间 |
| lostReason | String? | 流失原因（status=lost 时） |

### 2.4 ExportLead 新增

| 字段 | 类型 | 说明 |
|------|------|------|
| lastContactAt | DateTime? | 最后联系时间 |
| isDuplicate | Boolean | 是否重复线索 |
| duplicateReason | String? | 重复原因 |

---

## 三、报价和订单明细结构

### 3.1 ExportQuoteItem

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | cuid |
| quoteId | String | |
| productType | String | 产品类型 |
| spec | String? | 规格 |
| description | String? | 描述 |
| quantity | Decimal | 数量 |
| unit | String | 单位 |
| unitPrice | Decimal | 单价 |
| amount | Decimal | 金额 |
| sortOrder | Int | 排序 |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### 3.2 ExportOrderItem

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | cuid |
| orderId | String | |
| productType | String | |
| spec | String? | |
| description | String? | |
| quantity | Decimal | |
| unit | String | |
| unitPrice | Decimal | |
| amount | Decimal | |
| sortOrder | Int | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### 3.3 业务规则

- **Quote totalAmount**：可由 items 汇总，也支持手动覆盖（overrideTotalAmount）
- **Quote 转 Order**：复制 QuoteItems → OrderItems
- **API**：Quote/Order 的 create/update 支持 items 数组

---

## 四、索引与唯一约束

| 表 | 约束/索引 |
|----|-----------|
| ExportCustomer | @@unique([tenantId, customerCode]) |
| ExportQuote | @@unique([tenantId, quoteNo]) |
| ExportOrder | @@unique([tenantId, orderNo]) |
| 所有 Export 表 | @@index([tenantId]) |
| 所有 Export 表 | @@index([ownerId])（有 ownerId 的表） |
| 所有 Export 表 | @@index([status])（有 status 的表） |
| 所有 Export 表 | @@index([createdAt]) |
| ExportContact/Activity/Quote/Order/Task | @@index([customerId]) |
| ExportTask | @@index([dueDate]) |

---

## 五、编号生成规则

### 5.1 格式

- customerCode: `CUS-YYYY-0001`
- quoteNo: `QUO-YYYY-0001`
- orderNo: `ORD-YYYY-0001`

### 5.2 规则

1. 按年份递增，每年从 0001 开始
2. 同一 tenant 内唯一
3. 使用数据库事务 + 行锁保证唯一

### 5.3 实现位置

`src/lib/export/number-generator.ts`

```ts
export async function generateCustomerCode(tenantId: string): Promise<string>
export async function generateQuoteNo(tenantId: string): Promise<string>
export async function generateOrderNo(tenantId: string): Promise<string>
```

内部使用 `ExportSequence` 表或 `MAX(seq)+1` 按 tenantId+year 查询。

---

## 六、Migration 计划

### 6.1 新增表

- ExportTenant
- ExportQuoteItem
- ExportOrderItem
- ExportSequence（可选，用于编号）

### 6.2 修改表

- User: 新增 tenantId
- ExportLead: 新增 tenantId, lastContactAt, isDuplicate, duplicateReason, interestedProducts → String[]
- ExportCustomer: 新增 tenantId, lastStageChangedAt, lostReason, interestedProducts → String[]
- ExportContact: 新增 tenantId
- ExportActivity: 新增 tenantId, customerNameSnapshot, contactNameSnapshot, contactEmailSnapshot
- ExportQuote: 新增 tenantId，customerCode/quoteNo/orderNo 唯一约束改为 (tenantId, xxx)
- ExportOrder: 新增 tenantId
- ExportTask: 新增 tenantId

### 6.3 迁移步骤

1. 创建 ExportTenant，插入默认 tenant
2. 为所有 export 表添加 tenantId（可空）
3. 将现有 export 数据关联到默认 tenant
4. 将 tenantId 改为必填
5. 创建 ExportQuoteItem、ExportOrderItem
6. 创建 ExportSequence（如需要）
7. 添加索引

---

## 七、Export API 目录结构

```
src/
├── lib/
│   └── export/
│       ├── auth.ts           # requireExportSession, getExportContext
│       ├── number-generator.ts
│       ├── interested-products.ts
│       └── types.ts          # 通用类型
├── app/
│   └── api/
│       └── export/
│           ├── leads/
│           ├── customers/
│           ├── contacts/
│           ├── activities/
│           ├── quotes/
│           │   └── [id]/
│           │       └── items/   # 可选：明细单独路由
│           ├── orders/
│           ├── tasks/
│           ├── dashboard/
│           └── users/
```

### 7.1 API 职责划分

| 层级 | 职责 |
|------|------|
| Route Handler | 解析请求、校验权限、调用 service、返回响应 |
| Service（可选） | 业务逻辑、事务编排 |
| Prisma | 数据访问 |

第一版 Route 内直接写 Prisma 调用；复杂逻辑再抽 Service。

---

## 八、通用 Service / Utils 设计

### 8.1 `src/lib/export/auth.ts`

```ts
export async function requireExportSession(): Promise<{ user: SessionUser; tenantId: string } | { error: NextResponse }>
export function getExportContext(user: SessionUser): { tenantId: string; ownerFilter?: { ownerId: string } }
```

### 8.2 `src/lib/export/number-generator.ts`

```ts
export async function generateCustomerCode(tenantId: string): Promise<string>
export async function generateQuoteNo(tenantId: string): Promise<string>
export async function generateOrderNo(tenantId: string): Promise<string>
```

### 8.3 `src/lib/export/interested-products.ts`

```ts
export function parseInterestedProducts(val: string | string[] | null | undefined): string[]
export function serializeInterestedProducts(arr: string[]): string[]
```

### 8.4 `src/lib/export/quote-convert.ts`（可选）

```ts
export async function convertQuoteToOrder(quoteId: string, tenantId: string, userId: string): Promise<ExportOrder>
```

---

## 九、实施顺序

1. 更新 Prisma schema（含 Tenant、tenantId、新字段、明细表、索引）
2. 编写 migration
3. 实现 number-generator
4. 实现 interested-products utils
5. 更新 auth.ts（getExportContext、tenantId）
6. 更新现有 export API routes（where 加 tenantId，create 加 tenantId）
7. 更新 convert 逻辑（Lead→Customer、Quote→Order 含 items 复制）
