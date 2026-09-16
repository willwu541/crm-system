import { countryLabel } from "@/lib/export/countries";

export type PartyName = { role: string; companyName: string };

function namesForRoles(parties: PartyName[] | undefined, roles: string[]): string {
  const names = (parties ?? [])
    .filter((p) => roles.includes(p.role) && p.companyName?.trim())
    .map((p) => p.companyName.trim());
  return [...new Set(names)].join("、");
}

export function displayOwnerOperator(
  project: { ownerOperator?: string | null },
  parties?: PartyName[],
): string {
  return project.ownerOperator?.trim() || namesForRoles(parties, ["owner"]);
}

export function displayGeneralContractor(
  project: { generalContractor?: string | null },
  parties?: PartyName[],
): string {
  return project.generalContractor?.trim() || namesForRoles(parties, ["general_contractor"]);
}

export function displayPotentialBuyers(
  project: { potentialBuyers?: string | null },
  parties?: PartyName[],
): string {
  return (
    project.potentialBuyers?.trim() ||
    namesForRoles(parties, ["epc", "subcontractor", "fabricator", "consultant"])
  );
}

export function formatProjectPlace(project: {
  location?: string | null;
  city?: string | null;
  country?: string | null;
}): string {
  const countryRaw = countryLabel(project.country);
  const countryText = countryRaw === "-" ? project.country?.trim() || "" : countryRaw;
  const localParts = [project.location, project.city]
    .map((x) => x?.trim())
    .filter((x): x is string => !!x);
  const local: string[] = [];
  for (const part of localParts) {
    if (local.some((u) => u.toLowerCase().includes(part.toLowerCase()) || part.toLowerCase().includes(u.toLowerCase()))) {
      if (part.length > (local.find((u) => u.toLowerCase().includes(part.toLowerCase()))?.length ?? 0)) {
        const idx = local.findIndex((u) => part.toLowerCase().includes(u.toLowerCase()));
        if (idx >= 0) local[idx] = part;
      }
      continue;
    }
    local.push(part);
  }
  const localStr = local.join(", ");
  if (localStr && countryText && !localStr.toLowerCase().includes(countryText.toLowerCase())) {
    return `${localStr}\n${countryText}`;
  }
  return localStr || countryText || "—";
}

export function wrapSlashLabel(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw || raw === "-") return "—";
  return raw.replaceAll(" / ", "\n/ ");
}

export function projectSubtitle(project: {
  source?: string | null;
  notes?: string | null;
  description?: string | null;
  bidDeadline?: string | Date | null;
}): string {
  const bits: string[] = [];
  const source = project.source?.trim();
  if (source) bits.push(source.split(/\n/)[0]!.trim());
  if (project.bidDeadline) {
    const d = new Date(project.bidDeadline);
    if (!Number.isNaN(d.getTime())) {
      bits.push(`截止 -> ${d.getFullYear()}`);
    }
  }
  const extra = (project.notes || project.description || "").trim().split(/\n/)[0]?.trim();
  if (extra && extra !== source) bits.push(extra.length > 70 ? `${extra.slice(0, 70)}…` : extra);
  return bits.join(" · ");
}

export function boardFieldsFromNewParty(
  project: {
    ownerOperator?: string | null;
    generalContractor?: string | null;
    potentialBuyers?: string | null;
  },
  role: string,
  companyName: string,
): { ownerOperator?: string; generalContractor?: string; potentialBuyers?: string } {
  const name = companyName.trim();
  const patch: { ownerOperator?: string; generalContractor?: string; potentialBuyers?: string } = {};
  if (role === "owner" && !project.ownerOperator?.trim()) patch.ownerOperator = name;
  if (role === "general_contractor" && !project.generalContractor?.trim()) patch.generalContractor = name;
  if (["epc", "subcontractor", "fabricator", "consultant"].includes(role)) {
    const existing = (project.potentialBuyers || "")
      .split(/[、,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!existing.some((x) => x.toLowerCase() === name.toLowerCase())) {
      patch.potentialBuyers = [...existing, name].join("、");
    }
  }
  return patch;
}
