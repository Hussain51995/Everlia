"use client";

import { useState } from "react";
import {
  useAdminIndustries,
  useCreateIndustry,
  useDeleteIndustry,
  useUpdateIndustry,
} from "@/hooks/admin";
import { ApiClientError } from "@/lib/api/client";
import { AlertCircleIcon, CheckIcon, TrashIcon } from "@/components/ui/Icons";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { useToast } from "@/components/ui/Toast";

export function AdminIndustriesPanel() {
  const { showToast } = useToast();
  const industriesQuery = useAdminIndustries();
  const createIndustry = useCreateIndustry();
  const updateIndustry = useUpdateIndustry();
  const deleteIndustry = useDeleteIndustry();

  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!name.trim()) {
      setFormError("Industry name is required");
      return;
    }

    createIndustry.mutate(
      { name: name.trim() },
      {
        onSuccess: (data) => {
          setName("");
          setFormSuccess(
            `Created ${data.industry.name} with auto org "${data.otherOrganization.name}"`
          );
        },
        onError: (error) => {
          setFormError(
            error instanceof ApiClientError
              ? error.message
              : "Failed to create industry"
          );
        },
      }
    );
  };

  const handleDelete = (industry: { id: string; name: string }) => {
    if (
      !window.confirm(
        `Delete industry "${industry.name}" and all of its organizations? This cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(industry.id);
    deleteIndustry.mutate(industry.id, {
      onSuccess: () => {
        showToast({
          tone: "success",
          title: "Industry deleted",
          description: `"${industry.name}" and its organizations were removed.`,
        });
      },
      onError: (error) => {
        showToast({
          tone: "error",
          title: "Could not delete industry",
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
        <h1 className="text-2xl font-extrabold text-[#0B1F3D]">Industries</h1>
        <p className="mt-1 text-sm text-[#557393]">
          Creating an industry also creates an active organization named Other.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="space-y-4 rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm"
      >
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3D]">
          Create industry
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

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
            Industry name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Realtors"
            className="mt-1 w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-4 py-3 text-sm font-medium text-[#0B1F3D] outline-none focus:border-[#38B2D1] focus:bg-white"
          />
        </div>

        <button
          type="submit"
          disabled={createIndustry.isPending}
          className="inline-flex min-h-[42px] items-center justify-center rounded-2xl bg-[#38B2D1] px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#2ca0be] disabled:opacity-70"
        >
          {createIndustry.isPending ? "Creating…" : "Create industry"}
        </button>
      </form>

      <div className="space-y-4 rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3D]">
          All industries
        </h2>

        {industriesQuery.isLoading ? (
          <ThemeLoader label="Loading industries…" className="py-8" />
        ) : industriesQuery.isError ? (
          <p className="text-sm text-rose-600">
            Failed to load industries. Confirm you are a platform admin.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#C4EBF2] text-xs uppercase tracking-wider text-[#557393]">
                  <th className="py-2 pr-4 font-bold">Name</th>
                  <th className="py-2 pr-4 font-bold">Slug</th>
                  <th className="py-2 pr-4 font-bold">Status</th>
                  <th className="py-2 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(industriesQuery.data ?? []).map((industry) => (
                  <tr key={industry.id} className="border-b border-[#F0FAFC]">
                    <td className="py-3 pr-4 font-semibold text-[#0B1F3D]">
                      {industry.name}
                    </td>
                    <td className="py-3 pr-4 text-[#557393]">{industry.slug}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          industry.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {industry.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={updateIndustry.isPending}
                          onClick={() =>
                            updateIndustry.mutate({
                              id: industry.id,
                              isActive: !industry.is_active,
                            })
                          }
                          className="rounded-xl border border-[#C4EBF2] px-3 py-1.5 text-xs font-bold text-[#0B1F3D] hover:bg-[#F0FAFC] disabled:opacity-60"
                        >
                          {industry.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          disabled={
                            deleteIndustry.isPending &&
                            deletingId === industry.id
                          }
                          onClick={() => handleDelete(industry)}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          {deletingId === industry.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(industriesQuery.data ?? []).length === 0 ? (
              <p className="pt-3 text-sm text-[#557393]">No industries yet.</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
