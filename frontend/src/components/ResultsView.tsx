'use client';

import { useState, Component, ReactNode } from 'react';
import { SimulationResult, BenefitMetric, HealthcareCoverage } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ResultsViewProps {
  result: SimulationResult;
  onReset: () => void;
}

// Error boundary to catch rendering errors
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Safe number formatting that handles undefined/null/NaN
function safeNumber(value: unknown): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  return 0;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatChange(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return prefix + formatCurrency(value);
}

interface SummaryCardProps {
  title: string;
  before: number;
  after: number;
  inverse?: boolean;
  icon: React.ReactNode;
}

function SummaryCard({ title, before, after, inverse = false, icon }: SummaryCardProps) {
  const safeBefore = safeNumber(before);
  const safeAfter = safeNumber(after);
  const diff = safeAfter - safeBefore;
  const isPositive = inverse ? diff < 0 : diff > 0;
  const isNegative = inverse ? diff > 0 : diff < 0;

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
          {icon}
        </div>
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold text-gray-900">
          {formatCurrency(safeAfter)}
        </span>
        <span
          className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
            isPositive
              ? 'bg-green-50 text-green-600'
              : isNegative
              ? 'bg-red-50 text-red-600'
              : 'bg-gray-50 text-gray-500'
          }`}
        >
          {formatChange(diff)}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-gray-400">
        was {formatCurrency(safeBefore)}
      </p>
    </div>
  );
}

function HealthcareCoverageCard({
  before,
  after,
}: {
  before?: HealthcareCoverage;
  after?: HealthcareCoverage;
}) {
  // Defensive: ensure we have valid objects
  if (!before && !after) return null;

  const coverageTypes = ['ESI', 'Medicaid', 'CHIP', 'Marketplace'] as const;

  // Safely access summary objects
  const beforeSummary = before?.summary || {};
  const afterSummary = after?.summary || {};

  // Check if anyone has any coverage after the event
  const hasCoverage = coverageTypes.some(
    (type) => (afterSummary[type]?.length || 0) > 0
  );

  if (!hasCoverage) return null;

  const getCoverageIcon = (type: string) => {
    switch (type) {
      case 'ESI':
        return '💼';
      case 'Medicaid':
        return '🏥';
      case 'CHIP':
        return '👶';
      case 'Marketplace':
        return '🛒';
      default:
        return '❤️';
    }
  };

  const getCoverageLabel = (type: string) => {
    switch (type) {
      case 'ESI':
        return 'Employer Insurance';
      case 'Marketplace':
        return 'ACA Marketplace';
      default:
        return type;
    }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900">Healthcare Coverage After Event</h3>
      </div>

      <div className="space-y-2">
        {coverageTypes.map((type) => {
          const afterPeople = afterSummary[type] || [];
          const beforePeople = beforeSummary[type] || [];

          if (!Array.isArray(afterPeople) || afterPeople.length === 0) return null;

          // Find who was added to this coverage type
          const added = Array.isArray(beforePeople)
            ? afterPeople.filter(p => !beforePeople.includes(p))
            : afterPeople;

          return (
            <div key={type} className="flex items-center gap-3 py-1.5 px-2 rounded-lg bg-gray-50">
              <span className="text-base">{getCoverageIcon(type)}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-700">{getCoverageLabel(type)}</span>
                <span className="text-gray-400 mx-2">·</span>
                <span className="text-sm text-gray-600">
                  {afterPeople.map((person, i) => (
                    <span key={person}>
                      {i > 0 && ', '}
                      <span className={added.includes(person) ? 'text-green-600 font-medium' : ''}>
                        {person}
                        {added.includes(person) && ' (new)'}
                      </span>
                    </span>
                  ))}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComparisonChart({ metrics }: { metrics: BenefitMetric[] }) {
  // Defensive: ensure metrics is an array
  const safeMetrics = Array.isArray(metrics) ? metrics : [];

  const chartData = safeMetrics
    .filter((m) => m && (safeNumber(m.before) !== 0 || safeNumber(m.after) !== 0))
    .map((m) => ({
      name: m.label || 'Unknown',
      Before: m.category === 'tax' ? -safeNumber(m.before) : safeNumber(m.before),
      After: m.category === 'tax' ? -safeNumber(m.after) : safeNumber(m.after),
      category: m.category || 'benefit',
    }));

  if (chartData.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Before vs After
        </h3>
        <p className="text-gray-500 text-center py-8">No data to display</p>
      </div>
    );
  }

  // Truncate long labels for chart display
  const truncateLabel = (label: string, maxLength: number = 18) => {
    if (label.length <= maxLength) return label;
    return label.substring(0, maxLength - 1) + '…';
  };

  return (
    <div className="card p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">
        Before vs After
      </h3>
      <div style={{ height: Math.max(280, chartData.length * 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              type="number"
              tickFormatter={(value) => `${value < 0 ? '-' : ''}$${Math.abs(value / 1000).toFixed(0)}k`}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              tick={{ fontSize: 11, fill: '#374151' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value) => truncateLabel(value)}
            />
            <Tooltip
              formatter={(value) => formatCurrency(Math.abs(value as number))}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              labelStyle={{ color: '#374151', fontWeight: 500 }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '16px' }}
              formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
            />
            <Bar dataKey="Before" fill="#9CA3AF" radius={[0, 4, 4, 0]} />
            <Bar dataKey="After" fill="#319795" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChangeBreakdown({ metrics }: { metrics: BenefitMetric[] }) {
  // Defensive: ensure metrics is an array
  const safeMetrics = Array.isArray(metrics) ? metrics : [];

  const significantChanges = safeMetrics
    .filter((m) => m && Math.abs(safeNumber(m.after) - safeNumber(m.before)) > 0)
    .sort((a, b) => Math.abs(safeNumber(b.after) - safeNumber(b.before)) - Math.abs(safeNumber(a.after) - safeNumber(a.before)));

  const chartData = significantChanges.map((m) => ({
    name: m.label || 'Unknown',
    change: safeNumber(m.after) - safeNumber(m.before),
    category: m.category || 'benefit',
  }));

  const getBarColor = (entry: { change: number; category: string }) => {
    if (entry.category === 'tax') {
      return entry.change > 0 ? '#ef4444' : '#22c55e';
    }
    return entry.change > 0 ? '#22c55e' : '#ef4444';
  };

  // Truncate long labels for chart display
  const truncateLabel = (label: string, maxLength: number = 18) => {
    if (label.length <= maxLength) return label;
    return label.substring(0, maxLength - 1) + '…';
  };

  if (chartData.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          What Changed
        </h3>
        <p className="text-gray-500 text-center py-8">No changes detected</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">
        What Changed
      </h3>
      <div style={{ height: Math.max(224, chartData.length * 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              type="number"
              tickFormatter={(value) => {
                const prefix = value >= 0 ? '+' : '';
                return `${prefix}$${(value / 1000).toFixed(0)}k`;
              }}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              tick={{ fontSize: 11, fill: '#374151' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value) => truncateLabel(value)}
            />
            <Tooltip
              formatter={(value) => formatChange(value as number)}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              labelStyle={{ color: '#374151', fontWeight: 500 }}
            />
            <Bar dataKey="change" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DetailedBreakdown({ metrics }: { metrics: BenefitMetric[]; showAll: boolean }) {
  const [showZeroPrograms, setShowZeroPrograms] = useState(false);

  // Defensive: ensure metrics is an array
  const safeMetrics = Array.isArray(metrics) ? metrics : [];

  // Separate metrics into those with values and those without
  const activeMetrics: BenefitMetric[] = [];
  const zeroMetrics: BenefitMetric[] = [];

  safeMetrics.forEach((m) => {
    if (!m) return;
    const hasValue = safeNumber(m.before) !== 0 || safeNumber(m.after) !== 0;
    const isStateProgram = m.category === 'state_credit' || m.category === 'state_benefit';

    // Always hide state programs with no values (too many to show)
    if (isStateProgram && !hasValue) return;

    if (hasValue) {
      activeMetrics.push(m);
    } else {
      zeroMetrics.push(m);
    }
  });

  // Build categories for active metrics
  const categories: Record<string, { label: string; items: BenefitMetric[] }> = {
    tax: { label: 'Taxes', items: [] },
    credit: { label: 'Federal Tax Credits', items: [] },
    benefit: { label: 'Federal Benefits', items: [] },
    state: { label: 'State Programs', items: [] },
  };

  activeMetrics.forEach((m) => {
    const isStateProgram = m.category === 'state_credit' || m.category === 'state_benefit';
    if (isStateProgram) {
      categories.state.items.push(m);
    } else if (categories[m.category]) {
      categories[m.category].items.push(m);
    }
  });

  // Build categories for zero metrics (only federal, not state)
  const zeroCategories: Record<string, { label: string; items: BenefitMetric[] }> = {
    credit: { label: 'Federal Tax Credits', items: [] },
    benefit: { label: 'Federal Benefits', items: [] },
  };

  zeroMetrics.forEach((m) => {
    if (zeroCategories[m.category]) {
      zeroCategories[m.category].items.push(m);
    }
  });

  const nonEmptyCategories = Object.entries(categories).filter(
    ([, category]) => category.items.length > 0
  );

  const nonEmptyZeroCategories = Object.entries(zeroCategories).filter(
    ([, category]) => category.items.length > 0
  );

  const renderItem = (item: BenefitMetric) => {
    if (!item) return null;
    const beforeVal = safeNumber(item.before);
    const afterVal = safeNumber(item.after);
    const diff = afterVal - beforeVal;
    const isTax = item.category === 'tax';
    const isPositive = isTax ? diff < 0 : diff > 0;
    const isNegative = isTax ? diff > 0 : diff < 0;

    return (
      <div
        key={item.name || Math.random()}
        className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm text-gray-700">{item.label || 'Unknown'}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            {formatCurrency(beforeVal)}
          </span>
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-medium text-gray-900">
            {formatCurrency(afterVal)}
          </span>
          {diff !== 0 && (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                isPositive
                  ? 'bg-green-50 text-green-600'
                  : isNegative
                  ? 'bg-red-50 text-red-600'
                  : 'bg-gray-50 text-gray-500'
              }`}
            >
              {formatChange(diff)}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="card p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-5">
        Detailed Breakdown
      </h3>
      <div className="space-y-6">
        {nonEmptyCategories.map(([key, category]) => (
          <div key={key}>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {category.label}
            </h4>
            <div className="space-y-1">
              {category.items.map(renderItem)}
            </div>
          </div>
        ))}

        {/* Collapsible section for programs with $0 values */}
        {nonEmptyZeroCategories.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={() => setShowZeroPrograms(!showZeroPrograms)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showZeroPrograms ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {showZeroPrograms ? 'Hide' : 'Show'} programs you don&apos;t currently qualify for
              <span className="text-gray-400">({zeroMetrics.length})</span>
            </button>

            {showZeroPrograms && (
              <div className="mt-4 space-y-6">
                {nonEmptyZeroCategories.map(([key, category]) => (
                  <div key={key}>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      {category.label}
                    </h4>
                    <div className="space-y-1 opacity-60">
                      {category.items.map(renderItem)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultsViewContent({ result, onReset }: ResultsViewProps) {
  const [showAllBenefits, setShowAllBenefits] = useState(false);

  // Defensive: safely access nested properties
  const beforeData = result?.before || { netIncome: 0, totalTax: 0, totalBenefits: 0, metrics: [] };
  const afterData = result?.after || { netIncome: 0, totalTax: 0, totalBenefits: 0, metrics: [] };
  const metrics = Array.isArray(beforeData.metrics) ? beforeData.metrics : [];

  const primaryMetrics = metrics.filter(
    m => m && (m.priority === 1 || safeNumber(m.before) !== 0 || safeNumber(m.after) !== 0)
  );

  const secondaryWithValues = metrics.filter(
    m => m && m.priority === 2 && (safeNumber(m.before) !== 0 || safeNumber(m.after) !== 0)
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          title="Net Income"
          before={beforeData.netIncome}
          after={afterData.netIncome}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <SummaryCard
          title="Total Taxes"
          before={beforeData.totalTax}
          after={afterData.totalTax}
          inverse
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
            </svg>
          }
        />
        <SummaryCard
          title="Benefits & Credits"
          before={beforeData.totalBenefits}
          after={afterData.totalBenefits}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          }
        />
      </div>

      {/* Healthcare Coverage */}
      <HealthcareCoverageCard
        before={result.healthcareBefore}
        after={result.healthcareAfter}
      />

      {/* View Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl border border-[#E2E8F0] p-1 bg-white">
          <button
            onClick={() => setShowAllBenefits(false)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              !showAllBenefits
                ? 'bg-[#319795] text-white shadow-sm'
                : 'text-[#5A5A5A] hover:bg-[#F9FAFB]'
            }`}
          >
            Key Changes
          </button>
          <button
            onClick={() => setShowAllBenefits(true)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              showAllBenefits
                ? 'bg-[#319795] text-white shadow-sm'
                : 'text-[#5A5A5A] hover:bg-[#F9FAFB]'
            }`}
          >
            All Benefits ({metrics.length})
          </button>
        </div>
      </div>

      {/* Secondary benefits hint */}
      {!showAllBenefits && secondaryWithValues.length > 0 && (
        <p className="text-center text-sm text-gray-500">
          {secondaryWithValues.length} additional benefit{secondaryWithValues.length !== 1 ? 's' : ''} not shown.{' '}
          <button
            onClick={() => setShowAllBenefits(true)}
            className="text-[#319795] hover:text-[#285E61] font-medium transition-colors"
          >
            Show all
          </button>
        </p>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ComparisonChart metrics={showAllBenefits ? metrics : primaryMetrics} />
        <ChangeBreakdown metrics={showAllBenefits ? metrics : primaryMetrics} />
      </div>

      {/* Detailed Breakdown */}
      <DetailedBreakdown metrics={metrics} showAll={showAllBenefits} />

      {/* Reset Button */}
      <div className="flex justify-center pt-4">
        <button onClick={onReset} className="btn btn-secondary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Try Another Scenario
        </button>
      </div>
    </div>
  );
}

// Error fallback component
function ResultsErrorFallback({ onReset }: { onReset: () => void }) {
  return (
    <div className="card p-8 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
      <p className="text-gray-500 mb-6">There was an error displaying your results. Please try again.</p>
      <button onClick={onReset} className="btn btn-primary">
        Start Over
      </button>
    </div>
  );
}

// Main exported component with error boundary
export default function ResultsView({ result, onReset }: ResultsViewProps) {
  // Early return if result is completely invalid
  if (!result || typeof result !== 'object') {
    return <ResultsErrorFallback onReset={onReset} />;
  }

  return (
    <ErrorBoundary fallback={<ResultsErrorFallback onReset={onReset} />}>
      <ResultsViewContent result={result} onReset={onReset} />
    </ErrorBoundary>
  );
}
