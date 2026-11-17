"use client";

import type { ComponentType, SVGProps } from "react";
import type { WizardOccasionDraft } from "@/stores/campaign-wizard-store";
import type { OccasionDefinition } from "@/lib/campaigns/occasions";
import {
  BuildingIcon,
  CalendarIcon,
  GiftIcon,
  HomeIcon,
  SparklesIcon,
  UserIcon,
} from "@/components/ui/Icons";

export const CATEGORY_FILTERS: Array<{ label: string; value: string }> = [
  { label: "All", value: "" },
  { label: "Holidays", value: "federal_holiday" },
  { label: "Greetings", value: "popular_greeting" },
  { label: "Real estate", value: "real_estate_milestone" },
  { label: "Personal", value: "personal_milestone" },
  { label: "Custom", value: "custom" },
];

export const CATEGORY_LABELS: Record<string, string> = {
  federal_holiday: "Federal holiday",
  popular_greeting: "Popular greeting",
  real_estate_milestone: "Real estate milestone",
  personal_milestone: "Personal milestone",
  custom: "Custom date",
};

export const CATEGORY_STYLE: Record<
  string,
  { iconWrap: string; icon: string; accent: string; dot: string; chip: string }
> = {
  federal_holiday: {
    iconWrap: "bg-[#0B1F3D]/10",
    icon: "text-[#0B1F3D]",
    accent: "border-t-[#0B1F3D]",
    dot: "bg-[#0B1F3D]",
    chip: "bg-[#0B1F3D] text-white",
  },
  popular_greeting: {
    iconWrap: "bg-[#E6F7FB]",
    icon: "text-[#0E7490]",
    accent: "border-t-[#38B2D1]",
    dot: "bg-[#38B2D1]",
    chip: "bg-[#38B2D1] text-white",
  },
  real_estate_milestone: {
    iconWrap: "bg-teal-50",
    icon: "text-teal-700",
    accent: "border-t-teal-600",
    dot: "bg-teal-600",
    chip: "bg-teal-600 text-white",
  },
  personal_milestone: {
    iconWrap: "bg-orange-50",
    icon: "text-orange-600",
    accent: "border-t-orange-500",
    dot: "bg-orange-500",
    chip: "bg-orange-500 text-white",
  },
  custom: {
    iconWrap: "bg-violet-50",
    icon: "text-violet-700",
    accent: "border-t-violet-600",
    dot: "bg-violet-600",
    chip: "bg-violet-600 text-white",
  },
};

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type TileModel = {
  key: string;
  name: string;
  category?: string;
  leadDays: number;
  isSelected: boolean;
  isEnabled: boolean;
  hasMessage: boolean;
  exclusionCount: number;
  occurrenceDate?: string;
  draft: WizardOccasionDraft | null;
  catalog: OccasionDefinition | null;
  defaultMessagePreview?: string;
};

export function categoryLabel(category?: string) {
  return CATEGORY_LABELS[category ?? "custom"] ?? "Custom date";
}

export function categoryStyle(category?: string) {
  return CATEGORY_STYLE[category ?? "custom"] ?? CATEGORY_STYLE.custom;
}

export function occasionIcon(tile: {
  key: string;
  category?: string;
  catalog: OccasionDefinition | null;
}): IconComponent {
  const slug = tile.catalog?.slug ?? tile.key;
  if (slug === "birthday") return GiftIcon;
  if (slug === "home-anniversary") return HomeIcon;
  if (slug === "closing-anniversary") return BuildingIcon;
  if (
    slug === "referral-january" ||
    slug === "referral-april" ||
    slug === "referral-july" ||
    slug === "referral-october"
  ) {
    return UserIcon;
  }
  if (tile.category === "federal_holiday") return CalendarIcon;
  if (tile.category === "popular_greeting") return SparklesIcon;
  if (tile.category === "personal_milestone") return UserIcon;
  if (tile.category === "real_estate_milestone") return HomeIcon;
  return CalendarIcon;
}

export function truncate(text: string, max = 42) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function messagePreview(tile: TileModel) {
  const custom = tile.draft?.messageTemplate?.trim();
  if (custom) return truncate(custom);
  if (tile.defaultMessagePreview?.trim()) {
    return truncate(tile.defaultMessagePreview.trim());
  }
  return truncate(`Send a personalized ${tile.name.toLowerCase()} greeting to…`);
}

export function LayersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </svg>
  );
}

export function ListViewIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}
