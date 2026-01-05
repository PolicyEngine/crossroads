'use client';

import { Household, US_STATES } from '@/types';

interface HouseholdFormProps {
  household: Household;
  onChange: (household: Household) => void;
  disabled?: boolean;
}

export default function HouseholdForm({
  household,
  onChange,
  disabled = false,
}: HouseholdFormProps) {
  const updateField = <K extends keyof Household>(
    field: K,
    value: Household[K]
  ) => {
    onChange({ ...household, [field]: value });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Your Household
      </h2>

      <div className="space-y-5">
        {/* State */}
        <div>
          <label
            htmlFor="state"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            State
          </label>
          <select
            id="state"
            value={household.state}
            onChange={(e) => updateField('state', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {US_STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filing Status */}
        <div>
          <label
            htmlFor="filingStatus"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Filing Status
          </label>
          <select
            id="filingStatus"
            value={household.filingStatus}
            onChange={(e) =>
              updateField(
                'filingStatus',
                e.target.value as Household['filingStatus']
              )
            }
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="single">Single</option>
            <option value="married">Married Filing Jointly</option>
            <option value="head_of_household">Head of Household</option>
          </select>
        </div>

        {/* Annual Income */}
        <div>
          <label
            htmlFor="income"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Annual Income
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              id="income"
              type="number"
              min="0"
              step="1000"
              value={household.income}
              onChange={(e) =>
                updateField('income', Math.max(0, parseInt(e.target.value) || 0))
              }
              disabled={disabled}
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Age */}
        <div>
          <label
            htmlFor="age"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Your Age
          </label>
          <input
            id="age"
            type="number"
            min="18"
            max="100"
            value={household.age}
            onChange={(e) =>
              updateField(
                'age',
                Math.min(100, Math.max(18, parseInt(e.target.value) || 18))
              )
            }
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Number of Children */}
        <div>
          <label
            htmlFor="numChildren"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Number of Children
          </label>
          <input
            id="numChildren"
            type="number"
            min="0"
            max="10"
            value={household.numChildren}
            onChange={(e) =>
              updateField(
                'numChildren',
                Math.min(10, Math.max(0, parseInt(e.target.value) || 0))
              )
            }
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}
