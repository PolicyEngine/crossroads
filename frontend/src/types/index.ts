export interface Household {
  state: string;
  filingStatus: 'single' | 'married_jointly' | 'married_separately' | 'head_of_household';
  income: number;
  spouseIncome: number;
  spouseAge: number;
  childAges: number[]; // Array of child ages
  age: number;
  hasESI: boolean;
  spouseHasESI: boolean;
}

export type LifeEventType =
  | 'having_baby'
  | 'moving_states'
  | 'getting_married'
  | 'changing_income'
  | 'retiring'
  | 'pregnancy'
  | 'divorce'
  | 'unemployment';

export interface LifeEvent {
  type: LifeEventType;
  label: string;
  description: string;
  icon: string;
  params?: Record<string, unknown>;
}

export interface BenefitMetric {
  name: string;
  label: string;
  before: number;
  after: number;
  category: 'income' | 'tax' | 'benefit' | 'credit';
}

export interface SimulationResult {
  before: {
    netIncome: number;
    totalTax: number;
    totalBenefits: number;
    metrics: BenefitMetric[];
  };
  after: {
    netIncome: number;
    totalTax: number;
    totalBenefits: number;
    metrics: BenefitMetric[];
  };
  diff: {
    netIncome: number;
    totalTax: number;
    totalBenefits: number;
  };
}

export const LIFE_EVENTS: LifeEvent[] = [
  {
    type: 'having_baby',
    label: 'Having a Baby',
    description: 'Add a new child to your household',
    icon: '👶',
  },
  {
    type: 'pregnancy',
    label: 'Getting Pregnant',
    description: 'Pregnancy coverage and planning',
    icon: '🤰',
  },
  {
    type: 'getting_married',
    label: 'Getting Married',
    description: 'Combine households with a spouse',
    icon: '💍',
  },
  {
    type: 'divorce',
    label: 'Getting Divorced',
    description: 'Separate from your spouse',
    icon: '💔',
  },
  {
    type: 'moving_states',
    label: 'Moving States',
    description: 'Relocate to a different state',
    icon: '🏠',
  },
  {
    type: 'changing_income',
    label: 'Changing Income',
    description: 'Simulate a raise or income change',
    icon: '💰',
  },
  {
    type: 'unemployment',
    label: 'Losing Your Job',
    description: 'Transition to unemployment benefits',
    icon: '📉',
  },
  {
    type: 'retiring',
    label: 'Retiring',
    description: 'Transition to retirement',
    icon: '🎉',
  },
];

export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
];
