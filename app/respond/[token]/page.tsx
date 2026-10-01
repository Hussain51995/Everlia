"use client";

import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient, ApiClientError } from "@/lib/api/client";
import type { PublicRespondPayload } from "@/lib/types/cards";
import { ThemeLoader } from "@/components/ui/ThemeLoader";

type ResponseType = "thank" | "message" | "contact_request";

export default function PublicRespondPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [selected, setSelected] = useState<ResponseType | null>(null);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["respond", token],
    queryFn: async () => {
      const result = await apiClient<{ respond: PublicRespondPayload }>(
        `/api/respond/${token}`
      );
      return result.respond;
    },
  });

  const submit = useMutation({
    mutationFn: (body: { response_type: ResponseType; message?: string }) =>
      apiClient(`/api/respond/${token}`, {
        method: "POST",
        body,
      }),
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F7FB] via-[#F7FBFC] to-white px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <div className="text-sm font-extrabold tracking-tight text-[#0B1F3D]">
            Everlia
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#38B2D1]">
            A personal note continues here
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-3xl bg-white p-10 shadow-sm ring-1 ring-[#C4EBF2]">
            <ThemeLoader label="Opening your card…" size="lg" />
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-rose-200">
            <p className="text-sm font-semibold text-rose-700">
              {error instanceof ApiClientError
                ? error.message
                : "This link is invalid or expired."}
            </p>
          </div>
        ) : submitted ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-[#C4EBF2]">
            <h1 className="text-2xl font-extrabold text-[#0B1F3D]">
              Thank you
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#557393]">
              Your message is on its way to {data?.senderName}. Relationships
              grow one thoughtful note at a time.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#C4EBF2] sm:p-8">
            <h1 className="text-2xl font-extrabold leading-tight text-[#0B1F3D]">
              Hi {data?.customerFirstName},
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#557393]">
              {data?.senderName} hopes you have a wonderful{" "}
              {data?.occasionLabel?.toLowerCase() ?? "day"}.
              {data?.personalMessage ? (
                <>
                  {" "}
                  They wrote:{" "}
                  <span className="font-medium text-[#0B1F3D]">
                    “{data.personalMessage}”
                  </span>
                </>
              ) : null}
            </p>
            <p className="mt-4 text-sm font-semibold text-[#0B1F3D]">
              How would you like to respond?
            </p>

            <form onSubmit={onSubmit} className="mt-5 space-y-3">
              {(
                [
                  {
                    id: "thank" as const,
                    title: `Thank ${data?.senderName?.split(" ")[0] || "them"}`,
                    desc: "Send a warm note of appreciation.",
                  },
                  {
                    id: "message" as const,
                    title: "Send a Message",
                    desc: "Write a personal reply.",
                  },
                  {
                    id: "contact_request" as const,
                    title: `Ask ${data?.senderName?.split(" ")[0] || "them"} to Contact Me`,
                    desc: "Let them know you’d like to connect.",
                  },
                ]
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelected(option.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selected === option.id
                      ? "border-[#38B2D1] bg-[#F0FAFC] ring-2 ring-[#38B2D1]/20"
                      : "border-[#C4EBF2] bg-white hover:border-[#38B2D1]/50"
                  }`}
                >
                  <div className="text-sm font-extrabold text-[#0B1F3D]">
                    {option.title}
                  </div>
                  <div className="mt-0.5 text-xs text-[#557393]">
                    {option.desc}
                  </div>
                </button>
              ))}

              {(selected === "message" ||
                selected === "thank" ||
                selected === "contact_request") && (
                <label className="block space-y-1 pt-2">
                  <span className="text-xs font-bold text-[#0B1F3D]">
                    {selected === "message"
                      ? "Your message"
                      : "Optional note"}
                  </span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    required={selected === "message"}
                    placeholder={
                      selected === "thank"
                        ? "Thank you for remembering…"
                        : selected === "contact_request"
                          ? "I’d love to catch up…"
                          : "Write your message…"
                    }
                    className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F8FCFD] px-3 py-2.5 text-sm outline-none focus:border-[#38B2D1] focus:bg-white"
                  />
                </label>
              )}

              {submit.isError ? (
                <p className="text-xs font-semibold text-rose-600">
                  {submit.error instanceof ApiClientError
                    ? submit.error.message
                    : "Something went wrong."}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!selected || submit.isPending}
                className="mt-2 w-full rounded-2xl bg-[#0B1F3D] py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {submit.isPending ? "Sending…" : "Send response"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
