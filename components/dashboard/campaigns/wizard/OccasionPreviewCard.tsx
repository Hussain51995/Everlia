"use client";

import {
  ChevronRightIcon,
  ClockIcon,
  MailIcon,
} from "@/components/ui/Icons";
import {
  LayersIcon,
  categoryLabel,
  categoryStyle,
  messagePreview,
  occasionIcon,
  type TileModel,
} from "@/components/dashboard/campaigns/wizard/occasions-step-shared";

type Props = {
  tile: TileModel | null;
  onEdit: (tile: TileModel) => void;
  emptyLabel?: string;
  className?: string;
};

export function OccasionPreviewCard({
  tile,
  onEdit,
  emptyLabel = "Select an occasion to preview its settings.",
  className = "",
}: Props) {
  if (!tile) {
    return (
      <div
        className={`overflow-hidden rounded-2xl border border-dashed border-[#C4EBF2] bg-[#F8FBFC] ${className}`}
      >
        <div className="border-b border-[#E8F4F7] bg-white px-4 py-3">
          <p className="text-sm font-bold text-[#0B1F3D]">Occasion Preview</p>
        </div>
        <div className="px-4 py-12 text-center text-sm text-[#557393]">
          {emptyLabel}
        </div>
      </div>
    );
  }

  const style = categoryStyle(tile.category);
  const Icon = occasionIcon(tile);

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[#C4EBF2] border-t-4 bg-white shadow-sm ${style.accent} ${className}`}
    >
      <div className="border-b border-[#E8F4F7] px-4 py-3">
        <p className="text-sm font-bold text-[#0B1F3D]">Occasion Preview</p>
      </div>

      <div className="flex items-start gap-3 border-b border-[#E8F4F7] px-4 py-4">
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${style.iconWrap} ${style.icon}`}
        >
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-base font-black text-[#0B1F3D]">
                {tile.name}
              </p>
              <p className="text-xs text-[#557393]">
                {categoryLabel(tile.category)}
              </p>
            </div>
            {tile.isSelected && tile.isEnabled ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            ) : tile.isSelected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                Disabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C4EBF2] bg-[#F8FBFC] px-2.5 py-1 text-[11px] font-bold text-[#557393]">
                Not selected
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-[#E8F4F7]">
        <button
          type="button"
          onClick={() => onEdit(tile)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#F8FBFC]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#F0FAFC] text-[#38B2D1]">
            <ClockIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-[#557393]">
              Lead time
            </span>
            <span className="mt-1 inline-flex rounded-full bg-[#E6F7FB] px-2.5 py-0.5 text-xs font-bold text-[#0B1F3D]">
              {tile.leadDays} {tile.leadDays === 1 ? "day" : "days"}
            </span>
          </span>
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-[#9BB4C7]" />
        </button>

        <button
          type="button"
          onClick={() => onEdit(tile)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#F8FBFC]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#F0FAFC] text-[#38B2D1]">
            <MailIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-[#557393]">
              Message
            </span>
            <span className="mt-0.5 block truncate text-sm text-[#0B1F3D]">
              {messagePreview(tile)}
            </span>
          </span>
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-[#9BB4C7]" />
        </button>

        <button
          type="button"
          onClick={() => onEdit(tile)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#F8FBFC]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#F0FAFC] text-[#38B2D1]">
            <LayersIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-[#557393]">
              Exclusions
            </span>
            <span className="mt-0.5 block text-sm text-[#0B1F3D]">
              {tile.exclusionCount > 0
                ? `${tile.exclusionCount} customer${
                    tile.exclusionCount === 1 ? "" : "s"
                  }`
                : "None"}
            </span>
          </span>
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-[#9BB4C7]" />
        </button>
      </div>
    </div>
  );
}
