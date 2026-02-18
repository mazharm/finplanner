import type { Anomaly, AnomalySeverity, TaxYearRecord, TaxYearIncome, TaxDocument } from '@finplanner/domain';
import { DEFAULT_ANOMALY_THRESHOLD_PCT, DEFAULT_ANOMALY_THRESHOLD_ABSOLUTE, issuerNamesMatch } from '@finplanner/domain';
import type { AnomalyDetectionRequest, AnomalyDetectionResult } from './types.js';

const INCOME_FIELDS: Array<{ key: keyof TaxYearIncome; label: string }> = [
  { key: 'wages', label: 'Wages' },
  { key: 'selfEmploymentIncome', label: 'Self-employment income' },
  { key: 'interestIncome', label: 'Interest income' },
  { key: 'dividendIncome', label: 'Dividend income' },
  { key: 'capitalGains', label: 'Capital gains' },
  { key: 'capitalLosses', label: 'Capital losses' },
  { key: 'rentalIncome', label: 'Rental income' },
  { key: 'nqdcDistributions', label: 'NQDC distributions' },
  { key: 'retirementDistributions', label: 'Retirement distributions' },
  { key: 'socialSecurityIncome', label: 'Social Security income' },
  { key: 'otherIncome', label: 'Other income' },
];

function computeTotalIncome(income: TaxYearIncome): number {
  return income.wages + income.selfEmploymentIncome + income.interestIncome +
    income.dividendIncome + income.capitalGains + income.rentalIncome +
    income.nqdcDistributions + income.retirementDistributions +
    income.socialSecurityIncome + income.otherIncome - income.capitalLosses;
}

function computeTotalDeductions(record: TaxYearRecord): number {
  if (record.deductions.useItemized && record.deductions.itemizedDeductions) {
    const d = record.deductions.itemizedDeductions;
    // Apply SALT cap ($10,000) to state and local taxes
    const saltCapped = Math.min(d.stateAndLocalTaxes, 10_000);
    // Apply 7.5% AGI floor to medical expenses (use totalIncome as AGI approximation)
    const totalIncome = computeTotalIncome(record.income);
    const medicalFloor = totalIncome * 0.075;
    const medicalDeductible = Math.max(0, d.medicalExpenses - medicalFloor);
    return d.mortgageInterest + saltCapped + d.charitableContributions + medicalDeductible + d.other;
  }
  return record.deductions.standardDeduction;
}

function determineSeverity(
  pctChange: number,
  absoluteChange: number,
  thresholdPct: number,
  thresholdAbsolute: number
): AnomalySeverity {
  if (Math.abs(pctChange) > 2 * thresholdPct && Math.abs(absoluteChange) > 2 * thresholdAbsolute) {
    return 'critical';
  }
  return 'warning';
}

export function detectAnomalies(request: AnomalyDetectionRequest): AnomalyDetectionResult {
  const thresholdPct = request.thresholdPct ?? DEFAULT_ANOMALY_THRESHOLD_PCT;
  const thresholdAbsolute = request.thresholdAbsolute ?? DEFAULT_ANOMALY_THRESHOLD_ABSOLUTE;
  const anomalies: Anomaly[] = [];
  let index = 0;

  const makeId = () => `anomaly-${request.currentYear}-${index++}`;

  // Find current and prior year records
  const currentRecord = request.records.find(r => r.taxYear === request.currentYear);
  const priorYear = request.currentYear - 1;
  const priorRecord = request.records.find(r => r.taxYear === priorYear);

  if (!currentRecord || !priorRecord) {
    return {
      taxYear: request.currentYear,
      comparisonYear: priorYear,
      anomalies: [],
      yearOverYearSummary: {
        totalIncomeChange: 0,
        totalDeductionChange: 0,
        effectiveRateChange: 0,
        flagCount: { info: 0, warning: 0, critical: 0 },
      },
    };
  }

  // 1. Document omissions
  const priorDocs = request.documentsByYear.get(priorYear) ?? [];
  const currentDocs = request.documentsByYear.get(request.currentYear) ?? [];

  for (const priorDoc of priorDocs) {
    const found = currentDocs.some(
      d => d.formType === priorDoc.formType && issuerNamesMatch(d.issuerName, priorDoc.issuerName)
    );
    if (!found) {
      anomalies.push({
        id: makeId(),
        taxYear: request.currentYear,
        comparisonYear: priorYear,
        category: 'omission',
        severity: 'warning',
        field: `${priorDoc.formType} from ${priorDoc.issuerName}`,
        description: `${priorDoc.formType} from ${priorDoc.issuerName} was present in ${priorYear} but missing in ${request.currentYear}`,
        suggestedAction: `Verify whether ${priorDoc.formType} from ${priorDoc.issuerName} is still expected`,
      });
    }
  }

  // 2 & 3. Income field anomalies and new income sources
  for (const { key, label } of INCOME_FIELDS) {
    const priorVal = priorRecord.income[key];
    const currentVal = currentRecord.income[key];
    const absoluteChange = currentVal - priorVal;

    // New income source (was 0, now > 0)
    if (priorVal === 0 && currentVal > 0) {
      anomalies.push({
        id: makeId(),
        taxYear: request.currentYear,
        comparisonYear: priorYear,
        category: 'anomaly',
        severity: 'info',
        field: key,
        description: `New ${label}: $${currentVal.toLocaleString('en-US')} (was $0 in ${priorYear})`,
        priorValue: priorVal,
        currentValue: currentVal,
        percentChange: undefined,
        suggestedAction: `Review new ${label} source`,
      });
      continue;
    }

    // Skip if both are 0
    if (priorVal === 0 && currentVal === 0) continue;

    const pctChange = priorVal !== 0 ? ((currentVal - priorVal) / priorVal) * 100 : 0;

    // Anomaly: both thresholds must be exceeded (AND logic per spec)
    if (Math.abs(pctChange) > thresholdPct && Math.abs(absoluteChange) > thresholdAbsolute) {
      const severity = determineSeverity(pctChange, absoluteChange, thresholdPct, thresholdAbsolute);
      anomalies.push({
        id: makeId(),
        taxYear: request.currentYear,
        comparisonYear: priorYear,
        category: 'anomaly',
        severity,
        field: key,
        description: `${label} changed by ${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1)}% ($${Math.abs(absoluteChange).toLocaleString('en-US')}) from ${priorYear} to ${request.currentYear}`,
        priorValue: priorVal,
        currentValue: currentVal,
        percentChange: pctChange,
        suggestedAction: `Review ${label} change`,
      });
    }
  }

  // 4. Pattern breaks (3+ years of data)
  const sortedRecords = [...request.records]
    .filter(r => r.taxYear <= request.currentYear)
    .sort((a, b) => a.taxYear - b.taxYear);
  if (sortedRecords.length >= 3) {
    for (const { key, label } of INCOME_FIELDS) {
      const values = sortedRecords.map(r => r.income[key]);
      // Check if there was a consistent trend (all increasing or all decreasing) that reversed
      if (values.length >= 3) {
        const lastThree = values.slice(-3);
        const diff1 = lastThree[1] - lastThree[0]; // prior trend
        const diff2 = lastThree[2] - lastThree[1]; // current change

        // Pattern break: trend reversal with significant magnitude
        // Uses thresholdPct / 2 intentionally: trend reversals are more noteworthy
        // than simple YoY changes and warrant flagging at a lower percentage threshold
        if (diff1 !== 0 && diff2 !== 0 && Math.sign(diff1) !== Math.sign(diff2)) {
          const absChange = Math.abs(diff2);
          const pctChangeFromPrior = lastThree[1] !== 0 ? (Math.abs(diff2) / Math.abs(lastThree[1])) * 100 : 0;
          if (absChange > thresholdAbsolute && pctChangeFromPrior > thresholdPct / 2) {
            anomalies.push({
              id: makeId(),
              taxYear: request.currentYear,
              comparisonYear: priorYear,
              category: 'pattern_break',
              severity: 'warning',
              field: key,
              description: `${label} trend reversal: was ${diff1 > 0 ? 'increasing' : 'decreasing'}, now ${diff2 > 0 ? 'increasing' : 'decreasing'}`,
              priorValue: lastThree[1],
              currentValue: lastThree[2],
              suggestedAction: `Review ${label} trend change`,
            });
          }
        }
      }
    }
  }

  // YoY summary
  const totalIncomePrior = computeTotalIncome(priorRecord.income);
  const totalIncomeCurrent = computeTotalIncome(currentRecord.income);
  const totalDeductionsPrior = computeTotalDeductions(priorRecord);
  const totalDeductionsCurrent = computeTotalDeductions(currentRecord);

  const flagCount = { info: 0, warning: 0, critical: 0 };
  for (const a of anomalies) {
    flagCount[a.severity]++;
  }

  return {
    taxYear: request.currentYear,
    comparisonYear: priorYear,
    anomalies,
    yearOverYearSummary: {
      totalIncomeChange: totalIncomeCurrent - totalIncomePrior,
      totalDeductionChange: totalDeductionsCurrent - totalDeductionsPrior,
      effectiveRateChange: (() => {
        // Compute effective rates from available data instead of using potentially-zero stored rates
        const currentTotalIncome = computeTotalIncome(currentRecord.income);
        const priorTotalIncome = computeTotalIncome(priorRecord.income);
        const currentEffRate = currentTotalIncome > 0
          ? ((currentRecord.computedFederalTax + currentRecord.computedStateTax) / currentTotalIncome) * 100
          : currentRecord.computedEffectiveFederalRate + currentRecord.computedEffectiveStateRate;
        const priorEffRate = priorTotalIncome > 0
          ? ((priorRecord.computedFederalTax + priorRecord.computedStateTax) / priorTotalIncome) * 100
          : priorRecord.computedEffectiveFederalRate + priorRecord.computedEffectiveStateRate;
        return currentEffRate - priorEffRate;
      })(),
      flagCount,
    },
  };
}
