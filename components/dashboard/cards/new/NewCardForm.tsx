"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
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
import { useToast } from "@/components/ui/Toast";
import { ApiClientError } from "@/lib/api/client";
import { getTemplateMeta, TEMPLATE_META } from "@/lib/cards/template-meta";
import { BackStep } from "./BackStep";
import { CardFlipPreview } from "./CardFlipPreview";
import { CustomizeHeader } from "./CustomizeHeader";
import { FrontStep } from "./FrontStep";
import {
  EMPTY_NEW_CUSTOMER,
  type CardSide,
  type NewCustomerFormState,
} from "./types";

export function NewCardForm() {
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
  const activeOrganizationId = useAuthStore((s) => s.activeOrganizationId);

  const defaultSender = useMemo(() => {
    const name = [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    return name || membership?.organization?.name || "";
  }, [profile, membership]);

  const [activeSide, setActiveSide] = useState<CardSide>("front");
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
  const [newCustomer, setNewCustomer] =
    useState<NewCustomerFormState>(EMPTY_NEW_CUSTOMER);

  const frontStepRef = useRef<HTMLDivElement>(null);
  const backStepRef = useRef<HTMLDivElement>(null);
  const [formStepHeight, setFormStepHeight] = useState<number | null>(null);

  useEffect(() => {
    if (defaultSender && !senderName) {
      setSenderName(defaultSender);
    }
  }, [defaultSender, senderName]);

  useEffect(() => {
    setCustomerId("");
    setCustomerName("");
    setShowNewCustomer(false);
    setActiveSide("front");
  }, [activeOrganizationId]);

  useEffect(() => {
    if (!customerId || !customers) return;
    const selected = customers.find((customer) => customer.id === customerId);
    if (selected) {
      setCustomerName(
        `${selected.first_name} ${selected.last_name}`.trim()
      );
    }
  }, [customerId, customers]);

  useEffect(() => {
    if (!template) return;
    const meta = TEMPLATE_META[template.slug];
    if (meta && !footerNote) {
      setFooterNote(meta.footerNote);
    }
  }, [template, footerNote]);

  useLayoutEffect(() => {
    const activeStep =
      activeSide === "front" ? frontStepRef.current : backStepRef.current;
    if (!activeStep) return;
    const updateHeight = () => {
      setFormStepHeight(activeStep.offsetHeight);
    };
    updateHeight();
    if (typeof ResizeObserver === "undefined") return;
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(activeStep);
    return () => resizeObserver.disconnect();
  }, [activeSide, showNewCustomer, template?.id, customersLoading]);

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

  const templateMeta = getTemplateMeta(template.slug);

  const handleCreateCustomer = async () => {
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

  const validateFrontStep = () => {
    if (!customerId) {
      showToast({
        tone: "error",
        title: "Recipient required",
        description: "Select or create a customer first.",
      });
      return false;
    }
    if (!customerName.trim()) {
      showToast({
        tone: "error",
        title: "Customer name required",
        description: "Enter the customer name that should appear on the card.",
      });
      return false;
    }
    if (!personalMessage.trim()) {
      showToast({
        tone: "error",
        title: "Personal message required",
        description: "Add a personal message before continuing to the back.",
      });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateFrontStep()) return;
    setShowNewCustomer(false);
    setActiveSide("back");
  };

  const handleBack = () => {
    setActiveSide("front");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateFrontStep()) {
      setActiveSide("front");
      return;
    }
    if (!senderName.trim()) {
      showToast({
        tone: "error",
        title: "Sender name required",
        description: "Enter the sender name that should appear on the back.",
      });
      setActiveSide("back");
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
  const isSaving = createCard.isPending || updateCard.isPending;

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-6xl space-y-6">
      <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-5 rounded-3xl border border-[#C4EBF2] bg-white p-5 sm:p-6">
          <CustomizeHeader
            templateName={template.name}
            activeSide={activeSide}
            onRefetch={() => {
              void refetchTemplate();
              void refetchCustomers();
            }}
            isRefreshing={
              (fetchingTemplate || fetchingCustomers) &&
              !(templateLoading || customersLoading)
            }
          />

          <div
            className="relative overflow-hidden transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{
              height:
                formStepHeight === null ? undefined : `${formStepHeight}px`,
            }}
          >
            <div
              ref={frontStepRef}
              aria-hidden={activeSide !== "front"}
              className={`space-y-5 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:transform-none ${
                formStepHeight === null && activeSide === "front"
                  ? "relative"
                  : "absolute inset-x-0 top-0"
              } ${
                activeSide === "front"
                  ? "translate-x-0 scale-100 opacity-100 delay-75"
                  : "pointer-events-none -translate-x-4 scale-[0.985] opacity-0"
              }`}
            >
              <FrontStep
                disabled={activeSide !== "front"}
                customers={customers ?? []}
                customerId={customerId}
                onCustomerIdChange={setCustomerId}
                showNewCustomer={showNewCustomer}
                onToggleNewCustomer={() =>
                  setShowNewCustomer((previous) => !previous)
                }
                newCustomer={newCustomer}
                onNewCustomerChange={setNewCustomer}
                onCreateCustomer={() => void handleCreateCustomer()}
                isCreatingCustomer={createCustomer.isPending}
                customerName={customerName}
                onCustomerNameChange={setCustomerName}
                personalMessage={personalMessage}
                onPersonalMessageChange={setPersonalMessage}
                footerNote={footerNote}
                onFooterNoteChange={setFooterNote}
                footerNotePlaceholder={templateMeta.footerNote}
                onNext={handleNext}
              />
            </div>

            <div
              ref={backStepRef}
              aria-hidden={activeSide !== "back"}
              className={`space-y-5 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:transform-none ${
                formStepHeight === null && activeSide === "back"
                  ? "relative"
                  : "absolute inset-x-0 top-0"
              } ${
                activeSide === "back"
                  ? "translate-x-0 scale-100 opacity-100 delay-75"
                  : "pointer-events-none translate-x-4 scale-[0.985] opacity-0"
              }`}
            >
              <BackStep
                disabled={activeSide !== "back"}
                senderName={senderName}
                onSenderNameChange={setSenderName}
                senderTitle={senderTitle}
                onSenderTitleChange={setSenderTitle}
                phone={phone}
                onPhoneChange={setPhone}
                emailAddress={emailAddress}
                onEmailAddressChange={setEmailAddress}
                website={website}
                onWebsiteChange={setWebsite}
                onBack={handleBack}
                isSaving={isSaving}
              />
            </div>
          </div>
        </section>

        <CardFlipPreview
          template={template}
          templateMeta={templateMeta}
          activeSide={activeSide}
          customerName={customerName}
          previewMessage={previewMessage}
          footerNote={footerNote}
          senderName={senderName}
          senderTitle={senderTitle}
          phone={phone}
          emailAddress={emailAddress}
          website={website}
        />
      </div>
    </form>
  );
}
