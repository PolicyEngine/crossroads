'use client';

import { useState } from 'react';
import HouseholdForm from '@/components/HouseholdForm';
import LifeEventSelector from '@/components/LifeEventSelector';
import ResultsView from '@/components/ResultsView';
import { Household, LifeEventType, SimulationResult } from '@/types';

type Step = 'household' | 'event' | 'results';

const DEFAULT_HOUSEHOLD: Household = {
  state: 'CA',
  filingStatus: 'single',
  income: 50000,
  spouseIncome: 0,
  spouseAge: 30,
  childAges: [],
  age: 30,
  hasESI: false,
  spouseHasESI: false,
};

export default function Home() {
  const [step, setStep] = useState<Step>('household');
  const [household, setHousehold] = useState<Household>(DEFAULT_HOUSEHOLD);
  const [selectedEvent, setSelectedEvent] = useState<LifeEventType | null>(null);
  const [eventParams, setEventParams] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async () => {
    if (!selectedEvent) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          household,
          lifeEvent: { type: selectedEvent, params: eventParams },
        }),
      });

      if (!response.ok) {
        throw new Error('Simulation failed');
      }

      const data = await response.json();
      setResult(data);
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('household');
    setSelectedEvent(null);
    setEventParams({});
    setResult(null);
    setError(null);
  };

  const canProceedToEvent = household.income >= 0;
  const canSimulate = selectedEvent !== null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      {step === 'household' && (
        <div className="bg-gradient-to-br from-[#39C6C0] to-[#227773] text-white py-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">
              How will life changes affect your finances?
            </h1>
            <p className="text-xl text-[#F7FDFC] max-w-2xl mx-auto">
              Explore how major life events impact your taxes, benefits, and net income
              using PolicyEngine&apos;s simulation engine.
            </p>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-4 mb-8">
          {[
            { key: 'household', label: '1. Your Household' },
            { key: 'event', label: '2. Life Event' },
            { key: 'results', label: '3. Results' },
          ].map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  step === s.key
                    ? 'bg-[#39C6C0] text-white'
                    : s.key === 'household' ||
                      (s.key === 'event' && step !== 'household') ||
                      (s.key === 'results' && step === 'results')
                    ? 'bg-[#F7FDFC] text-[#227773]'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s.label}
              </div>
              {i < 2 && (
                <div className="w-8 h-0.5 bg-gray-300 mx-2" />
              )}
            </div>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Step Content */}
        {step === 'household' && (
          <div className="max-w-xl mx-auto">
            <HouseholdForm
              household={household}
              onChange={setHousehold}
              disabled={isLoading}
            />
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setStep('event')}
                disabled={!canProceedToEvent}
                className="px-6 py-3 bg-[#39C6C0] hover:bg-[#227773] disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
              >
                Continue to Life Events
              </button>
            </div>
          </div>
        )}

        {step === 'event' && (
          <div className="max-w-xl mx-auto">
            <LifeEventSelector
              selectedEvent={selectedEvent}
              onSelect={setSelectedEvent}
              eventParams={eventParams}
              onParamsChange={setEventParams}
              household={household}
              disabled={isLoading}
            />
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep('household')}
                disabled={isLoading}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSimulate}
                disabled={!canSimulate || isLoading}
                className="px-6 py-3 bg-[#39C6C0] hover:bg-[#227773] disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Simulating...
                  </>
                ) : (
                  'See Results'
                )}
              </button>
            </div>
          </div>
        )}

        {step === 'results' && result && (
          <div>
            {/* Show current scenario */}
            <div className="mb-6 p-4 bg-[#F7FDFC] rounded-lg border border-[#39C6C0]">
              <h3 className="font-semibold text-black mb-2">Your Scenario</h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <span className="font-medium">State:</span> {household.state}
                </div>
                <div>
                  <span className="font-medium">Filing Status:</span> {household.filingStatus.replace('_', ' ')}
                </div>
                <div>
                  <span className="font-medium">Your Income:</span> ${household.income.toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Children:</span> {household.childAges.length}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-[#39C6C0]/30">
                <span className="font-medium">Life Event:</span> {selectedEvent?.replace('_', ' ')}
              </div>
            </div>

            <ResultsView result={result} onReset={handleReset} />

            {/* Edit buttons */}
            <div className="mt-6 flex gap-4 justify-center">
              <button
                onClick={() => setStep('household')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Edit Household
              </button>
              <button
                onClick={() => setStep('event')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Change Life Event
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-gray-500 text-sm">
        <p>
          Powered by{' '}
          <a
            href="https://policyengine.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#39C6C0] hover:underline"
          >
            PolicyEngine
          </a>
        </p>
      </footer>
    </div>
  );
}
