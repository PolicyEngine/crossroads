'use client';

import { SimulationResult, BenefitMetric } from '@/types';
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
  note?: string;
}

function SummaryCard({ title, before, after, inverse = false, note }: SummaryCardProps) {
  const diff = after - before;
  const isPositive = inverse ? diff < 0 : diff > 0;
  const isNegative = inverse ? diff > 0 : diff < 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
        {title}
      </h3>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-2xl font-bold text-gray-900">
          {formatCurrency(after)}
        </span>
        <span
          className={`text-sm font-medium ${
            isPositive
              ? 'text-green-600'
              : isNegative
              ? 'text-red-600'
              : 'text-gray-500'
          }`}
        >
          {formatChange(diff)}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        was {formatCurrency(before)}
      </p>
      {note && (
        <p className="mt-1 text-xs text-gray-400">{note}</p>
      )}
    </div>
  );
}

function ComparisonChart({ metrics }: { metrics: BenefitMetric[] }) {
  const chartData = metrics
    .filter((m) => m.before !== 0 || m.after !== 0)
    .map((m) => ({
      name: m.label,
      // Negate taxes so they appear on negative side of chart
      Before: m.category === 'tax' ? -m.before : m.before,
      After: m.category === 'tax' ? -m.after : m.after,
      category: m.category,
    }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-black mb-4">
        Before vs After Comparison
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickFormatter={(value) => `${value < 0 ? '-' : ''}$${Math.abs(value / 1000).toFixed(0)}k`}
            />
            <YAxis type="category" dataKey="name" width={95} fontSize={12} />
            <Tooltip
              formatter={(value) => formatCurrency(Math.abs(value as number))}
              labelStyle={{ color: '#374151' }}
            />
            <Legend />
            <Bar dataKey="Before" fill="#808080" radius={[0, 4, 4, 0]} />
            <Bar dataKey="After" fill="#39C6C0" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChangeBreakdown({ metrics }: { metrics: BenefitMetric[] }) {
  const significantChanges = metrics
    .filter((m) => Math.abs(m.after - m.before) > 0)
    .sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before));

  const chartData = significantChanges.map((m) => ({
    name: m.label,
    change: m.after - m.before,
    category: m.category,
  }));

  const getBarColor = (entry: { change: number; category: string }) => {
    if (entry.category === 'tax') {
      return entry.change > 0 ? '#ef4444' : '#22c55e';
    }
    return entry.change > 0 ? '#22c55e' : '#ef4444';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-black mb-4">
        What Changed
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickFormatter={(value) => {
                const prefix = value >= 0 ? '+' : '';
                return `${prefix}$${(value / 1000).toFixed(0)}k`;
              }}
            />
            <YAxis type="category" dataKey="name" width={95} fontSize={12} />
            <Tooltip
              formatter={(value) => formatChange(value as number)}
              labelStyle={{ color: '#374151' }}
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

function DetailedBreakdown({ metrics }: { metrics: BenefitMetric[] }) {
  const categories: Record<string, { label: string; items: BenefitMetric[] }> = {
    tax: { label: 'Taxes', items: [] },
    credit: { label: 'Tax Credits', items: [] },
    benefit: { label: 'Benefits', items: [] },
  };

  metrics.forEach((m) => {
    if (categories[m.category]) {
      categories[m.category].items.push(m);
    }
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-black mb-4">
        Detailed Breakdown
      </h3>
      <div className="space-y-6">
        {Object.entries(categories).map(([key, category]) => (
          <div key={key}>
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              {category.label}
            </h4>
            <div className="space-y-2">
              {category.items.map((item) => {
                const diff = item.after - item.before;
                const isTax = item.category === 'tax';
                const isPositive = isTax ? diff < 0 : diff > 0;
                const isNegative = isTax ? diff > 0 : diff < 0;

                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-gray-700">{item.label}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500 text-sm">
                        {formatCurrency(item.before)} →{' '}
                        <span className="text-gray-900 font-medium">
                          {formatCurrency(item.after)}
                        </span>
                      </span>
                      {diff !== 0 && (
                        <span
                          className={`text-sm font-medium px-2 py-0.5 rounded ${
                            isPositive
                              ? 'bg-green-100 text-green-700'
                              : isNegative
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {formatChange(diff)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResultsView({ result, onReset }: ResultsViewProps) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Net Income"
          before={result.before.netIncome}
          after={result.after.netIncome}
          note="Includes all taxes, benefits, and costs"
        />
        <SummaryCard
          title="Total Taxes"
          before={result.before.totalTax}
          after={result.after.totalTax}
          inverse
        />
        <SummaryCard
          title="Total Benefits & Credits"
          before={result.before.totalBenefits}
          after={result.after.totalBenefits}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComparisonChart metrics={result.before.metrics} />
        <ChangeBreakdown metrics={result.before.metrics} />
      </div>

      {/* Detailed Breakdown */}
      <DetailedBreakdown metrics={result.before.metrics} />

      {/* Reset Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={onReset}
          className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
        >
          Try Another Scenario
        </button>
      </div>
    </div>
  );
}
