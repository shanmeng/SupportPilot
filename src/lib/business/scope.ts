import { z } from "zod";

export const environments = ["production", "sandbox"] as const;
export type Environment = (typeof environments)[number];

/** Business records are always read inside one account and one environment. */
export type RecordScope = { accountId: string; environment: Environment };
export type InvestigationScope = RecordScope & { paymentId: string };

export const ACCOUNT_ID = /^acct_[a-z0-9_]{1,64}$/;
export const PAYMENT_ID = /^pay_[a-z0-9_]{1,64}$/;

/** Scope as entered by the engineer; fields may be missing so the user can be asked for them (Flow C). */
export const scopeInputSchema = z
  .object({
    accountId: z.string().trim().regex(ACCOUNT_ID, "accountId must look like acct_bg_001").optional(),
    environment: z.enum(environments, { error: "environment must be production or sandbox" }).optional(),
    paymentId: z.string().trim().regex(PAYMENT_ID, "paymentId must look like pay_bg_001_0003").optional(),
  })
  .strict();

export type ScopeInput = z.infer<typeof scopeInputSchema>;

export function missingScopeFields(scope: ScopeInput): string[] {
  const missing: string[] = [];
  if (!scope.accountId) missing.push("account ID");
  if (!scope.environment) missing.push("environment");
  if (!scope.paymentId) missing.push("payment ID");
  return missing;
}

const RECORD_ID = /\b(?:acct|pay|evt|del|we)_[a-z0-9_]+/;

/** True when free text names a business record, which needs an explicit scope before any lookup. */
export function mentionsRecordId(text: string): boolean {
  return RECORD_ID.test(text);
}
