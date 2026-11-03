import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { resolve } from "path";

function readRepo(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

function migrationNames() {
  return readdirSync(resolve(process.cwd(), "supabase/migrations")).filter(
    (f) => f.endsWith(".sql")
  );
}

function readMigration(prefix: string) {
  const name = migrationNames().find((f) => f.startsWith(`${prefix}_`));
  expect(name, `missing migration ${prefix}_*`).toBeTruthy();
  return readRepo(`supabase/migrations/${name!}`);
}

describe("Phase 2 campaign migrations — chain integrity", () => {
  it("CODE_REVIEW_PASS: migrations 021–026 exist and are contiguous after 020", () => {
    const names = migrationNames();
    expect(names.some((f) => f.startsWith("020_"))).toBe(true);
    for (const n of ["021", "022", "023", "024", "025", "026"]) {
      expect(names.some((f) => f.startsWith(`${n}_`))).toBe(true);
    }
  });

  it("CODE_REVIEW_PASS: historical migrations 001–020 are not rewritten by campaign files", () => {
    for (const n of ["021", "022", "023", "024", "025", "026"]) {
      const sql = readMigration(n);
      expect(sql).not.toMatch(/drop table if exists public\.(customers|greeting_cards|organizations)\b/i);
      expect(sql).not.toMatch(/drop type if exists public\.(greeting_card_status|organization_role|membership_status)\b/i);
      expect(sql).not.toMatch(/create or replace function public\.is_organization_member\b/);
      expect(sql).not.toMatch(/create or replace function public\.handle_new_user\b/);
    }
  });
});

describe("Phase 2 campaign enums and core tables", () => {
  it("CODE_REVIEW_PASS: 021 defines required enums without conflicting with card enums", () => {
    const sql = readMigration("021");
    for (const t of [
      "campaign_status",
      "campaign_mailing_status",
      "campaign_mailing_mode",
      "campaign_audit_action",
      "occasion_kind",
      "milestone_type",
      "campaign_customer_status",
      "campaign_billing_mode",
      "campaign_billing_state",
    ]) {
      expect(sql).toContain(`'${t}'`);
      expect(sql).toContain(`create type public.${t}`);
    }
    expect(sql).toContain("'draft'");
    expect(sql).toContain("'active'");
    expect(sql).toContain("'paused'");
    expect(sql).toContain("'skipped_past'");
    expect(sql).toContain("'skipped_paused'");
    expect(sql).toContain("'dry_run'");
    expect(sql).toContain("'test'");
    expect(sql).toContain("'live'");
    expect(sql).toContain("'mailing_failed'");
  });

  it("CODE_REVIEW_PASS: 022 occasions + customer_milestones preserve customers table", () => {
    const sql = readMigration("022");
    expect(sql).toContain("create table if not exists public.occasions");
    expect(sql).toContain("create table if not exists public.customer_milestones");
    expect(sql).toContain("enforce_customer_milestone_same_org");
    expect(sql).toContain("anchor_date");
    expect(sql).toContain("property_type");
    expect(sql).toContain("recurs_annually");
    expect(sql).not.toMatch(/alter table public\.customers\s+drop/i);
    expect(sql).not.toMatch(/delete from public\.customers/i);
  });

  it("CODE_REVIEW_PASS: 023 campaigns enforce start<=end and unique enrollment", () => {
    const sql = readMigration("023");
    expect(sql).toContain("create table if not exists public.campaigns");
    expect(sql).toContain("campaigns_start_before_end");
    expect(sql).toContain("start_date <= end_date");
    expect(sql).toContain("mailing_mode");
    expect(sql).toContain("default_template_id");
    expect(sql).toContain("campaign_customers_campaign_customer_unique");
    expect(sql).toContain("enforce_campaign_customer_same_org");
    expect(sql).toContain("create table if not exists public.campaign_occasions");
    expect(sql).toContain("campaign_occasion_exclusions");
    expect(sql).toContain("campaign_billing_profiles");
    expect(sql).toContain("spending_limit_cents");
    expect(sql).toMatch(/Live PostGrid postage is not assumed free/i);
  });

  it("CODE_REVIEW_PASS: 024 mailings are idempotent and link greeting_cards additively", () => {
    const sql = readMigration("024");
    expect(sql).toContain("create table if not exists public.campaign_mailings");
    expect(sql).toContain("idempotency_key");
    expect(sql).toContain("campaign_mailings_idempotency_key_unique");
    expect(sql).toContain("content_snapshot");
    expect(sql).toContain("retry_count");
    expect(sql).toContain("provider_mail_id");
    expect(sql).toContain("mail_transaction_id");
    expect(sql).toContain("enforce_campaign_mailing_submitted_immutability");
    expect(sql).toContain("add column if not exists campaign_id");
    expect(sql).toContain("add column if not exists campaign_mailing_id");
    expect(sql).toMatch(/manual one-off cards/i);
  });
});

describe("Phase 2 campaign RLS contracts", () => {
  it("CODE_REVIEW_PASS: 025 reuses is_organization_member (active-only) and verifies helpers", () => {
    const sql = readMigration("025");
    expect(sql).toContain("campaign_audit_events");
    expect(sql).toContain("public.is_organization_member(organization_id)");
    expect(sql).toContain("missing public.is_organization_member");
    expect(sql).toContain("missing public.is_organization_admin");
    expect(sql).toContain("missing public.is_platform_admin");

    const rbac = readMigration("009");
    expect(rbac).toContain("create or replace function public.is_organization_member");
    expect(rbac).toMatch(/om\.status = 'active'/);

    expect(sql).toContain("Members can view org campaign audit events");
    expect(sql).toMatch(/No authenticated INSERT[\s\S]*campaign_audit_events|Inserts via trusted backend/i);
  });

  it("CODE_REVIEW_PASS: campaign and mailing policies are organization-scoped", () => {
    const sql = readMigration("025");
    for (const policy of [
      "Members can view org campaigns",
      "Members can insert org campaigns",
      "Members can view org campaign mailings",
      "Members can view org customer milestones",
      "Authenticated users can view active occasions",
    ]) {
      expect(sql).toContain(policy);
    }
    expect(sql).toContain("status = 'draft'::public.campaign_status");
  });

  it("CODE_REVIEW_PASS: pending members are excluded via active-only helper (not has_organization_membership_record)", () => {
    const sql = readMigration("025");
    expect(sql).not.toContain("has_organization_membership_record(organization_id)");
    expect(sql).toMatch(/Pending\/inactive members cannot access campaign CRM data/);
  });
});

describe("Phase 2 occasion seed", () => {
  it("CODE_REVIEW_PASS: 026 seeds US federal/popular/milestone occasions idempotently", () => {
    const sql = readMigration("026");
    expect(sql).toContain("on conflict (slug) do update");
    for (const slug of [
      "birthday",
      "home-anniversary",
      "closing-anniversary",
      "us-thanksgiving",
      "us-mothers-day",
      "us-christmas",
      "us-independence-day",
      "us-memorial-day",
    ]) {
      expect(sql).toContain(`'${slug}'`);
    }
    expect(sql).toContain("nth_weekday");
    expect(sql).toContain("milestone_annual");
    expect(sql).toContain("fixed_md");
  });
});

describe("Phase 2 documentation deliverables", () => {
  it("CODE_REVIEW_PASS: schema + compatibility docs exist", () => {
    const schema = readRepo("supabase/campaigns.md");
    expect(schema).toContain("021_campaign_enums.sql");
    expect(schema).toContain("026_seed_us_occasions.sql");
    expect(schema).toContain("is_organization_member");

    const report = readRepo(
      "docs/architecture/campaign-phase2-compatibility.md"
    );
    expect(report).toContain("021");
    expect(report).toContain("Historical migrations");
    expect(report).toMatch(/Unchanged/);
    expect(report).toContain("No frontend");
  });
});
