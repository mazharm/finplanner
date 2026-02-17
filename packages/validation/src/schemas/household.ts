import { z } from 'zod';
import { filingStatusSchema, personIdSchema } from './common.js';
import { VALID_STATE_CODES } from '@finplanner/domain';

export const socialSecuritySchema = z.object({
  claimAge: z.number().int().min(62).max(70),
  piaMonthlyAtFRA: z.number().min(0).optional(),
  estimatedMonthlyBenefitAtClaim: z.number().min(0),
  colaPct: z.number().min(-100).max(100),
});

const validStateCodes = new Set(VALID_STATE_CODES);

export const personProfileSchema = z.object({
  id: personIdSchema,
  birthYear: z.number().int().min(1900).max(2100),
  currentAge: z.number().int().min(0).max(120),
  retirementAge: z.number().int().min(0).max(120),
  lifeExpectancy: z.number().int().min(1).max(120),
  socialSecurity: socialSecuritySchema.optional(),
}).refine(
  (data) => data.lifeExpectancy >= data.currentAge,
  { message: 'lifeExpectancy must be >= currentAge', path: ['lifeExpectancy'] }
).refine(
  (data) => data.lifeExpectancy >= data.retirementAge,
  { message: 'lifeExpectancy must be >= retirementAge', path: ['lifeExpectancy'] }
).refine(
  (data) => {
    // Tolerance of ±2 accounts for: (1) birthday not yet reached this year,
    // and (2) data created near year boundary then loaded in the next year.
    const currentYear = new Date().getFullYear();
    const impliedAge = currentYear - data.birthYear;
    return Math.abs(impliedAge - data.currentAge) <= 2;
  },
  { message: 'currentAge must be consistent with birthYear (within 2 years)', path: ['currentAge'] }
);

export const householdProfileSchema = z.object({
  maritalStatus: z.enum(['single', 'married']),
  filingStatus: filingStatusSchema,
  stateOfResidence: z.string().refine(
    (code) => validStateCodes.has(code),
    { message: 'Must be a valid US state code (e.g., CA, NY, TX)' },
  ),
  primary: personProfileSchema,
  spouse: personProfileSchema.optional(),
}).superRefine((data, ctx) => {
  // Single households cannot have a spouse
  if (data.maritalStatus === 'single' && data.spouse !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Single households cannot have a spouse',
      path: ['spouse'],
    });
  }
  // Married households must have a spouse
  if (data.maritalStatus === 'married' && data.spouse === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Married households must have a spouse',
      path: ['spouse'],
    });
  }
  // MFJ filing status requires married marital status
  if (data.filingStatus === 'mfj' && data.maritalStatus !== 'married') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'MFJ filing status requires married marital status',
      path: ['filingStatus'],
    });
  }
  // MFJ filing status requires spouse
  if (data.filingStatus === 'mfj' && data.spouse === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Married filing jointly requires a spouse profile',
      path: ['spouse'],
    });
  }
  // Survivor filing status is valid (no rejection) — it implies married status
  // with a deceased spouse, so spouse profile is optional for survivor
});
