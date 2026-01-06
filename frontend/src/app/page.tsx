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

const STEPS = [
  { key: 'household' as const, label: 'Household', number: 1 },
  { key: 'event' as const, label: 'Life Event', number: 2 },
  { key: 'results' as const, label: 'Results', number: 3 },
];

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

  const currentStepIndex = STEPS.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      {step === 'household' && (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#319795] via-[#2C7A7B] to-[#285E61]">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
          <div className="relative max-w-3xl mx-auto px-6 py-16 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
              How will life changes affect your finances?
            </h1>
            <p className="text-lg text-white/90 max-w-xl mx-auto leading-relaxed">
              Explore how major life events impact your taxes, benefits, and net income
              using PolicyEngine&apos;s simulation engine.
            </p>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-center">
            {STEPS.map((s, i) => {
              const isActive = s.key === step;
              const isCompleted = currentStepIndex > i;
              const isClickable = i < currentStepIndex || (i === currentStepIndex);

              return (
                <div key={s.key} className="flex items-center">
                  <button
                    onClick={() => isClickable && i < currentStepIndex && setStep(s.key)}
                    disabled={!isClickable || i >= currentStepIndex}
                    className={`flex items-center gap-2.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#319795] text-white shadow-sm'
                        : isCompleted
                        ? 'bg-[#E6FFFA] text-[#285E61] hover:bg-[#B2F5EA] cursor-pointer'
                        : 'bg-[#F2F4F7] text-[#9CA3AF]'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-semibold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : isCompleted
                          ? 'bg-[#319795] text-white'
                          : 'bg-[#E2E8F0] text-[#9CA3AF]'
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        s.number
                      )}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`w-8 sm:w-12 h-0.5 mx-1 sm:mx-2 rounded-full transition-colors ${
                        currentStepIndex > i ? 'bg-[#319795]' : 'bg-[#E2E8F0]'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Step Content */}
        {step === 'household' && (
          <div className="animate-fadeIn">
            <HouseholdForm
              household={household}
              onChange={setHousehold}
              disabled={isLoading}
            />
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setStep('event')}
                disabled={!canProceedToEvent}
                className="btn btn-primary px-8"
              >
                Continue
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {step === 'event' && (
          <div className="animate-fadeIn">
            <LifeEventSelector
              selectedEvent={selectedEvent}
              onSelect={setSelectedEvent}
              eventParams={eventParams}
              onParamsChange={setEventParams}
              household={household}
              disabled={isLoading}
            />
            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep('household')}
                disabled={isLoading}
                className="btn btn-secondary"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                onClick={handleSimulate}
                disabled={!canSimulate || isLoading}
                className="btn btn-primary px-8"
              >
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    Simulating...
                  </>
                ) : (
                  <>
                    See Results
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 'results' && result && (
          <div className="animate-fadeIn">
            {/* Scenario Summary */}
            <div className="mb-8 p-5 bg-[#E6FFFA] rounded-xl border border-[#319795]/20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Your Scenario</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('household')}
                    className="text-sm text-[#285E61] hover:text-[#319795] font-medium"
                  >
                    Edit Household
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => setStep('event')}
                    className="text-sm text-[#285E61] hover:text-[#319795] font-medium"
                  >
                    Change Event
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">State</span>
                  <p className="font-medium text-gray-900">{household.state}</p>
                </div>
                <div>
                  <span className="text-gray-500">Filing Status</span>
                  <p className="font-medium text-gray-900 capitalize">
                    {household.filingStatus.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Income</span>
                  <p className="font-medium text-gray-900">${household.income.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">Life Event</span>
                  <p className="font-medium text-gray-900 capitalize">
                    {selectedEvent?.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
            </div>

            <ResultsView result={result} onReset={handleReset} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-auto py-10 text-center">
        <p className="text-sm text-gray-500">
          Powered by{' '}
          <a
            href="https://policyengine.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#319795] hover:text-[#285E61] font-medium transition-colors"
          >
            PolicyEngine
          </a>
        </p>
      </footer>
    </div>
  );
}
