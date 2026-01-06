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
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="label">Number of babies</label>
            <select
              value={(eventParams.numBabies as number) || 1}
              onChange={(e) =>
                onParamsChange({ ...eventParams, numBabies: parseInt(e.target.value) })
              }
              disabled={disabled}
              className="select-field"
            >
              <option value={1}>1 (Single)</option>
              <option value={2}>2 (Twins)</option>
              <option value={3}>3 (Triplets)</option>
            </select>
          </div>
        );

      case 'getting_married':
        return (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">Future Spouse Details</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Spouse&apos;s Age</label>
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
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Spouse&apos;s Annual Income</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5A5A] text-sm font-medium pointer-events-none">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={(eventParams.spouseIncome as number) || 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      onParamsChange({
                        ...eventParams,
                        spouseIncome: isNaN(val) ? 0 : Math.max(0, val),
                      });
                    }}
                    disabled={disabled}
                    className="input-field pl-8"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="label">Spouse&apos;s Children (from prior relationship)</label>
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
                className="input-field"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={(eventParams.spouseHasESI as boolean) || false}
                onChange={(e) =>
                  onParamsChange({ ...eventParams, spouseHasESI: e.target.checked })
                }
                disabled={disabled}
                className="checkbox"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                Spouse has employer-sponsored health insurance
              </span>
            </label>
          </div>
        );

      case 'divorce':
        return (
          <div className="mt-4 pt-4 border-t border-gray-100">
            {household.childAges.length > 0 && (
              <div>
                <label className="label">Children staying with you</label>
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
                  className="input-field"
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  Out of {household.childAges.length} children
                </p>
              </div>
            )}
          </div>
        );

      case 'moving_states':
        return (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="label">New State</label>
            <select
              value={(eventParams.newState as string) || 'TX'}
              onChange={(e) =>
                onParamsChange({ ...eventParams, newState: e.target.value })
              }
              disabled={disabled}
              className="select-field"
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
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="label">New Annual Income</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5A5A] text-sm font-medium pointer-events-none">$</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={(eventParams.newIncome as number) || Math.round(household.income * 1.2)}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  onParamsChange({
                    ...eventParams,
                    newIncome: isNaN(val) ? 0 : Math.max(0, val),
                  });
                }}
                disabled={disabled}
                className="input-field pl-8"
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              Current income: ${household.income.toLocaleString()}
            </p>
          </div>
        );

      case 'unemployment':
        return (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="label">Expected Weekly Unemployment Benefits</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5A5A] text-sm font-medium pointer-events-none">$</span>
              <input
                type="number"
                min="0"
                step="50"
                value={(eventParams.weeklyBenefits as number) || 400}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  onParamsChange({
                    ...eventParams,
                    weeklyBenefits: isNaN(val) ? 0 : Math.max(0, val),
                  });
                }}
                disabled={disabled}
                className="input-field pl-8"
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              Annual: ${(((eventParams.weeklyBenefits as number) || 400) * 52).toLocaleString()}
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="card p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Select a Life Event
      </h2>

      <div className="space-y-3">
        {LIFE_EVENTS.map((event) => {
          const isSelected = selectedEvent === event.type;

          return (
            <div key={event.type}>
              <button
                onClick={() => onSelect(event.type)}
                disabled={disabled}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-[#319795] bg-[#E6FFFA] shadow-sm'
                    : 'border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F9FAFB]'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`text-2xl w-10 h-10 flex items-center justify-center rounded-lg ${
                      isSelected ? 'bg-[#B2F5EA]' : 'bg-[#F2F4F7]'
                    }`}
                    role="img"
                    aria-label={event.label}
                  >
                    {event.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900">{event.label}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{event.description}</p>
                  </div>
                  {isSelected && (
                    <svg className="w-5 h-5 text-[#319795] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
              {renderEventParams(event)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
