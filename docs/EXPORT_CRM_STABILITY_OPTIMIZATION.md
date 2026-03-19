# 外贸 CRM 上线前稳定性与效率优化清单

## 一、稳定性优化清单

### 1.1 防重复转换
| 场景 | 当前 | 优化 |
|------|------|------|
| Lead → Customer | 已有 convertedToCustomerId 检查 | 前端按钮禁用已转化线索；API 返回明确错误 |
| Quote → Order | 已有 existingOrder 检查 | 前端按钮禁用已转化报价；API 返回明确错误 |

### 1.2 防重复提交
| 组件 | 优化 |
|------|------|
| 所有表单 Submit 按钮 | 提交中 disabled + loading 文案 |
| 转化按钮（Lead 转客户、Quote 转订单） | 点击后 disabled，完成后恢复 |
| 批量操作按钮 | 处理中 disabled |

### 1.3 危险操作确认
| 操作 | 确认文案 |
|------|----------|
| 删除 Customer | 确定删除该客户？将同时删除联系人、跟进记录等关联数据 |
| 删除 Lead | 确定删除该线索？ |
| 删除 Contact | 确定删除该联系人？ |
| 删除 Activity | 确定删除该跟进记录？ |
| 删除 Quote | 确定删除该报价？ |
| 删除 Order | 确定删除该订单？ |
| 删除 Task | 确定删除该任务？ |
| 批量删除 | 确定删除选中的 N 条记录？此操作不可恢复 |

### 1.4 统一反馈
| 场景 | 实现 |
|------|------|
| 抽屉提交成功 | Toast 提示「保存成功」 |
| 批量操作成功 | Toast 提示「已更新 N 条」 |
| 操作失败 | Toast 或 inline 错误提示 |

### 1.5 页面细节
| 项 | 检查点 |
|----|--------|
| Dashboard 跳转 | filter=today, filter=overdue, due=today, status=overdue, since=week 等参数在目标列表页正确解析 |
| 列表筛选 | 多条件组合、清空后重置、分页与筛选联动 |
| 空状态 | 友好文案 + 引导操作 |
| 错误状态 | 网络错误、API 错误有明确提示 |
| Customer 工作台 | 局部刷新不滚动到顶部、抽屉关闭后焦点合理 |

---

## 二、批量操作实现方案

### 2.1 数据结构
- 列表页增加 `selectedIds: Set<string>`
- 表头增加全选 checkbox
- 每行增加单选 checkbox
- 选中时显示批量操作栏（固定在表格上方或底部）

### 2.2 批量操作栏 UI
```
[已选 N 条] [取消选择] [批量改负责人 ▼] [批量改状态 ▼] [批量删除]
```

### 2.3 API 设计

| 资源 | 批量接口 | 支持操作 |
|------|----------|----------|
| Leads | PATCH /api/export/leads/batch | ownerId, status, delete |
| Customers | PATCH /api/export/customers/batch | ownerId, status, nextFollowUpAt, delete |
| Quotes | PATCH /api/export/quotes/batch | ownerId, status, delete |
| Orders | PATCH /api/export/orders/batch | ownerId, delete |
| Tasks | PATCH /api/export/tasks/batch | ownerId, status, delete |

### 2.4 请求体格式
```json
{
  "ids": ["id1", "id2"],
  "action": "update" | "delete",
  "data": { "ownerId": "xxx" } | { "status": "xxx" } | { "nextFollowUpAt": "2025-03-15" }
}
```

### 2.5 权限
- 所有批量操作需校验 tenantId
- 删除需校验 ownerFilter（SALES 仅能删自己的）

### 2.6 Customers 快速标记下次跟进
- 列表行增加「标记」按钮或快捷入口
- 点击弹出小弹窗：日期选择器 + 确认
- 调用 PATCH /api/export/customers/[id] 更新 nextFollowUpAt

---

## 三、状态 Badge 一致性

### 3.1 Quote 状态
| status | 文案 | 颜色 |
|--------|------|------|
| draft | 草稿 | slate |
| sent | 已发送 | teal |
| replied | 已回复 | teal |
| negotiating | 谈判中 | teal |
| won | 已成交 | green |
| lost | 已流失 | slate |
| expired | 已过期 | slate |

### 3.2 Order 付款状态
| status | 文案 | 颜色 |
|--------|------|------|
| unpaid | 未付 | slate |
| partial_paid | 部分付 | amber |
| paid | 已付 | green |

### 3.3 Task 状态
| 计算 | 文案 | 颜色 |
|------|------|------|
| dueDate < today && !done | 超期 | red |
| done | 完成 | green |
| todo | 待办 | slate |
| in_progress | 进行中 | slate |
