"use client";

import { useState } from "react";
import {
  useAdminOrganizationRequests,
  useApproveOrganizationRequest,
  useRejectOrganizationRequest,
  useAdminVerifyDomain,
} from "@/hooks/admin";
import { ApiClientError } from "@/lib/api/client";
import { AlertCircleIcon, CheckIcon } from "@/components/ui/Icons";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { useToast } from "@/components/ui/Toast";

export function AdminOnboardingRequestsPanel() {
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const requestsQuery = useAdminOrganizationRequests(statusFilter || null);
  const approveRequest = useApproveOrganizationRequest();
  const rejectRequest = useRejectOrganizationRequest();
  const verifyDomain = useAdminVerifyDomain();
  const [actingId, setActingId] = useState<string | null>(null);

  const handleApprove = (id: string) => {
    setActingId(id);
    approveRequest.mutate(id, {
      onSuccess: () => {
        showToast({
          tone: "success",
          title: "Request approved",
          description: "Organization activated and owner membership granted.",
        });
      },
      onError: (error) => {
        showToast({
          tone: "error",
          title: "Could not approve request",
          description:
            error instanceof ApiClientError
              ? error.message
              : "Please try again.",
        });
      },
      onSettled: () => setActingId(null),
    });
  };

  const handleReject = (id: string) => {
    const notes = window.prompt("Optional rejection notes") ?? undefined;
    setActingId(id);
    rejectRequest.mutate(
      { id, notes: notes?.trim() || undefined },
      {
        onSuccess: () => {
          showToast({
            tone: "success",
            title: "Request rejected",
            description: "Draft organization marked rejected if present.",
          });
        },
        onError: (error) => {
          showToast({
            tone: "error",
            title: "Could not reject request",
            description:
              error instanceof ApiClientError
                ? error.message
                : "Please try again.",
          });
        },
        onSettled: () => setActingId(null),
      }
    );
  };

  const handleAdminVerifyDomain = (
    organizationId: string | null,
    domain: string | null
  ) => {
    if (!organizationId || !domain) {
      showToast({
        tone: "error",
        title: "Missing organization or domain",
        description: "Cannot verify domain for this request.",
      });
      return;
    }
    setActingId(organizationId);
    verifyDomain.mutate(
      { organizationId, domain, markVerified: true },
      {
        onSuccess: () => {
          showToast({
            tone: "success",
            title: "Domain verified",
            description: `${domain} marked verified by platform admin.`,
          });
        },
        onError: (error) => {
          showToast({
            tone: "error",
            title: "Domain verification failed",
            description:
              error instanceof ApiClientError
                ? error.message
                : "Please try again.",
          });
        },
        onSettled: () => setActingId(null),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0B1F3D]">
          Organization requests
        </h1>
        <p className="mt-1 text-sm text-[#557393]">
          Review self-service company onboarding, verification status, and
          approve or reject pending requests.
        </p>
      </div>

      <div className="rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3D]">
            Requests queue
          </h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-2 text-xs font-semibold text-[#0B1F3D] outline-none"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="">All</option>
          </select>
        </div>

        {requestsQuery.isLoading ? (
          <ThemeLoader label="Loading requests…" className="py-8" />
        ) : requestsQuery.isError ? (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
            <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Failed to load organization requests.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#C4EBF2] text-xs uppercase tracking-wider text-[#557393]">
                  <th className="py-2 pr-4 font-bold">Name</th>
                  <th className="py-2 pr-4 font-bold">Domain</th>
                  <th className="py-2 pr-4 font-bold">Industry</th>
                  <th className="py-2 pr-4 font-bold">Type</th>
                  <th className="py-2 pr-4 font-bold">Status</th>
                  <th className="py-2 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(requestsQuery.data ?? []).map((req) => {
                  const industry = Array.isArray(req.industry)
                    ? req.industry[0]
                    : req.industry;
                  const busy = actingId === req.id || actingId === req.resulting_organization_id;
                  return (
                    <tr key={req.id} className="border-b border-[#F0FAFC]">
                      <td className="py-3 pr-4 font-semibold text-[#0B1F3D]">
                        {req.requested_name}
                      </td>
                      <td className="py-3 pr-4 text-[#557393]">
                        {req.requested_domain ?? "—"}
                      </td>
                      <td className="py-3 pr-4 text-[#557393]">
                        {industry?.name ?? "—"}
                      </td>
                      <td className="py-3 pr-4 text-[#557393]">
                        {req.requested_workspace_type}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            req.status === "approved"
                              ? "bg-emerald-50 text-emerald-700"
                              : req.status === "rejected"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3">
                        {req.status === "pending" ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleApprove(req.id)}
                              className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                            >
                              <CheckIcon className="h-3.5 w-3.5" />
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleReject(req.id)}
                              className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                            >
                              Reject
                            </button>
                            {req.resulting_organization_id &&
                            req.requested_domain ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  handleAdminVerifyDomain(
                                    req.resulting_organization_id,
                                    req.requested_domain
                                  )
                                }
                                className="rounded-xl border border-[#C4EBF2] px-3 py-1.5 text-xs font-bold text-[#0B1F3D] hover:bg-[#F0FAFC] disabled:opacity-60"
                              >
                                Verify domain
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-[#557393]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {(requestsQuery.data ?? []).length === 0 ? (
              <p className="pt-3 text-sm text-[#557393]">
                No {statusFilter || ""} requests.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
