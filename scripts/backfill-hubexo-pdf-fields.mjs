/**
 * 回填 Hubexo 项目 PDF 结构字段：
 * - 从 notes 拆出人民币万元金额 / 原币原文
 * - 从 party notes 拆出资料角色 / 地址
 * - 从 RCC PDF 筛钢格板相关 Building elements
 *
 * 用法：
 *   set -a && source .env && set +a
 *   node scripts/backfill-hubexo-pdf-fields.mjs
 *   node scripts/backfill-hubexo-pdf-fields.mjs --pdf-dir /path/to/RCC/PDF
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfDirArg = process.argv.includes("--pdf-dir")
  ? process.argv[process.argv.indexOf("--pdf-dir") + 1]
  : process.env.RCC_PDF_DIR || "C:/Users/11944/Desktop/RCC/PDF";

function clean(value) {
  const text = value == null ? "" : String(value).trim();
  return text || null;
}

function parseProjectNotes(notes) {
  const lines = String(notes || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  let projectValueText = null;
  let projectValueOriginal = null;
  const rest = [];
  for (const line of lines) {
    if (line.startsWith("项目金额：")) {
      projectValueText = line.slice("项目金额：".length).trim() || null;
      continue;
    }
    if (line.startsWith("原金额：")) {
      projectValueOriginal = line.slice("原金额：".length).trim() || null;
      continue;
    }
    rest.push(line);
  }
  return { projectValueText, projectValueOriginal, notes: rest.join("\n") || null };
}

function parsePartyNotes(notes) {
  const lines = String(notes || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  let companyRole = null;
  let address = null;
  const rest = [];
  for (const line of lines) {
    if (line.startsWith("资料角色：")) {
      companyRole = line.slice("资料角色：".length).trim() || null;
      continue;
    }
    if (line.startsWith("地址：")) {
      address = line.slice("地址：".length).trim() || null;
      continue;
    }
    rest.push(line);
  }
  return { companyRole, address, notes: rest.join("\n") || null };
}

function parseDescription(description) {
  const lines = String(description || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  let siteArea = null;
  const rest = [];
  for (const line of lines) {
    if (line.startsWith("用地：")) {
      siteArea = line.slice("用地：".length).trim() || null;
      continue;
    }
    rest.push(line);
  }
  return { siteArea, description: rest.join("\n") || null };
}

function extractGratingMap(pdfDir) {
  if (!fs.existsSync(pdfDir)) {
    console.warn("PDF 目录不存在，跳过建材抽取:", pdfDir);
    return {};
  }
  const helper = path.join(__dirname, "extract-grating-elements.py");
  const result = spawnSync("py", ["-3", helper, pdfDir], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status !== 0) {
    console.error("PDF 抽取失败:", result.stderr || result.stdout);
    return {};
  }
  try {
    return JSON.parse(result.stdout.trim() || "{}");
  } catch (error) {
    console.error("解析 PDF 抽取 JSON 失败", error);
    return {};
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("缺少 DATABASE_URL");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();

const gratingMap = extractGratingMap(pdfDirArg);
console.log("grating projects from PDF", Object.keys(gratingMap).length);

const projects = await client.query(
  `SELECT id, source_project_number, notes, description,
          project_value_text, project_value_original, site_area, grating_related_elements
   FROM export_projects
   WHERE source = 'Hubexo' OR source_project_number IS NOT NULL`,
);

let projectUpdated = 0;
let valueFilled = 0;
let gratingFilled = 0;
let partyUpdated = 0;

await client.query("BEGIN");
try {
  for (const row of projects.rows) {
    const fromNotes = parseProjectNotes(row.notes);
    const fromDesc = parseDescription(row.description);
    const grating =
      clean(row.grating_related_elements) || clean(gratingMap[row.source_project_number]) || null;
    const projectValueText = clean(row.project_value_text) || fromNotes.projectValueText;
    const projectValueOriginal = clean(row.project_value_original) || fromNotes.projectValueOriginal;
    const siteArea = clean(row.site_area) || fromDesc.siteArea;

    // 若 description 里还有「用地：」前缀，拆到 site_area 后写回剩余部分
    const descriptionAfter = fromDesc.siteArea ? fromDesc.description : clean(row.description);

    const changed =
      projectValueText !== clean(row.project_value_text) ||
      projectValueOriginal !== clean(row.project_value_original) ||
      siteArea !== clean(row.site_area) ||
      grating !== clean(row.grating_related_elements) ||
      fromNotes.notes !== clean(row.notes) ||
      descriptionAfter !== clean(row.description);

    if (!changed) continue;

    await client.query(
      `UPDATE export_projects
       SET project_value_text = $2,
           project_value_original = $3,
           site_area = COALESCE(NULLIF(site_area, ''), $4),
           grating_related_elements = $5,
           notes = $6,
           description = $7,
           updated_at = NOW()
       WHERE id = $1`,
      [
        row.id,
        projectValueText,
        projectValueOriginal,
        siteArea,
        grating,
        fromNotes.notes,
        descriptionAfter,
      ],
    );
    projectUpdated += 1;
    if (!clean(row.project_value_text) && projectValueText) valueFilled += 1;
    if (!clean(row.grating_related_elements) && grating) gratingFilled += 1;
  }

  const parties = await client.query(
    `SELECT id, notes, company_role, address
     FROM export_project_parties
     WHERE notes IS NOT NULL AND notes <> ''`,
  );
  for (const party of parties.rows) {
    const parsed = parsePartyNotes(party.notes);
    const companyRole = clean(party.company_role) || parsed.companyRole;
    const address = clean(party.address) || parsed.address;
    if (
      companyRole === clean(party.company_role) &&
      address === clean(party.address) &&
      parsed.notes === clean(party.notes)
    ) {
      continue;
    }
    await client.query(
      `UPDATE export_project_parties
       SET company_role = $2, address = $3, notes = $4, updated_at = NOW()
       WHERE id = $1`,
      [party.id, companyRole, address, parsed.notes],
    );
    partyUpdated += 1;
  }

  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
}

const counts = await client.query(
  `SELECT
     COUNT(*) FILTER (WHERE project_value_text IS NOT NULL AND project_value_text <> '')::int AS with_value,
     COUNT(*) FILTER (WHERE grating_related_elements IS NOT NULL AND grating_related_elements <> '')::int AS with_grating,
     COUNT(*)::int AS total
   FROM export_projects
   WHERE source = 'Hubexo'`,
);
const sample = await client.query(
  `SELECT source_project_number, project_value_text,
          LEFT(grating_related_elements, 220) AS grating
   FROM export_projects
   WHERE source_project_number = '79893011'`,
);

console.log(
  JSON.stringify(
    {
      projectUpdated,
      valueFilled,
      gratingFilled,
      partyUpdated,
      hubexo: counts.rows[0],
      sample: sample.rows[0] || null,
    },
    null,
    2,
  ),
);
await client.end();
