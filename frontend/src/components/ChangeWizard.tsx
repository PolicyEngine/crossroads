'use client';

import { useState } from 'react';
import { Household, LifeEventType, LIFE_EVENTS, US_STATES, SelectedEvent } from '@/types';

interface ChangeWizardProps {
  household: Household;
  onApply: (events: SelectedEvent[]) => void;
}

function isMarried(h: Household) {
  return h.filingStatus === 'married_jointly' || h.filingStatus === 'married_separately';
}

// Events that make sense for this household. Marriage is hidden for married
// filers, divorce for single filers, and losing employer coverage when
// nobody has it.
function getAvailableEvents(h: Household): typeof LIFE_EVENTS {
  return LIFE_EVENTS.filter((e) => {
    if (e.type === 'getting_married') return !isMarried(h);
    if (e.type === 'divorce') return isMarried(h);
    if (e.type === 'losing_esi') return h.hasESI || h.spouseHasESI;
    return true;
  });
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5">
      {children}
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#319795]/30 focus-within:border-[#319795] bg-white">
      <span className="px-3 text-gray-400 text-sm bg-gray-50 border-r border-gray-200 py-2.5">$</span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        autoFocus={autoFocus}
        className="flex-1 text-base px-3 py-2.5 focus:outline-none min-w-0"
      />
      <span className="px-3 text-gray-400 text-xs bg-gray-50 border-l border-gray-200 py-2.5">/yr</span>
    </div>
  );
}

function inputClass() {
  return 'w-full text-base border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#319795]/30 focus:border-[#319795] bg-white';
}

export default function ChangeWizard({ household, onApply }: ChangeWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [eventType, setEventType] = useState<LifeEventType | null>(null);
  // Events already configured via "Add another change"; applied in order
  // before the one currently being edited.
  const [queued, setQueued] = useState<SelectedEvent[]>([]);

  const married = isMarried(household);

  // having_baby
  const [numBabies, setNumBabies] = useState(1);

  // getting_married
  const [spouseAge, setSpouseAge] = useState('30');
  const [spouseIncome, setSpouseIncome] = useState('');
  const [spouseHasESI, setSpouseHasESI] = useState(false);
  const [spouseChildAges, setSpouseChildAges] = useState<Array<number | ''>>([]);

  // divorce
  const [childrenKeeping, setChildrenKeeping] = useState(household.childAges.length);

  // moving_states
  const [newState, setNewState] = useState('');

  // changing_income
  const [newIncome, setNewIncome] = useState(String(household.income));
  const [newSpouseIncome, setNewSpouseIncome] = useState(String(household.spouseIncome ?? 0));

  const events = getAvailableEvents(household);

  function resetEventFields() {
    setNumBabies(1);
    setSpouseAge('30');
    setSpouseIncome('');
    setSpouseHasESI(false);
    setSpouseChildAges([]);
    setChildrenKeeping(household.childAges.length);
    setNewState('');
    setNewIncome(String(household.income));
    setNewSpouseIncome(String(household.spouseIncome ?? 0));
  }

  function pickEvent(t: LifeEventType) {
    setEventType(t);
    setStep(2);
  }

  function buildParams(): Record<string, unknown> {
    switch (eventType) {
      case 'having_baby':
        return { numBabies };
      case 'getting_married':
        return {
          spouseAge: parseInt(spouseAge, 10) || 30,
          spouseIncome: parseInt(spouseIncome, 10) || 0,
          spouseHasESI,
          spouseChildAges: spouseChildAges.map((a) => (a === '' ? 0 : a)),
        };
      case 'divorce':
        return { childrenKeeping };
      case 'moving_states':
        return { newState };
      case 'changing_income': {
        const params: Record<string, unknown> = {
          newIncome: parseInt(newIncome, 10) || 0,
        };
        if (married) params.newSpouseIncome = parseInt(newSpouseIncome, 10) || 0;
        return params;
      }
      case 'losing_esi':
        return {};
      default:
        return {};
    }
  }

  function canApply(): boolean {
    switch (eventType) {
      case 'changing_income': {
        if (newIncome === '') return false;
        const changedSelf = (parseInt(newIncome, 10) || 0) !== household.income;
        const changedSpouse =
          married && (parseInt(newSpouseIncome, 10) || 0) !== (household.spouseIncome ?? 0);
        return changedSelf || changedSpouse;
      }
      case 'moving_states':
        return newState !== '' && newState !== household.state;
      case 'getting_married':
        return spouseAge !== '' && parseInt(spouseAge, 10) >= 18;
      case 'having_baby':
      case 'divorce':
      case 'losing_esi':
        return true;
      default:
        return false;
    }
  }

  function addAnother() {
    if (!eventType || !canApply()) return;
    setQueued((prev) => [...prev, { type: eventType, params: buildParams() }]);
    setEventType(null);
    resetEventFields();
    setStep(1);
  }

  function run() {
    if (eventType && canApply()) {
      onApply([...queued, { type: eventType, params: buildParams() }]);
    } else if (queued.length > 0) {
      onApply(queued);
    }
  }

  function removeQueued(index: number) {
    setQueued((prev) => prev.filter((_, i) => i !== index));
  }

  const eventLabel = (t: LifeEventType) => LIFE_EVENTS.find((e) => e.type === t)?.label ?? t;

  // Display step number continues from the household wizard (steps 1-6).
  const wizardStep = step === 1 ? 7 : 8;
  const progressPercent = (wizardStep / 8) * 100;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500">Step {wizardStep} of 8</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#319795] rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="card p-6 sm:p-8">
        {queued.length > 0 && (
          <div className="mb-5 p-4 bg-[#E6FFFA] rounded-xl border border-[#319795]/20">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#285E61] mb-2">
              Changes so far (applied in order)
            </div>
            <div className="flex flex-wrap gap-2">
              {queued.map((evt, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-[#319795]/30 text-sm font-medium text-gray-700"
                >
                  {eventLabel(evt.type)}
                  <button
                    type="button"
                    onClick={() => removeQueued(idx)}
                    className="p-0.5 text-gray-400 hover:text-gray-700 transition-colors"
                    aria-label={`Remove ${eventLabel(evt.type)}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <>
            <div className="mb-5">
              <h2 className="text-xl font-bold text-gray-900">
                {queued.length > 0 ? 'What else is changing?' : "What's changing?"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {queued.length > 0
                  ? 'Pick another life event, or run the scenario with the changes above.'
                  : 'Pick the life event you want to model.'}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {events.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => pickEvent(opt.type)}
                  className="text-left rounded-xl border-2 border-gray-200 hover:border-[#319795] hover:bg-[#E6FFFA]/50 p-4 transition-all"
                >
                  <div className="text-sm font-semibold text-gray-900 mb-1">{opt.label}</div>
                  <div className="text-xs text-gray-500 leading-snug">{opt.description}</div>
                </button>
              ))}
            </div>
            {queued.length > 0 && (
              <div className="flex justify-end mt-6">
                <button type="button" onClick={run} className="btn btn-primary">
                  Run scenario ({queued.length} change{queued.length > 1 ? 's' : ''})
                </button>
              </div>
            )}
          </>
        )}

        {step === 2 && eventType && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canApply()) run();
            }}
          >
            <div className="mb-5">
              <h2 className="text-xl font-bold text-gray-900">{getStep2Heading(eventType)}</h2>
            </div>

            <div className="space-y-4">
              {eventType === 'having_baby' && (
                <div className="max-w-xs">
                  <FieldLabel>Number of babies</FieldLabel>
                  <select
                    value={numBabies}
                    onChange={(e) => setNumBabies(parseInt(e.target.value, 10))}
                    autoFocus
                    className={inputClass()}
                  >
                    <option value={1}>1 (single)</option>
                    <option value={2}>2 (twins)</option>
                    <option value={3}>3 (triplets)</option>
                  </select>
                </div>
              )}

              {eventType === 'getting_married' && (
                <>
                  <div className="max-w-xs">
                    <FieldLabel>Spouse&apos;s age</FieldLabel>
                    <input
                      type="number"
                      min={18}
                      max={100}
                      value={spouseAge}
                      onChange={(e) => setSpouseAge(e.target.value)}
                      autoFocus
                      className={inputClass()}
                    />
                  </div>
                  <div className="max-w-xs">
                    <FieldLabel>Spouse&apos;s annual income</FieldLabel>
                    <MoneyInput value={spouseIncome} onChange={setSpouseIncome} />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 py-1">
                    <input
                      type="checkbox"
                      checked={spouseHasESI}
                      onChange={(e) => setSpouseHasESI(e.target.checked)}
                      className="checkbox"
                    />
                    Spouse has employer health insurance
                  </label>
                  <div>
                    <FieldLabel>Spouse&apos;s children (under 18)</FieldLabel>
                    <div className="flex flex-col gap-2 max-w-xs">
                      {spouseChildAges.length === 0 && (
                        <p className="text-xs text-gray-400">None</p>
                      )}
                      {spouseChildAges.map((childAge, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-14 shrink-0">Child {i + 1}</span>
                          <input
                            type="number"
                            min={0}
                            max={17}
                            value={childAge}
                            onChange={(e) => {
                              const next = [...spouseChildAges];
                              const v = e.target.value;
                              if (v === '') next[i] = '';
                              else {
                                const n = parseInt(v, 10);
                                next[i] = isNaN(n) ? '' : Math.min(17, Math.max(0, n));
                              }
                              setSpouseChildAges(next);
                            }}
                            className={inputClass()}
                            placeholder="Age"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setSpouseChildAges(spouseChildAges.filter((_, j) => j !== i))
                            }
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                            aria-label={`Remove spouse's child ${i + 1}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          spouseChildAges.length < 10 && setSpouseChildAges([...spouseChildAges, 0])
                        }
                        className="self-start inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#2C7A7B] bg-[#E6FFFA] hover:bg-[#B2F5EA] rounded-lg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        Add child
                      </button>
                    </div>
                  </div>
                </>
              )}

              {eventType === 'divorce' && (
                <>
                  {household.childAges.length > 0 ? (
                    <div className="max-w-xs">
                      <FieldLabel>
                        Children staying with you (of {household.childAges.length})
                      </FieldLabel>
                      <input
                        type="number"
                        min={0}
                        max={household.childAges.length}
                        value={childrenKeeping}
                        onChange={(e) =>
                          setChildrenKeeping(
                            Math.min(
                              household.childAges.length,
                              Math.max(0, parseInt(e.target.value, 10) || 0),
                            ),
                          )
                        }
                        autoFocus
                        className={inputClass()}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Click Run scenario to model the divorce.
                    </p>
                  )}
                </>
              )}

              {eventType === 'moving_states' && (
                <div className="max-w-sm">
                  <FieldLabel>New state</FieldLabel>
                  <select
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    autoFocus
                    className={inputClass()}
                  >
                    <option value="" disabled>Select a state</option>
                    {US_STATES.filter((s) => s.code !== household.state).map((s) => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {eventType === 'changing_income' && (
                <>
                  <div className="max-w-xs">
                    <FieldLabel>{married ? 'Your new annual income' : 'New annual income'}</FieldLabel>
                    <MoneyInput value={newIncome} onChange={setNewIncome} autoFocus />
                    <p className="mt-1.5 text-xs text-gray-500">
                      Current: ${household.income.toLocaleString()}
                    </p>
                  </div>
                  {married && (
                    <div className="max-w-xs">
                      <FieldLabel>Spouse&apos;s new annual income</FieldLabel>
                      <MoneyInput value={newSpouseIncome} onChange={setNewSpouseIncome} />
                      <p className="mt-1.5 text-xs text-gray-500">
                        Current: ${(household.spouseIncome ?? 0).toLocaleString()}
                      </p>
                    </div>
                  )}
                </>
              )}

              {eventType === 'losing_esi' && (
                <p className="text-sm text-gray-600">
                  Employer health insurance ends for everyone who has it. Click Run scenario to
                  see what changes.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
              <button type="button" onClick={() => setStep(1)} className="btn btn-ghost">
                Pick a different event
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={addAnother}
                  disabled={!canApply()}
                  className="btn btn-secondary"
                >
                  Add another change
                </button>
                <button type="submit" disabled={!canApply()} className="btn btn-primary">
                  Run scenario
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function getStep2Heading(eventType: LifeEventType): string {
  switch (eventType) {
    case 'having_baby': return 'Tell us about the new arrival';
    case 'getting_married': return 'Tell us about your future spouse';
    case 'divorce': return 'A few details about the split';
    case 'moving_states': return 'Where are you moving?';
    case 'changing_income': return "What's the new income?";
    case 'losing_esi': return 'Confirm';
  }
}
