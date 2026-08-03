'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import HouseholdWizard from '@/components/HouseholdWizard';
import ChangeWizard from '@/components/ChangeWizard';
import ResultsView from '@/components/ResultsView';
import { Household, LifeEventType, SimulationResult, SelectedEvent, LIFE_EVENTS, US_STATES } from '@/types';

interface SavedScenario {
  id: string;
  events: SelectedEvent[];
  result: SimulationResult;
}

function newScenarioId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// URL encoding/decoding helpers (single-event scenarios only)
function encodeScenario(household: Household, event: LifeEventType, params: Record<string, unknown>): string {
  return btoa(JSON.stringify({ h: household, e: event, p: params }));
}

function decodeScenario(encoded: string): { household: Household; event: LifeEventType; params: Record<string, unknown> } | null {
  try {
    const data = JSON.parse(atob(encoded));
    if (data.h && data.e) {
      // Ensure all required household fields have defaults (for backwards compatibility)
      const household: Household = {
        state: data.h.state || 'CA',
        filingStatus: data.h.filingStatus || 'single',
        income: data.h.income ?? 50000,
        spouseIncome: data.h.spouseIncome ?? 0,
        spouseAge: data.h.spouseAge ?? 30,
        childAges: data.h.childAges || [],
        age: data.h.age ?? 30,
        hasESI: data.h.hasESI ?? false,
        spouseHasESI: data.h.spouseHasESI ?? false,
        year: data.h.year ?? 2026,
      };
      return { household, event: data.e, params: data.p || {} };
    }
  } catch {
    // Invalid encoding
  }
  return null;
}

export default function Home() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [partialHousehold, setPartialHousehold] = useState<Partial<Household>>({});
  const [appliedEvents, setAppliedEvents] = useState<SelectedEvent[]>([]);
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showCopied, setShowCopied] = useState(false);

  const result = scenarios.find((s) => s.id === currentScenarioId)?.result ?? null;
  const otherScenarios = scenarios.filter((s) => s.id !== currentScenarioId);

  const runSimulation = useCallback(async (h: Household, events: SelectedEvent[]) => {
    if (events.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
      // Single events use the lifeEvent field; combined scenarios send the
      // ordered lifeEvents list.
      const body: Record<string, unknown> = { household: h };
      if (events.length === 1) {
        body.lifeEvent = { type: events[0].type, params: events[0].params };
      } else {
        body.lifeEvents = events.map((e) => ({ type: e.type, params: e.params }));
      }

      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (!data.before || !data.after) throw new Error('Invalid response from simulation');

      const id = newScenarioId();
      setScenarios((prev) => [...prev, { id, events, result: data }]);
      setCurrentScenarioId(id);

      // Shareable link (single events only for now)
      if (events.length === 1) {
        const encoded = encodeScenario(h, events[0].type, events[0].params);
        setShareUrl(`${window.location.origin}?s=${encoded}`);
        window.history.replaceState({}, '', `?s=${encoded}`);
      } else {
        setShareUrl(null);
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const restoreScenario = useCallback((s: SavedScenario, h: Household) => {
    setCurrentScenarioId(s.id);
    setAppliedEvents(s.events);
    setError(null);
    if (s.events.length === 1) {
      const encoded = encodeScenario(h, s.events[0].type, s.events[0].params);
      setShareUrl(`${window.location.origin}?s=${encoded}`);
      window.history.replaceState({}, '', `?s=${encoded}`);
    } else {
      setShareUrl(null);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const removeScenario = useCallback((id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
    setCurrentScenarioId((curr) => (curr === id ? null : curr));
  }, []);

  // Check URL for a shared scenario on page load. The ref guards against
  // StrictMode double-invocation creating duplicate scenarios.
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('s');
    if (encoded) {
      const scenario = decodeScenario(encoded);
      if (scenario) {
        const events = [{ type: scenario.event, params: scenario.params }];
        setHousehold(scenario.household);
        setAppliedEvents(events);
        runSimulation(scenario.household, events);
      }
    }
  }, [runSimulation]);

  const handleWizardComplete = (h: Household) => {
    setHousehold(h);
    setAppliedEvents([]);
    setScenarios([]);
    setCurrentScenarioId(null);
    setError(null);
  };

  const handleRun = () => {
    if (household && appliedEvents.length > 0) {
      runSimulation(household, appliedEvents);
    }
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const handleTryAnother = () => {
    // Keep household + scenario history; clear the active result so the
    // user can model a new what-if.
    setAppliedEvents([]);
    setCurrentScenarioId(null);
    setError(null);
    setShareUrl(null);
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handleReset = () => {
    setHousehold(null);
    setPartialHousehold({});
    setAppliedEvents([]);
    setScenarios([]);
    setCurrentScenarioId(null);
    setError(null);
    setShareUrl(null);
    window.history.replaceState({}, '', window.location.pathname);
  };

  const eventsLabel = describeEvents(appliedEvents);

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 pb-16">

        {/* Hero card */}
        <div className="bg-white border border-gray-200 rounded-xl p-7 shadow-sm mb-4 mt-6">
          {result && appliedEvents.length > 0 && household ? (
            <>
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-[#285E61] bg-[#E6FFFA] px-3 py-1.5 rounded-full mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#319795]" />
                {eventsLabel}
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
                {getHeroHeadline(appliedEvents, result)}
              </h1>
              <p className="text-[15px] text-gray-500 leading-relaxed">
                {householdSummaryLine(household)}
              </p>
              {(() => {
                const changes = appliedEvents.flatMap((e) =>
                  describeScenarioChanges(e.type, e.params, household),
                );
                if (changes.length === 0) return null;
                return (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                      What changed
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                      {changes.map((c, i) => (
                        <div key={i} className="flex items-baseline gap-2 text-sm">
                          <span className="text-gray-500">{c.label}</span>
                          {c.before !== undefined && c.after !== undefined ? (
                            <>
                              <span className="text-gray-400 line-through tabular-nums">{c.before}</span>
                              <span className="text-gray-300">to</span>
                              <span className="font-semibold text-gray-900 tabular-nums">{c.after}</span>
                            </>
                          ) : (
                            <span className="font-semibold text-gray-900">{c.text}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div className="flex gap-5 flex-wrap mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
                <span>Tax year: <b className="text-gray-900">{household.year}</b></span>
                {shareUrl && (
                  <button
                    onClick={handleShare}
                    className="ml-auto text-[#319795] hover:text-[#285E61] font-medium flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    {showCopied ? 'Copied!' : 'Share'}
                  </button>
                )}
              </div>
            </>
          ) : household ? (
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-[#285E61] bg-[#E6FFFA] px-3 py-1.5 rounded-full mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#319795]" />
                  Your household
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
                  What if something changed?
                </h1>
                <p className="text-[15px] text-gray-500 leading-relaxed">
                  Pick a life event below to see how it would affect your taxes, benefits, and
                  net income.
                </p>
              </div>
              <button
                onClick={handleReset}
                className="shrink-0 text-sm text-gray-400 hover:text-gray-600 transition-colors mt-1"
              >
                Start over
              </button>
            </div>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-[#285E61] bg-[#E6FFFA] px-3 py-1.5 rounded-full mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#319795]" />
                New scenario
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
                See how a life event changes your taxes and benefits.
              </h1>
              <p className="text-[15px] text-gray-500 leading-relaxed max-w-2xl">
                Tell us about your household and we&apos;ll model it with PolicyEngine&apos;s
                simulation engine.
              </p>
            </>
          )}
        </div>

        {/* Household wizard (no household yet) */}
        {!household && (
          <>
            <PartialSummary partial={partialHousehold} />
            <HouseholdWizard
              onComplete={handleWizardComplete}
              onPartialChange={setPartialHousehold}
            />
          </>
        )}

        {/* Household entered: show change wizard until results are ready */}
        {household && !isLoading && !result && !error && (
          <ChangeWizard
            household={household}
            onApply={(events) => {
              setAppliedEvents(events);
              runSimulation(household, events);
            }}
          />
        )}

        {/* Loading */}
        {isLoading && (
          <div className="mt-4 bg-white border border-gray-200 rounded-xl p-12 shadow-sm flex flex-col items-center justify-center">
            <div className="relative mb-6">
              <div className="w-14 h-14 border-4 border-[#E6FFFA] rounded-full" />
              <div className="absolute inset-0 w-14 h-14 border-4 border-[#319795] border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-gray-500 text-center">
              Calculating how {eventsLabel.toLowerCase()} affects your taxes and benefits…
            </p>
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="mt-4 bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-center">
            <p className="text-red-600 font-medium mb-1">Simulation failed</p>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
            <div className="flex justify-center gap-3 flex-wrap">
              <button
                onClick={handleRun}
                disabled={appliedEvents.length === 0}
                className="btn btn-secondary"
              >
                Try again
              </button>
              <button onClick={handleTryAnother} className="btn btn-ghost">
                Pick a different change
              </button>
              <button onClick={handleReset} className="btn btn-ghost">
                Start over with a new household
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {!isLoading && !error && result && household && (
          <div className="mt-4">
            <ResultsView
              result={result}
              household={household}
              onTryAnother={handleTryAnother}
              onReset={handleReset}
            />
          </div>
        )}

        {/* Saved scenarios: older results from this household */}
        {household && otherScenarios.length > 0 && (
          <div className="mt-6">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">
              Compared scenarios
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {otherScenarios.map((s) => (
                <ScenarioCard
                  key={s.id}
                  scenario={s}
                  onClick={() => restoreScenario(s, household)}
                  onRemove={() => removeScenario(s.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-10 text-center" role="contentinfo">
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
    </div>
  );
}

function describeEvents(events: SelectedEvent[]): string {
  if (events.length === 0) return 'This change';
  if (events.length === 1) {
    return LIFE_EVENTS.find((e) => e.type === events[0].type)?.label ?? events[0].type;
  }
  return `${events.length} combined changes`;
}

function householdSummaryLine(h: Household): string {
  const married = h.filingStatus === 'married_jointly' || h.filingStatus === 'married_separately';
  const stateName = US_STATES.find((s) => s.code === h.state)?.name ?? h.state;
  const totalIncome = h.income + (married ? h.spouseIncome ?? 0 : 0);
  const parts = [
    stateName,
    married ? `Married, ages ${h.age} & ${h.spouseAge}` : `Single, age ${h.age}`,
    `$${totalIncome.toLocaleString()}/yr household income`,
  ];
  if (h.childAges.length > 0) {
    parts.push(`${h.childAges.length} child${h.childAges.length > 1 ? 'ren' : ''}`);
  }
  return parts.join(' · ');
}

function PartialSummary({ partial }: { partial: Partial<Household> }) {
  const items: { label: string; value: string }[] = [];
  if (partial.state) {
    items.push({
      label: 'State',
      value: US_STATES.find((s) => s.code === partial.state)?.name ?? partial.state,
    });
  }
  if (partial.year) {
    items.push({ label: 'Tax year', value: String(partial.year) });
  }
  if (partial.filingStatus) {
    const labels: Record<Household['filingStatus'], string> = {
      single: 'Single',
      married_jointly: 'Married filing jointly',
      married_separately: 'Married filing separately',
      head_of_household: 'Head of household',
    };
    items.push({ label: 'Filing', value: labels[partial.filingStatus] });
  }
  if (partial.age && partial.age > 0) {
    const married =
      partial.filingStatus === 'married_jointly' || partial.filingStatus === 'married_separately';
    items.push({
      label: 'Age',
      value: married && partial.spouseAge ? `${partial.age} & ${partial.spouseAge}` : `${partial.age}`,
    });
  }
  if (partial.income !== undefined && partial.income > 0) {
    const total = partial.income + (partial.spouseIncome ?? 0);
    items.push({ label: 'Income', value: `$${total.toLocaleString()}/yr` });
  }
  if (partial.hasESI !== undefined || partial.spouseHasESI !== undefined) {
    items.push({
      label: 'Job coverage',
      value: partial.hasESI || partial.spouseHasESI ? 'Yes' : 'No',
    });
  }
  if (partial.childAges && partial.childAges.length > 0) {
    items.push({
      label: 'Children',
      value: `${partial.childAges.length} (ages ${partial.childAges.join(', ')})`,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="mb-4 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
        So far
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {items.map((item) => (
          <div key={item.label}>
            <div className="text-[10px] uppercase tracking-wider text-gray-400">{item.label}</div>
            <div className="text-sm font-semibold text-gray-900">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ScenarioCardProps {
  scenario: SavedScenario;
  onClick: () => void;
  onRemove: () => void;
}

function ScenarioCard({ scenario, onClick, onRemove }: ScenarioCardProps) {
  const label = describeEvents(scenario.events);
  const delta = scenario.result.diff?.netIncome ?? 0;
  const isGain = delta > 0.5;
  const isLoss = delta < -0.5;
  const tone = isGain ? 'text-green-600' : isLoss ? 'text-red-600' : 'text-gray-500';
  const sign = isGain ? '+' : isLoss ? '−' : '';
  const amount = `$${Math.abs(Math.round(delta)).toLocaleString()}`;
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left bg-white border border-gray-200 hover:border-[#319795] hover:shadow-sm rounded-xl p-3 pr-8 transition-all"
      >
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#285E61] mb-1">
          {label}
        </div>
        <div className={`text-base font-semibold tabular-nums ${tone}`}>
          {isGain || isLoss ? `${sign}${amount}/yr net income` : 'No net income change'}
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        aria-label="Remove scenario"
        className="absolute top-2 right-2 p-1 text-gray-300 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// Structured "what changed" entries for the result hero. Each entry has a
// label and either a before/after pair or a single text value. Skips fields
// the user didn't actually change.
interface ScenarioChange {
  label: string;
  before?: string;
  after?: string;
  text?: string;
}

function describeScenarioChanges(
  eventType: LifeEventType,
  params: Record<string, unknown>,
  household: Household,
): ScenarioChange[] {
  const fmt = (annual: number) => `$${Math.round(annual).toLocaleString()}/yr`;
  const out: ScenarioChange[] = [];

  switch (eventType) {
    case 'having_baby': {
      const n = (params.numBabies as number) ?? 1;
      out.push({ label: 'New baby', text: n === 1 ? '1 baby' : `${n} babies` });
      return out;
    }
    case 'getting_married': {
      const spouseAge = params.spouseAge as number | undefined;
      const spouseIncome = params.spouseIncome as number | undefined;
      const spouseChildAges = (params.spouseChildAges as number[] | undefined) ?? [];
      const parts: string[] = [];
      if (spouseAge) parts.push(`age ${spouseAge}`);
      if (spouseIncome !== undefined && spouseIncome > 0) parts.push(`${fmt(spouseIncome)} income`);
      if (spouseChildAges.length > 0) {
        parts.push(`${spouseChildAges.length} child${spouseChildAges.length > 1 ? 'ren' : ''}`);
      }
      out.push({ label: 'Adding spouse', text: parts.length > 0 ? parts.join(', ') : 'New spouse' });
      return out;
    }
    case 'divorce': {
      const childrenKeeping = params.childrenKeeping as number | undefined;
      if (household.childAges.length > 0 && childrenKeeping !== undefined) {
        const leaving = household.childAges.length - childrenKeeping;
        out.push({
          label: 'Children',
          text: `${childrenKeeping} of ${household.childAges.length} stay with you${leaving > 0 ? `, ${leaving} with ex-spouse` : ''}`,
        });
      }
      out.push({ label: 'Separating', text: 'from spouse' });
      return out;
    }
    case 'moving_states': {
      const newState = (params.newState as string) ?? household.state;
      if (newState !== household.state) {
        out.push({ label: 'State', before: household.state, after: newState });
      }
      return out;
    }
    case 'changing_income': {
      const newIncome = (params.newIncome as number) ?? household.income;
      if (newIncome !== household.income) {
        out.push({ label: 'Your income', before: fmt(household.income), after: fmt(newIncome) });
      }
      const newSpouseIncome = params.newSpouseIncome as number | undefined;
      if (newSpouseIncome !== undefined && newSpouseIncome !== (household.spouseIncome ?? 0)) {
        out.push({
          label: 'Spouse income',
          before: fmt(household.spouseIncome ?? 0),
          after: fmt(newSpouseIncome),
        });
      }
      return out;
    }
    case 'losing_esi':
      out.push({ label: 'Employer coverage', text: 'ending' });
      return out;
    default:
      return out;
  }
}

// Build the hero headline from the net income delta in the result so the
// copy can't contradict the numbers beneath it.
function getHeroHeadline(events: SelectedEvent[], result: SimulationResult): string {
  const subject = describeEvents(events);
  const delta = result.diff?.netIncome ?? 0;
  const amount = `$${Math.abs(Math.round(delta)).toLocaleString()}`;
  if (delta > 0.5) return `${subject} raises your annual net income by ${amount}.`;
  if (delta < -0.5) return `${subject} lowers your annual net income by ${amount}.`;
  return `${subject} leaves your annual net income unchanged.`;
}
