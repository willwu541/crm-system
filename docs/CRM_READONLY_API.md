# CRM 专用只读数据接口

地址：`GET /api/integrations/crm-readonly`

用途：读取指定外贸租户的客户、线索、联系人、跟进记录，供数据检查与清洗建议使用。它不开放新增、修改、合并、删除操作；不输出用户密码、系统密钥、报价成本或附件。

## 服务器配置

在 `/root/crm-system/.env` 增加两个变量：

```env
CRM_READONLY_API_KEY="单独生成的随机密钥，至少32个字符"
CRM_READONLY_TENANT_SLUG="default"
```

slug 必须对应实际 ExportTenant。第一版凭证可读取该租户全部外贸记录，包含联系方式及跟进正文；适合老板授权的整库检查，不适合发给普通业务员。没有配置或密钥过短时接口关闭。不要复用登录密码或网站客服密钥。

密钥只通过 HTTPS 的 `Authorization: Bearer ...` 请求头传递，不能放在 URL 中，不要提交 GitHub。移除变量并重启即可停用；替换密钥并重启即可撤销旧凭证。

## 查询

参数：entity=customers/leads/contacts/activities（默认 customers），limit=1..100（默认50），cursor=上页 nextCursor，updatedSince=带时区的 ISO 时间。

```text
https://crm.wibergmetal.com/api/integrations/crm-readonly?entity=customers&limit=50
```

返回 `readonly`、`entity`、`data`、`pagination.hasMore` 与 `pagination.nextCursor`。分页按稳定的 ID 顺序读取；持续更新的数据不是事务快照，完整审计建议在低活动时段采集，增量检查固定 updatedSince 并适当重叠、按 ID 去重。

状态：401 密钥无效；400 参数无效；405 尝试写入；503 未配置；500 读取异常。响应禁止缓存，不开放跨域浏览器访问。

## 上线与验证

构建并重启前，确认服务器已拉到包含本接口的提交。配置变量后重启 PM2。无凭证 GET 必须返回401，合法凭证读取分页数据，POST必须返回405。测试结果不要打印密钥或客户记录到公开日志。

此 HTTP 接口并不会自动成为聊天里的连接器。后续需要在可安全传递请求头的执行环境或专用连接器中配置凭证；不要把密钥粘贴在聊天消息里。若聊天环境不能直接访问，可以由服务器生成只读导出文件用于检查。
