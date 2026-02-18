import { z } from 'zod';

export const filingStatusSchema = z.enum(['single', 'mfj', 'survivor', 'hoh']);
export const accountTypeSchema = z.enum(['taxable', 'taxDeferred', 'deferredComp', 'roth']);
export const simulationModeSchema = z.enum(['deterministic', 'historical', 'stress', 'monteCarlo']);
export const taxYearStatusSchema = z.enum(['draft', 'ready', 'filed', 'amended']);
export const checklistItemStatusSchema = z.enum(['pending', 'received', 'not_applicable', 'waived']);
export const anomalySeveritySchema = z.enum(['info', 'warning', 'critical']);
export const taxFormTypeSchema = z.enum(['W-2', '1099-INT', '1099-DIV', '1099-R', '1099-B', '1099-MISC', '1099-NEC', 'K-1', '1098', '1098-T', '1098-E', 'other']);
export const ndjsonRecordTypeSchema = z.enum(['header', 'household', 'account', 'incomeStream', 'adjustment', 'appConfig', 'taxYear', 'taxDocument', 'checklistItem', 'anomaly', 'retirementPlan', 'simulationResult']);
export const ownerSchema = z.enum(['primary', 'spouse', 'joint']);
export const personIdSchema = z.enum(['primary', 'spouse']);
