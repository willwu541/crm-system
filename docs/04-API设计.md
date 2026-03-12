# 外采加工询价管理系统 - API 设计

## 一、认证相关

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 登录，返回 session/token |
| POST | /api/auth/logout | 登出 |
| GET | /api/auth/me | 获取当前用户信息 |

## 二、订单相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/orders | 订单列表（分页、筛选） |
| GET | /api/orders/[id] | 订单详情（含明细、附件） |
| POST | /api/orders | 新建订单 |
| PUT | /api/orders/[id] | 更新订单 |
| DELETE | /api/orders/[id] | 删除订单（软删或硬删） |

## 三、订单附件

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/orders/[id]/attachments | 上传订单级附件 |
| POST | /api/orders/[id]/items/[itemId]/attachments | 上传明细级附件 |
| DELETE | /api/attachments/[id] | 删除附件 |

## 四、外协链接

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/orders/[id]/quote-links | 生成外协链接 |
| GET | /api/orders/[id]/quote-links | 获取订单的外协链接列表 |
| GET | /api/quote/[token] | 外协填写页获取订单信息（公开，无需登录） |
| POST | /api/quote/[token] | 外协提交报价（公开） |

## 五、报价回收

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/orders/[id]/quotes | 获取订单下所有报价 |
| PATCH | /api/quotes/[id] | 更新报价状态（标记意向/中选） |

## 六、用户管理（V2）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/admin/users | 用户列表 |
| POST | /api/admin/users | 新建用户 |
| PUT | /api/admin/users/[id] | 更新用户 |
| DELETE | /api/admin/users/[id] | 删除用户 |

## 七、请求/响应示例

### 7.1 登录
```
POST /api/auth/login
Body: { "email": "xxx@xx.com", "password": "xxx" }
Response: { "user": {...}, "token": "..." } 或 session cookie
```

### 7.2 新建订单
```
POST /api/orders
Body: {
  "customerName": "...",
  "contactName": "...",
  "orderItems": [
    { "productType": "...", "specModel": "...", "quantity": 100, ... }
  ],
  "attachments": []  // 或通过 multipart 单独上传
}
Response: { "id": "...", "orderNo": "..." }
```

### 7.3 外协获取订单信息
```
GET /api/quote/[token]
Response: {
  "order": {...},
  "orderItems": [...],
  "attachments": [...],
  "expired": false
}
```

### 7.4 外协提交报价
```
POST /api/quote/[token]
Body: {
  "supplierName": "...",
  "contactName": "...",
  "contactPhone": "...",
  "quoteItems": [
    { "orderItemId": "...", "price": 100.5, "remark": "..." }
  ],
  "expectedDelivery": "2025-04-01",
  "includeTax": true,
  "includeShipping": false
}
Response: { "success": true }
```
