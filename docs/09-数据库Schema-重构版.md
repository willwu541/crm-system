# 数据库 Schema - 重构版（主状态 + 辅助字段）

## 一、枚举定义

```prisma
// 主状态（6 个）
enum MainStatus {
  OPPORTUNITY    // 商机中
  CONVERTED      // 已成交
  IN_PRODUCTION  // 生产中
  PENDING_SHIPMENT  // 待发货
  COMPLETED      // 已完成
  CANCELLED      // 已取消
}

// 辅助：意向等级
enum IntentionLevel {
  HIGH
  MEDIUM
  LOW
}

// 辅助：生产方式
enum ProductionMode {
  SELF       // 自制
  OUTSOURCE  // 外放
  MIXED      // 混合
}

// 辅助：收款/付款状态
enum PaymentStatus {
  UNPAID   // 未收/未付
  PARTIAL  // 部分收/部分付
  PAID     // 已收/已付
}

// 用户角色
enum UserRole {
  ADMIN
  SALES
  TRACKER
  FINANCE
}
```

## 二、表结构（Prisma 风格）

### Customer 客户
```
id, name, contactName, contactPhone, address?, remark?
createdAt, updatedAt
```

### Opportunity 商机
```
id, customerId, projectName
status: MainStatus (OPPORTUNITY | CONVERTED | CANCELLED)
isQuoted: Boolean
intentionLevel: IntentionLevel?
estimatedAmount: Decimal?
remark?
createdById, orderId?  // 成交后关联订单
createdAt, updatedAt
```

### Order 订单（扩展）
```
id, orderNo, customerId, opportunityId?
status: MainStatus (CONVERTED | IN_PRODUCTION | PENDING_SHIPMENT | COMPLETED | CANCELLED)
productionMode: ProductionMode?
hasSelectedSupplier: Boolean
customerPaymentStatus: PaymentStatus?
supplierPaymentStatus: PaymentStatus?
totalAmount?, receivedAmount, paidAmount, shippingCost?, otherCost?
contactName, contactPhone, projectName, deliveryRegion, quoteDeadline?, remark?
createdById
createdAt, updatedAt
```

### Supplier 加工户
```
id, name, contactName, contactPhone, remark?
createdAt, updatedAt
```

### OrderItem 订单明细（沿用）
```
id, orderId, sortOrder
productType, specModel, dimensions, quantity, unit
surfaceTreatment?, specialRequirement?, remark?
```

### OrderAttachment 订单附件（沿用）
```
id, orderId, orderItemId?, fileName, filePath, fileSize, mimeType
```

### QuoteLink 外协链接（沿用，可加 supplierId）
```
id, orderId, token, supplierName?, expiresAt?
```

### Quote 报价（沿用，可加 supplierId）
```
id, orderId, quoteLinkId
supplierName, contactName, contactPhone, contactWechat?
totalRemark?, expectedDelivery?, includeTax, includeShipping
status: PENDING | PREFERRED | SELECTED
```

### QuoteItem 报价明细（沿用）
```
id, quoteId, orderItemId, price, remark?
```

### PaymentRecord 收付款记录（V2）
```
id, orderId
type: CUSTOMER_RECEIVABLE | SUPPLIER_PAYABLE
amount, paidAt, remark?
```

### User 用户（扩展角色）
```
id, email, passwordHash, name
role: ADMIN | SALES | TRACKER | FINANCE
```

## 三、主状态流转

```
商机: OPPORTUNITY → CONVERTED（转订单）| CANCELLED

订单: CONVERTED → IN_PRODUCTION → PENDING_SHIPMENT → COMPLETED
                    ↓
                CANCELLED（任意阶段可取消）
```

## 四、列表页筛选

- 商机列表：status in [OPPORTUNITY, CONVERTED, CANCELLED]
- 订单列表：status in [CONVERTED, IN_PRODUCTION, PENDING_SHIPMENT, COMPLETED, CANCELLED]
- 辅助筛选：isQuoted, intentionLevel, productionMode, customerPaymentStatus 等（可选）
