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

describe("Property Intelligence migrations — chain integrity", () => {
  it("CODE_REVIEW_PASS: migrations 036–044 exist after 035", () => {
    const names = migrationNames();
    expect(names.some((f) => f.startsWith("035_"))).toBe(true);
    for (const n of [
      "036",
      "037",
      "038",
      "039",
      "040",
      "041",
      "042",
      "043",
      "044",
    ]) {
      expect(names.some((f) => f.startsWith(`${n}_`))).toBe(true);
    }
  });

  it("CODE_REVIEW_PASS: PI migrations do not rewrite history or CRM tables", () => {
    for (const n of ["036", "037", "038", "039"]) {
      const sql = readMigration(n);
      expect(sql).not.toMatch(
        /drop table if exists public\.(customers|greeting_cards|organizations|campaigns|qr_tokens)\b/i
      );
      expect(sql).not.toMatch(
        /alter table public\.customers\s+drop\s+column/i
      );
      expect(sql).not.toMatch(/delete from public\.customers/i);
      expect(sql).not.toMatch(
        /create or replace function public\.handle_new_user\b/
      );
      expect(sql).not.toMatch(
        /create or replace function public\.is_organization_member\b/
      );
    }
  });

  it("CODE_REVIEW_PASS: school data is absent from PI schema objects", () => {
    for (const n of ["036", "037", "038"]) {
      const sql = readMigration(n).toLowerCase();
      expect(sql).not.toMatch(
        /create\s+type\s+public\.\w*school|create\s+table\s+public\.\w*school|\bschool[_\s]?district\b|\bschool_rating\b/
      );
      expect(sql).not.toMatch(/'school[s]?'/);
    }
  });
});

describe("036 enums and settings", () => {
  it("CODE_REVIEW_PASS: defines required enums and five categories", () => {
    const sql = readMigration("036");
    expect(sql).toContain("property_intelligence_category");
    for (const c of [
      "property_details",
      "property_valuation",
      "nearby_houses",
      "nearby_land",
      "market_statistics",
    ]) {
      expect(sql).toContain(`'${c}'`);
    }
    expect(sql).toContain("property_intelligence_cache_status");
    expect(sql).toContain("property_intelligence_usage_outcome");
    expect(sql).toContain("property_intelligence_fetch_lock_status");
  });

  it("CODE_REVIEW_PASS: settings singleton defaults feature_enabled false", () => {
    const sql = readMigration("036");
    expect(sql).toContain("property_intelligence_settings");
    expect(sql).toContain("feature_enabled boolean not null default false");
    expect(sql).toContain("browser_caching_enabled");
    expect(sql).toContain("default_provider_id");
    expect(sql).toContain("config_version");
    expect(sql).toContain("monthly_api_budget");
    expect(sql).toContain("updated_by");
  });

  it("CODE_REVIEW_PASS: category TTL defaults and browser<=database constraint", () => {
    const sql = readMigration("036");
    expect(sql).toContain("property_intelligence_category_settings");
    expect(sql).toContain("browser_ttl_seconds");
    expect(sql).toContain("database_ttl_seconds");
    expect(sql).toContain("search_radius_miles");
    expect(sql).toContain("listing_limit");
    expect(sql).toContain("query_filters");
    expect(sql).toContain(
      "browser_ttl_seconds <= database_ttl_seconds"
    );
    expect(sql).toContain("604800"); 
    expect(sql).toContain("15552000");
    expect(sql).toContain("86400");
    expect(sql).toContain("2592000");
    expect(sql).toContain("21600");
  });

  it("CODE_REVIEW_PASS: deny-by-default RLS on settings tables", () => {
    const sql = readMigration("036");
    expect(sql).toContain(
      "alter table public.property_intelligence_settings enable row level security"
    );
    expect(sql).toContain(
      "alter table public.property_intelligence_category_settings enable row level security"
    );
    expect(sql).toMatch(/using \(false\)/);
  });

  it("CODE_REVIEW_PASS: foundation settings do not redefine tester tables", () => {
    const sql = readMigration("036");
    expect(sql).not.toContain("rentcast_tester_usage");
    expect(sql).not.toContain("rentcast_tester_reserve_calls");
  });
});

describe("039 shared budget consume/release", () => {
  it("CODE_REVIEW_PASS: consume/release RPCs and tester shares PI budget", () => {
    const sql = readMigration("039");
    expect(sql).toContain("property_intelligence_consume_units");
    expect(sql).toContain("property_intelligence_release_units");
    expect(sql).toContain("rentcast_tester_reserve_calls");
    expect(sql).toContain("property_intelligence_reserve_units");
    expect(sql).toContain("cannot bypass");
    expect(sql).toContain("from public.rentcast_tester_usage");
  });
});

describe("037 identity and cache", () => {
  it("CODE_REVIEW_PASS: identity + aliases without customer duplication", () => {
    const sql = readMigration("037");
    expect(sql).toContain("create table if not exists public.property_identities");
    expect(sql).toContain("unit_normalized");
    expect(sql).toContain("normalized_key");
    expect(sql).toContain(
      "create table if not exists public.property_address_aliases"
    );
    expect(sql).not.toMatch(/references public\.customers/);
    expect(sql).not.toMatch(/alter table public\.customers/);
  });

  it("CODE_REVIEW_PASS: single provider-independent cache table", () => {
    const sql = readMigration("037");
    expect(sql).toContain(
      "create table if not exists public.property_intelligence_cache"
    );
    expect(sql).toContain("cache_key");
    expect(sql).toContain("provider_dataset");
    expect(sql).toContain("request_params_fingerprint");
    expect(sql).toContain("schema_version");
    expect(sql).toContain("access_scope");
    expect(sql).toContain("source_data_at");
    expect(sql).toContain("invalidated_at");
    expect(sql).toContain("nulls not distinct");
    expect(sql).not.toContain("rentcast_cache");
    expect(sql).not.toContain("zillow_cache");
    expect(sql).not.toContain("mls_cache");
  });

  it("CODE_REVIEW_PASS: cache forbids org-private payload keys and enables RLS", () => {
    const sql = readMigration("037");
    expect(sql).toContain("organization_id");
    expect(sql).toContain("personal_message");
    expect(sql).toContain("api_key");
    expect(sql).toContain(
      "alter table public.property_intelligence_cache enable row level security"
    );
    expect(sql).toContain("property_intelligence_cache_expires_at_idx");
  });
});

describe("038 usage and locks", () => {
  it("CODE_REVIEW_PASS: usage ledger and budget counters with reserve RPC", () => {
    const sql = readMigration("038");
    expect(sql).toContain("property_intelligence_usage");
    expect(sql).toContain("billing_period");
    expect(sql).toContain("units_reserved");
    expect(sql).toContain("units_consumed");
    expect(sql).toContain("error_message_sanitized");
    expect(sql).toContain("property_intelligence_budget_counters");
    expect(sql).toContain(
      "create or replace function public.property_intelligence_reserve_units"
    );
    expect(sql).toContain("grant execute on function public.property_intelligence_reserve_units");
    expect(sql).toContain("to service_role");
  });

  it("CODE_REVIEW_PASS: fetch locks and claim/complete/fail/expire RPCs", () => {
    const sql = readMigration("038");
    expect(sql).toContain("property_intelligence_fetch_locks");
    expect(sql).toContain("property_intelligence_try_claim_fetch");
    expect(sql).toContain("property_intelligence_complete_fetch");
    expect(sql).toContain("property_intelligence_fail_fetch");
    expect(sql).toContain("property_intelligence_expire_stale_locks");
    expect(sql).toContain("for update skip locked");
    expect(sql).not.toContain("claim_campaign_mailings");
  });

  it("CODE_REVIEW_PASS: usage/lock tables are deny-by-default RLS", () => {
    const sql = readMigration("038");
    for (const table of [
      "property_intelligence_usage",
      "property_intelligence_budget_counters",
      "property_intelligence_fetch_locks",
    ]) {
      expect(sql).toContain(
        `alter table public.${table} enable row level security`
      );
    }
  });
});

describe("040 try_claim_fetch expires_at ambiguity fix", () => {
  it("CODE_REVIEW_PASS: qualifies lock expires_at and uses OUT-safe locals", () => {
    const sql = readMigration("040");
    expect(sql).toContain("property_intelligence_try_claim_fetch");
    expect(sql).toContain("fl.expires_at");
    expect(sql).toContain("v_out_expires_at");
    expect(sql).toContain("create or replace function");
  });
});

describe("043 redis TTL column rename", () => {
  it("CODE_REVIEW_PASS: renames database_ttl_seconds to redis_ttl_seconds", () => {
    const sql = readMigration("043");
    expect(sql).toContain("rename column database_ttl_seconds to redis_ttl_seconds");
    expect(sql).toContain("browser_ttl_seconds <= redis_ttl_seconds");
    expect(sql).not.toMatch(/drop table/i);
  });
});

describe("044 drop obsolete payload cache", () => {
  it("CODE_REVIEW_PASS: drops payload cache table and status enum without CASCADE", () => {
    const sql = readMigration("044");
    expect(sql).toContain("to_regclass('public.property_intelligence_cache')");
    expect(sql).toContain("drop table public.property_intelligence_cache");
    expect(sql).toContain("drop type if exists public.property_intelligence_cache_status");
    expect(sql).toContain("drop column if exists result_cache_id");
    expect(sql).not.toMatch(/drop\s+table\s+.+cascade/i);
    expect(sql).not.toMatch(/drop table if exists public\.(customers|greeting_cards|organizations)\b/i);
    expect(sql).toContain("property_intelligence_try_claim_fetch");
    expect(sql).toContain("v_out_expires_at");
  });
});

