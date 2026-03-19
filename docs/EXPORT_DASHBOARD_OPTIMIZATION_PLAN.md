# 外贸 CRM 内测优化方案

## 一、Dashboard 页面结构

### 1.1 布局（业务优先，简洁）

```
/export/dashboard
├── 待办提醒区（高优先级）
│   ├── 今日待跟进客户 [N] → /export/customers?filter=today
│   ├── 超7天未跟进客户 [N] → /export/customers?filter=overdue
│   ├── 报价后3天未跟进 [列表] → 每条跳转 /export/quotes/[id]
│   └── 今日到期任务 [N] → /export/tasks?due=today
│   └── 超期任务 [N] → /export/tasks?status=overdue
├── 数据概览区
│   ├── 本周新增 Leads [N] → /export/leads（可带 ?since=week）
│   ├── 本月 Quotes [N] → /export/quotes
│   └── 本月 Orders [N] → /export/orders
└── 统计区
    ├── 客户状态分布 [列表] → 点击跳转 /export/customers?status=xxx
    └── 国家分布 [列表] → 点击跳转 /export/customers?country=xxx
```

### 1.2 模块展示顺序

1. 今日待跟进客户（数字 + 查看链接）
2. 超7天未跟进客户（数字 + 查看链接）
3. 报价后3天未跟进（列表，最多 10 条）
4. 今日到期任务（数字 + 查看链接）
5. 超期任务（数字 + 查看链接）
6. 本周新增 Leads（数字 + 查看链接）
7. 本月 Quotes（数字 + 查看链接）
8. 本月 Orders（数字 + 查看链接）
9. 客户状态统计（列表，可点击）
10. 国家分布（列表，可点击）

---

## 二、需补充的 API / Service 逻辑

### 2.1 Dashboard API 增强

| 项 | 当前 | 需补充 |
|----|------|--------|
| todayDueTasksCount | 无 | 新增：dueDate 在今日的任务数 |
| tasksOverdue | 有 | 保持 |
| quoteNoFollowUp3Days | 仅按 createdAt | 增强：排除已有跟进活动的报价（可选，先保持简单） |
| tenantId | 部分缺失 | 为 quotes/orders 的 where 补充 tenantId |
| 今日待跟进列表 | 仅 count | 可选：返回前几条用于快捷入口 |

### 2.2 报价 3 天未跟进逻辑

- 条件：status=sent，createdAt < 3 天前
- 增强（可选）：排除「该客户在报价后有 Activity」的报价
- 实现：先按简单逻辑（仅按时间），后续可加子查询

### 2.3 Lead 转 Customer 增强

- 已有：Lead.status → converted，convertedToCustomerId
- 需补充：若 Lead 有 email 或 phone，自动创建默认 Contact
  - Contact.name：优先用 email 前缀，否则 companyName，否则「默认联系人」
  - Contact.email：Lead.email
  - Contact.phone：Lead.phone
  - Contact.isPrimary：true

### 2.4 Activity 创建时更新 Customer

- 已有：lastFollowUpAt、nextFollowUpAt 更新
- 保持现状，逻辑正确

### 2.5 Tasks API 支持 due=today

- 新增参数：`due=today` 表示 dueDate 在今日
- 用于 Dashboard「今日到期任务」跳转

### 2.6 Customers API 支持 country 筛选

- 已有：country 参数（contains）
- 保持

---

## 三、前端优化

### 3.1 Customer 工作台局部刷新

- 当前：handleFormSuccess → fetchCustomer() 全量刷新
- 优化：按模块分别刷新
  - 新增 Contact → 只刷新 contacts
  - 新增 Activity → 只刷新 activities + 基本信息（lastFollowUpAt, nextFollowUpAt）
  - 新增 Quote → 只刷新 quotes
  - 新增 Task → 只刷新 tasks
- 实现：fetchCustomer 已有完整数据，可改为按需更新 state 的对应字段；或拆成多个小接口（如 GET /api/export/customers/[id]/contacts）

### 3.2 提醒与高亮

| 场景 | 实现 |
|------|------|
| Customer 超7天未跟进 | 列表/详情中显示 overdue 标记 |
| nextFollowUpAt 到期 | 详情页高亮显示 |
| Quote 3天未跟进 | Dashboard 提醒模块 |
| Task 超期 | 显示 overdue badge |

### 3.3 Quote/Order/Task 列表 badge

- 使用统一 StatusBadge 组件
- 补充时间字段：quoteDate、orderDate、dueDate

---

## 四、实现顺序

1. Dashboard API：补充 todayDueTasksCount、修复 tenantId、tasks 支持 due=today
2. Dashboard 前端：按新结构重排，所有模块可点击跳转
3. Lead 转 Customer：自动创建 Contact
4. Customer 工作台：局部刷新
5. 提醒与 badge：overdue、高亮、状态展示
