"use client";

export type PropertyIntelligenceAdminSection =
  | "general"
  | "categories"
  | "providers"
  | "cache"
  | "usage";

const SECTIONS: Array<{
  id: PropertyIntelligenceAdminSection;
  label: string;
}> = [
  { id: "general", label: "General Settings" },
  { id: "categories", label: "Data Categories" },
  { id: "providers", label: "Provider Configuration" },
  { id: "cache", label: "Cache Management" },
  { id: "usage", label: "API Usage & Performance" },
];

type Props = {
  active: PropertyIntelligenceAdminSection;
  onChange: (section: PropertyIntelligenceAdminSection) => void;
};

export function AdminSectionNav({ active, onChange }: Props) {
  return (
    <nav
      aria-label="Property Intelligence sections"
      className="flex flex-wrap gap-2"
    >
      {SECTIONS.map((section) => {
        const isActive = section.id === active;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            className={`rounded-2xl px-4 py-2 text-sm font-bold transition-colors ${
              isActive
                ? "bg-[#0B1F3D] text-white shadow-sm"
                : "border border-[#C4EBF2] bg-white text-[#557393] hover:border-[#38B2D1] hover:text-[#0B1F3D]"
            }`}
          >
            {section.label}
          </button>
        );
      })}
    </nav>
  );
}
