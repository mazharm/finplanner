import { z } from 'zod';
import { filingStatusSchema } from './common.js';

export const yearResultSchema = z.object({
  year: z.number().int(),
  agePrimary: z.number().int(),
  ageSpouse: z.number().int().optional(),
  isSurvivorPhase: z.boolean(),
  filingStatus: filingStatusSchema,
  targetSpend: z.number().finite(),
  actualSpend: z.number().finite(),
  grossIncome: z.number().finite(),
  socialSecurityIncome: z.number().finite(),
  nqdcDistributions: z.number().finite(),
  rmdTotal: z.number().finite(),
  pensionAndOtherIncome: z.number().finite(),
  rothWithdrawals: z.number().finite(),
  withdrawalsByAccount: z.record(z.string(), z.number().finite()),
  taxesFederal: z.number().finite(),
  taxesState: z.number().finite(),
  taxableOrdinaryIncome: z.number().finite(),
  taxableCapitalGains: z.number().finite(),
  netSpendable: z.number().finite(),
  shortfall: z.number().finite().min(0),
  surplus: z.number().finite().min(0),
  endBalanceByAccount: z.record(z.string(), z.number().finite()),
  costBasisByAccount: z.record(z.string(), z.number().finite()).optional(),
});

export const planResultSchema = z.object({
  summary: z.object({
    successProbability: z.number().finite().min(0).max(1).optional(),
    medianTerminalValue: z.number().finite().optional(),
    worstCaseShortfall: z.number().finite().min(0).optional(),
  }),
  yearly: z.array(yearResultSchema).max(200),
  assumptionsUsed: z.record(z.string(), z.union([z.string(), z.number().finite(), z.boolean(), z.null()])),
});
