import { NextRequest, NextResponse } from 'next/server';
import { Household, LifeEventType, SimulationResult, BenefitMetric } from '@/types';

const BACKEND_URL = process.env.BACKEND_URL;

// Proxy to real Python backend if configured
async function callRealBackend(body: unknown): Promise<SimulationResult> {
  // Modal URLs are the endpoint directly, Cloud Run needs /api/simulate suffix
  const url = BACKEND_URL?.includes('modal.run')
    ? BACKEND_URL
    : `${BACKEND_URL}/api/simulate`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Backend request failed');
  }

  return response.json();
}

// Mock implementation for development
function generateMockMetrics(
  household: Household,
  eventType: LifeEventType
): { before: BenefitMetric[]; after: BenefitMetric[] } {
  const { income, childAges, filingStatus, spouseIncome } = household;
  const numChildren = childAges.length;
  const totalIncome = income + (filingStatus.startsWith('married') ? spouseIncome : 0);

  // Base calculations (simplified mock)
  const baseIncomeTax = totalIncome * 0.22;
  const basePayrollTax = totalIncome * 0.0765;
  const baseEITC = totalIncome < 60000 && numChildren > 0 ? Math.min(6000, totalIncome * 0.1) : 0;
  const baseCTC = numChildren * 2000;
  const baseSNAP = totalIncome < 40000 ? Math.max(0, (40000 - totalIncome) * 0.05) : 0;
  const basePTC = totalIncome < 80000 ? Math.max(0, (80000 - totalIncome) * 0.03) : 0;
  const baseMedicaid = totalIncome < 30000 ? 5000 : 0;

  // Apply life event changes
  let afterIncome = totalIncome;
  let afterChildren = numChildren;
  let afterFilingStatus = filingStatus;
  let afterAge = household.age;

  switch (eventType) {
    case 'having_baby':
      afterChildren += 1;
      break;
    case 'getting_married':
      afterFilingStatus = 'married_jointly';
      afterIncome = totalIncome * 1.5;
      break;
    case 'changing_income':
      afterIncome = totalIncome * 1.2;
      break;
    case 'divorce':
      afterFilingStatus = 'single';
      afterIncome = income; // Just the primary income
      break;
    case 'moving_states':
      break;
    case 'losing_esi':
      // May become eligible for ACA subsidies
      break;
  }

  const isMarried = afterFilingStatus.startsWith('married');
  const afterIncomeTax = afterIncome * (isMarried ? 0.18 : 0.22);
  const afterPayrollTax = afterIncome * 0.0765;
  const afterEITC = afterIncome < 60000 && afterChildren > 0 ? Math.min(7000, afterIncome * 0.1 * (afterChildren / Math.max(numChildren, 1))) : 0;
  const afterCTC = afterChildren * 2000;
  const afterSNAP = afterIncome < 40000 ? Math.max(0, (40000 - afterIncome) * 0.05) : 0;
  const afterPTC = afterIncome < 80000 ? Math.max(0, (80000 - afterIncome) * 0.03) : 0;
  const afterMedicaid = afterIncome < 30000 ? 5000 : 0;
  const afterSocialSecurity = afterAge >= 65 ? 20000 : 0;

  const beforeMetrics: BenefitMetric[] = [
    { name: 'income_tax', label: 'Federal Income Tax', before: baseIncomeTax, after: afterIncomeTax, category: 'tax', priority: 1 },
    { name: 'payroll_tax', label: 'Payroll Tax', before: basePayrollTax, after: afterPayrollTax, category: 'tax', priority: 1 },
    { name: 'eitc', label: 'Earned Income Tax Credit', before: baseEITC, after: afterEITC, category: 'credit', priority: 1 },
    { name: 'ctc', label: 'Child Tax Credit', before: baseCTC, after: afterCTC, category: 'credit', priority: 1 },
    { name: 'snap', label: 'SNAP Benefits', before: baseSNAP, after: afterSNAP, category: 'benefit', priority: 1 },
    { name: 'ptc', label: 'Premium Tax Credit (ACA)', before: basePTC, after: afterPTC, category: 'credit', priority: 1 },
    { name: 'medicaid', label: 'Medicaid', before: baseMedicaid, after: afterMedicaid, category: 'benefit', priority: 1 },
    { name: 'social_security', label: 'Social Security', before: 0, after: afterSocialSecurity, category: 'benefit', priority: 1 },
  ];

  const afterMetrics = beforeMetrics.map((m) => ({
    ...m,
    before: m.after,
    after: m.after,
  }));

  return { before: beforeMetrics, after: afterMetrics };
}

function generateMockResult(
  household: Household,
  lifeEvent: { type: LifeEventType; params?: Record<string, unknown> }
): SimulationResult {
  const { before: metrics } = generateMockMetrics(household, lifeEvent.type);

  const beforeTax = metrics.reduce(
    (sum, m) => (m.category === 'tax' ? sum + m.before : sum),
    0
  );
  const afterTax = metrics.reduce(
    (sum, m) => (m.category === 'tax' ? sum + m.after : sum),
    0
  );
  const beforeBenefits = metrics.reduce(
    (sum, m) => (m.category === 'benefit' || m.category === 'credit' ? sum + m.before : sum),
    0
  );
  const afterBenefits = metrics.reduce(
    (sum, m) => (m.category === 'benefit' || m.category === 'credit' ? sum + m.after : sum),
    0
  );

  const totalIncome = household.income + (household.filingStatus.startsWith('married') ? household.spouseIncome : 0);
  const beforeNetIncome = totalIncome - beforeTax + beforeBenefits;

  let afterGrossIncome = totalIncome;
  if (lifeEvent.type === 'getting_married') afterGrossIncome *= 1.5;
  if (lifeEvent.type === 'changing_income') afterGrossIncome *= 1.2;
  if (lifeEvent.type === 'divorce') afterGrossIncome = household.income;

  const afterNetIncome = afterGrossIncome - afterTax + afterBenefits;

  return {
    before: {
      netIncome: beforeNetIncome,
      totalTax: beforeTax,
      totalBenefits: beforeBenefits,
      metrics,
    },
    after: {
      netIncome: afterNetIncome,
      totalTax: afterTax,
      totalBenefits: afterBenefits,
      metrics: metrics.map((m) => ({ ...m, before: m.after })),
    },
    diff: {
      netIncome: afterNetIncome - beforeNetIncome,
      totalTax: afterTax - beforeTax,
      totalBenefits: afterBenefits - beforeBenefits,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { household, lifeEvent } = body as {
      household: Household;
      lifeEvent: { type: LifeEventType; params?: Record<string, unknown> };
    };

    // Use real backend if configured, otherwise use mock
    if (BACKEND_URL) {
      const result = await callRealBackend(body);
      return NextResponse.json(result);
    }

    // Mock implementation
    await new Promise((resolve) => setTimeout(resolve, 300));
    const result = generateMockResult(household, lifeEvent);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to simulate';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
