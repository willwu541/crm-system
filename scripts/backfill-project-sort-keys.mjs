/**
 * 回填 export_projects.project_value_wan 和 schedule_end_key。
 * 解析规则同 src/lib/export/project-schedule-value.ts。只改和原文不一致的行，可重复跑。
 *
 * 用法（仓库根目录，需 DATABASE_URL）：node scripts/backfill-project-sort-keys.mjs
 */
import fs from "fs";
import pg from "pg";
import { parseProjectValueWan, parseScheduleMonthKey } from "./lib/project-sort-keys.mjs";

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!fs.existsSync(".env")) return null;
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = /^\s*DATABASE_URL\s*=\s*(.*)\s*$/.exec(line);
    if (match) return match[1].replace(/^["']|["']$/g, "");
  }
  return null;
}

const connectionString = loadDatabaseUrl();
if (!connectionString) {
  console.error("缺少 DATABASE_URL");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();

const counts = { total: 0, changed: 0, valueParsed: 0, valueNull: 0, scheduleParsed: 0, scheduleNull: 0 };

try {
  const { rows } = await client.query(
    `SELECT id, project_value_text, schedule_end, project_value_wan, schedule_end_key FROM export_projects`
  );
  counts.total = rows.length;
  await client.query("BEGIN");
  for (const row of rows) {
    const value = parseProjectValueWan(row.project_value_text);
    const key = parseScheduleMonthKey(row.schedule_end);
    if (value == null) counts.valueNull += 1;
    else counts.valueParsed += 1;
    if (key == null) counts.scheduleNull += 1;
    else counts.scheduleParsed += 1;
    const currentValue = row.project_value_wan == null ? null : Number(row.project_value_wan);
    const currentKey = row.schedule_end_key == null ? null : Number(row.schedule_end_key);
    if (currentValue === value && currentKey === key) continue;
    await client.query(
      `UPDATE export_projects SET project_value_wan = $2, schedule_end_key = $3 WHERE id = $1`,
      [row.id, value, key]
    );
    counts.changed += 1;
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

console.log(JSON.stringify(counts, null, 2));
