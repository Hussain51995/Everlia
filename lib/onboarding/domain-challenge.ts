import { createHash, randomBytes } from "crypto";
import { promises as dns } from "dns";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractEmailDomain } from "@/lib/onboarding/normalize-email";
import type { OrganizationDomain } from "@/lib/types/auth";

export type DomainChallenge = OrganizationDomain & {
  txt_record_host: string | null;
  txt_record_value: string | null;
  verification_token?: string | null;
};

function buildTxtHost(domain: string) {
  return `_everlia-challenge.${domain}`;
}

function buildTxtValue(token: string) {
  return `everlia-verify=${token}`;
}

function generateToken() {
  return randomBytes(24).toString("base64url");
}

export function hashDomainChallengeToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function ensureDomainVerificationChallenge(params: {
  organizationId: string;
  domain: string;
}): Promise<{
  domain: DomainChallenge;
  challenge: {
    host: string;
    value: string;
    instructions: string;
  };
}> {
  const admin = createAdminClient();
  const domain = extractEmailDomain(params.domain);
  if (!domain) {
    throw new Error("Domain is invalid");
  }

  const { data: existing, error: existingError } = await admin
    .from("organization_domains")
    .select(
      "id, organization_id, domain, verification_status, verification_method, verified_at, created_at, updated_at, verification_token, txt_record_host, txt_record_value"
    )
    .eq("organization_id", params.organizationId)
    .eq("domain", domain)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing?.verification_status === "verified") {
    return {
      domain: existing as DomainChallenge,
      challenge: {
        host: existing.txt_record_host ?? buildTxtHost(domain),
        value: existing.txt_record_value ?? "",
        instructions:
          "This domain is already verified. No further DNS changes are required.",
      },
    };
  }

  if (
    existing &&
    existing.verification_status === "pending" &&
    existing.verification_token &&
    existing.txt_record_host &&
    existing.txt_record_value
  ) {
    return {
      domain: existing as DomainChallenge,
      challenge: {
        host: existing.txt_record_host,
        value: existing.txt_record_value,
        instructions: `Add a DNS TXT record on ${existing.txt_record_host} with value ${existing.txt_record_value}`,
      },
    };
  }

  const token = generateToken();
  const host = buildTxtHost(domain);
  const value = buildTxtValue(token);

  if (existing) {
    const { data, error } = await admin
      .from("organization_domains")
      .update({
        verification_status: "pending",
        verification_method: "dns_txt",
        verification_token: token,
        txt_record_host: host,
        txt_record_value: value,
        verified_at: null,
      })
      .eq("id", existing.id)
      .select(
        "id, organization_id, domain, verification_status, verification_method, verified_at, created_at, updated_at, verification_token, txt_record_host, txt_record_value"
      )
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to refresh domain challenge");
    }

    return {
      domain: data as DomainChallenge,
      challenge: {
        host,
        value,
        instructions: `Add a DNS TXT record on ${host} with value ${value}`,
      },
    };
  }

  const { data, error } = await admin
    .from("organization_domains")
    .insert({
      organization_id: params.organizationId,
      domain,
      verification_status: "pending",
      verification_method: "dns_txt",
      verification_token: token,
      txt_record_host: host,
      txt_record_value: value,
    })
    .select(
      "id, organization_id, domain, verification_status, verification_method, verified_at, created_at, updated_at, verification_token, txt_record_host, txt_record_value"
    )
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return ensureDomainVerificationChallenge(params);
    }
    throw new Error(error?.message ?? "Failed to create domain challenge");
  }

  return {
    domain: data as DomainChallenge,
    challenge: {
      host,
      value,
      instructions: `Add a DNS TXT record on ${host} with value ${value}`,
    },
  };
}

export async function lookupTxtRecords(host: string): Promise<string[]> {
  try {
    const records = await dns.resolveTxt(host);
    return records.map((chunks) => chunks.join(""));
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "SERVFAIL") {
      return [];
    }
    throw error;
  }
}

export async function verifyDomainOwnershipViaDns(params: {
  domainId: string;
}): Promise<DomainChallenge> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("organization_domains")
    .select(
      "id, organization_id, domain, verification_status, verification_method, verified_at, created_at, updated_at, verification_token, txt_record_host, txt_record_value"
    )
    .eq("id", params.domainId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) throw new Error("Organization domain not found");

  if (row.verification_status === "verified") {
    return row as DomainChallenge;
  }

  const host = row.txt_record_host as string | null;
  const expected = row.txt_record_value as string | null;
  if (!host || !expected) {
    throw new Error("Domain challenge has not been initialized");
  }

  const records = await lookupTxtRecords(host);
  const matched = records.some(
    (record) =>
      record.trim() === expected.trim() || record.includes(expected.trim())
  );

  if (!matched) {
    throw new Error(
      `DNS TXT record not found on ${host}. Publish "${expected}" and try again.`
    );
  }

  const { data: updated, error: updateError } = await admin
    .from("organization_domains")
    .update({
      verification_status: "verified",
      verification_method: "dns_txt",
      verified_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .select(
      "id, organization_id, domain, verification_status, verification_method, verified_at, created_at, updated_at, verification_token, txt_record_host, txt_record_value"
    )
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message ?? "Failed to mark domain verified");
  }

  return updated as DomainChallenge;
}

export async function verifyDomainDnsChallenge(params: {
  organizationDomainId: string;
}) {
  return verifyDomainOwnershipViaDns({ domainId: params.organizationDomainId });
}

