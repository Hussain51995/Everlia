"use client";

import { useState } from "react";
import {
  AdminSectionNav,
  type PropertyIntelligenceAdminSection,
} from "./AdminSectionNav";
import { GeneralSettingsPanel } from "./GeneralSettingsPanel";
import { CategorySettingsPanel } from "./CategorySettingsPanel";
import { ProviderConfigPanel } from "./ProviderConfigPanel";
import { CacheManagementPanel } from "./CacheManagementPanel";
import { UsageDashboardPanel } from "./UsageDashboardPanel";

export function PropertyIntelligenceAdmin() {
  const [section, setSection] =
    useState<PropertyIntelligenceAdminSection>("general");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0B1F3D]">
          Property Intelligence
        </h1>
        <p className="mt-1 text-sm text-[#557393]">
          Platform administration for feature settings, providers, cache, and
          application-local usage. School data remains permanently excluded.
        </p>
      </div>

      <AdminSectionNav active={section} onChange={setSection} />

      {section === "general" ? <GeneralSettingsPanel /> : null}
      {section === "categories" ? <CategorySettingsPanel /> : null}
      {section === "providers" ? <ProviderConfigPanel /> : null}
      {section === "cache" ? <CacheManagementPanel /> : null}
      {section === "usage" ? <UsageDashboardPanel /> : null}
    </div>
  );
}
