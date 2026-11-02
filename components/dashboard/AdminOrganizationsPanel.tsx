"use client";

import { useMemo, useState } from "react";
import {
  useAdminDomains,
  useAdminIndustries,
  useAdminOrganizations,
  useAdminVerifyDomain,
  useCreateOrganization,
  useDeleteOrganization,
  useUpdateOrganization,
} from "@/hooks/admin";
import { ApiClientError } from "@/lib/api/client";
import {
  AlertCircleIcon,
  BuildingIcon,
  CheckIcon,
  TrashIcon,
} from "@/components/ui/Icons";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { useToast } from "@/components/ui/Toast";

function industryLabel(
  org: {
    industry_id?: string;
    industry?: { name: string; is_active?: boolean } | null;
  },
  fallbackName?: string
) {
  const name = org.industry?.name ?? fallbackName;
  if (!name) return "—";
  if (org.industry?.is_active === false) {
    return `${name} (inactive)`;
  }
  return name;
}

function domainSummary(
  domains:
    | Array<{ domain: string; verification_status: string }>
    | null
    | undefined
) {
  if (!domains || domains.length === 0) return "—";
  return domains
    .map((d) => `${d.domain}${d.verification_status === "verified" ? " ✓" : ""}`)
    .join(", ");
}

export function AdminOrganizationsPanel() {
  const { showToast } = useToast();
  const industriesQuery = useAdminIndustries();
  const [industryFilter, setIndustryFilter] = useState<string>("");
  const organizationsQuery = useAdminOrganizations(industryFilter || null);
  const domainsQuery = useAdminDomains(industryFilter || null);
  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization();
  const deleteOrganization = useDeleteOrganization();
  const verifyDomain = useAdminVerifyDomain();

  const [name, setName] = useState("");
  const [industryId, setIndustryId] = useState("");
  const [domain, setDomain] = useState("");
  const [workspaceType, setWorkspaceType] = useState<"company" | "team">(
    "company"
  );
  const [markDomainVerified, setMarkDomainVerified] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [domainOrgId, setDomainOrgId] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState("");

  const industries = industriesQuery.data ?? [];
  const activeIndustries = useMemo(
    () => industries.filter((industry) => industry.is_active !== false),
    [industries]
  );

  const industryNameById = useMemo(() => {
    const map = new Map<string, string>();
    industries.forEach((industry) => map.set(industry.id, industry.name));
    return map;
  }, [industries]);

  const availableDomains = domainsQuery.data?.domains ?? [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!industryId || !name.trim()) {
      setFormError("Industry and organization name are required");
      return;
    }

    createOrganization.mutate(
      {
        industryId,
        name: name.trim(),
        domain: domain.trim() || undefined,
        workspaceType,
        joinPolicy: domain.trim() ? "verified_domain" : "approval_required",
        markDomainVerified: domain.trim() ? markDomainVerified : false,
      },
      {
        onSuccess: (data) => {
          setName("");
          setDomain("");
          const domainLabel = data.domain
            ? ` · domain ${data.domain.domain} (${data.domain.verification_status})`
            : "";
          setFormSuccess(`Organization created${domainLabel}`);
        },
        onError: (error) => {
          setFormError(
            error instanceof ApiClientError
              ? error.message
              : "Failed to create organization"
          );
        },
      }
    );
  };

  const handleDelete = (org: { id: string; name: string }) => {
    if (
      !window.confirm(
        `Delete organization "${org.name}"? Members of this org will lose access.`
      )
    ) {
      return;
    }

    setDeletingId(org.id);
    deleteOrganization.mutate(org.id, {
      onSuccess: () => {
        showToast({
          tone: "success",
          title: "Organization deleted",
          description: `"${org.name}" was removed.`,
        });
      },
      onError: (error) => {
        showToast({
          tone: "error",
          title: "Could not delete organization",
          description:
            error instanceof ApiClientError
              ? error.message
              : "Please try again.",
        });
      },
      onSettled: () => setDeletingId(null),
    });
  };

  const handleAddDomain = (organizationId: string) => {
    const value = domainInput.trim();
    if (!value) {
      showToast({
        tone: "error",
        title: "Domain required",
        description: "Enter a company domain such as acme.com",
      });
      return;
    }

    verifyDomain.mutate(
      { organizationId, domain: value, markVerified: true },
      {
        onSuccess: () => {
          showToast({
            tone: "success",
            title: "Domain verified",
            description: `${value} attached and marked verified.`,
          });
          setDomainOrgId(null);
          setDomainInput("");
        },
        onError: (error) => {
          showToast({
            tone: "error",
            title: "Could not add domain",
            description:
              error instanceof ApiClientError
                ? error.message
                : "Please try again.",
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0B1F3D]">Organizations</h1>
        <p className="mt-1 text-sm text-[#557393]">
          Create company/team organizations under an industry and attach
          verified domains so signup discovery can find them. Multiple orgs may
          share one domain — users then choose which to join.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm space-y-4"
      >
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3D]">
          Create organization
        </h2>

        {formError ? (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
            <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        ) : null}

        {formSuccess ? (
          <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700">
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
              Industry
            </label>
            <select
              value={industryId}
              onChange={(e) => setIndustryId(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-3 text-sm font-medium text-[#0B1F3D] outline-none focus:border-[#38B2D1] focus:bg-white"
            >
              <option value="">Select industry</option>
              {activeIndustries.map((industry) => (
                <option key={industry.id} value={industry.id}>
                  {industry.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
              Organization name
            </label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#557393]">
                <BuildingIcon className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ABC Properties"
                className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-3 pl-10 pr-4 text-sm font-medium text-[#0B1F3D] outline-none focus:border-[#38B2D1] focus:bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
              Workspace type
            </label>
            <select
              value={workspaceType}
              onChange={(e) =>
                setWorkspaceType(e.target.value as "company" | "team")
              }
              className="mt-1 w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-3 text-sm font-medium text-[#0B1F3D] outline-none focus:border-[#38B2D1] focus:bg-white"
            >
              <option value="company">Company</option>
              <option value="team">Team</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
              Company domain
            </label>
            <input
              type="text"
              list="admin-available-domains"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="acme.com (optional)"
              className="mt-1 w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-3 text-sm font-medium text-[#0B1F3D] outline-none focus:border-[#38B2D1] focus:bg-white"
            />
            <datalist id="admin-available-domains">
              {availableDomains.map((d) => (
                <option key={d.domain} value={d.domain}>
                  {d.organizationCount} org(s)
                </option>
              ))}
            </datalist>
            <p className="mt-1 text-[11px] text-[#557393]">
              Pick an existing domain or type a new one. Required for email
              discovery at signup.
            </p>
          </div>
        </div>

        {domain.trim() ? (
          <label className="flex items-center gap-2 text-xs font-semibold text-[#0B1F3D]">
            <input
              type="checkbox"
              checked={markDomainVerified}
              onChange={(e) => setMarkDomainVerified(e.target.checked)}
              className="rounded border-[#C4EBF2]"
            />
            Mark domain verified immediately (recommended for admin-created
            orgs)
          </label>
        ) : null}

        <button
          type="submit"
          disabled={createOrganization.isPending}
          className="inline-flex min-h-[42px] items-center justify-center rounded-2xl bg-[#38B2D1] px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#2ca0be] disabled:opacity-70"
        >
          {createOrganization.isPending ? "Creating…" : "Create organization"}
        </button>
      </form>

      {availableDomains.length > 0 ? (
        <div className="rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3D]">
            Available domains
          </h2>
          <p className="text-xs text-[#557393]">
            Reuse a domain below when creating another organization that shares
            it. Signup will ask the user to choose among matching orgs.
          </p>
          <ul className="flex flex-wrap gap-2">
            {availableDomains.map((d) => (
              <li key={d.domain}>
                <button
                  type="button"
                  onClick={() => setDomain(d.domain)}
                  className="rounded-xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-1.5 text-xs font-bold text-[#0B1F3D] hover:border-[#38B2D1]"
                >
                  {d.domain}
                  <span className="ml-1 font-medium text-[#557393]">
                    · {d.organizationCount}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3D]">
            All organizations
          </h2>
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-2 text-xs font-semibold text-[#0B1F3D] outline-none"
          >
            <option value="">All industries</option>
            {industries.map((industry) => (
              <option key={industry.id} value={industry.id}>
                {industry.name}
                {industry.is_active === false ? " (inactive)" : ""}
              </option>
            ))}
          </select>
        </div>

        {organizationsQuery.isLoading ? (
          <ThemeLoader label="Loading organizations…" className="py-8" />
        ) : organizationsQuery.isError ? (
          <p className="text-sm text-rose-600">
            Failed to load organizations. Confirm you are a platform admin.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#C4EBF2] text-xs uppercase tracking-wider text-[#557393]">
                  <th className="py-2 pr-4 font-bold">Name</th>
                  <th className="py-2 pr-4 font-bold">Industry</th>
                  <th className="py-2 pr-4 font-bold">Type</th>
                  <th className="py-2 pr-4 font-bold">Domains</th>
                  <th className="py-2 pr-4 font-bold">Status</th>
                  <th className="py-2 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(organizationsQuery.data ?? []).map((org) => {
                  const nestedIndustry = Array.isArray(org.industry)
                    ? org.industry[0]
                    : org.industry;
                  const industry = industryLabel(
                    { ...org, industry: nestedIndustry ?? null },
                    org.industry_id
                      ? industryNameById.get(org.industry_id)
                      : undefined
                  );
                  const domains = Array.isArray(org.domains)
                    ? org.domains
                    : org.domains
                      ? [org.domains]
                      : [];

                  return (
                    <tr key={org.id} className="border-b border-[#F0FAFC]">
                      <td className="py-3 pr-4 font-semibold text-[#0B1F3D]">
                        {org.name}
                      </td>
                      <td className="py-3 pr-4 text-[#557393]">{industry}</td>
                      <td className="py-3 pr-4 text-[#557393]">
                        {org.workspace_type ?? "company"}
                      </td>
                      <td className="py-3 pr-4 text-[#557393]">
                        {domainSummary(domains)}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            org.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {org.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={updateOrganization.isPending}
                              onClick={() =>
                                updateOrganization.mutate({
                                  id: org.id,
                                  isActive: !org.is_active,
                                })
                              }
                              className="rounded-xl border border-[#C4EBF2] px-3 py-1.5 text-xs font-bold text-[#0B1F3D] hover:bg-[#F0FAFC] disabled:opacity-60"
                            >
                              {org.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDomainOrgId(
                                  domainOrgId === org.id ? null : org.id
                                );
                                setDomainInput("");
                              }}
                              className="rounded-xl border border-[#C4EBF2] px-3 py-1.5 text-xs font-bold text-[#0B1F3D] hover:bg-[#F0FAFC]"
                            >
                              {domainOrgId === org.id
                                ? "Cancel domain"
                                : "Add domain"}
                            </button>
                            <button
                              type="button"
                              disabled={
                                deleteOrganization.isPending &&
                                deletingId === org.id
                              }
                              onClick={() => handleDelete(org)}
                              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                              {deletingId === org.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                          {domainOrgId === org.id ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="text"
                                value={domainInput}
                                onChange={(e) => setDomainInput(e.target.value)}
                                placeholder="newco.com"
                                className="min-w-[160px] flex-1 rounded-xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-1.5 text-xs font-medium text-[#0B1F3D] outline-none"
                              />
                              <button
                                type="button"
                                disabled={verifyDomain.isPending}
                                onClick={() => handleAddDomain(org.id)}
                                className="rounded-xl bg-[#38B2D1] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                              >
                                {verifyDomain.isPending
                                  ? "Saving…"
                                  : "Verify & save"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {(organizationsQuery.data ?? []).length === 0 ? (
              <p className="pt-3 text-sm text-[#557393]">No organizations yet.</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
