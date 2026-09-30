"use client";

import { useMemo, useState } from "react";
import {
  useAdminIndustries,
  useAdminOrganizations,
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

export function AdminOrganizationsPanel() {
  const { showToast } = useToast();
  const industriesQuery = useAdminIndustries();
  const [industryFilter, setIndustryFilter] = useState<string>("");
  const organizationsQuery = useAdminOrganizations(industryFilter || null);
  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization();
  const deleteOrganization = useDeleteOrganization();

  const [name, setName] = useState("");
  const [industryId, setIndustryId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!industryId || !name.trim()) {
      setFormError("Industry and organization name are required");
      return;
    }

    createOrganization.mutate(
      { industryId, name: name.trim() },
      {
        onSuccess: () => {
          setName("");
          setFormSuccess("Organization created");
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0B1F3D]">Organizations</h1>
        <p className="mt-1 text-sm text-[#557393]">
          Create organizations under an industry. Signup is join-only for members.
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
        </div>

        <button
          type="submit"
          disabled={createOrganization.isPending}
          className="inline-flex min-h-[42px] items-center justify-center rounded-2xl bg-[#38B2D1] px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#2ca0be] disabled:opacity-70"
        >
          {createOrganization.isPending ? "Creating…" : "Create organization"}
        </button>
      </form>

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
                  <th className="py-2 pr-4 font-bold">Slug</th>
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

                  return (
                    <tr key={org.id} className="border-b border-[#F0FAFC]">
                      <td className="py-3 pr-4 font-semibold text-[#0B1F3D]">
                        {org.name}
                      </td>
                      <td className="py-3 pr-4 text-[#557393]">{industry}</td>
                      <td className="py-3 pr-4 text-[#557393]">{org.slug}</td>
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
