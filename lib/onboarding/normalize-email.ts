export type NormalizedEmail = {
  email: string;
  domain: string;
};

export function normalizeEmailAddress(raw: string): string | null {
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned) return null;

  const at = cleaned.lastIndexOf("@");
  if (at <= 0 || at === cleaned.length - 1) return null;

  const local = cleaned.slice(0, at);
  const domain = cleaned.slice(at + 1);
  if (!local || !domain || domain.includes("@")) return null;

  return `${local}@${domain}`;
}

export function extractEmailDomain(rawEmailOrDomain: string): string | null {
  let cleaned = rawEmailOrDomain.trim().toLowerCase();
  if (!cleaned) return null;

  cleaned = cleaned.replace(/^mailto:/, "");
  cleaned = cleaned.split("/")[0] ?? cleaned;
  cleaned = cleaned.split("?")[0] ?? cleaned;

  const at = cleaned.lastIndexOf("@");
  if (at >= 0) {
    cleaned = cleaned.slice(at + 1);
  }

  cleaned = cleaned.replace(/^\.+|\.+$/g, "");
  if (!cleaned || cleaned.includes("@")) return null;
  if (!/^[a-z0-9.-]+$/.test(cleaned)) return null;
  if (!cleaned.includes(".")) return null;

  return cleaned;
}

export function normalizeEmailAndDomain(raw: string): NormalizedEmail | null {
  const email = normalizeEmailAddress(raw);
  if (!email) return null;
  const domain = extractEmailDomain(email);
  if (!domain) return null;
  return { email, domain };
}
