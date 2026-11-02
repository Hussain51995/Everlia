"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiClientError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { useToast } from "@/components/ui/Toast";
import { CheckIcon, AlertCircleIcon } from "@/components/ui/Icons";

type PendingMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  status: string;
  created_at?: string;
  profile?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

export function PendingMembersPanel() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const memberships = useAuthStore((s) => s.memberships);
  const activeOrganizationId = useAuthStore((s) => s.activeOrganizationId);
  const [actingId, setActingId] = useState<string | null>(null);

  const activeMembership = useMemo(
    () =>
      memberships.find(
        (m) =>
          m.organization_id === activeOrganizationId && m.status === "active"
      ),
    [memberships, activeOrganizationId]
  );

  const canModerate =
    activeMembership?.role === "owner" ||
    activeMembership?.role === "admin" ||
    activeMembership?.role === "org_admin";

  const pendingQuery = useQuery({
    queryKey: ["org-pending-members", activeOrganizationId],
    enabled: Boolean(activeOrganizationId && canModerate),
    queryFn: () =>
      apiClient<PendingMember[]>(
        `/api/organizations/${activeOrganizationId}/members/pending`
      ),
  });

  const approve = useMutation({
    mutationFn: (memberId: string) =>
      apiClient(`/api/organizations/${activeOrganizationId}/members/${memberId}/approve`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["org-pending-members", activeOrganizationId],
      });
      showToast({
        tone: "success",
        title: "Member approved",
        description: "Access is now active for this user.",
      });
    },
    onError: (error) => {
      showToast({
        tone: "error",
        title: "Could not approve member",
        description:
          error instanceof ApiClientError ? error.message : "Please try again.",
      });
    },
  });

  const reject = useMutation({
    mutationFn: (memberId: string) =>
      apiClient(`/api/organizations/${activeOrganizationId}/members/${memberId}/reject`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["org-pending-members", activeOrganizationId],
      });
      showToast({
        tone: "success",
        title: "Member rejected",
        description: "Join request was declined.",
      });
    },
    onError: (error) => {
      showToast({
        tone: "error",
        title: "Could not reject member",
        description:
          error instanceof ApiClientError ? error.message : "Please try again.",
      });
    },
  });

  if (!activeOrganizationId || !canModerate) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-extrabold text-[#0B1F3D]">
          Pending members
        </h2>
        <p className="mt-1 text-sm text-[#557393]">
          Approve or reject users waiting to join{" "}
          {activeMembership?.organization?.name ?? "this organization"}.
        </p>
      </div>

      {pendingQuery.isLoading ? (
        <ThemeLoader label="Loading pending members…" className="py-6" />
      ) : pendingQuery.isError ? (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
          <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Failed to load pending members.</span>
        </div>
      ) : (pendingQuery.data ?? []).length === 0 ? (
        <p className="text-sm text-[#557393]">No pending join requests.</p>
      ) : (
        <ul className="space-y-3">
          {(pendingQuery.data ?? []).map((member) => {
            const profile = Array.isArray(member.profile)
              ? member.profile[0]
              : member.profile;
            const name = [profile?.first_name, profile?.last_name]
              .filter(Boolean)
              .join(" ")
              .trim();
            const busy = actingId === member.id;
            return (
              <li
                key={member.id}
                className="flex flex-col gap-3 rounded-2xl border border-[#F0FAFC] bg-[#F0FAFC]/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-sm font-bold text-[#0B1F3D]">
                    {name || "Pending user"}
                  </div>
                  <div className="text-xs text-[#557393]">
                    Role: {member.role} · Status: {member.status}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy || approve.isPending}
                    onClick={() => {
                      setActingId(member.id);
                      approve.mutate(member.id, {
                        onSettled: () => setActingId(null),
                      });
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy || reject.isPending}
                    onClick={() => {
                      setActingId(member.id);
                      reject.mutate(member.id, {
                        onSettled: () => setActingId(null),
                      });
                    }}
                    className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
