'use client';

import { LifeEvent, LifeEventType, LIFE_EVENTS, US_STATES, Household } from '@/types';

interface LifeEventSelectorProps {
  selectedEvent: LifeEventType | null;
  onSelect: (event: LifeEventType) => void;
  eventParams: Record<string, unknown>;
  onParamsChange: (params: Record<string, unknown>) => void;
  household: Household;
  disabled?: boolean;
}

export default function LifeEventSelector({
  selectedEvent,
  onSelect,
  eventParams,
  onParamsChange,
  household,
  disabled = false,
}: LifeEventSelectorProps) {
  const renderEventParams = (event: LifeEvent) => {
    if (!selectedEvent || selectedEvent !== event.type) return null;

    switch (event.type) {
      case 'having_baby':
        return (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of babies
              </label>
              <select
                value={(eventParams.numBabies as number) || 1}
                onChange={(e) =>
                  onParamsChange({ ...eventParams, numBabies: parseInt(e.target.value) })
                }
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#39C6C0] focus:border-[#39C6C0] text-sm"
              >
                <option value={1}>1 (Single)</option>
                <option value={2}>2 (Twins)</option>
                <option value={3}>3 (Triplets)</option>
              </select>
            </div>
          </div>
        );

      case 'pregnancy':
        return (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of babies expected
              </label>
              <select
                value={(eventParams.numBabies as number) || 1}
                onChange={(e) =>
                  onParamsChange({ ...eventParams, numBabies: parseInt(e.target.value) })
                }
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#39C6C0] focus:border-[#39C6C0] text-sm"
              >
                <option value={1}>1 (Single)</option>
                <option value={2}>2 (Twins)</option>
                <option value={3}>3 (Triplets)</option>
              </select>
            </div>
          </div>
        );

      case 'getting_married':
        return (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-4">
            <h4 className="text-sm font-semibold text-black">Future Spouse Details</h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Spouse&apos;s Age
              </label>
              <input
                type="number"
                min="18"
                max="100"
                value={(eventParams.spouseAge as number) || 30}
                onChange={(e) =>
                  onParamsChange({
                    ...eventParams,
                    spouseAge: Math.min(100, Math.max(18, parseInt(e.target.value) || 30)),
                  })
                }
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#39C6C0] focus:border-[#39C6C0] text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Spouse&apos;s Annual Income
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={(eventParams.spouseIncome as number) || 0}
                  onChange={(e) =>
                    onParamsChange({
                      ...eventParams,
                      spouseIncome: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                  disabled={disabled}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#39C6C0] focus:border-[#39C6C0] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Spouse&apos;s Children (from prior relationship)
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={(eventParams.spouseChildren as number) || 0}
                onChange={(e) =>
                  onParamsChange({
                    ...eventParams,
                    spouseChildren: Math.min(10, Math.max(0, parseInt(e.target.value) || 0)),
                  })
                }
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#39C6C0] focus:border-[#39C6C0] text-sm"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="spouseHasESI"
                type="checkbox"
                checked={(eventParams.spouseHasESI as boolean) || false}
                onChange={(e) =>
                  onParamsChange({ ...eventParams, spouseHasESI: e.target.checked })
                }
                disabled={disabled}
                className="h-4 w-4 text-[#39C6C0] border-gray-300 rounded focus:ring-[#39C6C0] accent-[#39C6C0]"
              />
              <label htmlFor="spouseHasESI" className="text-sm text-gray-700">
                Spouse has employer-sponsored health insurance
              </label>
            </div>
          </div>
        );

      case 'divorce':
        return (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
            {household.childAges.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Children staying with you
                </label>
                <input
                  type="number"
                  min="0"
                  max={household.childAges.length}
                  value={(eventParams.childrenKeeping as number) ?? household.childAges.length}
                  onChange={(e) =>
                    onParamsChange({
                      ...eventParams,
                      childrenKeeping: Math.min(
                        household.childAges.length,
                        Math.max(0, parseInt(e.target.value) || 0)
                      ),
                    })
                  }
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#39C6C0] focus:border-[#39C6C0] text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Out of {household.childAges.length} children
                </p>
              </div>
            )}
          </div>
        );

      case 'moving_states':
        return (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New State
            </label>
            <select
              value={(eventParams.newState as string) || 'TX'}
              onChange={(e) =>
                onParamsChange({ ...eventParams, newState: e.target.value })
              }
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
            >
              {US_STATES.filter(s => s.code !== household.state).map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>
        );

      case 'changing_income':
        return (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Annual Income
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={(eventParams.newIncome as number) || Math.round(household.income * 1.2)}
                  onChange={(e) =>
                    onParamsChange({
                      ...eventParams,
                      newIncome: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                  disabled={disabled}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#39C6C0] focus:border-[#39C6C0] text-sm"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Current income: ${household.income.toLocaleString()}
              </p>
            </div>
          </div>
        );

      case 'unemployment':
        return (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Weekly Unemployment Benefits
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={(eventParams.weeklyBenefits as number) || 400}
                  onChange={(e) =>
                    onParamsChange({
                      ...eventParams,
                      weeklyBenefits: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                  disabled={disabled}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#39C6C0] focus:border-[#39C6C0] text-sm"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Annual: ${((eventParams.weeklyBenefits as number) || 400) * 52}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-black mb-6">
        Select a Life Event
      </h2>

      <div className="space-y-3">
        {LIFE_EVENTS.map((event) => (
          <div key={event.type}>
            <button
              onClick={() => onSelect(event.type)}
              disabled={disabled}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedEvent === event.type
                  ? 'border-[#39C6C0] bg-[#F7FDFC]'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" role="img" aria-label={event.label}>
                  {event.icon}
                </span>
                <div>
                  <h3 className="font-medium text-gray-900">{event.label}</h3>
                  <p className="text-sm text-gray-500">{event.description}</p>
                </div>
              </div>
            </button>
            {renderEventParams(event)}
          </div>
        ))}
      </div>
    </div>
  );
}
