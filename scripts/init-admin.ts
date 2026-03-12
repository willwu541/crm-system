/**
 * 初始化管理员账号脚本（使用 pg 直连，绕过 Prisma adapter 问题）
 * 用法: npx tsx scripts/init-admin.ts
 *
 * 若数据库无用户，会创建 admin@example.com / admin123
 */
import "dotenv/config";
import pg from "pg";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("错误: 请设置 .env 中的 DATABASE_URL");
  process.exit(1);
}

function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(5).toString("hex");
  return `c${timestamp}${random}`;
}

async function main() {
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    const checkRes = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ["admin@example.com"]
    );

    if (checkRes.rows.length > 0) {
      console.log("管理员账号已存在: admin@example.com");
      return;
    }

    const adminHash = await bcrypt.hash("admin123", 10);
    const id = generateCuid();
    const now = new Date().toISOString();

    await client.query(
      `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6)`,
      [id, "admin@example.com", adminHash, "管理员", "ADMIN", now]
    );

    console.log("管理员账号已创建: admin@example.com / admin123");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  const err = e as Error & { code?: string };
  const msg = err?.message ?? String(e);
  const isConnRefused = msg.includes("ECONNREFUSED") || err?.code === "ECONNREFUSED";
  console.error("初始化失败:", msg || e);
  if (isConnRefused) {
    console.error("\n提示: PostgreSQL 未启动或无法连接。请先启动 PostgreSQL，再执行 npx prisma db push 创建表结构。");
  }
  process.exit(1);
});
