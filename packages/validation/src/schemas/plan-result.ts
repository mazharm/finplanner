import { z } from 'zod';
import { filingStatusSchema } from './common.js';

export const yearResultSchema = z.object({
  year: z.number().int(),
  agePrimary: z.number().int(),
  ageSpouse: z.number().int().optional(),
  isSurvivorPhase: z.boolean(),
  filingStatus: filingStatusSchema,
  targetSpend: z.number(),
  actualSpend: z.number(),
  grossIncome: z.number(),
  socialSecurityIncome: z.number(),
  nqdcDistributions: z.number(),
  rmdTotal: z.number(),
  pensionAndOtherIncome: z.number(),
  rothWithdrawals: z.number(),
  withdrawalsByAccount: z.record(z.string(), z.number()),
  taxesFederal: z.number(),
  taxesState: z.number(),
  taxableOrdinaryIncome: z.number(),
  taxableCapitalGains: z.number(),
  netSpendable: z.number(),
  shortfall: z.number().min(0),
  surplus: z.number().min(0),
  endBalanceByAccount: z.record(z.string(), z.number()),
  costBasisByAccount: z.record(z.string(), z.number()).optional(),
});

export const planResultSchema = z.object({
  summary: z.object({
    successProbability: z.number().min(0).max(1).optional(),
    medianTerminalValue: z.number().optional(),
    worstCaseShortfall: z.number().min(0).optional(),
  }),
  yearly: z.array(yearResultSchema),
  assumptionsUsed: z.record(z.string(), z.unknown()),
});
