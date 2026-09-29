"use client";

import { useState } from "react";
import {
  useIndustries,
  useJoinOrganization,
  useOrganizations,
} from "@/hooks/auth";
import { ApiClientError } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import { AlertCircleIcon, BuildingIcon, CheckIcon } from "@/components/ui/Icons";

export function JoinOrganizationPanel() {
  const { showToast } = useToast();
  const industriesQuery = useIndustries();
  const [industryId, setIndustryId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const organizationsQuery = useOrganizations(industryId || null);
  const joinOrganization = useJoinOrganization();
  const [formError, setFormError] = useState<string | null>(null);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!organizationId) {
      setFormError("Select an organization to join");
      return;
    }

    joinOrganization.mutate(
      { organizationId },
      {
        onSuccess: (data) => {
          setOrganizationId("");
          showToast({
            tone: "success",
            title: data.alreadyMember
              ? `Already a member of ${data.organizationName}`
              : `You joined ${data.organizationName}`,
          });
        },
        onError: (error) => {
          setFormError(
            error instanceof ApiClientError
              ? error.message
              : "Failed to join organization"
          );
        },
      }
    );
  };

  return (
    <form
      onSubmit={handleJoin}
      className="space-y-4 rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm"
    >
      {formError ? (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
          <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
            Industry
          </label>
          <select
            value={industryId}
            onChange={(e) => {
              setIndustryId(e.target.value);
              setOrganizationId("");
            }}
            className="mt-1 w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-3 text-sm font-medium text-[#0B1F3D] outline-none focus:border-[#38B2D1] focus:bg-white"
          >
            <option value="">Select industry</option>
            {(industriesQuery.data ?? []).map((industry) => (
              <option key={industry.id} value={industry.id}>
                {industry.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
            Organization
          </label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#557393]">
              <BuildingIcon className="h-4 w-4" />
            </span>
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              disabled={!industryId}
              className="w-full appearance-none rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-3 pl-10 pr-4 text-sm font-medium text-[#0B1F3D] outline-none focus:border-[#38B2D1] focus:bg-white disabled:opacity-60"
            >
              <option value="">Select organization</option>
              {(organizationsQuery.data ?? []).map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={joinOrganization.isPending}
        className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-2xl bg-[#38B2D1] px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#2ca0be] disabled:opacity-70"
      >
        {joinOrganization.isPending ? (
          "Joining…"
        ) : (
          <>
            <CheckIcon className="h-4 w-4" />
            Join organization
          </>
        )}
      </button>
    </form>
  );
}
