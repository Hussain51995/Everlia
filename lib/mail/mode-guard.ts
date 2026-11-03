import type { CampaignMailingMode } from "@/lib/types/campaigns";

export function assertCampaignMailingModeAllowed(
  mode: CampaignMailingMode
): void {
  if (mode === "dry_run") {
    throw new Error("dry_run mode cannot submit campaign mailings");
  }
  if (mode === "live") {
    const enabled =
      process.env.CAMPAIGN_LIVE_MAIL_ENABLED === "true" &&
      process.env.POSTGRID_MODE === "live";
    if (!enabled) {
      throw new Error(
        "Live campaign mailing is disabled. Set CAMPAIGN_LIVE_MAIL_ENABLED=true and POSTGRID_MODE=live only when explicitly authorized."
      );
    }
  }
}

export function isCampaignWorkerMode(mode: CampaignMailingMode): boolean {
  return mode === "test";
}

export function assertTestProviderEnvironment(environment: string): void {
  if (environment === "live") {
    throw new Error(
      "Refusing to use live mail provider credentials for campaign test mode"
    );
  }
}
