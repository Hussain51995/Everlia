  
export const DEFAULT_PROVIDER_ACCOUNT_BUDGET = 50;

export type ProviderBudgetConfig = {
  monthlyBudget: number;
  apiAccountScope: string;
  enforceBudgetForMock: boolean;
};

export function resolveProviderMonthlyBudget(input?: {
  settingsBudget?: number | null;
  env?: NodeJS.ProcessEnv;
}): number {
  const env = input?.env ?? process.env;
  const fromPi = parsePositiveInt(env.PROPERTY_INTELLIGENCE_MONTHLY_BUDGET);
  if (fromPi != null) return fromPi;

  const fromTester = parsePositiveInt(env.RENTCAST_TEST_MONTHLY_BUDGET);
  if (fromTester != null) return fromTester;

  if (
    input?.settingsBudget != null &&
    Number.isFinite(input.settingsBudget) &&
    input.settingsBudget >= 0
  ) {
    return Math.floor(input.settingsBudget);
  }

  return DEFAULT_PROVIDER_ACCOUNT_BUDGET;
}

export function resolveApiAccountScope(
  env: NodeJS.ProcessEnv = process.env
): string {
  const raw = env.PROPERTY_INTELLIGENCE_API_ACCOUNT_SCOPE?.trim();
  return raw && raw.length > 0 ? raw : "default";
}

function parsePositiveInt(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
