"use client";

import { FormEvent, useState } from "react";
import {
  useCreateCustomer,
  useCustomers,
  useDeleteCustomer,
} from "@/hooks/cards";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { RefetchButton } from "@/components/ui/RefetchButton";
import { TrashIcon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { ApiClientError } from "@/lib/api/client";

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
};

export default function CustomersPage() {
  const { data: customers, isLoading, error, refetch, isFetching } = useCustomers();
  const createCustomer = useCreateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createCustomer.mutateAsync(form);
      setForm(EMPTY);
      setOpen(false);
      showToast({
        tone: "success",
        title: "Customer saved",
      });
    } catch (err) {
      showToast({
        tone: "error",
        title: "Could not save customer",
        description:
          err instanceof ApiClientError ? err.message : "Please try again.",
      });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B1F3D]">Customers</h1>
          <p className="mt-1 text-sm text-[#557393]">
            Recipients for personalized greeting cards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefetchButton
            onClick={() => refetch()}
            isRefreshing={isFetching && !isLoading}
          />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-xl bg-[#38B2D1] px-4 py-2.5 text-xs font-bold text-white"
          >
            {open ? "Close form" : "Add customer"}
          </button>
        </div>
      </div>

      {open ? (
        <form
          onSubmit={onSubmit}
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
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="space-y-1 text-xs font-semibold text-[#557393]">
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
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={createCustomer.isPending}
              className="rounded-xl bg-[#0B1F3D] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
            >
              {createCustomer.isPending ? "Saving…" : "Save customer"}
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
                <tr
                  key={c.id}
                  className="border-b border-[#EEF6F8] last:border-0"
                >
                  <td className="px-4 py-3 font-bold text-[#0B1F3D]">
                    {c.first_name} {c.last_name}
                  </td>
                  <td className="px-4 py-3 text-[#557393]">
                    {c.address_line1}, {c.city}, {c.province_or_state}{" "}
                    {c.postal_or_zip}
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
