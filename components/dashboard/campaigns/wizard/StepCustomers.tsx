"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { customerKeys } from "@/hooks/cards/keys";
import { useAuthStore } from "@/stores/auth-store";
import { useCampaignWizardStore } from "@/stores/campaign-wizard-store";
import {
  customerHasAddress,
  fieldLabelClass,
  textInputClass,
} from "@/components/dashboard/campaigns/shared";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import type { Customer, CustomerMilestone } from "@/lib/types/cards";

export function StepCustomers() {
  const organizationId = useAuthStore((s) => s.activeOrganizationId);
  const customerIds = useCampaignWizardStore((s) => s.customerIds);
  const toggleCustomer = useCampaignWizardStore((s) => s.toggleCustomer);
  const setCustomerIds = useCampaignWizardStore((s) => s.setCustomerIds);
  const selectAllEligible = useCampaignWizardStore((s) => s.selectAllEligible);
  const setSelectAllEligible = useCampaignWizardStore(
    (s) => s.setSelectAllEligible
  );
  const [query, setQuery] = useState("");

  const { data: customers, isLoading } = useQuery({
    queryKey: customerKeys.list(organizationId),
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const data = await apiClient<{ customers: Customer[] }>("/api/customers");
      return data.customers;
    },
  });

  const { data: milestoneMap } = useQuery({
    queryKey: [...customerKeys.all, "bulk-milestones", organizationId],
    enabled: Boolean(organizationId) && Boolean(customers?.length),
    queryFn: async () => {
      const map = new Map<string, CustomerMilestone[]>();
      await Promise.all(
        (customers ?? []).slice(0, 200).map(async (c) => {
          try {
            const data = await apiClient<{ milestones: CustomerMilestone[] }>(
              `/api/customers/${c.id}/milestones`
            );
            map.set(c.id, data.milestones);
          } catch {
            map.set(c.id, []);
          }
        })
      );
      return map;
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (customers ?? []).filter((c) => {
      if (!q) return true;
      const hay = `${c.first_name} ${c.last_name} ${c.email ?? ""} ${c.city}`.toLowerCase();
      return hay.includes(q);
    });
  }, [customers, query]);

  const eligibleIds = useMemo(
    () =>
      (customers ?? [])
        .filter((c) => customerHasAddress(c))
        .map((c) => c.id),
    [customers]
  );

  const selectAll = () => {
    setSelectAllEligible(true);
    setCustomerIds(eligibleIds);
  };

  if (isLoading) {
    return (
      <div className="grid min-h-[180px] place-items-center">
        <ThemeLoader label="Loading customers…" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <label className={fieldLabelClass} htmlFor="customer-search">
            Search customers
          </label>
          <input
            id="customer-search"
            className={textInputClass}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, email, or city"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2 text-xs font-bold text-[#0B1F3D] hover:bg-[#F0FAFC]"
          >
            Select all eligible ({eligibleIds.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectAllEligible(false);
              setCustomerIds([]);
            }}
            className="rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2 text-xs font-bold text-[#557393] hover:bg-[#F0FAFC]"
          >
            Clear
          </button>
        </div>
      </div>

      {selectAllEligible ? (
        <p className="text-xs font-medium text-[#38B2D1]">
          All eligible customers selected ({customerIds.length}).
        </p>
      ) : (
        <p className="text-xs text-[#557393]">
          {customerIds.length} selected
        </p>
      )}

      <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-2xl border border-[#C4EBF2] p-2">
        {filtered.map((customer) => {
          const checked = customerIds.includes(customer.id);
          const hasAddress = customerHasAddress(customer);
          const milestones = milestoneMap?.get(customer.id) ?? [];
          const hasBirthday = milestones.some(
            (m) => m.milestone_type === "birthday" && m.is_active
          );
          const hasClosing = milestones.some(
            (m) =>
              (m.milestone_type === "closing_anniversary" ||
                m.milestone_type === "home_anniversary") &&
              m.is_active
          );

          return (
            <label
              key={customer.id}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2.5 ${
                checked
                  ? "border-[#38B2D1] bg-[#F0FAFC]"
                  : "border-transparent hover:bg-[#F0FAFC]/70"
              }`}
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[#38B2D1]"
                checked={checked}
                onChange={() => toggleCustomer(customer.id)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#0B1F3D]">
                  {customer.first_name} {customer.last_name}
                </p>
                <p className="truncate text-xs text-[#557393]">
                  {[customer.city, customer.province_or_state]
                    .filter(Boolean)
                    .join(", ") || "No city"}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {!hasAddress ? (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700">
                      Missing address
                    </span>
                  ) : null}
                  {!hasBirthday ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                      No birthday
                    </span>
                  ) : null}
                  {!hasClosing ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                      No closing date
                    </span>
                  ) : null}
                </div>
              </div>
            </label>
          );
        })}
        {!filtered.length ? (
          <p className="p-4 text-center text-sm text-[#557393]">
            No customers match this search.
          </p>
        ) : null}
      </div>
    </div>
  );
}
