import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("错误: 请设置 .env 中的 DATABASE_URL");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 管理员: admin@wibergmetal.com / admin123
  const adminHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@wibergmetal.com" },
    update: { passwordHash: adminHash, name: "Admin", role: "ADMIN" },
    create: {
      email: "admin@wibergmetal.com",
      passwordHash: adminHash,
      name: "Admin",
      role: "ADMIN",
    },
  });
  console.log("管理员账号已创建/更新:", admin.email);

  // 示例业务员: sales@wibergmetal.com / sales123
  const salesHash = await bcrypt.hash("sales123", 10);
  const sales = await prisma.user.upsert({
    where: { email: "sales@wibergmetal.com" },
    update: {},
    create: {
      email: "sales@wibergmetal.com",
      passwordHash: salesHash,
      name: "业务员",
      role: "SALES",
    },
  });
  console.log("业务员账号已创建:", sales.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
