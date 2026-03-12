/**
 * 初始化管理员账号脚本（使用 pg 直连，绕过 Prisma adapter 问题）
 * 用法: npx tsx scripts/init-admin.ts
 *
 * 创建/更新 admin@wibergmetal.com / admin123
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

const ADMIN_EMAIL = "admin@wibergmetal.com";
const ADMIN_PASSWORD = "admin123";
const ADMIN_NAME = "Admin";

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
      "SELECT id, password_hash FROM users WHERE email = $1",
      [ADMIN_EMAIL]
    );

    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    if (checkRes.rows.length > 0) {
      await client.query(
        "UPDATE users SET password_hash = $1, name = $2, role = $3, updated_at = $4 WHERE email = $5",
        [adminHash, ADMIN_NAME, "ADMIN", new Date().toISOString(), ADMIN_EMAIL]
      );
      console.log(`管理员账号已更新: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
      return;
    }

    const id = generateCuid();
    const now = new Date().toISOString();

    await client.query(
      `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6)`,
      [id, ADMIN_EMAIL, adminHash, ADMIN_NAME, "ADMIN", now]
    );

    console.log(`管理员账号已创建: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
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
