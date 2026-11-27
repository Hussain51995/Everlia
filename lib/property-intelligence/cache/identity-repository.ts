import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAliasKey } from "@/lib/property-intelligence/address-normalization";
import type { PropertyIdentity } from "@/lib/types/property-intelligence";
import type { PropertyIdentityRecord } from "@/lib/property-intelligence/cache/types";

export interface PropertyIdentityRepository {
  findByNormalizedKey(
    normalizedKey: string
  ): Promise<PropertyIdentityRecord | null>;
  findByAliasKey(aliasKey: string): Promise<PropertyIdentityRecord | null>;
  ensureIdentity(input: {
    identity: PropertyIdentity;
    rawAddress: string;
    aliasKey?: string;
  }): Promise<PropertyIdentityRecord>;
  addProviderAlias(input: {
    identityId: string;
    rawAddress: string;
    aliasKey?: string;
  }): Promise<void>;
}

function toRecord(row: Record<string, unknown>): PropertyIdentityRecord {
  return {
    id: String(row.id),
    normalizedKey: String(row.normalized_key),
    countryCode: String(row.country_code ?? "US"),
    addressLine1Normalized: (row.address_line1_normalized as string) ?? null,
    unitNormalized: (row.unit_normalized as string) ?? null,
    localityNormalized: (row.locality_normalized as string) ?? null,
    adminAreaNormalized: (row.admin_area_normalized as string) ?? null,
    postalNormalized: (row.postal_normalized as string) ?? null,
    displayAddress: (row.display_address as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export class MemoryPropertyIdentityRepository
  implements PropertyIdentityRepository
{
  readonly identities = new Map<string, PropertyIdentityRecord>();
  readonly aliases = new Map<string, string>();
  private readonly byId = new Map<string, PropertyIdentityRecord>();

  async findByNormalizedKey(
    normalizedKey: string
  ): Promise<PropertyIdentityRecord | null> {
    return this.identities.get(normalizedKey) ?? null;
  }

  async findByAliasKey(
    aliasKey: string
  ): Promise<PropertyIdentityRecord | null> {
    const id = this.aliases.get(aliasKey);
    if (!id) return null;
    return this.byId.get(id) ?? null;
  }

  async ensureIdentity(input: {
    identity: PropertyIdentity;
    rawAddress: string;
    aliasKey?: string;
  }): Promise<PropertyIdentityRecord> {
    const aliasKey = input.aliasKey ?? buildAliasKey(input.rawAddress);
    const existingAlias = await this.findByAliasKey(aliasKey);
    if (existingAlias) return existingAlias;

    let record = this.identities.get(input.identity.normalizedKey);
    if (!record) {
      const now = new Date().toISOString();
      record = {
        id: randomUUID(),
        normalizedKey: input.identity.normalizedKey,
        countryCode: input.identity.components.countryCode,
        addressLine1Normalized: input.identity.components.line1,
        unitNormalized: input.identity.components.unit,
        localityNormalized: input.identity.components.city,
        adminAreaNormalized: input.identity.components.adminArea,
        postalNormalized: input.identity.components.postalCode,
        displayAddress: input.identity.components.formatted,
        metadata: {},
        createdAt: now,
        updatedAt: now,
      };
      this.identities.set(record.normalizedKey, record);
      this.byId.set(record.id, record);
    }

    this.aliases.set(aliasKey, record.id);
    return record;
  }

  async addProviderAlias(input: {
    identityId: string;
    rawAddress: string;
    aliasKey?: string;
  }): Promise<void> {
    const record = this.byId.get(input.identityId);
    if (!record) return;
    const aliasKey = input.aliasKey ?? buildAliasKey(input.rawAddress);
    this.aliases.set(aliasKey, record.id);
  }
}

export class SupabasePropertyIdentityRepository
  implements PropertyIdentityRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async findByNormalizedKey(
    normalizedKey: string
  ): Promise<PropertyIdentityRecord | null> {
    const { data, error } = await this.client
      .from("property_identities")
      .select("*")
      .eq("normalized_key", normalizedKey)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toRecord(data as Record<string, unknown>) : null;
  }

  async findByAliasKey(
    aliasKey: string
  ): Promise<PropertyIdentityRecord | null> {
    const { data, error } = await this.client
      .from("property_address_aliases")
      .select("identity_id, property_identities(*)")
      .eq("normalized_alias_key", aliasKey)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const identity = (data as { property_identities?: unknown })
      .property_identities;
    const row = Array.isArray(identity) ? identity[0] : identity;
    return row ? toRecord(row as Record<string, unknown>) : null;
  }

  async ensureIdentity(input: {
    identity: PropertyIdentity;
    rawAddress: string;
    aliasKey?: string;
  }): Promise<PropertyIdentityRecord> {
    const aliasKey = input.aliasKey ?? buildAliasKey(input.rawAddress);
    const byAlias = await this.findByAliasKey(aliasKey);
    if (byAlias) return byAlias;

    let record = await this.findByNormalizedKey(input.identity.normalizedKey);
    if (!record) {
      const { data, error } = await this.client
        .from("property_identities")
        .upsert(
          {
            normalized_key: input.identity.normalizedKey,
            country_code: input.identity.components.countryCode,
            address_line1_normalized: input.identity.components.line1,
            unit_normalized: input.identity.components.unit,
            locality_normalized: input.identity.components.city,
            admin_area_normalized: input.identity.components.adminArea,
            postal_normalized: input.identity.components.postalCode,
            display_address: input.identity.components.formatted,
            metadata: {},
          },
          { onConflict: "normalized_key" }
        )
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      record = toRecord(data as Record<string, unknown>);
    }

    await this.client.from("property_address_aliases").upsert(
      {
        identity_id: record.id,
        raw_address: input.rawAddress,
        normalized_alias_key: aliasKey,
      },
      { onConflict: "normalized_alias_key", ignoreDuplicates: true }
    );

    return record;
  }

  async addProviderAlias(input: {
    identityId: string;
    rawAddress: string;
    aliasKey?: string;
  }): Promise<void> {
    const aliasKey = input.aliasKey ?? buildAliasKey(input.rawAddress);
    const { error } = await this.client.from("property_address_aliases").upsert(
      {
        identity_id: input.identityId,
        raw_address: input.rawAddress,
        normalized_alias_key: aliasKey,
      },
      { onConflict: "normalized_alias_key", ignoreDuplicates: true }
    );
    if (error) throw new Error(error.message);
  }
}
