# 外贸 CRM - 筛选正确性 + 快速标记下次跟进

## 一、筛选参数校验清单

| 跳转目标 | URL 示例 | 当前问题 | 修复方案 |
|---------|----------|----------|----------|
| 今日待跟进客户 | `/export/customers?filter=today` | CustomersClient 仅从 URL 读取 filter，不读 status/country；筛选变更/翻页后 URL 不同步 | 从 URL 初始化全部筛选；筛选/翻页时同步 URL |
| 超7天未跟进 | `/export/customers?filter=overdue` | 同上 | 同上 |
| 今日到期任务 | `/export/tasks?due=today` | TasksClient 未读取 URL，无 due 筛选 | 增加 useSearchParams，支持 due=today 并同步 URL |
| 超期任务 | `/export/tasks?status=overdue` | TasksClient 未读取 URL，status 下拉无「超期」快捷项 | 增加 status=overdue 支持并同步 URL |
| 本周新增 Leads | `/export/leads?since=week` | LeadsClient 已支持 since，但筛选/翻页后 URL 不同步 | 筛选/翻页时同步 URL |
| 客户状态分布 | `/export/customers?status=xxx` | CustomersClient 不读 status 初始值 | 从 URL 初始化 status |
| 国家分布 | `/export/customers?country=xxx` | CustomersClient 不读 country 初始值 | 从 URL 初始化 country |

### 一致性要求
- 跳转后列表结果正确
- URL 参数与页面筛选控件同步
- 翻页后筛选条件不丢失（page 写入 URL）
- 多筛选项组合时行为稳定

---

## 二、Customers 快速标记下次跟进 - 交互方案

### 2.1 入口
- 在 Customers 列表每行「操作」列增加「设置下次跟进」按钮（或图标）
- 与「详情」并列，点击不触发行跳转（stopPropagation）

### 2.2 弹窗交互
- 点击后打开小弹窗（Modal）或轻量抽屉
- 内容：日期选择器（date）+ 可选时间（datetime-local 或仅 date）
- 默认值：当前日期或该客户现有 nextFollowUpAt
- 按钮：确定、取消

### 2.3 提交逻辑
- 调用 `PATCH /api/export/customers/[id]`，传 `{ nextFollowUpAt: ISO8601 }`
- 成功：toast「设置成功」；关闭弹窗；**局部刷新**该行或当前页数据（不整页 loading）
- 失败：toast 错误信息

### 2.4 列表展示优化
- 若 nextFollowUpAt 已过期（≤ 今日）：该单元格高亮（如 amber/red）
- 文案：上次跟进 / 下次跟进 保持现有，可微调为「上次跟进时间」「下次跟进时间」以更清晰

---

## 三、涉及的 API / 组件改动点

### 3.1 筛选与 URL 同步

| 文件 | 改动 |
|------|------|
| `src/lib/export/use-list-params.ts`（新建） | 统一 query 解析与 URL 同步 hook |
| `src/components/export/CustomersClient.tsx` | 使用 hook，从 URL 初始化 filter/status/country/page；筛选/翻页时 replaceState |
| `src/components/export/TasksClient.tsx` | 增加 useSearchParams；支持 due、status=overdue；同步 URL |
| `src/components/export/LeadsClient.tsx` | 筛选/翻页时同步 URL |
| `src/components/export/shared/Pagination.tsx` | 可选：接收 onPageChange 时同时更新 URL（由父组件负责） |

### 3.2 快速标记下次跟进

| 文件 | 改动 |
|------|------|
| `src/components/export/NextFollowUpModal.tsx`（新建） | 日期选择弹窗组件 |
| `src/components/export/CustomersClient.tsx` | 行内「设置下次跟进」按钮；集成 NextFollowUpModal；局部刷新 |
| `src/app/api/export/customers/[id]/route.ts` | 已有 nextFollowUpAt 支持，无需改 |

### 3.3 API 现状确认
- Customers GET：已支持 filter, status, country, ownerId, keyword, page ✅
- Tasks GET：已支持 due, status (含 overdue), ownerId, keyword, page ✅
- Leads GET：已支持 since, status, country, ownerId, keyword, page ✅

---

## 四、实现完成情况（2025-03）

### 4.1 筛选与 URL 同步 ✅
- 新增 `src/lib/export/url-params.ts`：buildListUrl 工具
- CustomersClient：从 URL 初始化 filter/status/country/ownerId/page；筛选/翻页时 router.replace
- TasksClient：支持 due=today、status=overdue；新增「今日到期」「超期任务」快捷筛选；URL 同步
- LeadsClient：筛选/翻页时 URL 同步

### 4.2 快速标记下次跟进 ✅
- 新增 `NextFollowUpModal`：日期时间选择弹窗
- CustomersClient：行内「设置下次跟进」按钮；成功后 toast + 局部刷新（silent fetch）
- 列表展示：nextFollowUpAt 过期时高亮 + 「(待跟进)」文案；超7天 badge 改为「超7天」
