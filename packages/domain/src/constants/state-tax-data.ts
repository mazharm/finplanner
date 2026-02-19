import type { StateEntry } from '../types/data-assets.js';

/**
 * Canonical state tax data — single source of truth.
 * Used by both the tax computation module and the retirement simulation engine.
 */
export const STATE_TAX_DATA: readonly StateEntry[] = [
  { stateCode: 'AL', stateName: 'Alabama', incomeRate: 5.0, capitalGainsRate: 5.0, ssTaxExempt: 'yes', stateStandardDeduction: 3_000 },
  { stateCode: 'AK', stateName: 'Alaska', incomeRate: 0, capitalGainsRate: 0, ssTaxExempt: 'yes' },
  { stateCode: 'AZ', stateName: 'Arizona', incomeRate: 2.5, capitalGainsRate: 2.5, ssTaxExempt: 'yes', stateStandardDeduction: 14_600 },
  { stateCode: 'AR', stateName: 'Arkansas', incomeRate: 4.4, capitalGainsRate: 4.4, ssTaxExempt: 'yes', stateStandardDeduction: 2_340 },
  { stateCode: 'CA', stateName: 'California', incomeRate: 13.3, capitalGainsRate: 13.3, ssTaxExempt: 'yes', stateStandardDeduction: 5_540, brackets: [[10_412, 1.0], [24_684, 2.0], [38_959, 4.0], [54_081, 6.0], [68_350, 8.0], [349_137, 9.3], [418_961, 10.3], [698_271, 11.3], [1_000_000, 12.3], [Infinity, 13.3]] },
  { stateCode: 'CO', stateName: 'Colorado', incomeRate: 4.4, capitalGainsRate: 4.4, ssTaxExempt: 'partial', stateStandardDeduction: 14_600 },
  { stateCode: 'CT', stateName: 'Connecticut', incomeRate: 6.99, capitalGainsRate: 6.99, ssTaxExempt: 'partial', stateStandardDeduction: 0 },
  { stateCode: 'DE', stateName: 'Delaware', incomeRate: 6.6, capitalGainsRate: 6.6, ssTaxExempt: 'yes', stateStandardDeduction: 3_250 },
  { stateCode: 'FL', stateName: 'Florida', incomeRate: 0, capitalGainsRate: 0, ssTaxExempt: 'yes' },
  { stateCode: 'GA', stateName: 'Georgia', incomeRate: 5.49, capitalGainsRate: 5.49, ssTaxExempt: 'yes', stateStandardDeduction: 5_400 },
  { stateCode: 'HI', stateName: 'Hawaii', incomeRate: 11.0, capitalGainsRate: 7.25, ssTaxExempt: 'yes', stateStandardDeduction: 2_200 },
  { stateCode: 'ID', stateName: 'Idaho', incomeRate: 5.8, capitalGainsRate: 5.8, ssTaxExempt: 'yes', stateStandardDeduction: 14_600 },
  { stateCode: 'IL', stateName: 'Illinois', incomeRate: 4.95, capitalGainsRate: 4.95, ssTaxExempt: 'yes', stateStandardDeduction: 0 },
  { stateCode: 'IN', stateName: 'Indiana', incomeRate: 3.05, capitalGainsRate: 3.05, ssTaxExempt: 'yes', stateStandardDeduction: 0 },
  { stateCode: 'IA', stateName: 'Iowa', incomeRate: 5.7, capitalGainsRate: 5.7, ssTaxExempt: 'yes', stateStandardDeduction: 2_210 },
  { stateCode: 'KS', stateName: 'Kansas', incomeRate: 5.7, capitalGainsRate: 5.7, ssTaxExempt: 'partial', stateStandardDeduction: 3_500 },
  { stateCode: 'KY', stateName: 'Kentucky', incomeRate: 4.0, capitalGainsRate: 4.0, ssTaxExempt: 'yes', stateStandardDeduction: 3_160 },
  { stateCode: 'LA', stateName: 'Louisiana', incomeRate: 4.25, capitalGainsRate: 4.25, ssTaxExempt: 'yes', stateStandardDeduction: 4_500 },
  { stateCode: 'ME', stateName: 'Maine', incomeRate: 7.15, capitalGainsRate: 7.15, ssTaxExempt: 'yes', stateStandardDeduction: 14_600 },
  { stateCode: 'MD', stateName: 'Maryland', incomeRate: 5.75, capitalGainsRate: 5.75, ssTaxExempt: 'yes', stateStandardDeduction: 2_550 },
  { stateCode: 'MA', stateName: 'Massachusetts', incomeRate: 5.0, capitalGainsRate: 5.0, ssTaxExempt: 'yes', stateStandardDeduction: 0, notes: 'Short-term gains taxed at 12%; long-term at 5%. 4% surtax on income above $1M.' },
  { stateCode: 'MI', stateName: 'Michigan', incomeRate: 4.25, capitalGainsRate: 4.25, ssTaxExempt: 'yes', stateStandardDeduction: 0 },
  { stateCode: 'MN', stateName: 'Minnesota', incomeRate: 9.85, capitalGainsRate: 9.85, ssTaxExempt: 'partial', stateStandardDeduction: 14_575, brackets: [[31_690, 5.35], [104_090, 6.8], [183_340, 7.85], [Infinity, 9.85]] },
  { stateCode: 'MS', stateName: 'Mississippi', incomeRate: 5.0, capitalGainsRate: 5.0, ssTaxExempt: 'yes', stateStandardDeduction: 2_300 },
  { stateCode: 'MO', stateName: 'Missouri', incomeRate: 4.95, capitalGainsRate: 4.95, ssTaxExempt: 'partial', stateStandardDeduction: 14_600 },
  { stateCode: 'MT', stateName: 'Montana', incomeRate: 6.75, capitalGainsRate: 6.75, ssTaxExempt: 'partial', stateStandardDeduction: 5_540 },
  { stateCode: 'NE', stateName: 'Nebraska', incomeRate: 6.64, capitalGainsRate: 6.64, ssTaxExempt: 'yes', stateStandardDeduction: 7_900 },
  { stateCode: 'NV', stateName: 'Nevada', incomeRate: 0, capitalGainsRate: 0, ssTaxExempt: 'yes' },
  { stateCode: 'NH', stateName: 'New Hampshire', incomeRate: 0, capitalGainsRate: 0, ssTaxExempt: 'yes' },
  { stateCode: 'NJ', stateName: 'New Jersey', incomeRate: 10.75, capitalGainsRate: 10.75, ssTaxExempt: 'yes', stateStandardDeduction: 0, brackets: [[20_000, 1.4], [35_000, 1.75], [40_000, 3.5], [75_000, 5.525], [500_000, 6.37], [1_000_000, 8.97], [Infinity, 10.75]] },
  { stateCode: 'NM', stateName: 'New Mexico', incomeRate: 5.9, capitalGainsRate: 5.9, ssTaxExempt: 'partial', stateStandardDeduction: 14_600 },
  { stateCode: 'NY', stateName: 'New York', incomeRate: 10.9, capitalGainsRate: 10.9, ssTaxExempt: 'yes', stateStandardDeduction: 8_000, brackets: [[8_500, 4.0], [11_700, 4.5], [13_900, 5.25], [80_650, 5.5], [215_400, 6.0], [1_077_550, 6.85], [5_000_000, 9.65], [25_000_000, 10.3], [Infinity, 10.9]] },
  { stateCode: 'NC', stateName: 'North Carolina', incomeRate: 4.5, capitalGainsRate: 4.5, ssTaxExempt: 'yes', stateStandardDeduction: 12_750 },
  { stateCode: 'ND', stateName: 'North Dakota', incomeRate: 2.5, capitalGainsRate: 2.5, ssTaxExempt: 'partial', stateStandardDeduction: 14_600 },
  { stateCode: 'OH', stateName: 'Ohio', incomeRate: 3.5, capitalGainsRate: 3.5, ssTaxExempt: 'yes', stateStandardDeduction: 0 },
  { stateCode: 'OK', stateName: 'Oklahoma', incomeRate: 4.75, capitalGainsRate: 4.75, ssTaxExempt: 'yes', stateStandardDeduction: 6_350 },
  { stateCode: 'OR', stateName: 'Oregon', incomeRate: 9.9, capitalGainsRate: 9.9, ssTaxExempt: 'yes', stateStandardDeduction: 2_745, brackets: [[4_050, 4.75], [10_200, 6.75], [125_000, 8.75], [Infinity, 9.9]] },
  { stateCode: 'PA', stateName: 'Pennsylvania', incomeRate: 3.07, capitalGainsRate: 3.07, ssTaxExempt: 'yes', stateStandardDeduction: 0 },
  { stateCode: 'RI', stateName: 'Rhode Island', incomeRate: 5.99, capitalGainsRate: 5.99, ssTaxExempt: 'partial', stateStandardDeduction: 10_550 },
  { stateCode: 'SC', stateName: 'South Carolina', incomeRate: 6.4, capitalGainsRate: 6.4, ssTaxExempt: 'yes', stateStandardDeduction: 14_600 },
  { stateCode: 'SD', stateName: 'South Dakota', incomeRate: 0, capitalGainsRate: 0, ssTaxExempt: 'yes' },
  { stateCode: 'TN', stateName: 'Tennessee', incomeRate: 0, capitalGainsRate: 0, ssTaxExempt: 'yes' },
  { stateCode: 'TX', stateName: 'Texas', incomeRate: 0, capitalGainsRate: 0, ssTaxExempt: 'yes' },
  { stateCode: 'UT', stateName: 'Utah', incomeRate: 4.65, capitalGainsRate: 4.65, ssTaxExempt: 'partial', stateStandardDeduction: 0 },
  { stateCode: 'VT', stateName: 'Vermont', incomeRate: 8.75, capitalGainsRate: 8.75, ssTaxExempt: 'partial', stateStandardDeduction: 6_500 },
  { stateCode: 'VA', stateName: 'Virginia', incomeRate: 5.75, capitalGainsRate: 5.75, ssTaxExempt: 'yes', stateStandardDeduction: 8_000 },
  { stateCode: 'WA', stateName: 'Washington', incomeRate: 0, capitalGainsRate: 7.0, ssTaxExempt: 'yes', capitalGainsThreshold: 270_000, capitalGainsExcludesQualDivs: true },
  { stateCode: 'WV', stateName: 'West Virginia', incomeRate: 6.5, capitalGainsRate: 6.5, ssTaxExempt: 'partial', stateStandardDeduction: 0 },
  { stateCode: 'WI', stateName: 'Wisconsin', incomeRate: 7.65, capitalGainsRate: 7.65, ssTaxExempt: 'yes', stateStandardDeduction: 12_760 },
  { stateCode: 'WY', stateName: 'Wyoming', incomeRate: 0, capitalGainsRate: 0, ssTaxExempt: 'yes' },
  { stateCode: 'DC', stateName: 'District of Columbia', incomeRate: 10.75, capitalGainsRate: 10.75, ssTaxExempt: 'yes', stateStandardDeduction: 14_600 },
] as const;

const statesMap = new Map<string, StateEntry>();
for (const state of STATE_TAX_DATA) {
  statesMap.set(state.stateCode, state);
}

/** Valid 2-letter state codes (50 states + DC). */
export const VALID_STATE_CODES: readonly string[] = STATE_TAX_DATA.map(s => s.stateCode);

export function lookupState(stateCode: string): StateEntry | undefined {
  return statesMap.get(stateCode);
}

/**
 * Compute state income tax using progressive brackets when available,
 * falling back to the flat incomeRate when brackets are not defined.
 */
export function computeStateBracketTax(taxableIncome: number, stateInfo: StateEntry): number {
  if (taxableIncome <= 0) return 0;
  if (!stateInfo.brackets || stateInfo.brackets.length === 0) {
    return taxableIncome * stateInfo.incomeRate / 100;
  }
  let tax = 0;
  let prevBound = 0;
  for (const [upperBound, rate] of stateInfo.brackets) {
    if (taxableIncome <= prevBound) break;
    const taxableInBracket = Math.min(taxableIncome, upperBound) - prevBound;
    tax += taxableInBracket * rate / 100;
    prevBound = upperBound;
  }
  return tax;
}
