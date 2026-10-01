"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import {
  useCreateCard,
  useCreateCustomer,
  useCustomers,
  useTemplate,
  useUpdateCard,
} from "@/hooks/cards";
import { useAuthStore } from "@/stores/auth-store";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { RefetchButton } from "@/components/ui/RefetchButton";
import { useToast } from "@/components/ui/Toast";
import { ApiClientError } from "@/lib/api/client";

function NewCardForm() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get("templateId");
  const router = useRouter();
  const { showToast } = useToast();

  const { data: template, isLoading: templateLoading, refetch: refetchTemplate, isFetching: fetchingTemplate } = useTemplate(templateId);
  const { data: customers, isLoading: customersLoading, refetch: refetchCustomers, isFetching: fetchingCustomers } = useCustomers();
  const createCustomer = useCreateCustomer();
  const createCard = useCreateCard();
  const updateCard = useUpdateCard();

  const profile = useAuthStore((s) => s.profile);
  const membership = useAuthStore((s) => s.membership);
  const activeOrganizationId = useAuthStore((s) => s.activeOrganizationId);

  const defaultSender = useMemo(() => {
    const name = [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    return name || membership?.organization?.name || "";
  }, [profile, membership]);

  const [customerId, setCustomerId] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [senderName, setSenderName] = useState("");
  const [newCustomer, setNewCustomer] = useState({
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
  });

  useEffect(() => {
    if (defaultSender && !senderName) setSenderName(defaultSender);
  }, [defaultSender, senderName]);

  useEffect(() => {
    setCustomerId("");
    setCustomerName("");
    setShowNewCustomer(false);
  }, [activeOrganizationId]);

  useEffect(() => {
    if (!customerId || !customers) return;
    const selected = customers.find((c) => c.id === customerId);
    if (selected) {
      setCustomerName(`${selected.first_name} ${selected.last_name}`.trim());
    }
  }, [customerId, customers]);

  if (!templateId) {
    return (
      <div className="rounded-3xl border border-[#C4EBF2] bg-white p-8 text-center">
        <p className="text-sm font-semibold text-[#0B1F3D]">
          Select a template first
        </p>
        <Link
          href="/dashboard/templates"
          className="mt-3 inline-block text-xs font-bold text-[#38B2D1]"
        >
          Browse templates
        </Link>
      </div>
    );
  }

  if (templateLoading || customersLoading) {
    return (
      <div className="py-16">
        <ThemeLoader label="Loading customization…" size="lg" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Template not found.
      </div>
    );
  }

  const handleCreateCustomer = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const result = await createCustomer.mutateAsync(newCustomer);
      setCustomerId(result.customer.id);
      setCustomerName(
        `${result.customer.first_name} ${result.customer.last_name}`.trim()
      );
      setShowNewCustomer(false);
      showToast({
        tone: "success",
        title: "Customer added",
        description: "You can now personalize and save the card.",
      });
    } catch (error) {
      showToast({
        tone: "error",
        title: "Could not add customer",
        description:
          error instanceof ApiClientError
            ? error.message
            : "Please check the address fields.",
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      showToast({
        tone: "error",
        title: "Recipient required",
        description: "Select or create a customer first.",
      });
      return;
    }

    try {
      const created = await createCard.mutateAsync({
        template_id: template.id,
        customer_id: customerId,
        field_values: {
          customer_name: customerName,
          personal_message: personalMessage,
          sender_name: senderName,
        },
      });

      await updateCard.mutateAsync({
        id: created.card.id,
        field_values: {
          customer_name: customerName,
          personal_message: personalMessage,
          sender_name: senderName,
        },
      });

      router.push(`/dashboard/cards/${created.card.id}`);
    } catch (error) {
      showToast({
        tone: "error",
        title: "Could not save card",
        description:
          error instanceof ApiClientError
            ? error.message
            : "Please try again.",
      });
    }
  };

  const previewMessage =
    personalMessage ||
    "Wishing you a wonderful day filled with joy and gratitude.";

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-3xl border border-[#C4EBF2] bg-white p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#38B2D1]">
              Customize
            </div>
            <h1 className="mt-1 text-2xl font-extrabold text-[#0B1F3D]">
              {template.name}
            </h1>
            <p className="mt-1 text-sm text-[#557393]">
              Only approved fields are editable — designs stay professionally locked.
              Uploading a custom card design is not available in this version.
            </p>
          </div>
          <RefetchButton
            onClick={() => {
              void refetchTemplate();
              void refetchCustomers();
            }}
            isRefreshing={
              (fetchingTemplate || fetchingCustomers) &&
              !(templateLoading || customersLoading)
            }
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-[#0B1F3D]">Recipient</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-2.5 text-sm outline-none focus:border-[#38B2D1] focus:bg-white"
          >
            <option value="">Select a customer…</option>
            {(customers ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name} — {c.city}, {c.province_or_state}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowNewCustomer((v) => !v)}
            className="text-xs font-bold text-[#38B2D1] hover:underline"
          >
            {showNewCustomer ? "Hide new customer form" : "+ Add new customer"}
          </button>
        </div>

        {showNewCustomer ? (
          <div className="space-y-3 rounded-2xl border border-[#C4EBF2] bg-[#F8FCFD] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
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
                    value={newCustomer[key]}
                    onChange={(e) =>
                      setNewCustomer((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[#C4EBF2] bg-white px-3 py-2 text-sm text-[#0B1F3D] outline-none focus:border-[#38B2D1]"
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={handleCreateCustomer}
              disabled={createCustomer.isPending}
              className="rounded-xl bg-[#0B1F3D] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              {createCustomer.isPending ? "Saving…" : "Save customer"}
            </button>
          </div>
        ) : null}

        <label className="block space-y-1">
          <span className="text-xs font-bold text-[#0B1F3D]">Customer name on card</span>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-2.5 text-sm outline-none focus:border-[#38B2D1] focus:bg-white"
            placeholder="John Smith"
            required
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-bold text-[#0B1F3D]">Personal message</span>
          <textarea
            value={personalMessage}
            onChange={(e) => setPersonalMessage(e.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-2.5 text-sm outline-none focus:border-[#38B2D1] focus:bg-white"
            placeholder="Happy birthday! Thinking of you…"
            required
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-bold text-[#0B1F3D]">Sender name</span>
          <input
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-2.5 text-sm outline-none focus:border-[#38B2D1] focus:bg-white"
            required
          />
        </label>

        <button
          type="submit"
          disabled={createCard.isPending || updateCard.isPending}
          className="w-full rounded-2xl bg-[#38B2D1] py-3 text-sm font-bold text-white shadow-md shadow-[#38B2D1]/25 hover:bg-[#2ca0be] disabled:opacity-60"
        >
          {createCard.isPending || updateCard.isPending
            ? "Saving draft…"
            : "Save draft & continue"}
        </button>
      </form>

      <div className="space-y-4">
        <div className="overflow-hidden rounded-3xl border border-[#C4EBF2] bg-white shadow-sm">
          <div className="border-b border-[#C4EBF2] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#557393]">
            Live preview
          </div>
          <div className="relative aspect-[3/2] overflow-hidden bg-[#F0FAFC]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={template.front_background_url}
              alt="Front preview"
              className="h-full w-full object-cover"
            />
            {/* Editable fields only — leave the template headline area clear */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[48%] flex flex-col justify-end">
              <div className="bg-gradient-to-t from-black/55 via-black/35 to-transparent px-6 pb-5 pt-10 text-center sm:px-8 sm:pb-6">
                <p className="text-base font-extrabold leading-snug text-white drop-shadow-sm sm:text-xl">
                  {customerName || "Friend"}
                </p>
                <p className="mx-auto mt-2.5 max-w-sm text-[11px] leading-relaxed text-white/95 drop-shadow-sm sm:mt-3 sm:text-sm line-clamp-4">
                  {previewMessage}
                </p>
                <p className="mt-3 text-[11px] font-semibold tracking-wide text-white/90 sm:mt-4">
                  — {senderName || "Sender"}
                </p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-[#557393]">
          Preview shows your editable fields only. Final print artwork (with QR)
          is generated on the next step. Designs are platform-curated — custom
          design uploads are not available in this version.
        </p>
      </div>
    </div>
  );
}

export default function NewCardPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16">
          <ThemeLoader label="Loading…" size="lg" />
        </div>
      }
    >
      <NewCardForm />
    </Suspense>
  );
}
