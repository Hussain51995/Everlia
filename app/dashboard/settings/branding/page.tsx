"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiClientError } from "@/lib/api/client";
import type { OrganizationBranding } from "@/lib/types/cards";
import { useToast } from "@/components/ui/Toast";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import {
  fieldLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
  textInputClass,
} from "@/components/dashboard/campaigns/shared";

export default function BrandingSettingsPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [logoUrl, setLogoUrl] = useState("");
  const [senderName, setSenderName] = useState("");

  const brandingQuery = useQuery({
    queryKey: ["organization-branding"],
    queryFn: () =>
      apiClient<{ branding: OrganizationBranding }>(
        "/api/organization/branding"
      ),
  });

  useEffect(() => {
    const branding = brandingQuery.data?.branding;
    if (!branding) return;
    setLogoUrl(branding.logo_url ?? "");
    setSenderName(branding.sender_display_name ?? "");
  }, [brandingQuery.data]);

  const save = useMutation({
    mutationFn: (payload: {
      logo_url: string | null;
      sender_display_name: string | null;
    }) =>
      apiClient<{ branding: OrganizationBranding }>(
        "/api/organization/branding",
        {
          method: "PATCH",
          body: payload,
        }
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(["organization-branding"], data);
      setLogoUrl(data.branding.logo_url ?? "");
      setSenderName(data.branding.sender_display_name ?? "");
      showToast({
        tone: "success",
        title: "Branding saved",
        description: "Campaign and card flows can now use this logo.",
      });
    },
    onError: (error) => {
      showToast({
        tone: "error",
        title: "Could not save branding",
        description:
          error instanceof ApiClientError
            ? error.message
            : "Please try again.",
      });
    },
  });

  if (brandingQuery.isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center rounded-3xl border border-[#C4EBF2] bg-white">
        <ThemeLoader label="Loading branding…" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link
          href="/dashboard"
          className="text-xs font-bold text-[#38B2D1] hover:underline"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-black text-[#0B1F3D]">
          Organization branding
        </h1>
        <p className="mt-1 text-sm text-[#557393]">
          Save your logo once. Campaign and send-separately checkboxes will use
          it when enabled.
        </p>
      </div>

      <form
        className="space-y-4 rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate({
            logo_url: logoUrl.trim() || null,
            sender_display_name: senderName.trim() || null,
          });
        }}
      >
        <div>
          <label className={fieldLabelClass} htmlFor="logo-url">
            Logo image URL
          </label>
          <input
            id="logo-url"
            type="url"
            className={textInputClass}
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…/your-logo.png"
          />
          <p className="mt-1 text-xs text-[#557393]">
            Use a publicly reachable PNG or SVG URL (transparent background
            works best).
          </p>
        </div>

        {logoUrl.trim() ? (
          <div className="rounded-2xl border border-[#C4EBF2] bg-[#F8FCFD] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#557393]">
              Preview
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl.trim()}
              alt="Organization logo preview"
              className="mt-2 h-20 w-auto max-w-full rounded-xl border border-[#C4EBF2] bg-white object-contain p-2"
            />
          </div>
        ) : null}

        <div>
          <label className={fieldLabelClass} htmlFor="sender-name">
            Default sender display name
          </label>
          <input
            id="sender-name"
            type="text"
            className={textInputClass}
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="Jordan Lee"
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={save.isPending}
          >
            {save.isPending ? "Saving…" : "Save branding"}
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={!logoUrl || save.isPending}
            onClick={() =>
              save.mutate({
                logo_url: null,
                sender_display_name: senderName.trim() || null,
              })
            }
          >
            Clear logo
          </button>
        </div>
      </form>
    </div>
  );
}
