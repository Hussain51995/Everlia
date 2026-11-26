"use client";

import { useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";

import { ApiClientError } from "@/lib/api/client";
import type { PublicRespondPayload } from "@/lib/types/cards";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { Logo } from "@/components/ui/Logo";
import { PropertyInsightsExperience } from "@/components/respond/PropertyInsightsPanel";
import {
  AgentProfileCard,
  QuoteIcon,
} from "@/components/respond/greeting/AgentProfileCard";
import type { ApiResponse } from "@/lib/types/auth";

type ResponseType = "thank" | "message" | "contact_request";

export default function PublicRespondPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [selected, setSelected] = useState<ResponseType | null>("thank");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["respond", token],
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    queryFn: async ({ client }) => {
      const queryKey = ["respond", token] as const;
      const previous = client.getQueryData<PublicRespondPayload>(queryKey);
      const etag = previous?.propertyIntelligence?.etag;

      const response = await fetch(`/api/respond/${token}`, {
        credentials: "include",
        headers: etag ? { "If-None-Match": etag } : undefined,
      });

      if (response.status === 304 && previous) {
        return previous;
      }

      const payload =
        (await response.json()) as ApiResponse<{ respond: PublicRespondPayload }>;

      if (!payload.success) {
        throw new ApiClientError(
          payload.error.message,
          payload.error.code,
          response.status
        );
      }

      return payload.data.respond;
    },
  });

  const submit = useMutation({
    mutationFn: async (body: {
      response_type: ResponseType;
      message?: string;
    }) => {
      const response = await fetch(`/api/respond/${token}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!payload.success) {
        throw new ApiClientError(
          payload.error.message,
          payload.error.code,
          response.status
        );
      }
      return payload.data;
    },
    onSuccess: () => setSubmitted(true),
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    await submit.mutateAsync({
      response_type: selected,
      message: selected === "message" ? message : message || undefined,
    });
  };

  const senderFirst = data?.senderName?.split(" ")[0] || "them";
  const showInsights =
    Boolean(data?.propertyIntelligence?.featureEnabled) &&
    (data?.propertyIntelligence?.enabledCategories.length ?? 0) > 0;
  const dualPane =
    Boolean(showInsights && !submitted && !isLoading && !error);

  const greetingCard = data && !submitted ? (
    <div
      className={
        dualPane
          ? "flex min-h-full flex-col"
          : "flex min-h-full flex-col rounded-[1.5rem] border border-[#D7EAF1] bg-white p-4 shadow-[0_16px_40px_-18px_rgba(11,31,61,0.28)] sm:rounded-[1.75rem] sm:p-5 lg:p-6"
      }
    >
      <div className="mb-4 flex justify-center lg:mb-5 lg:justify-start">
        <Logo href="/" height={56} />
      </div>

      <p className="break-words [overflow-wrap:anywhere] text-[9px] font-bold uppercase tracking-[0.16em] text-[#38B2D1] sm:text-[10px] sm:tracking-[0.18em]">
        {data.occasionLabel ?? "A personal note"}
      </p>

      <h1 className="font-cursive mt-1 break-words [overflow-wrap:anywhere] text-[1.75rem] font-bold italic leading-[1.08] text-[#0B1F3D] sm:text-[2rem] lg:text-[2.15rem]">
        Dear {data.customerFirstName},
      </h1>

      <div className="mt-4">
        <AgentProfileCard data={data} />
      </div>

      {data.personalMessage ? (
        <div className="mt-4 rounded-2xl border border-[#DDF3F8] bg-[#EEF8FB] px-3.5 py-3 sm:px-4 sm:py-3.5">
          <QuoteIcon className="h-4 w-5 text-[#8FD4E6]" />
          <p className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[13px] font-medium leading-relaxed text-[#0B1F3D] sm:text-[14px]">
            {data.personalMessage}
          </p>
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="mt-5 flex flex-1 flex-col space-y-2.5 sm:mt-6 sm:space-y-3"
      >
        <p className="text-[14px] font-extrabold leading-snug text-[#0B1F3D] sm:text-[15px]">
          How would you like to respond?
        </p>

        {(
          [
            {
              id: "thank" as const,
              title: `Thank ${senderFirst}`,
              desc: "Send a warm note of appreciation.",
            },
            {
              id: "message" as const,
              title: "Send a Message",
              desc: "Write a personal reply.",
            },
            {
              id: "contact_request" as const,
              title: `Ask ${senderFirst} to Contact Me`,
              desc: "Let them know you’d like to connect.",
            },
          ] as const
        ).map((option) => {
          const isActive = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelected(option.id)}
              aria-pressed={isActive}
              className={`flex min-h-12 w-full touch-manipulation items-start gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.99] sm:min-h-[3.35rem] sm:items-center sm:gap-3 sm:px-3.5 sm:py-3 ${
                isActive
                  ? "border-[#38B2D1] bg-[#F0FAFC] shadow-xs"
                  : "border-[#D7E8EE] bg-white hover:bg-[#F9FDFE]"
              }`}
            >
              <span
                className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 sm:mt-0 ${
                  isActive
                    ? "border-[#38B2D1] bg-[#38B2D1]"
                    : "border-[#B7D5DF] bg-white"
                }`}
                aria-hidden
              >
                {isActive ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words [overflow-wrap:anywhere] text-[13px] font-extrabold leading-snug text-[#0B1F3D] sm:text-sm">
                  {option.title}
                </span>
                <span className="mt-0.5 block break-words [overflow-wrap:anywhere] text-[11px] leading-snug text-[#6B849E] sm:text-xs">
                  {option.desc}
                </span>
              </span>
            </button>
          );
        })}

        {selected ? (
          <label className="block space-y-1.5 pt-0.5 sm:pt-1">
            <span className="text-[11.5px] font-bold text-[#0B1F3D] sm:text-xs">
              {selected === "message" ? "Your message" : "Optional note"}
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              required={selected === "message"}
              placeholder={
                selected === "message"
                  ? "Write your message…"
                  : "Add a personal note (optional)..."
              }
              className="min-h-[6rem] w-full resize-y rounded-2xl border border-[#D7E8EE] bg-white px-3 py-2.5 text-base leading-relaxed text-[#0B1F3D] outline-none transition placeholder:text-[#9BB0C2] focus:border-[#38B2D1] focus:ring-2 focus:ring-[#38B2D1]/15 sm:px-3.5 sm:py-3 sm:text-sm"
            />
          </label>
        ) : null}

        {submit.isError ? (
          <p className="break-words [overflow-wrap:anywhere] text-xs font-semibold text-rose-600">
            {submit.error instanceof ApiClientError
              ? submit.error.message
              : "Something went wrong."}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!selected || submit.isPending}
          className="mt-auto flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-2xl bg-[#0B1F3D] px-4 py-2.5 text-[14px] font-bold text-white shadow-[0_10px_25px_-8px_rgba(11,31,61,0.45)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[3.25rem] sm:text-[15px]"
        >
          {submit.isPending ? "Sending…" : "Send response"}
          {!submit.isPending ? (
            <span aria-hidden className="text-base leading-none">
              →
            </span>
          ) : null}
        </button>
      </form>
    </div>
  ) : null;

  return (
    <div
      className={`relative overflow-x-hidden ${
        dualPane
          ? "min-h-[100svh] lg:h-[100svh] lg:max-h-[100svh] lg:overflow-hidden"
          : "min-h-screen min-h-[100svh]"
      }`}
    >
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[linear-gradient(160deg,#EAF6FA_0%,#F4FBFD_42%,#E7F3F8_100%)]" />
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#C4EBF2]/35 blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-[#38B2D1]/15 blur-3xl" />
      </div>

      <main
        className={`relative z-10 mx-auto w-full px-3 sm:px-5 lg:px-6 xl:px-8 ${
          dualPane
            ? "flex max-w-[90rem] flex-col pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] lg:h-full lg:min-h-0 lg:overflow-hidden lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            : "max-w-lg pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:max-w-md"
        }`}
      >
        {isLoading ? (
          <div className="mx-auto mt-8 max-w-md rounded-[1.5rem] border border-white/90 bg-white p-8 shadow-[0_16px_40px_-18px_rgba(11,31,61,0.28)]">
            <ThemeLoader label="Opening your card…" size="lg" />
          </div>
        ) : error ? (
          <div className="mx-auto mt-8 max-w-md rounded-[1.5rem] border border-white/90 bg-white px-5 py-8 text-center shadow-[0_16px_40px_-18px_rgba(11,31,61,0.28)]">
            <h1 className="text-xl font-extrabold text-[#0B1F3D]">
              Link unavailable
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#557393]">
              {error instanceof ApiClientError
                ? error.message
                : "This link is invalid or expired."}
            </p>
          </div>
        ) : submitted ? (
          <div className="mx-auto mt-8 max-w-md rounded-[1.5rem] border border-white/90 bg-white px-5 py-10 text-center shadow-[0_16px_40px_-18px_rgba(11,31,61,0.28)]">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#E8F7FB] text-[#38B2D1] ring-1 ring-[#C4EBF2]">
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7 fill-none stroke-current"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-[#0B1F3D]">
              Thank you
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#557393]">
              Your message is on its way to{" "}
              <span className="font-semibold text-[#0B1F3D]">
                {data?.senderName}
              </span>
              . Relationships grow one thoughtful note at a time.
            </p>
          </div>
        ) : showInsights ? (
          <div className="grid gap-4 md:gap-5 lg:h-full lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:grid-rows-1 lg:gap-5 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] xl:gap-6">
            <aside className="order-1 flex min-w-0 flex-col rounded-[1.5rem] border border-[#D7EAF1] bg-white shadow-[0_16px_40px_-18px_rgba(11,31,61,0.28)] sm:rounded-[1.75rem] lg:h-full lg:min-h-0 lg:overflow-hidden">
              <div className="p-4 sm:p-5 lg:everlia-pane-scroll lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:p-6">
                {greetingCard}
              </div>
            </aside>
            <div className="order-2 flex min-w-0 flex-col rounded-[1.5rem] border border-[#D7EAF1] bg-white shadow-[0_16px_40px_-18px_rgba(11,31,61,0.28)] sm:rounded-[1.75rem] lg:h-full lg:min-h-0 lg:overflow-hidden">
              <div className="p-3 sm:p-4 lg:everlia-pane-scroll lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:p-5">
                {data ? (
                  <PropertyInsightsExperience token={token} respond={data} />
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-md">{greetingCard}</div>
        )}
      </main>
    </div>
  );
}
