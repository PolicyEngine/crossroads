'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { Household } from '@/types';

interface CliffCause {
  program: string;
  change: number;
}

interface CliffDataPoint {
  income: number;
  netIncome: number;
  totalTax: number;
  totalBenefits: number;
  totalCredits: number;
  marginalRate: number;
  breakdown: Record<string, number>;
  cliffCauses?: CliffCause[];
}

// Program name mappings for display
const PROGRAM_LABELS: Record<string, string> = {
  snap: 'SNAP',
  medicaid: 'Medicaid',
  chip: 'CHIP',
  earned_income_tax_credit: 'EITC',
  ctc: 'Child Tax Credit',
  ccdf: 'Childcare Subsidy',
  tanf: 'TANF',
  wic: 'WIC',
  ssi: 'SSI',
  premium_tax_credit: 'ACA Premium Credit',
  income_tax: 'Federal Income Tax',
  state_income_tax: 'State Income Tax',
  employee_payroll_tax: 'Payroll Tax',
  ca_eitc: 'CA EITC',
  ca_yctc: 'CA Young Child Credit',
  ny_eitc: 'NY EITC',
  state_eitc: 'State EITC',
};

interface CliffChartProps {
  household: Household;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAxis(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return `$${value}`;
}

// Custom tooltip component
interface TooltipPayloadItem {
  value: number;
  dataKey: string;
  color: string;
  payload: CliffDataPoint;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: number;
}) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const marginalRateColor = data.marginalRate > 100
    ? 'text-red-600'
    : data.marginalRate > 50
    ? 'text-amber-600'
    : 'text-green-600';

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-xs">
      <p className="font-semibold text-gray-900 mb-2">
        At {formatCurrency(label || 0)} income
      </p>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Net Income:</span>
          <span className="font-medium text-gray-900">{formatCurrency(data.netIncome)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Total Taxes:</span>
          <span className="font-medium text-gray-900">{formatCurrency(data.totalTax)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Benefits:</span>
          <span className="font-medium text-gray-900">{formatCurrency(data.totalBenefits)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Tax Credits:</span>
          <span className="font-medium text-gray-900">{formatCurrency(data.totalCredits)}</span>
        </div>
        <div className="border-t border-gray-100 pt-1.5 mt-1.5">
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Marginal Rate:</span>
            <span className={`font-semibold ${marginalRateColor}`}>
              {data.marginalRate.toFixed(0)}%
              {data.marginalRate > 100 && ' (cliff!)'}
            </span>
          </div>
        </div>
        {data.cliffCauses && data.cliffCauses.length > 0 && (
          <div className="border-t border-gray-100 pt-2 mt-2">
            <p className="text-xs font-medium text-gray-500 mb-1">Changes at this point:</p>
            {data.cliffCauses.map((cause, idx) => (
              <div key={idx} className="flex justify-between gap-3 text-xs">
                <span className="text-gray-600">{PROGRAM_LABELS[cause.program] || cause.program}</span>
                <span className={cause.change < 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                  {cause.change < 0 ? '' : '+'}{formatCurrency(cause.change)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CliffChart({ household }: CliffChartProps) {
  const [data, setData] = useState<CliffDataPoint[]>([]);
  const [currentIncome, setCurrentIncome] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'netIncome' | 'marginalRate'>('netIncome');

  useEffect(() => {
    async function fetchCliffData() {
      setLoading(true);
      setError(null);

      try {
        // Set income range based on current income
        const baseIncome = household.income + (household.spouseIncome || 0);
        const incomeMin = 0;
        const incomeMax = Math.max(150000, baseIncome * 2);

        const response = await fetch('/api/cliff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            household,
            incomeMin,
            incomeMax,
            numPoints: 40,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to fetch cliff data');
        }

        const result = await response.json();
        setData(result.data);
        setCurrentIncome(result.currentIncome);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cliff analysis');
      } finally {
        setLoading(false);
      }
    }

    fetchCliffData();
  }, [household]);

  // Find cliff points (marginal rate > 100%)
  const cliffPoints = data.filter(d => d.marginalRate > 100);
  const hasCliffs = cliffPoints.length > 0;

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Analyzing Benefit Cliffs</h3>
            <p className="text-sm text-gray-500">Calculating benefits across income levels...</p>
          </div>
        </div>
        <div className="h-64 bg-gray-50 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 text-red-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Benefit Cliffs Analysis</h3>
            <p className="text-sm text-gray-500">
              How your benefits change as income increases
            </p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-200 p-0.5">
          <button
            onClick={() => setViewMode('netIncome')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'netIncome'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Net Income
          </button>
          <button
            onClick={() => setViewMode('marginalRate')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'marginalRate'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Marginal Rate
          </button>
        </div>
      </div>

      {/* Cliff warning */}
      {hasCliffs && (() => {
        // Aggregate cliff causes across all cliff points
        const causeCounts: Record<string, { total: number; count: number }> = {};
        cliffPoints.forEach(point => {
          point.cliffCauses?.forEach(cause => {
            if (cause.change < 0) { // Only count benefit losses
              if (!causeCounts[cause.program]) {
                causeCounts[cause.program] = { total: 0, count: 0 };
              }
              causeCounts[cause.program].total += Math.abs(cause.change);
              causeCounts[cause.program].count += 1;
            }
          });
        });
        const topCauses = Object.entries(causeCounts)
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, 3);

        return (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex gap-2">
              <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">
                  {cliffPoints.length} benefit cliff{cliffPoints.length !== 1 ? 's' : ''} detected
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  At certain income levels, earning more could reduce your total resources.
                </p>
                {topCauses.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {topCauses.map(([program]) => (
                      <span
                        key={program}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800"
                      >
                        {PROGRAM_LABELS[program] || program}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'netIncome' ? (
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="netIncomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="income"
                tickFormatter={formatAxis}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tickFormatter={formatAxis}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="netIncome"
                stroke="#8B5CF6"
                fill="url(#netIncomeGradient)"
                strokeWidth={2}
              />
              {/* Current income marker */}
              {currentIncome > 0 && (
                <ReferenceLine
                  x={currentIncome}
                  stroke="#319795"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: 'Current',
                    position: 'top',
                    fill: '#319795',
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                />
              )}
              {/* 45-degree reference line (where net = gross) */}
              <ReferenceLine
                segment={[
                  { x: data[0]?.income || 0, y: data[0]?.income || 0 },
                  { x: data[data.length - 1]?.income || 0, y: data[data.length - 1]?.income || 0 },
                ]}
                stroke="#d1d5db"
                strokeDasharray="3 3"
              />
            </ComposedChart>
          ) : (
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="income"
                tickFormatter={formatAxis}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                width={50}
                domain={[0, (dataMax: number) => Math.max(100, Math.ceil(dataMax / 20) * 20)]}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* 100% reference line */}
              <ReferenceLine
                y={100}
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth={1}
                label={{
                  value: '100% (cliff)',
                  position: 'right',
                  fill: '#ef4444',
                  fontSize: 10,
                }}
              />
              <Line
                type="stepAfter"
                dataKey="marginalRate"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#8B5CF6' }}
              />
              {/* Current income marker */}
              {currentIncome > 0 && (
                <ReferenceLine
                  x={currentIncome}
                  stroke="#319795"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: 'Current',
                    position: 'top',
                    fill: '#319795',
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                />
              )}
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-purple-500 rounded" />
          <span>{viewMode === 'netIncome' ? 'Net Income' : 'Marginal Rate'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-teal-500 rounded" style={{ borderStyle: 'dashed' }} />
          <span>Your Current Income</span>
        </div>
        {viewMode === 'marginalRate' && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-red-400 rounded" style={{ borderStyle: 'dashed' }} />
            <span>100% = Benefit Cliff</span>
          </div>
        )}
      </div>

      {/* Explanation */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          {viewMode === 'netIncome' ? (
            <>
              <strong>Net Income</strong> = Gross Income - Taxes + Benefits + Tax Credits.
              The line shows how much you actually keep as your earnings change.
            </>
          ) : (
            <>
              <strong>Marginal Rate</strong> shows how much of each additional dollar you lose to taxes
              and benefit phase-outs. Rates above 100% mean earning more leaves you worse off.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
