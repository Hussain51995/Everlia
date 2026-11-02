import type { Organization } from "@/lib/types/auth";

export function isLegacyOtherOrganization(
  org: Pick<Organization, "name" | "slug"> & { is_system_other?: boolean }
) {
  if (org.is_system_other === true) return true;
  const slug = org.slug?.trim().toLowerCase();
  const name = org.name?.trim().toLowerCase();
  return slug === "other" && name === "other";
}

export function excludeLegacyOtherOrganizations<
  T extends Pick<Organization, "name" | "slug"> & { is_system_other?: boolean },
>(organizations: T[]): T[] {
  return organizations.filter((org) => !isLegacyOtherOrganization(org));
}

export function sortOrganizationsWithOtherLast<
  T extends Pick<Organization, "name" | "slug">,
>(organizations: T[]): T[] {
  return [...organizations].sort((a, b) => {
    const aOther = a.name?.trim().toLowerCase() === "other";
    const bOther = b.name?.trim().toLowerCase() === "other";
    if (aOther !== bOther) {
      return aOther ? 1 : -1;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}
