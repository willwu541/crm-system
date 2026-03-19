# 外贸 CRM 前端页面结构与组件拆分方案

## 一、整体架构

```
src/
├── app/(export)/
│   ├── layout.tsx              # 已有，需增强：左侧导航
│   └── export/
│       ├── leads/page.tsx
│       ├── customers/page.tsx
│       ├── customers/[id]/page.tsx
│       ├── quotes/page.tsx
│       ├── quotes/[id]/page.tsx
│       ├── orders/page.tsx
│       ├── orders/[id]/page.tsx
│       └── tasks/page.tsx
│       └── tasks/[id]/page.tsx
├── components/
│   ├── layout/
│   │   ├── ExportHeader.tsx   # 已有
│   │   └── ExportSidebar.tsx  # 新增：左侧导航
│   ├── export/
│   │   ├── LeadsClient.tsx
│   │   ├── CustomersClient.tsx
│   │   ├── CustomerDetailClient.tsx
│   │   ├── QuotesClient.tsx
│   │   ├── QuoteDetailClient.tsx
│   │   ├── OrdersClient.tsx
│   │   ├── OrderDetailClient.tsx
│   │   ├── TasksClient.tsx
│   │   └── TaskDetailClient.tsx
│   └── export/shared/          # 共享组件
│       ├── DataTable.tsx       # 通用表格（含加载/空状态）
│       ├── FilterBar.tsx       # 搜索+筛选栏
│       ├── Pagination.tsx     # 分页
│       ├── StatusBadge.tsx    # 状态标签
│       ├── Drawer.tsx         # 抽屉容器
│       ├── Modal.tsx          # 弹窗容器
│       ├── LeadFormDrawer.tsx  # 线索表单（新建/编辑）
│       ├── CustomerFormDrawer.tsx
│       ├── ContactFormDrawer.tsx
│       ├── ActivityFormDrawer.tsx
│       ├── QuoteFormDrawer.tsx
│       ├── QuoteItemTable.tsx  # 报价明细表格
│       ├── OrderFormDrawer.tsx
│       ├── OrderItemTable.tsx  # 订单明细表格
│       └── TaskFormDrawer.tsx
```

## 二、Layout 与导航

### 2.1 布局调整
- 当前：Header + main 全宽
- 目标：Header + 左侧 Sidebar + main 内容区
- Sidebar：固定宽度 ~220px，折叠可考虑后续

### 2.2 左侧导航 (ExportSidebar)
- Dashboard
- Leads 线索
- Customers 客户
- Quotes 报价
- Orders 订单
- Tasks 任务
- 高亮当前路由

## 三、列表页通用能力

### 3.1 FilterBar 组件
- 搜索框（keyword）
- 状态下拉（status）
- 国家筛选（country，leads/customers）
- 负责人筛选（ownerId，需 API 支持 ownerId 参数）
- 快捷筛选（如 customers：今日待跟进、超7天未跟进）

### 3.2 DataTable 组件
- 表头、行、点击行进入详情
- loading 骨架/占位
- 空状态文案

### 3.3 Pagination 组件
- 上一页/下一页
- 当前页/总页数
- 共 N 条

## 四、各页面职责

### 4.1 /export/leads
- **LeadsClient**：列表 + 筛选 + 分页
- 筛选：keyword, status, country, ownerId
- 操作：新建线索、导入 CSV、转客户、详情
- 表单：LeadFormDrawer（新建/编辑，弹窗）

### 4.2 /export/customers
- **CustomersClient**：列表 + 筛选 + 分页
- 筛选：keyword, status, country, ownerId, filter(today/overdue)
- 操作：新建客户、导出 CSV、详情
- 表单：CustomerFormDrawer

### 4.3 /export/customers/[id] 工作台
- **CustomerDetailClient**
- 顶部：公司名、客户编号、返回按钮、快捷操作区
- 快捷按钮：新增联系人 | 新增跟进 | 新建报价 | 新建任务
- 左栏（2/3）：基本信息卡片、跟进记录时间线、报价列表、订单列表
- 右栏（1/3）：联系人列表、任务列表
- 所有新增/编辑用 Drawer，不跳转

### 4.4 /export/quotes
- **QuotesClient**：列表 + 筛选 + 分页
- 筛选：keyword, status, customerId
- 操作：新建报价、导出 CSV、详情
- 表单：QuoteFormDrawer（含 items 明细）

### 4.5 /export/quotes/[id]
- **QuoteDetailClient**：报价详情 + items 明细表
- 支持转订单
- 编辑用 QuoteFormDrawer

### 4.6 /export/orders
- **OrdersClient**：列表 + 筛选 + 分页
- 筛选：keyword, status(payment/production/shipping), customerId
- 操作：新建订单、导出 CSV、详情
- 表单：OrderFormDrawer（含 items）

### 4.7 /export/orders/[id]
- **OrderDetailClient**：订单详情 + items 明细表
- 编辑用 OrderFormDrawer

### 4.8 /export/tasks
- **TasksClient**：列表 + 筛选 + 分页
- 筛选：status, customerId, ownerId
- 操作：新建任务、详情
- 表单：TaskFormDrawer

### 4.9 /export/tasks/[id]
- **TaskDetailClient**：任务详情
- 编辑用 TaskFormDrawer

## 五、API 参数补充（如需）

| API | 已有 | 需补充 |
|-----|------|--------|
| leads | page, pageSize, keyword, status, country | ownerId |
| customers | page, pageSize, keyword, status, country, filter | ownerId |
| quotes | page, pageSize, keyword, status, customerId | ownerId |
| orders | page, pageSize, keyword, status, customerId | ownerId |
| tasks | page, pageSize, status, customerId | ownerId, keyword |

- ownerId：供 ADMIN 按负责人筛选；SALES 时由 ctx 自动过滤
- 前端需先 GET /api/export/users 获取负责人列表

## 六、开发顺序

1. **Export layout + Sidebar**：调整布局，增加左侧导航
2. **Leads 列表页**：增强 LeadsClient（country、ownerId 筛选），LeadFormDrawer
3. **Customers 列表页**：增强 CustomersClient（country、ownerId），CustomerFormDrawer
4. **Customer 详情工作台**：重构 CustomerDetailClient，所有表单改为 Drawer
5. **Quotes / Orders 列表与详情**：QuotesClient、QuoteDetailClient（含 items）、OrdersClient、OrderDetailClient（含 items）
6. **Tasks 列表页**：TasksClient、TaskDetailClient、TaskFormDrawer

## 七、交互约定

- 新建/编辑：优先 Drawer 从右侧滑出
- 删除：确认弹窗
- 错误：toast 或 inline 提示（可先用 alert，后续统一）
- 加载：表格区域 skeleton 或「加载中...」
- 空状态：友好文案 + 引导操作
