export function slugifyOrganizationName(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return base || "organization";
}

export function withSlugSuffix(slug: string, attempt: number) {
  if (attempt <= 0) return slug;
  const suffix = `-${attempt + 1}`;
  const maxBase = Math.max(1, 60 - suffix.length);
  return `${slug.slice(0, maxBase)}${suffix}`;
}
