"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

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

const TEMPLATE_EYEBROWS: Record<
  string,
  {
    eyebrow: string;
    h1: string;
    h2: string;
    footerNote: string;
    accentColor: string;
  }
> = {
  "welcome-home": {
    eyebrow: "Welcome to your",
    h1: "Welcome",
    h2: "Home",
    footerNote: "WISHING YOU MANY HAPPY MEMORIES AHEAD.",
    accentColor: "#38B2D1",
  },

  "birthday-classic": {
    eyebrow: "Wishing you a",
    h1: "Happy",
    h2: "Birthday",
    footerNote: "THANK YOU FOR BEING A VALUED CLIENT.",
    accentColor: "#38B2D1",
  },

  "thank-you-warm": {
    eyebrow: "With gratitude",
    h1: "Thank",
    h2: "You",
    footerNote: "YOUR TRUST MEANS EVERYTHING TO US.",
    accentColor: "#34A99C",
  },

  "home-anniversary": {
    eyebrow: "Celebrating your",
    h1: "Home",
    h2: "Anniversary",
    footerNote: "ONE MORE YEAR OF MAKING MEMORIES.",
    accentColor: "#E8A838",
  },

  "holiday-greetings": {
    eyebrow: "Season's greetings",
    h1: "Warm",
    h2: "Wishes",
    footerNote: "MAY THIS SEASON BRING YOU JOY & PEACE.",
    accentColor: "#3B7DD8",
  },

  congratulations: {
    eyebrow: "Celebrating you",
    h1: "Warmest",
    h2: "Congratulations!",
    footerNote: "YOUR HARD WORK HAS PAID OFF.",
    accentColor: "#C49A2A",
  },
};

function NewCardForm() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get("templateId");

  const router = useRouter();
  const { showToast } = useToast();

  const {
    data: template,
    isLoading: templateLoading,
    refetch: refetchTemplate,
    isFetching: fetchingTemplate,
  } = useTemplate(templateId);

  const {
    data: customers,
    isLoading: customersLoading,
    refetch: refetchCustomers,
    isFetching: fetchingCustomers,
  } = useCustomers();

  const createCustomer = useCreateCustomer();
  const createCard = useCreateCard();
  const updateCard = useUpdateCard();

  const profile = useAuthStore((s) => s.profile);
  const membership = useAuthStore((s) => s.membership);

  const activeOrganizationId = useAuthStore(
    (s) => s.activeOrganizationId
  );

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
  const [senderTitle, setSenderTitle] = useState("REALTOR®");

  const [phone, setPhone] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [website, setWebsite] = useState("");

  const [footerNote, setFooterNote] = useState("");

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
    if (defaultSender && !senderName) {
      setSenderName(defaultSender);
    }
  }, [defaultSender, senderName]);

  useEffect(() => {
    setCustomerId("");
    setCustomerName("");
    setShowNewCustomer(false);
  }, [activeOrganizationId]);

  useEffect(() => {
    if (!customerId || !customers) return;

    const selected = customers.find(
      (customer) => customer.id === customerId
    );

    if (selected) {
      setCustomerName(
        `${selected.first_name} ${selected.last_name}`.trim()
      );
    }
  }, [customerId, customers]);

  // Populate footer note from template slug defaults
  useEffect(() => {
    if (!template) return;

    const meta = TEMPLATE_EYEBROWS[template.slug];

    if (meta && !footerNote) {
      setFooterNote(meta.footerNote);
    }
  }, [template, footerNote]);

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
        <ThemeLoader
          label="Loading customization…"
          size="lg"
        />
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

  const templateMeta = TEMPLATE_EYEBROWS[template.slug] ?? {
    eyebrow: "FOR YOU",
    footerNote: "",
    accentColor: "#38B2D1",
  };

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
        description:
          "You can now personalize and save the card.",
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
      const fieldValues = {
        customer_name: customerName,
        personal_message: personalMessage,
        sender_name: senderName,
        sender_title: senderTitle,
        phone,
        email_address: emailAddress,
        website,
        footer_note: footerNote,
      };

      const created = await createCard.mutateAsync({
        template_id: template.id,
        customer_id: customerId,
        field_values: fieldValues,
      });

      await updateCard.mutateAsync({
        id: created.card.id,
        field_values: fieldValues,
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
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-6xl space-y-6"
    >
      <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_0.9fr]">

        <section className="space-y-5 rounded-3xl border border-[#C4EBF2] bg-white p-5 sm:p-6">

          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#38B2D1]">
                Customize
              </div>

              <h1 className="mt-1 text-2xl font-extrabold text-[#0B1F3D]">
                {template.name}
              </h1>

              <p className="mt-1 text-sm text-[#557393]">
                Only approved fields are editable — designs stay
                professionally locked.
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
            <label
              htmlFor="recipient"
              className="text-xs font-bold text-[#0B1F3D]"
            >
              Recipient
            </label>

            <select
              id="recipient"
              value={customerId}
              onChange={(e) =>
                setCustomerId(e.target.value)
              }
              className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-2.5 text-sm outline-none transition focus:border-[#38B2D1] focus:bg-white"
            >
              <option value="">
                Select a customer…
              </option>

              {(customers ?? []).map((customer) => (
                <option
                  key={customer.id}
                  value={customer.id}
                >
                  {customer.first_name}{" "}
                  {customer.last_name} —{" "}
                  {customer.city},{" "}
                  {customer.province_or_state}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() =>
                setShowNewCustomer(
                  (previous) => !previous
                )
              }
              className="text-xs font-bold text-[#38B2D1] hover:underline"
            >
              {showNewCustomer
                ? "Hide new customer form"
                : "+ Add new customer"}
            </button>
          </div>

          {showNewCustomer && (
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
                    [
                      "province_or_state",
                      "State / Province",
                    ],
                    [
                      "postal_or_zip",
                      "Postal / ZIP",
                    ],
                    [
                      "country_code",
                      "Country code",
                    ],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="space-y-1 text-xs font-semibold text-[#557393]"
                  >
                    <span>{label}</span>

                    <input
                      value={newCustomer[key]}
                      onChange={(e) =>
                        setNewCustomer(
                          (previous) => ({
                            ...previous,
                            [key]: e.target.value,
                          })
                        )
                      }
                      className="w-full rounded-xl border border-[#C4EBF2] bg-white px-3 py-2 text-sm text-[#0B1F3D] outline-none transition focus:border-[#38B2D1]"
                    />
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={handleCreateCustomer}
                disabled={createCustomer.isPending}
                className="rounded-xl bg-[#0B1F3D] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#12335f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createCustomer.isPending
                  ? "Saving…"
                  : "Save customer"}
              </button>
            </div>
          )}

          <div className="space-y-4 rounded-2xl border border-[#C4EBF2] bg-[#F8FCFD] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#557393]">
              Card front
            </p>

            <label className="block space-y-1">
              <span className="text-xs font-bold text-[#0B1F3D]">
                Customer name on card
              </span>

              <input
                value={customerName}
                onChange={(e) =>
                  setCustomerName(e.target.value)
                }
                className="w-full rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#38B2D1]"
                placeholder="John Smith"
                required
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-bold text-[#0B1F3D]">
                Personal message
              </span>

              <textarea
                value={personalMessage}
                onChange={(e) =>
                  setPersonalMessage(e.target.value)
                }
                rows={3}
                className="w-full resize-none rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#38B2D1]"
                placeholder="Happy birthday! Thinking of you…"
                required
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-bold text-[#0B1F3D]">
                Footer note{" "}
                <span className="font-normal text-[#557393]">
                  (optional)
                </span>
              </span>

              <input
                value={footerNote}
                onChange={(e) =>
                  setFooterNote(e.target.value)
                }
                className="w-full rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#38B2D1]"
                placeholder={
                  templateMeta.footerNote
                }
              />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <div className="overflow-hidden rounded-3xl border border-[#C4EBF2] bg-white shadow-sm">
            <div className="relative aspect-[3/2] overflow-hidden bg-[#F0FAFC]">
              <img
                src={template.front_background_url}
                alt={`${template.name} front preview`}
                className="h-full w-full object-cover"
              />

              <div className="pointer-events-none absolute inset-y-0 left-0 w-[44%] bg-gradient-to-r from-white/95 via-white/80 to-transparent" />

              <div className="pointer-events-none absolute inset-y-0 left-0 flex w-[42%] flex-col justify-end px-5 pb-7">
                <p className="font-cursive text-sm font-bold italic text-[#0B1F3D]">
                  {customerName
                    ? `Dear ${customerName}`
                    : "Dear Customer"}
                </p>

                <div
                  className="mt-1.5 h-0.5 w-6 rounded-full"
                  style={{
                    backgroundColor: templateMeta.accentColor,
                  }}
                />

                <p className="mt-2 line-clamp-4 text-[10px] leading-relaxed text-[#557393]">
                  {previewMessage}
                </p>

                {footerNote && (
                  <p
                    className="mt-2.5 text-[8px] font-bold uppercase tracking-[0.12em]"
                    style={{
                      color: templateMeta.accentColor,
                    }}
                  >
                    {footerNote}
                  </p>
                )}
              </div>
            </div>
          </div>

          <p className="text-center text-xs font-bold uppercase tracking-[0.14em] text-[#557393]">
            Front Preview
          </p>
        </section>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_0.9fr]">

        <section className="space-y-5 rounded-3xl border border-[#C4EBF2] bg-white p-5 sm:p-6">

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#38B2D1]">
              Sender details
            </div>

            <h2 className="mt-1 text-xl font-extrabold text-[#0B1F3D]">
              Card back
            </h2>

            <p className="mt-1 text-sm text-[#557393]">
              Add the contact information that
              should appear on the back of the card.
            </p>
          </div>

          <div className="space-y-4 rounded-2xl border border-[#C4EBF2] bg-[#F8FCFD] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#557393]">
              Agent info
            </p>

            <div className="grid gap-3 sm:grid-cols-2">

              <label className="block space-y-1">
                <span className="text-xs font-bold text-[#0B1F3D]">
                  Your name
                </span>

                <input
                  value={senderName}
                  onChange={(e) =>
                    setSenderName(e.target.value)
                  }
                  className="w-full rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#38B2D1]"
                  required
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-bold text-[#0B1F3D]">
                  Title / designation
                </span>

                <input
                  value={senderTitle}
                  onChange={(e) =>
                    setSenderTitle(e.target.value)
                  }
                  className="w-full rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#38B2D1]"
                  placeholder="REALTOR®"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-bold text-[#0B1F3D]">
                  Phone
                </span>

                <input
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  className="w-full rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#38B2D1]"
                  placeholder="(555) 123-4567"
                  type="tel"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-bold text-[#0B1F3D]">
                  Email
                </span>

                <input
                  value={emailAddress}
                  onChange={(e) =>
                    setEmailAddress(
                      e.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#38B2D1]"
                  placeholder="you@everliarealty.com"
                  type="email"
                />
              </label>

              <label className="block space-y-1 sm:col-span-2">
                <span className="text-xs font-bold text-[#0B1F3D]">
                  Website
                </span>

                <input
                  value={website}
                  onChange={(e) =>
                    setWebsite(e.target.value)
                  }
                  className="w-full rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#38B2D1]"
                  placeholder="https://www.everliarealty.com"
                  type="url"
                />
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="overflow-hidden rounded-3xl border border-[#C4EBF2] bg-white shadow-sm">
            <div className="relative aspect-[3/2] overflow-hidden bg-[#F8FCFD]">
              <img
                src={template.back_background_url}
                alt={`${template.name} back preview`}
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex w-[50%] flex-col justify-center px-5 py-5">
                {(senderName ||
                  senderTitle ||
                  phone ||
                  emailAddress ||
                  website) && (
                    <div className="space-y-1.5 rounded-xl p-3 backdrop-blur-sm">
                      {senderName && (
                        <p className="text-[11px] font-extrabold text-[#0B1F3D]">
                          {senderName}
                        </p>
                      )}

                      {senderTitle && (
                        <p className="text-[9px] font-bold uppercase tracking-wide text-[#557393]">
                          {senderTitle}
                        </p>
                      )}

                      {phone && (
                        <p className="text-[9px] text-[#557393]">
                          {phone}
                        </p>
                      )}

                      {emailAddress && (
                        <p className="break-all text-[9px] text-[#557393]">
                          {emailAddress}
                        </p>
                      )}

                      {website && (
                        <p
                          className="break-all text-[9px]"
                          style={{
                            color: templateMeta.accentColor,
                          }}
                        >
                          {website}
                        </p>
                      )}
                    </div>
                  )}
              </div>
            </div>
          </div>

          <p className="text-center text-xs font-bold uppercase tracking-[0.14em] text-[#557393]">
            Back Preview
          </p>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <button
            type="submit"
            disabled={
              createCard.isPending ||
              updateCard.isPending
            }
            className="w-full rounded-2xl bg-[#38B2D1] py-3 text-sm font-bold text-white shadow-md shadow-[#38B2D1]/25 transition hover:bg-[#2ca0be] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createCard.isPending ||
              updateCard.isPending
              ? "Saving draft…"
              : "Save draft & continue"}
          </button>
        </div>

        <div className="flex items-start">
          <p className="text-xs leading-relaxed text-[#557393]">
            Preview is approximate. Final print
            artwork with QR code, profile photo, and
            exact typography is generated on the
            next step.
          </p>
        </div>
      </div>
    </form>
  );
}

export default function NewCardPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16">
          <ThemeLoader
            label="Loading…"
            size="lg"
          />
        </div>
      }
    >
      <NewCardForm />
    </Suspense>
  );
}