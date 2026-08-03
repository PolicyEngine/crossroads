'use client';

import { useState } from 'react';
import { Household, US_STATES } from '@/types';

interface HouseholdWizardProps {
  onComplete: (household: Household) => void;
  onPartialChange?: (partial: Partial<Household>) => void;
}

type FilingStatus = Household['filingStatus'];

// The change wizard adds 2 more steps after household entry (event picker,
// event details). Display the household steps as part of the same 8-step
// flow so the user sees a continuous progress bar.
const TOTAL_STEPS_INCLUDING_CHANGE = 8;

function isMarriedStatus(status: FilingStatus): boolean {
  return status === 'married_jointly' || status === 'married_separately';
}

const FILING_OPTIONS: { label: string; value: FilingStatus }[] = [
  { label: 'Single', value: 'single' },
  { label: 'Married filing jointly', value: 'married_jointly' },
  { label: 'Married filing separately', value: 'married_separately' },
  { label: 'Head of household', value: 'head_of_household' },
];

function optionClass(selected: boolean): string {
  return `w-full text-left px-4 py-3 rounded-xl border-2 font-medium transition-all mb-2 ${
    selected
      ? 'border-[#319795] bg-[#E6FFFA] text-[#285E61]'
      : 'border-gray-200 text-gray-900 hover:border-[#319795] hover:bg-[#E6FFFA]'
  }`;
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

export default function HouseholdWizard({ onComplete, onPartialChange }: HouseholdWizardProps) {
  const [step, setStep] = useState(1);

  const [state, setState] = useState('');
  const [year, setYear] = useState(2026);

  const [filingStatus, setFilingStatus] = useState<FilingStatus>('single');
  const [filingTouched, setFilingTouched] = useState(false);

  const [age, setAge] = useState<string>('');
  const [spouseAge, setSpouseAge] = useState<string>('');

  const [income, setIncome] = useState<string>('');
  const [spouseIncome, setSpouseIncome] = useState<string>('');

  const [hasESI, setHasESI] = useState(false);
  const [spouseHasESI, setSpouseHasESI] = useState(false);
  const [esiTouched, setEsiTouched] = useState(false);

  const [hasKids, setHasKids] = useState<'yes' | 'no' | null>(null);
  const [childAges, setChildAges] = useState<Array<number | ''>>([]);

  const married = isMarriedStatus(filingStatus);

  function buildPartial(overrides: Partial<Household> = {}): Partial<Household> {
    const partial: Partial<Household> = { year };
    if (state) partial.state = state;
    if (filingTouched) partial.filingStatus = filingStatus;
    const myAge = parseInt(age, 10);
    if (!isNaN(myAge) && myAge > 0) partial.age = myAge;
    const mySpouseAge = parseInt(spouseAge, 10);
    if (!isNaN(mySpouseAge) && mySpouseAge > 0) partial.spouseAge = mySpouseAge;
    const myIncome = parseInt(income, 10);
    if (!isNaN(myIncome)) partial.income = myIncome;
    const mySpouseIncome = parseInt(spouseIncome, 10);
    if (!isNaN(mySpouseIncome)) partial.spouseIncome = mySpouseIncome;
    if (esiTouched) {
      partial.hasESI = hasESI;
      partial.spouseHasESI = spouseHasESI;
    }
    const enteredChildAges = childAges.map(Number).filter((n) => !isNaN(n));
    if (enteredChildAges.length > 0) partial.childAges = enteredChildAges;
    return { ...partial, ...overrides };
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  function goNext() {
    setStep((s) => s + 1);
    onPartialChange?.(buildPartial());
  }

  function selectFilingStatus(status: FilingStatus) {
    setFilingStatus(status);
    setFilingTouched(true);
    setStep(3);
    // Pass overrides because the React state setter above hasn't flushed yet.
    onPartialChange?.(buildPartial({ filingStatus: status }));
  }

  function selectESI(selfESI: boolean, partnerESI: boolean) {
    setHasESI(selfESI);
    setSpouseHasESI(partnerESI);
    setEsiTouched(true);
    setStep(6);
    onPartialChange?.(buildPartial({ hasESI: selfESI, spouseHasESI: partnerESI }));
  }

  function addChild() {
    if (childAges.length < 10) setChildAges((prev) => [...prev, '']);
  }

  function removeChild(index: number) {
    setChildAges((prev) => prev.filter((_, i) => i !== index));
  }

  function updateChildAge(index: number, value: string) {
    setChildAges((prev) => {
      const next = [...prev];
      if (value === '') {
        next[index] = '';
      } else {
        const parsed = parseInt(value, 10);
        next[index] = isNaN(parsed) ? '' : Math.min(17, Math.max(0, parsed));
      }
      return next;
    });
  }

  function handleComplete(finalChildAges: Array<number | ''>) {
    const numericChildAges = finalChildAges.map((a) => (a === '' ? 0 : a));
    const household: Household = {
      state: state || 'CA',
      filingStatus,
      age: parseInt(age, 10) || 30,
      spouseAge: married ? parseInt(spouseAge, 10) || 30 : 30,
      income: parseInt(income, 10) || 0,
      spouseIncome: married ? parseInt(spouseIncome, 10) || 0 : 0,
      hasESI,
      spouseHasESI: married ? spouseHasESI : false,
      childAges: numericChildAges,
      year,
    };
    onComplete(household);
  }

  const progressPercent = (step / TOTAL_STEPS_INCLUDING_CHANGE) * 100;

  const step1Valid = state !== '';
  const step3Valid =
    age !== '' &&
    parseInt(age, 10) >= 18 &&
    (!married || (spouseAge !== '' && parseInt(spouseAge, 10) >= 18));
  const step4Valid = income !== '';

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500">
            Step {step} of {TOTAL_STEPS_INCLUDING_CHANGE}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#319795] rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="card p-8 animate-fadeIn" key={step}>
        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); if (step1Valid) goNext(); }}>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Where do you live?</h2>
            <p className="text-sm text-gray-500 mb-6">
              State and tax year determine which programs and rates apply.
            </p>
            <div className="flex flex-col gap-4 max-w-sm">
              <div>
                <label className="label">State</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  autoFocus
                  className="select-field"
                >
                  <option value="" disabled>Select a state</option>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Tax year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  className="select-field"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                  <option value={2023}>2023</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-8">
              <button type="submit" disabled={!step1Valid} className="btn btn-primary">
                Continue
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">How do you file your taxes?</h2>
            <p className="text-sm text-gray-500 mb-6">
              Head of household applies to single filers supporting a child or dependent.
            </p>
            <div className="flex flex-col gap-0">
              {FILING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => selectFilingStatus(opt.value)}
                  className={optionClass(filingTouched && filingStatus === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-4">
              <button type="button" onClick={goBack} className="btn btn-ghost">
                Back
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={(e) => { e.preventDefault(); if (step3Valid) goNext(); }}>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">How old are you?</h2>
            <p className="text-sm text-gray-500 mb-6" />
            <div className="flex flex-col gap-4">
              <div className="max-w-xs">
                <label className="label">Your age</label>
                <input
                  type="number"
                  min={18}
                  max={100}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  onBlur={() => {
                    const parsed = parseInt(age, 10);
                    if (!isNaN(parsed)) setAge(String(Math.min(100, Math.max(18, parsed))));
                  }}
                  className="input-field text-lg"
                  autoFocus
                />
              </div>
              {married && (
                <div className="max-w-xs">
                  <label className="label">Your spouse&apos;s age</label>
                  <input
                    type="number"
                    min={18}
                    max={100}
                    value={spouseAge}
                    onChange={(e) => setSpouseAge(e.target.value)}
                    onBlur={() => {
                      const parsed = parseInt(spouseAge, 10);
                      if (!isNaN(parsed)) setSpouseAge(String(Math.min(100, Math.max(18, parsed))));
                    }}
                    className="input-field text-lg"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-between mt-8">
              <button type="button" onClick={goBack} className="btn btn-ghost">
                Back
              </button>
              <button type="submit" disabled={!step3Valid} className="btn btn-primary">
                Continue
              </button>
            </div>
          </form>
        )}

        {step === 4 && (
          <form onSubmit={(e) => { e.preventDefault(); if (step4Valid) goNext(); }}>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {married ? 'What do you each earn per year?' : 'What do you earn per year?'}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Before taxes: wages, self-employment, and other earned income.
            </p>
            <div className="flex flex-col gap-4">
              <div className="max-w-xs">
                <label className="label">{married ? 'Your annual income' : 'Annual income'}</label>
                <MoneyInput value={income} onChange={setIncome} autoFocus />
              </div>
              {married && (
                <div className="max-w-xs">
                  <label className="label">Your spouse&apos;s annual income</label>
                  <MoneyInput value={spouseIncome} onChange={setSpouseIncome} />
                </div>
              )}
            </div>
            <div className="flex justify-between mt-8">
              <button type="button" onClick={goBack} className="btn btn-ghost">
                Back
              </button>
              <button type="submit" disabled={!step4Valid} className="btn btn-primary">
                Continue
              </button>
            </div>
          </form>
        )}

        {step === 5 && !married && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Do you have health insurance through an employer?
            </h2>
            <p className="text-sm text-gray-500 mb-6" />
            <div className="flex flex-col gap-0">
              <button
                type="button"
                onClick={() => selectESI(true, false)}
                className={optionClass(esiTouched && hasESI)}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => selectESI(false, false)}
                className={optionClass(esiTouched && !hasESI)}
              >
                No
              </button>
            </div>
            <div className="flex justify-between mt-4">
              <button type="button" onClick={goBack} className="btn btn-ghost">
                Back
              </button>
            </div>
          </div>
        )}

        {step === 5 && married && (
          <form onSubmit={(e) => { e.preventDefault(); selectESI(hasESI, spouseHasESI); }}>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Does anyone have health insurance through an employer?
            </h2>
            <p className="text-sm text-gray-500 mb-6">Check all that apply.</p>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasESI}
                  onChange={(e) => setHasESI(e.target.checked)}
                  className="checkbox"
                />
                <span className="text-sm text-gray-700">I have employer coverage</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={spouseHasESI}
                  onChange={(e) => setSpouseHasESI(e.target.checked)}
                  className="checkbox"
                />
                <span className="text-sm text-gray-700">My spouse has employer coverage</span>
              </label>
            </div>
            <div className="flex justify-between mt-8">
              <button type="button" onClick={goBack} className="btn btn-ghost">
                Back
              </button>
              <button type="submit" className="btn btn-primary">
                Continue
              </button>
            </div>
          </form>
        )}

        {step === 6 && hasKids !== 'yes' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Do you have any children under 18?
            </h2>
            <p className="text-sm text-gray-500 mb-6" />
            <div className="flex flex-col gap-0">
              <button
                type="button"
                onClick={() => { setHasKids('yes'); if (childAges.length === 0) setChildAges(['']); }}
                className={optionClass(false)}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => { setHasKids('no'); handleComplete([]); }}
                className={optionClass(hasKids === 'no')}
              >
                No
              </button>
            </div>
            <div className="flex justify-between mt-4">
              <button type="button" onClick={goBack} className="btn btn-ghost">
                Back
              </button>
            </div>
          </div>
        )}

        {step === 6 && hasKids === 'yes' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (childAges.length > 0) handleComplete(childAges);
            }}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-2">How old are your children?</h2>
            <p className="text-sm text-gray-500 mb-6" />
            <div className="flex flex-col gap-3 max-w-md">
              {childAges.map((childAge, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600 w-16 shrink-0">
                    Child {index + 1}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={17}
                    value={childAge}
                    onChange={(e) => updateChildAge(index, e.target.value)}
                    onBlur={() => { if (childAge === '') updateChildAge(index, '0'); }}
                    className="input-field flex-1 py-2"
                  />
                  <button
                    type="button"
                    onClick={() => removeChild(index)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
                    aria-label={`Remove child ${index + 1}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addChild}
                disabled={childAges.length >= 10}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#2C7A7B] bg-[#E6FFFA] hover:bg-[#B2F5EA] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors self-start"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add child
              </button>
            </div>
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={() => { setHasKids(null); setChildAges([]); }}
                className="btn btn-ghost"
              >
                Back
              </button>
              <button type="submit" disabled={childAges.length === 0} className="btn btn-primary">
                Finish
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
