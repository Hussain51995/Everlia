

const DEFAULT_PERSONAL_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "hotmail.co.uk",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "yandex.ru",
  "qq.com",
  "163.com",
  "126.com",
] as const;

function parseDomainList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export function getPersonalEmailDomains(): ReadonlySet<string> {
  const fromEnv = parseDomainList(process.env.PERSONAL_EMAIL_DOMAINS);
  const extra = parseDomainList(process.env.PERSONAL_EMAIL_DOMAINS_EXTRA);
  const base =
    fromEnv.length > 0 ? fromEnv : [...DEFAULT_PERSONAL_EMAIL_DOMAINS];
  return new Set([...base, ...extra]);
}

export function isPersonalEmailDomain(domain: string | null | undefined): boolean {
  if (!domain) return false;
  const normalized = domain.trim().toLowerCase();
  if (!normalized) return false;

  const personal = getPersonalEmailDomains();
  if (personal.has(normalized)) return true;

  for (const entry of personal) {
    if (normalized === entry || normalized.endsWith(`.${entry}`)) {
      return true;
    }
  }

  return false;
}

export { DEFAULT_PERSONAL_EMAIL_DOMAINS };
