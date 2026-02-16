import { z } from 'zod';
import { filingStatusSchema, personIdSchema } from './common.js';

export const socialSecuritySchema = z.object({
  claimAge: z.number().int().min(62).max(70),
  piaMonthlyAtFRA: z.number().min(0).optional(),
  estimatedMonthlyBenefitAtClaim: z.number().min(0),
  colaPct: z.number().min(-100).max(100),
});

export const personProfileSchema = z.object({
  id: personIdSchema,
  birthYear: z.number().int().min(1900).max(2100),
  currentAge: z.number().int().min(0).max(120),
  retirementAge: z.number().int().min(0).max(120),
  lifeExpectancy: z.number().int().min(1).max(120),
  socialSecurity: socialSecuritySchema.optional(),
});

export const householdProfileSchema = z.object({
  maritalStatus: z.enum(['single', 'married']),
  filingStatus: filingStatusSchema,
  stateOfResidence: z.string().length(2),
  primary: personProfileSchema,
  spouse: personProfileSchema.optional(),
}).refine(
  (data) => data.maritalStatus !== 'single' || data.spouse === undefined,
  { message: 'Single households cannot have a spouse', path: ['spouse'] }
).refine(
  (data) => data.maritalStatus !== 'married' || data.spouse !== undefined,
  { message: 'Married households must have a spouse', path: ['spouse'] }
).refine(
  (data) => data.filingStatus !== 'mfj' || data.maritalStatus === 'married',
  { message: 'MFJ filing status requires married marital status', path: ['filingStatus'] }
);
