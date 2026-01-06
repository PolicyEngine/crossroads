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

  const isMarried = household.filingStatus === 'married_jointly' || household.filingStatus === 'married_separately';

  const addChild = () => {
    if (household.childAges.length < 10) {
      updateField('childAges', [...household.childAges, 10]);
    }
  };

  const removeChild = (index: number) => {
    const newAges = household.childAges.filter((_, i) => i !== index);
    updateField('childAges', newAges);
  };

  const updateChildAge = (index: number, age: number) => {
    const newAges = [...household.childAges];
    newAges[index] = Math.min(17, Math.max(0, age));
    updateField('childAges', newAges);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-black mb-6">
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#39C6C0] focus:border-[#39C6C0] disabled:bg-gray-100 disabled:cursor-not-allowed"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#39C6C0] focus:border-[#39C6C0] disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="single">Single</option>
            <option value="married_jointly">Married Filing Jointly</option>
            <option value="married_separately">Married Filing Separately</option>
            <option value="head_of_household">Head of Household</option>
          </select>
        </div>

        {/* Your Age */}
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#39C6C0] focus:border-[#39C6C0] disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Your Annual Income */}
        <div>
          <label
            htmlFor="income"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Your Annual Income
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
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#39C6C0] focus:border-[#39C6C0] disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Your ESI */}
        <div className="flex items-center gap-3">
          <input
            id="hasESI"
            type="checkbox"
            checked={household.hasESI}
            onChange={(e) => updateField('hasESI', e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 text-[#39C6C0] border-gray-300 rounded focus:ring-[#39C6C0] disabled:cursor-not-allowed accent-[#39C6C0]"
          />
          <label
            htmlFor="hasESI"
            className="text-sm font-medium text-gray-700"
          >
            I have employer-sponsored health insurance
          </label>
        </div>

        {/* Spouse Section - shown when married */}
        {isMarried && (
          <div className="border-t border-gray-200 pt-5 mt-5">
            <h3 className="text-md font-semibold text-black mb-4">Spouse Information</h3>

            {/* Spouse Age */}
            <div className="mb-4">
              <label
                htmlFor="spouseAge"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Spouse&apos;s Age
              </label>
              <input
                id="spouseAge"
                type="number"
                min="18"
                max="100"
                value={household.spouseAge}
                onChange={(e) =>
                  updateField(
                    'spouseAge',
                    Math.min(100, Math.max(18, parseInt(e.target.value) || 18))
                  )
                }
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#39C6C0] focus:border-[#39C6C0] disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Spouse Income */}
            <div className="mb-4">
              <label
                htmlFor="spouseIncome"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Spouse&apos;s Annual Income
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  id="spouseIncome"
                  type="number"
                  min="0"
                  step="1000"
                  value={household.spouseIncome}
                  onChange={(e) =>
                    updateField('spouseIncome', Math.max(0, parseInt(e.target.value) || 0))
                  }
                  disabled={disabled}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#39C6C0] focus:border-[#39C6C0] disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Spouse ESI */}
            <div className="flex items-center gap-3">
              <input
                id="spouseHasESI"
                type="checkbox"
                checked={household.spouseHasESI}
                onChange={(e) => updateField('spouseHasESI', e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 text-[#39C6C0] border-gray-300 rounded focus:ring-[#39C6C0] disabled:cursor-not-allowed accent-[#39C6C0]"
              />
              <label
                htmlFor="spouseHasESI"
                className="text-sm font-medium text-gray-700"
              >
                Spouse has employer-sponsored health insurance
              </label>
            </div>
          </div>
        )}

        {/* Children Section */}
        <div className="border-t border-gray-200 pt-5 mt-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-semibold text-black">Children</h3>
            <button
              type="button"
              onClick={addChild}
              disabled={disabled || household.childAges.length >= 10}
              className="px-3 py-1 text-sm bg-[#39C6C0] hover:bg-[#227773] disabled:bg-gray-300 text-white rounded-md transition-colors"
            >
              + Add Child
            </button>
          </div>

          {household.childAges.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No children added</p>
          ) : (
            <div className="space-y-3">
              {household.childAges.map((age, index) => (
                <div key={index} className="flex items-center gap-3">
                  <label className="text-sm text-gray-600 w-20">
                    Child {index + 1}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="17"
                    value={age}
                    onChange={(e) =>
                      updateChildAge(index, parseInt(e.target.value) || 0)
                    }
                    disabled={disabled}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#39C6C0] focus:border-[#39C6C0] disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                    placeholder="Age"
                  />
                  <span className="text-sm text-gray-500">years old</span>
                  <button
                    type="button"
                    onClick={() => removeChild(index)}
                    disabled={disabled}
                    className="p-1 text-red-500 hover:text-red-700 disabled:text-gray-400"
                    aria-label={`Remove child ${index + 1}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
