import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  DEFAULT_POOL_DAYS_CUSTOMER,
  DEFAULT_POOL_DAYS_LEAD,
} from "./field-options";

export interface PoolSettings {
  leadDays: number;
  customerDays: number;
}

const CONFIG_PATH = path.join(process.cwd(), "data", "domestic-settings.json");

function fromEnv(): PoolSettings {
  return {
    leadDays: parseInt(process.env.POOL_DAYS_LEAD ?? String(DEFAULT_POOL_DAYS_LEAD), 10) || DEFAULT_POOL_DAYS_LEAD,
    customerDays: parseInt(process.env.POOL_DAYS_CUSTOMER ?? String(DEFAULT_POOL_DAYS_CUSTOMER), 10) || DEFAULT_POOL_DAYS_CUSTOMER,
  };
}

export async function getPoolSettings(): Promise<PoolSettings> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<PoolSettings>;
    const env = fromEnv();
    return {
      leadDays: parsed.leadDays ?? env.leadDays,
      customerDays: parsed.customerDays ?? env.customerDays,
    };
  } catch {
    return fromEnv();
  }
}

export async function savePoolSettings(settings: PoolSettings): Promise<PoolSettings> {
  const normalized: PoolSettings = {
    leadDays: Math.max(7, Math.min(365, settings.leadDays)),
    customerDays: Math.max(7, Math.min(365, settings.customerDays)),
  };
  await mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(normalized, null, 2), "utf-8");
  return normalized;
}
