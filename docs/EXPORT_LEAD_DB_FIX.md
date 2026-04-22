# 线索表报错 / 创建失败（数据库未同步）

若代码已使用 `product_interest` 字段，但数据库仍是旧的 `interested_products`（数组）或未执行迁移，会出现：

- 列表/创建失败
- 接口返回 500

## 推荐（服务器项目目录）

```bash
npx prisma migrate deploy
# 或
npx prisma db push
```

然后：

```bash
npm run build
pm2 restart crm
```

## 仅手动 SQL（PostgreSQL，无法使用 Prisma 时）

在 `export_leads` 上执行（与迁移 `20260312120000_lead_product_interest_and_deletion_log` 一致）：

```sql
ALTER TABLE export_leads ADD COLUMN IF NOT EXISTS product_interest TEXT;
UPDATE export_leads
SET product_interest = array_to_string(interested_products, ', ')
WHERE interested_products IS NOT NULL;
```

若存在 `interested_products` 列且需删除：

```sql
ALTER TABLE export_leads DROP COLUMN IF EXISTS interested_products;
```

（若 `UPDATE` 报错，请按当前库中列名调整。）
