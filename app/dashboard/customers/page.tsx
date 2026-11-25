"use client";

import {
  FormEvent,
  Fragment,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  useCreateCustomer,
  useCustomers,
  useDeleteCustomer,
} from "@/hooks/cards";
import {
  useCreateCustomerMilestone,
  useCustomerMilestones,
  useDeleteCustomerMilestone,
} from "@/hooks/campaigns";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { RefetchButton } from "@/components/ui/RefetchButton";
import { SparklesIcon, TrashIcon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { ApiClientError, apiClient } from "@/lib/api/client";
import type { Customer, CustomerMilestone } from "@/lib/types/cards";
import { StartCampaignDialog } from "@/components/dashboard/campaigns/StartCampaignDialog";

const EMPTY = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  province_or_state: "",
  postal_or_zip: "",
  country_code: "US",
  property_address: "",
  birthday: "",
  closing_date: "",
  property_type: "",
  custom_property_type: "",
};

const PROPERTY_TYPES = [
  "",
  "Single family",
  "Condo",
  "Townhouse",
  "Multi-family",
  "Land",
  "Other",
];

function CustomerMilestonesPanel({ customer }: { customer: Customer }) {
  const { showToast } = useToast();
  const { data: milestones, isLoading, refetch } = useCustomerMilestones(
    customer.id
  );
  const createMilestone = useCreateCustomerMilestone(customer.id);
  const deleteMilestone = useDeleteCustomerMilestone(customer.id);

  const [customDate, setCustomDate] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [customPropertyType, setCustomPropertyType] = useState("");
  const [customOtherPropertyType, setCustomOtherPropertyType] = useState("");

  const birthday = useMemo(
    () => milestones?.find((m) => m.milestone_type === "birthday"),
    [milestones]
  );
  const closing = useMemo(
    () =>
      milestones?.find((m) => m.milestone_type === "closing_anniversary") ??
      milestones?.find((m) => m.milestone_type === "home_anniversary"),
    [milestones]
  );
  const customs = useMemo(
    () => (milestones ?? []).filter((m) => m.milestone_type === "custom"),
    [milestones]
  );

  return (
    <div className="space-y-3 border-t border-[#EEF6F8] bg-[#F8FCFD] px-4 py-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-[#557393]">
          Milestones
        </p>
        <RefetchButton onClick={() => refetch()} isRefreshing={false} />
      </div>

      {isLoading ? (
        <ThemeLoader label="Loading milestones…" size="sm" />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-[#C4EBF2] bg-white px-3 py-2">
            <p className="text-[11px] font-bold uppercase text-[#557393]">
              Birthday
            </p>
            <p className="mt-0.5 font-semibold text-[#0B1F3D]">
              {birthday?.anchor_date ?? "Not set"}
            </p>
          </div>
          <div className="rounded-xl border border-[#C4EBF2] bg-white px-3 py-2">
            <p className="text-[11px] font-bold uppercase text-[#557393]">
              Closing / home anniversary
            </p>
            <p className="mt-0.5 font-semibold text-[#0B1F3D]">
              {closing?.anchor_date ?? "Not set"}
            </p>
            {closing?.property_type ? (
              <p className="text-xs text-[#557393]">{closing.property_type}</p>
            ) : null}
            {customer.property_address ? (
              <p className="text-xs text-[#557393]">
                Property: {customer.property_address}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {customs.length > 0 ? (
        <ul className="space-y-1">
          {customs.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-xl border border-[#C4EBF2] bg-white px-3 py-2"
            >
              <div>
                <p className="font-semibold text-[#0B1F3D]">
                  {m.label || "Custom"}
                </p>
                <p className="text-xs text-[#557393]">
                  {m.anchor_date}
                  {m.property_type ? ` · ${m.property_type}` : ""}
                  {m.recurs_annually ? " · annual" : " · one-time"}
                </p>
              </div>
              <button
                type="button"
                className="text-xs font-bold text-rose-500"
                disabled={deleteMilestone.isPending}
                onClick={async () => {
                  try {
                    await deleteMilestone.mutateAsync(m.id);
                    showToast({ tone: "success", title: "Milestone removed" });
                  } catch (err) {
                    showToast({
                      tone: "error",
                      title: "Could not remove milestone",
                      description:
                        err instanceof ApiClientError
                          ? err.message
                          : "Please try again.",
                    });
                  }
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <form
        className="grid gap-2 rounded-xl border border-dashed border-[#C4EBF2] bg-white p-3 sm:grid-cols-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!customDate || !customLabel.trim()) {
            showToast({
              tone: "error",
              title: "Custom milestone needs a label and date",
            });
            return;
          }
          const finalPropType =
            customPropertyType === "Other"
              ? customOtherPropertyType.trim()
              : customPropertyType;
          try {
            await createMilestone.mutateAsync({
              milestone_type: "custom",
              anchor_date: customDate,
              label: customLabel.trim(),
              property_type: finalPropType || "",
              recurs_annually: true,
            });
            setCustomDate("");
            setCustomLabel("");
            setCustomPropertyType("");
            setCustomOtherPropertyType("");
            showToast({ tone: "success", title: "Custom milestone added" });
          } catch (err) {
            showToast({
              tone: "error",
              title: "Could not add milestone",
              description:
                err instanceof ApiClientError
                  ? err.message
                  : "Please try again.",
            });
          }
        }}
      >
        <input
          type="text"
          placeholder="Custom label"
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          className="rounded-lg border border-[#C4EBF2] bg-[#F0FAFC] px-2 py-2 text-xs text-[#0B1F3D] outline-none focus:border-[#38B2D1] sm:col-span-1"
        />
        <input
          type="date"
          value={customDate}
          onChange={(e) => setCustomDate(e.target.value)}
          className="rounded-lg border border-[#C4EBF2] bg-[#F0FAFC] px-2 py-2 text-xs text-[#0B1F3D] outline-none focus:border-[#38B2D1]"
        />
        <select
          value={customPropertyType}
          onChange={(e) => {
            setCustomPropertyType(e.target.value);
            if (e.target.value !== "Other") {
              setCustomOtherPropertyType("");
            }
          }}
          className="rounded-lg border border-[#C4EBF2] bg-[#F0FAFC] px-2 py-2 text-xs text-[#0B1F3D] outline-none focus:border-[#38B2D1]"
        >
          {PROPERTY_TYPES.map((t) => (
            <option key={t || "none"} value={t}>
              {t || "Property type (optional)"}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={createMilestone.isPending}
          className="rounded-lg bg-[#38B2D1] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          Add custom date
        </button>
        {customPropertyType === "Other" ? (
          <input
            type="text"
            placeholder="Specify custom property type"
            value={customOtherPropertyType}
            onChange={(e) => setCustomOtherPropertyType(e.target.value)}
            className="rounded-lg border border-[#C4EBF2] bg-[#F0FAFC] px-2 py-2 text-xs text-[#0B1F3D] outline-none focus:border-[#38B2D1] sm:col-span-4"
          />
        ) : null}
      </form>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16">
          <ThemeLoader label="Loading…" size="lg" />
        </div>
      }
    >
      <CustomersPageContent />
    </Suspense>
  );
}

function CustomersPageContent() {
  const searchParams = useSearchParams();
  const { data: customers, isLoading, error, refetch, isFetching } =
    useCustomers();
  const createCustomer = useCreateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [startCampaignOpen, setStartCampaignOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setOpen(true);
    }
    if (searchParams.get("start") === "1") {
      setStartCampaignOpen(true);
    }
  }, [searchParams]);

  const saveCustomer = async () => {
    const {
      birthday,
      closing_date,
      property_type,
      custom_property_type,
      ...customerFields
    } = form;

    const trimmedBirthday = birthday.trim();
    const trimmedClosingDate = closing_date.trim();
    const finalPropertyType =
      property_type === "Other"
        ? custom_property_type.trim()
        : property_type.trim();

    if (!trimmedBirthday) {
      throw new Error("Birthday is required");
    }
    if (!trimmedClosingDate) {
      throw new Error("Property closing date is required");
    }
    if (!finalPropertyType) {
      throw new Error(
        property_type === "Other"
          ? "Please specify the custom property type"
          : "Property type is required"
      );
    }

    const result = await createCustomer.mutateAsync(customerFields);
    const customerId = result.customer.id;

    const milestonePosts: Promise<unknown>[] = [
      apiClient<{ milestone: CustomerMilestone }>(
        `/api/customers/${customerId}/milestones`,
        {
          method: "POST",
          body: {
            milestone_type: "birthday",
            anchor_date: trimmedBirthday,
            recurs_annually: true,
          },
        }
      ),
      apiClient<{ milestone: CustomerMilestone }>(
        `/api/customers/${customerId}/milestones`,
        {
          method: "POST",
          body: {
            milestone_type: "closing_anniversary",
            anchor_date: trimmedClosingDate,
            property_type: finalPropertyType,
            recurs_annually: true,
          },
        }
      ),
      apiClient<{ milestone: CustomerMilestone }>(
        `/api/customers/${customerId}/milestones`,
        {
          method: "POST",
          body: {
            milestone_type: "home_anniversary",
            anchor_date: trimmedClosingDate,
            property_type: finalPropertyType,
            recurs_annually: true,
          },
        }
      ).catch(() => undefined),
    ];

    await Promise.all(milestonePosts);
    return { birthday: trimmedBirthday, closing_date: trimmedClosingDate };
  };

  const onSubmit = async (
    e: FormEvent,
    options?: { startCampaign?: boolean }
  ) => {
    e.preventDefault();
    try {
      const { birthday, closing_date } = await saveCustomer();
      setForm(EMPTY);
      setOpen(false);
      showToast({
        tone: "success",
        title: "Customer saved",
        description: "Milestones were stored for campaign occasions.",
      });
      if (options?.startCampaign) {
        setStartCampaignOpen(true);
      }
    } catch (err) {
      showToast({
        tone: "error",
        title: "Could not save customer",
        description:
          err instanceof ApiClientError || err instanceof Error
            ? err.message
            : "Please try again.",
      });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B1F3D]">Customers</h1>
          <p className="mt-1 text-sm text-[#557393]">
            Recipients for personalized greeting cards, with optional birthday
            and property milestones.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RefetchButton
            onClick={() => refetch()}
            isRefreshing={isFetching && !isLoading}
          />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-xl border border-[#C4EBF2] bg-white px-4 py-2.5 text-xs font-bold text-[#0B1F3D] transition hover:bg-[#F8FBFC]"
          >
            {open ? "Close form" : "Add customer"}
          </button>
          <button
            type="button"
            onClick={() => setStartCampaignOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#38B2D1] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#2ca0be]"
          >
            <SparklesIcon className="h-4 w-4" />
            Start Campaign
          </button>
        </div>
      </div>

      {open ? (
        <form
          onSubmit={(e) => onSubmit(e)}
          className="grid gap-3 rounded-3xl border border-[#C4EBF2] bg-white p-5 sm:grid-cols-2"
        >
          {(
            [
              ["first_name", "First name"],
              ["last_name", "Last name"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["address_line1", "Address line 1"],
              ["address_line2", "Address line 2"],
              ["city", "City"],
              ["province_or_state", "State / Province"],
              ["postal_or_zip", "Postal / ZIP"],
              ["country_code", "Country code"],
              ["property_address", "Property address"],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className={`space-y-1 text-xs font-semibold text-[#557393] ${
                key === "property_address" ? "sm:col-span-2" : ""
              }`}
            >
              <span>{label}</span>
              <input
                value={form[key]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [key]: e.target.value }))
                }
                required={
                  key !== "email" &&
                  key !== "phone" &&
                  key !== "address_line2"
                }
                className="w-full rounded-xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-2 text-sm text-[#0B1F3D] outline-none focus:border-[#38B2D1] focus:bg-white"
              />
            </label>
          ))}

          <label className="space-y-1 text-xs font-semibold text-[#557393]">
            <span>Birthday</span>
            <input
              type="date"
              required
              value={form.birthday}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, birthday: e.target.value }))
              }
              className="w-full rounded-xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-2 text-sm text-[#0B1F3D] outline-none focus:border-[#38B2D1] focus:bg-white"
            />
          </label>
          <label className="space-y-1 text-xs font-semibold text-[#557393]">
            <span>Property closing date</span>
            <input
              type="date"
              required
              value={form.closing_date}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, closing_date: e.target.value }))
              }
              className="w-full rounded-xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-2 text-sm text-[#0B1F3D] outline-none focus:border-[#38B2D1] focus:bg-white"
            />
          </label>
          <label className="space-y-1 text-xs font-semibold text-[#557393] sm:col-span-2">
            <span>Property type</span>
            <select
              required
              value={form.property_type}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  property_type: e.target.value,
                  custom_property_type:
                    e.target.value === "Other" ? prev.custom_property_type : "",
                }))
              }
              className="w-full rounded-xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-2 text-sm text-[#0B1F3D] outline-none focus:border-[#38B2D1] focus:bg-white"
            >
              <option value="" disabled>
                Select property type
              </option>
              {PROPERTY_TYPES.filter(Boolean).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          {form.property_type === "Other" ? (
            <label className="space-y-1 text-xs font-semibold text-[#557393] sm:col-span-2">
              <span>Specify property type</span>
              <input
                type="text"
                required
                placeholder="Enter property type (e.g. Duplex, Mobile Home, Villa)"
                value={form.custom_property_type}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    custom_property_type: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-2 text-sm text-[#0B1F3D] outline-none focus:border-[#38B2D1] focus:bg-white"
              />
            </label>
          ) : null}

          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={createCustomer.isPending}
              className="rounded-xl border border-[#C4EBF2] bg-white px-4 py-2.5 text-xs font-bold text-[#0B1F3D] transition hover:bg-[#F8FBFC] disabled:opacity-60"
            >
              {createCustomer.isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={createCustomer.isPending}
              onClick={(e) => onSubmit(e, { startCampaign: true })}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#38B2D1] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#2ca0be] disabled:opacity-60"
            >
              <SparklesIcon className="h-3.5 w-3.5" />
              {createCustomer.isPending
                ? "Saving…"
                : "Save and Start Campaign"}
            </button>
          </div>
        </form>
      ) : null}

      {isLoading ? (
        <div className="py-16">
          <ThemeLoader label="Loading customers…" size="lg" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error instanceof ApiClientError
            ? error.message
            : "Failed to load customers"}
        </div>
      ) : (customers ?? []).length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#C4EBF2] bg-white p-10 text-center text-sm text-[#557393]">
          No customers yet. Add a recipient to send your first card.
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-[#C4EBF2] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#C4EBF2] bg-[#F0FAFC] text-[11px] uppercase tracking-wider text-[#557393]">
              <tr>
                <th className="px-4 py-3 font-bold">Name</th>
                <th className="px-4 py-3 font-bold">Address</th>
                <th className="px-4 py-3 font-bold">Contact</th>
                <th className="px-4 py-3 font-bold" />
              </tr>
            </thead>
            <tbody>
              {(customers ?? []).map((c) => (
                <Fragment key={c.id}>
                  <tr className="border-b border-[#EEF6F8] last:border-0">
                    <td className="px-4 py-3 font-bold text-[#0B1F3D]">
                      <button
                        type="button"
                        className="text-left hover:text-[#38B2D1]"
                        onClick={() =>
                          setExpandedId((id) => (id === c.id ? null : c.id))
                        }
                      >
                        {c.first_name} {c.last_name}
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-[#557393]">
                          {expandedId === c.id ? "Hide" : "Milestones"}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[#557393]">
                      <div>
                        {c.address_line1}, {c.city}, {c.province_or_state}{" "}
                        {c.postal_or_zip}
                      </div>
                      {c.property_address ? (
                        <div className="mt-0.5 text-xs text-[#8A9EA8]">
                          Property: {c.property_address}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-[#557393]">
                      {c.email || c.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        title="Delete customer"
                        aria-label={`Delete ${c.first_name} ${c.last_name}`}
                        disabled={deleteCustomer.isPending}
                        className="inline-grid h-9 w-9 place-items-center rounded-xl border border-rose-200 bg-white text-rose-500 transition hover:bg-rose-50 disabled:opacity-60"
                        onClick={async () => {
                          const confirmed = window.confirm(
                            `Delete ${c.first_name} ${c.last_name}?`
                          );
                          if (!confirmed) return;
                          try {
                            await deleteCustomer.mutateAsync(c.id);
                            showToast({
                              tone: "success",
                              title: "Customer deleted",
                            });
                          } catch (err) {
                            showToast({
                              tone: "error",
                              title: "Delete failed",
                              description:
                                err instanceof ApiClientError
                                  ? err.message
                                  : "Customer may be linked to a card.",
                            });
                          }
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                  {expandedId === c.id ? (
                    <tr>
                      <td colSpan={4} className="p-0">
                        <CustomerMilestonesPanel customer={c} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <StartCampaignDialog
        open={startCampaignOpen}
        onClose={() => setStartCampaignOpen(false)}
      />
    </div>
  );
}
