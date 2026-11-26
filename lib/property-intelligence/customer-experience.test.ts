import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  formatArea,
  formatBedsBaths,
  formatDistanceMiles,
  formatListingStatus,
  formatMoney,
  formatPropertyType,
} from "@/components/respond/property-insights/format";
import {
  categoryStatusCopy,
  isEmptyAvailableData,
} from "@/components/respond/property-insights/status-copy";
import { shouldRenderCategoryShell } from "@/components/respond/property-insights/CategoryState";
import type { CategoryResultStatus } from "@/lib/types/property-intelligence";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";

describe("property insights formatters", () => {
  it("formats money without inventing values", () => {
    expect(formatMoney(null)).toBeNull();
    expect(formatMoney({ amount: 360000, currency: "USD" })).toContain("360,000");
  });

  it("formats area, beds/baths, distance, type", () => {
    expect(formatArea({ value: 1800, unit: "sqft" })).toBe("1,800 sq ft");
    expect(formatBedsBaths(3, 2)).toBe("3 bed · 2 bath");
    expect(formatBedsBaths(null, null)).toBeNull();
    expect(formatDistanceMiles(1.2)).toBe("1.2 mi");
    expect(formatDistanceMiles(null)).toBeNull();
    expect(formatPropertyType("single_family")).toBe("Single family");
    expect(formatPropertyType("unknown")).toBeNull();
    expect(formatListingStatus("active")).toBe("Active");
  });
});

describe("category status UX", () => {
  it("never exposes budget internals to customers", () => {
    const copy = categoryStatusCopy("budget_exhausted");
    expect(copy?.body.toLowerCase()).not.toContain("budget");
    expect(copy?.body.toLowerCase()).not.toContain("rentcast");
    expect(copy?.title).toBe("Temporarily unavailable");
  });

  it("maps loading / unsupported / error safely", () => {
    expect(categoryStatusCopy("loading")?.title).toBe("Loading");
    expect(categoryStatusCopy("unsupported")?.title).toBe("Not available");
    expect(categoryStatusCopy("error")?.body).not.toMatch(
      /stack|sql|provider_failure/i
    );
    expect(categoryStatusCopy("disabled")).toBeNull();
    expect(categoryStatusCopy("available")).toBeNull();
  });

  it("detects empty available payloads", () => {
    expect(isEmptyAvailableData("available", null)).toBe(true);
    expect(isEmptyAvailableData("available", [])).toBe(true);
    expect(isEmptyAvailableData("available", [{ id: 1 }])).toBe(false);
    expect(isEmptyAvailableData("loading", null)).toBe(false);
  });

  it("selects shell modes for independent category states", () => {
    const statuses: CategoryResultStatus[] = [
      "loading",
      "available",
      "unavailable",
      "unsupported",
      "budget_exhausted",
      "error",
      "disabled",
    ];
    for (const status of statuses) {
      const mode = shouldRenderCategoryShell(
        status,
        status === "available" ? { ok: true } : null
      );
      if (status === "disabled") expect(mode).toBe("hide");
      else if (status === "loading") expect(mode).toBe("loading");
      else if (status === "available") expect(mode).toBe("content");
      else expect(mode).toBe("unavailable");
    }
    expect(shouldRenderCategoryShell("available", [])).toBe("empty");
  });
});

describe("category combination visibility contract", () => {
  it("supports all five / subset / none without school data", () => {
    expect(PROPERTY_DATA_CATEGORIES).toHaveLength(5);
    expect(PROPERTY_DATA_CATEGORIES).not.toContain("schools" as never);

    const allEnabled = [...PROPERTY_DATA_CATEGORIES];
    const oneEnabled = ["property_valuation"] as const;
    const threeEnabled = [
      "property_valuation",
      "property_details",
      "market_statistics",
    ] as const;
    const noneEnabled: string[] = [];

    expect(allEnabled).toHaveLength(5);
    expect(oneEnabled).toHaveLength(1);
    expect(threeEnabled).toHaveLength(3);
    expect(noneEnabled).toHaveLength(0);
  });

  it("page places insights after reply and uses noindex", () => {
    const page = readFileSync(
      resolve(process.cwd(), "app/respond/[token]/page.tsx"),
      "utf8"
    );
    const formIndex = page.indexOf("<form");
    const insightsIndex = page.indexOf("<PropertyInsightsExperience");
    expect(formIndex).toBeGreaterThan(-1);
    expect(insightsIndex).toBeGreaterThan(formIndex);
    expect(page).toContain("lg:overflow-y-auto");
    expect(page).toContain("lg:overscroll-contain");
    expect(page).not.toMatch(
      /className="everlia-pane-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain/
    );

    const layout = readFileSync(
      resolve(process.cwd(), "app/respond/layout.tsx"),
      "utf8"
    );
    expect(layout).toContain("robots");
    expect(layout).toContain("index: false");
  });

  it("experience hides when feature off or categories disabled", () => {
    const src = readFileSync(
      resolve(
        process.cwd(),
        "components/respond/property-insights/PropertyInsightsExperience.tsx"
      ),
      "utf8"
    );
    expect(src).toContain("if (!featureEnabled) return null");
    expect(src).toContain("enabled.length === 0");
    expect(src).toContain("AgentContactSection");
    expect(src).toContain("Footer");
    expect(src).not.toContain("SourceAttribution");
    expect(src.toLowerCase()).not.toContain("school");
  });

  it("listing cards do not use stock property photographs", () => {
    const house = readFileSync(
      resolve(
        process.cwd(),
        "components/respond/property-insights/ResidentialListingCard.tsx"
      ),
      "utf8"
    );
    const land = readFileSync(
      resolve(
        process.cwd(),
        "components/respond/property-insights/LandListingCard.tsx"
      ),
      "utf8"
    );
    expect(house).not.toMatch(/unsplash|pexels|placeholder\.com|<img/i);
    expect(land).not.toMatch(/unsplash|pexels|placeholder\.com|<img/i);
  });
});

describe("market chart honesty", () => {
  it("requires at least two real historical points", () => {
    const chart = readFileSync(
      resolve(
        process.cwd(),
        "components/respond/property-insights/charts/MarketHistoryChart.tsx"
      ),
      "utf8"
    );
    expect(chart).toContain("points.length < 2");
    expect(chart).toContain("asking-price");
    expect(chart).not.toContain("Math.random");
  });

  it("visual chart gallery only renders from published payload fields", () => {
    const gallery = readFileSync(
      resolve(
        process.cwd(),
        "components/respond/property-insights/charts/InsightsChartsSection.tsx"
      ),
      "utf8"
    );
    const histogram = readFileSync(
      resolve(
        process.cwd(),
        "components/respond/property-insights/charts/PriceHistogram.tsx"
      ),
      "utf8"
    );
    const scatter = readFileSync(
      resolve(
        process.cwd(),
        "components/respond/property-insights/charts/ScatterPlotChart.tsx"
      ),
      "utf8"
    );
    expect(gallery).toContain("status === \"available\"");
    expect(gallery).not.toContain("Math.random");
    expect(gallery).not.toContain("Estimate vs comps");
    expect(gallery).toContain("compareBars.length >= 2");
    expect(histogram).toContain("sorted.length < 3");
    expect(histogram).not.toContain("Math.random");
    expect(scatter).toContain("valid.length < 3");
    expect(scatter).not.toContain("Math.random");
  });

  it("places valuation before visual insights and dedupes charts", () => {
    const experience = readFileSync(
      resolve(
        process.cwd(),
        "components/respond/property-insights/PropertyInsightsExperience.tsx"
      ),
      "utf8"
    );
    const market = readFileSync(
      resolve(
        process.cwd(),
        "components/respond/property-insights/MarketStatisticsSection.tsx"
      ),
      "utf8"
    );
    const nearby = readFileSync(
      resolve(
        process.cwd(),
        "components/respond/property-insights/NearbyListingsSection.tsx"
      ),
      "utf8"
    );
    const valuationIdx = experience.indexOf("<ValuationSection");
    const chartsIdx = experience.indexOf("<InsightsChartsSection");
    expect(valuationIdx).toBeGreaterThan(-1);
    expect(chartsIdx).toBeGreaterThan(valuationIdx);
    expect(market).not.toContain("MarketHistoryChart");
    expect(market).not.toContain("VerticalBarChart");
    expect(nearby).toContain("showPriceBars={false}");
    expect(nearby).toContain("showPriceBars");
  });

  it("adapts section and chart grids to visible item count", () => {
    const experience = readFileSync(
      resolve(
        process.cwd(),
        "components/respond/property-insights/PropertyInsightsExperience.tsx"
      ),
      "utf8"
    );
    const gallery = readFileSync(
      resolve(
        process.cwd(),
        "components/respond/property-insights/charts/InsightsChartsSection.tsx"
      ),
      "utf8"
    );
    expect(experience).toContain("topCount > 1");
    expect(experience).toContain("nearbyCount > 1");
    expect(experience).toContain("lg:grid-cols-2");
    expect(gallery).toContain("secondaryCharts");
    expect(gallery).toContain("secondaryCount > 1");
    expect(gallery).toContain("sm:col-span-2");
    expect(gallery).toContain("orphanSpansFull");
  });
});

describe("public respond contact fields", () => {
  it("exposes verified card contact fields without inventing them", () => {
    const route = readFileSync(
      resolve(process.cwd(), "app/api/respond/[token]/route.ts"),
      "utf8"
    );
    expect(route).toContain("senderPhone");
    expect(route).toContain("senderEmail");
    expect(route).toContain("card.field_values?.phone");
    expect(route).toContain("Cache-Control\": \"private, no-store");
  });
});
