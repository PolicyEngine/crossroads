'use client';

import { LifeEvent, LifeEventType, LIFE_EVENTS, US_STATES } from '@/types';

interface LifeEventSelectorProps {
  selectedEvent: LifeEventType | null;
  onSelect: (event: LifeEventType) => void;
  eventParams: Record<string, unknown>;
  onParamsChange: (params: Record<string, unknown>) => void;
  disabled?: boolean;
}

export default function LifeEventSelector({
  selectedEvent,
  onSelect,
  eventParams,
  onParamsChange,
  disabled = false,
}: LifeEventSelectorProps) {
  const renderEventParams = (event: LifeEvent) => {
    if (!selectedEvent || selectedEvent !== event.type) return null;

    switch (event.type) {
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
              {US_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>
        );

      case 'changing_income':
        return (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Income Change
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="-50"
                max="100"
                value={(eventParams.percentChange as number) || 20}
                onChange={(e) =>
                  onParamsChange({
                    ...eventParams,
                    percentChange: parseInt(e.target.value),
                  })
                }
                disabled={disabled}
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-700 w-16 text-right">
                {(eventParams.percentChange as number) > 0 ? '+' : ''}
                {(eventParams.percentChange as number) || 20}%
              </span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
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
                  ? 'border-teal-500 bg-teal-50'
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
