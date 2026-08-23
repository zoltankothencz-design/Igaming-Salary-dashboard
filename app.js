/* app.js — Gibraltar iGaming Salary Dashboard 2026 */

// === FX RATE ===
// Fallback values — overridden on load from salary-data.json (auto-updated by GitHub Actions)
let FX_EUR_GBP = 0.855;
let FX_UPDATED = '30 July 2026';
let FX_SOURCE = 'European Central Bank reference rate';

// === TAX ESTIMATION CONFIG ===
// Malta: 2026 single-person brackets. Source: PwC Malta Tax Summary 2026 / cfr.gov.mt.
// Cyprus: 2024/2025 brackets. Source: Cyprus Tax Dept / PwC Cyprus. 50% expat exemption for qualifying employees >€55k.
const taxConfig = {
  malta: {
    note: 'Malta single-person income tax 2026. Source: PwC Malta Tax Summary / cfr.gov.mt.',
    personalAllowance: 0,
    brackets: [
      { from: 0,     to: 12000,    rate: 0    },
      { from: 12000, to: 16000,    rate: 0.15 },
      { from: 16000, to: 60000,    rate: 0.25 },
      { from: 60000, to: Infinity, rate: 0.35 }
    ],
    ni: { rate: 0.10, annualCap: 2414 }
  },
  cyprus: {
    note: 'Cyprus income tax 2024/25. Source: Cyprus Tax Dept / PwC Cyprus. Brackets apply to standard employee. 50% expat exemption (Art. 8(23A)) for qualifying new residents earning >€55k — halves effective tax on qualifying portion.',
    personalAllowance: 0,
    brackets: [
      { from: 0,     to: 19500,    rate: 0    },
      { from: 19500, to: 28000,    rate: 0.20 },
      { from: 28000, to: 36300,    rate: 0.25 },
      { from: 36300, to: 60000,    rate: 0.30 },
      { from: 60000, to: Infinity, rate: 0.35 }
    ],
    ni: { rate: 0.088, annualCap: 5285 }
  }
};

function calcNetSalary(gross, market) {
  if (market === 'gibraltar') {
    // Uses correct GIBS/ABS functions (defined below in tax section)
    const incomeTax = Math.min(calcGibraltarGIBS(gross), calcGibraltarABS(gross));
    const ni = calcGibraltarSIEmployee(gross);
    const net = Math.round(gross - incomeTax - ni);
    const effectiveRate = ((incomeTax + ni) / gross * 100).toFixed(1);
    return { net, incomeTax, ni, effectiveRate };
  }
  const cfg = taxConfig[market];
  if (!cfg) return { net: gross, incomeTax: 0, ni: 0, effectiveRate: '0.0' };
  const taxable = Math.max(0, gross - cfg.personalAllowance);
  let incomeTax = 0;
  let prev = 0;
  for (const b of cfg.brackets) {
    if (taxable <= prev) break;
    const bandTop = b.to === Infinity ? taxable : Math.min(taxable, b.to);
    incomeTax += Math.max(0, bandTop - prev) * b.rate;
    prev = b.to === Infinity ? taxable : b.to;
  }
  const ni = Math.min(gross * cfg.ni.rate, cfg.ni.annualCap);
  const net = Math.round(gross - incomeTax - ni);
  const effectiveRate = ((incomeTax + ni) / gross * 100).toFixed(1);
  return { net, incomeTax: Math.round(incomeTax), ni: Math.round(ni), effectiveRate };
}

// === COST OF LIVING DATA ===
const colData = {
  gibraltar: {
    label: 'Gibraltar', rentMonthly: 2000, rentCurrency: 'GBP', currencySymbol: '£',
    colIndex: 108, sourceLabel: 'Numbeo 2026 — Gibraltar',
    sourceUrl: 'https://www.numbeo.com/cost-of-living/in/Gibraltar'
  },
  malta: {
    label: 'Malta', rentMonthly: 1100, rentCurrency: 'EUR', currencySymbol: '€',
    colIndex: 65, sourceLabel: 'Numbeo 2026 — Malta',
    sourceUrl: 'https://www.numbeo.com/cost-of-living/in/Malta'
  },
  cyprus: {
    label: 'Cyprus (Limassol)', rentMonthly: 1400, rentCurrency: 'EUR', currencySymbol: '€',
    colIndex: 80, sourceLabel: 'Numbeo 2026 — Limassol',
    sourceUrl: 'https://www.numbeo.com/cost-of-living/in/Limassol'
  }
};

// === HISTORICAL SNAPSHOTS ===
// Weekly trend. Min 2 snapshots needed to render the trend chart.
const historicalSnapshots = {
  frequency: 'weekly_monday',
  snapshots: [
    {
      date: '2026-07-31',
      markets: {
        gibraltar: { customerSupport: 31667, productManager: 67500, compliance: 62750, marketingAffiliate: 68600, crmVipOps: 66200, director: 111667 },
        malta:     { customerSupport: 24000, productManager: 65000, compliance: 53500, marketingAffiliate: 55000, crmVipOps: 48100, director: 89167  }
      }
    }
  ]
};

// === SALARY BAND VERIFICATION ===
const salaryVerification = {
  gibraltar: {
    customerSupport:    { entry: 'confirmed', mid: 'typical',    senior: 'typical'    },
    productManager:     { junior: 'estimated', mid: 'confirmed',  senior: 'typical',   director: 'estimated' },
    compliance:         { officer: 'confirmed', manager: 'typical', seniorManager: 'estimated', director: 'estimated' },
    marketingAffiliate: { executive: 'confirmed', manager: 'confirmed', senior: 'typical', head: 'estimated', director: 'estimated' },
    crmVipOps:          { coordinator: 'confirmed', vipManager: 'confirmed', crmManager: 'typical', seniorVip: 'estimated', director: 'estimated' },
    director:           { director: 'typical', seniorDirector: 'estimated', cLevel: 'estimated' },
    technology:         { junior: 'estimated', mid: 'estimated', senior: 'estimated', principal: 'estimated' }
  },
  malta: {
    customerSupport:    { entry: 'typical', mid: 'typical',   senior: 'estimated'  },
    productManager:     { junior: 'estimated', mid: 'typical', senior: 'estimated', director: 'estimated' },
    compliance:         { officer: 'typical', manager: 'typical', seniorManager: 'estimated', director: 'estimated' },
    marketingAffiliate: { executive: 'typical', manager: 'typical', senior: 'estimated', head: 'estimated', director: 'estimated' },
    crmVipOps:          { coordinator: 'typical', vipManager: 'typical', crmManager: 'typical', seniorVip: 'estimated', director: 'estimated' },
    director:           { director: 'estimated', seniorDirector: 'estimated', cLevel: 'estimated' },
    technology:         { junior: 'estimated', mid: 'estimated', senior: 'estimated', principal: 'estimated' }
  },
  cyprus: {
    customerSupport:    { entry: 'typical', mid: 'typical', senior: 'estimated' },
    productManager:     { junior: 'estimated', mid: 'estimated', senior: 'estimated', director: 'estimated' },
    compliance:         { officer: 'estimated', manager: 'estimated', seniorManager: 'estimated', director: 'estimated' },
    marketingAffiliate: { executive: 'estimated', manager: 'estimated', senior: 'estimated', head: 'estimated', director: 'estimated' },
    crmVipOps:          { coordinator: 'estimated', vipManager: 'estimated', crmManager: 'estimated', seniorVip: 'estimated', director: 'estimated' },
    director:           { director: 'estimated', seniorDirector: 'estimated', cLevel: 'estimated' },
    technology:         { junior: 'estimated', mid: 'estimated', senior: 'estimated', principal: 'estimated' }
  }
};

function getSalaryVerification(market, roleKey, levelKey) {
  try { return salaryVerification[market][roleKey][levelKey] || 'estimated'; } catch(_) { return 'estimated'; }
}

// === SALARY DATA ===
// Gibraltar data: Entain Gibraltar postings, Careers Gibraltar, Big Bet Jobs,
// IT Jobs Watch UK iGaming percentiles, Track360 salary report.
// Gibraltar premium ~10-15% over Malta/EU hub equivalents.
//
// Malta data: Malta iGaming salary report 2026 (impjieg.work),
// Track360 affiliate manager report, BettingJobs Malta listings,
// CareerFinders Cyprus/Malta iGaming postings.

const salaryData = {
  markets: {
    gibraltar: {
      label: 'Gibraltar',
      shortLabel: 'Gibraltar',
      currency: 'GBP',
      currencySymbol: '\u00A3',
      residencyThreshold: 37500,
      roles: {
        customerSupport: {
          label: 'Customer Support',
          shortLabel: 'Cust. Support',
          levels: {
            entry:    { label: 'Entry-Level Agent',      min: 22000, mid: 25000, max: 28000 },
            mid:      { label: 'Experienced Agent',      min: 28000, mid: 32000, max: 36000 },
            senior:   { label: 'Team Lead / Supervisor',  min: 35000, mid: 38500, max: 42000 }
          }
        },
        productManager: {
          label: 'Product Manager',
          shortLabel: 'Product Mgr',
          levels: {
            junior:   { label: 'Junior PM',              min: 40000, mid: 45000, max: 50000 },
            mid:      { label: 'Product Manager',         min: 50000, mid: 57500, max: 65000 },
            senior:   { label: 'Senior Product Manager',  min: 65000, mid: 72500, max: 80000 },
            director: { label: 'Product Director',        min: 85000, mid: 97500, max: 110000 }
          }
        },
        compliance: {
          label: 'Compliance',
          shortLabel: 'Compliance',
          levels: {
            officer:        { label: 'Compliance Officer',       min: 30000, mid: 36000, max: 42000 },
            manager:       { label: 'Compliance Manager',        min: 45000, mid: 52500, max: 60000 },
            seniorManager:  { label: 'Senior Compliance Mgr',    min: 60000, mid: 67500, max: 75000 },
            director:      { label: 'Compliance Director',       min: 80000, mid: 95000, max: 110000 }
          }
        },
        marketingAffiliate: {
          label: 'Marketing & Affiliate',
          shortLabel: 'Marketing',
          levels: {
            executive: { label: 'Marketing Executive',           min: 24000, mid: 30000, max: 35000 },
            manager:   { label: 'Marketing / Affiliate Mgr',     min: 42000, mid: 50000, max: 58000 },
            senior:    { label: 'Senior Affiliate Manager',      min: 58000, mid: 68000, max: 78000 },
            head:      { label: 'Head of Marketing / Affiliates', min: 75000, mid: 85000, max: 95000 },
            director:  { label: 'Marketing / Affiliate Director', min: 95000, mid: 110000, max: 130000 }
          }
        },
        crmVipOps: {
          label: 'CRM, VIP & Operations',
          shortLabel: 'CRM/VIP/Ops',
          levels: {
            coordinator: { label: 'Casino Coordinator / CRM Exec',  min: 26000, mid: 31000, max: 36000 },
            vipManager:  { label: 'VIP Account Manager',             min: 45000, mid: 55000, max: 65000 },
            crmManager:  { label: 'CRM Manager / Vendor Mgmt Mgr',   min: 50000, mid: 60000, max: 70000 },
            seniorVip:   { label: 'Senior VIP Mgr / Head of CRM',     min: 70000, mid: 80000, max: 90000 },
            director:    { label: 'Director of CRM / VIP',            min: 90000, mid: 105000, max: 120000 }
          }
        },
        director: {
          label: 'Director / Executive',
          shortLabel: 'Director',
          levels: {
            director:       { label: 'Director',                  min: 80000, mid: 90000, max: 100000 },
            seniorDirector:  { label: 'Senior Director',           min: 100000, mid: 110000, max: 120000 },
            cLevel:         { label: 'C-Level / MD',              min: 120000, mid: 135000, max: 150000 }
          }
        },
        technology: {
          label: 'Technology & Engineering',
          shortLabel: 'Tech/Eng',
          levels: {
            junior:    { label: 'Junior Developer / Engineer',  min: 28000, mid: 34000, max: 42000 },
            mid:       { label: 'Mid-Level Engineer',           min: 42000, mid: 55000, max: 65000 },
            senior:    { label: 'Senior Engineer / Tech Lead',  min: 65000, mid: 77500, max: 90000 },
            principal: { label: 'Principal / Staff Engineer',   min: 90000, mid: 105000, max: 120000 }
          }
        }
      }
    },

    malta: {
      label: 'Malta',
      shortLabel: 'Malta',
      currency: 'EUR',
      currencySymbol: '\u20AC',
      residencyThreshold: null,
      roles: {
        customerSupport: {
          label: 'Customer Support',
          shortLabel: 'Cust. Support',
          levels: {
            entry:    { label: 'Entry-Level Agent',      min: 18000, mid: 21000, max: 24000 },
            mid:      { label: 'Experienced Agent',      min: 24000, mid: 27000, max: 30000 },
            senior:   { label: 'Team Lead / Supervisor',  min: 28000, mid: 30000, max: 32000 }
          }
        },
        productManager: {
          label: 'Product Manager',
          shortLabel: 'Product Mgr',
          levels: {
            junior:   { label: 'Junior PM',              min: 40000, mid: 45000, max: 50000 },
            mid:      { label: 'Product Manager',         min: 50000, mid: 60000, max: 70000 },
            senior:   { label: 'Senior Product Manager',  min: 70000, mid: 80000, max: 85000 },
            director: { label: 'Product Director',        min: 85000, mid: 87500, max: 90000 }
          }
        },
        compliance: {
          label: 'Compliance',
          shortLabel: 'Compliance',
          levels: {
            officer:        { label: 'Compliance Officer',       min: 30000, mid: 36000, max: 42000 },
            manager:       { label: 'Compliance Manager',        min: 42000, mid: 48000, max: 55000 },
            seniorManager:  { label: 'Senior Compliance Mgr',    min: 55000, mid: 60000, max: 65000 },
            director:      { label: 'Compliance Director',       min: 65000, mid: 70000, max: 75000 }
          }
        },
        marketingAffiliate: {
          label: 'Marketing & Affiliate',
          shortLabel: 'Marketing',
          levels: {
            executive: { label: 'Marketing Executive',           min: 22000, mid: 25000, max: 28000 },
            manager:   { label: 'Marketing / Affiliate Mgr',     min: 36000, mid: 43000, max: 50000 },
            senior:    { label: 'Senior Affiliate Manager',      min: 50000, mid: 57500, max: 65000 },
            head:      { label: 'Head of Marketing / Affiliates', min: 65000, mid: 70000, max: 75000 },
            director:  { label: 'Marketing / Affiliate Director', min: 75000, mid: 82500, max: 90000 }
          }
        },
        crmVipOps: {
          label: 'CRM, VIP & Operations',
          shortLabel: 'CRM/VIP/Ops',
          levels: {
            coordinator: { label: 'Casino Coordinator / CRM Exec',  min: 20000, mid: 23000, max: 26000 },
            vipManager:  { label: 'VIP Account Manager',             min: 35000, mid: 42500, max: 50000 },
            crmManager:  { label: 'CRM Manager / Vendor Mgmt Mgr',   min: 35000, mid: 42500, max: 55000 },
            seniorVip:   { label: 'Senior VIP Mgr / Head of CRM',     min: 55000, mid: 60000, max: 65000 },
            director:    { label: 'Director of CRM / VIP',            min: 65000, mid: 72500, max: 80000 }
          }
        },
        director: {
          label: 'Director / Executive',
          shortLabel: 'Director',
          levels: {
            director:       { label: 'Director',                  min: 65000, mid: 72500, max: 80000 },
            seniorDirector:  { label: 'Senior Director',           min: 80000, mid: 87500, max: 95000 },
            cLevel:         { label: 'C-Level / MD',              min: 95000, mid: 107500, max: 120000 }
          }
        },
        technology: {
          label: 'Technology & Engineering',
          shortLabel: 'Tech/Eng',
          levels: {
            junior:    { label: 'Junior Developer / Engineer',  min: 30000, mid: 35000, max: 40000 },
            mid:       { label: 'Mid-Level Engineer',           min: 40000, mid: 47500, max: 55000 },
            senior:    { label: 'Senior Engineer / Tech Lead',  min: 55000, mid: 65000, max: 75000 },
            principal: { label: 'Principal / Staff Engineer',   min: 75000, mid: 87500, max: 100000 }
          }
        }
      }
    },

    cyprus: {
      label: 'Cyprus (Limassol)',
      shortLabel: 'Cyprus',
      currency: 'EUR',
      currencySymbol: '€',
      residencyThreshold: null,
      roles: {
        customerSupport: {
          label: 'Customer Support',
          shortLabel: 'Cust. Support',
          levels: {
            entry:  { label: 'Entry-Level Agent',      min: 18000, mid: 21000, max: 24000 },
            mid:    { label: 'Experienced Agent',       min: 24000, mid: 27000, max: 30000 },
            senior: { label: 'Team Lead / Supervisor',  min: 28000, mid: 33000, max: 38000 }
          }
        },
        productManager: {
          label: 'Product Manager',
          shortLabel: 'Product Mgr',
          levels: {
            junior:   { label: 'Junior PM',             min: 32000, mid: 38000, max: 44000 },
            mid:      { label: 'Product Manager',        min: 44000, mid: 53000, max: 62000 },
            senior:   { label: 'Senior Product Manager', min: 62000, mid: 72000, max: 82000 },
            director: { label: 'Product Director',       min: 82000, mid: 95000, max: 110000 }
          }
        },
        compliance: {
          label: 'Compliance',
          shortLabel: 'Compliance',
          levels: {
            officer:       { label: 'Compliance Officer',    min: 25000, mid: 31000, max: 37000 },
            manager:       { label: 'Compliance Manager',    min: 37000, mid: 44000, max: 51000 },
            seniorManager: { label: 'Senior Compliance Mgr', min: 51000, mid: 60000, max: 70000 },
            director:      { label: 'Compliance Director',   min: 70000, mid: 82500, max: 95000 }
          }
        },
        marketingAffiliate: {
          label: 'Marketing & Affiliate',
          shortLabel: 'Marketing',
          levels: {
            executive: { label: 'Marketing Executive',            min: 22000, mid: 27000, max: 32000 },
            manager:   { label: 'Marketing / Affiliate Mgr',      min: 32000, mid: 39000, max: 46000 },
            senior:    { label: 'Senior Affiliate Manager',       min: 46000, mid: 55000, max: 64000 },
            head:      { label: 'Head of Marketing / Affiliates', min: 60000, mid: 68000, max: 76000 },
            director:  { label: 'Marketing / Affiliate Director', min: 76000, mid: 88000, max: 100000 }
          }
        },
        crmVipOps: {
          label: 'CRM, VIP & Operations',
          shortLabel: 'CRM/VIP/Ops',
          levels: {
            coordinator: { label: 'Casino Coordinator / CRM Exec', min: 18000, mid: 21000, max: 24000 },
            vipManager:  { label: 'VIP Account Manager',           min: 30000, mid: 37000, max: 44000 },
            crmManager:  { label: 'CRM Manager',                   min: 30000, mid: 37000, max: 44000 },
            seniorVip:   { label: 'Senior VIP Mgr / Head of CRM',  min: 44000, mid: 52000, max: 60000 },
            director:    { label: 'Director of CRM / VIP',         min: 60000, mid: 70000, max: 80000 }
          }
        },
        director: {
          label: 'Director / Executive',
          shortLabel: 'Director',
          levels: {
            director:       { label: 'Director',       min: 60000,  mid: 70000,  max: 80000  },
            seniorDirector: { label: 'Senior Director', min: 80000,  mid: 92500,  max: 105000 },
            cLevel:         { label: 'C-Level / MD',   min: 105000, mid: 120000, max: 140000 }
          }
        },
        technology: {
          label: 'Technology & Engineering',
          shortLabel: 'Tech/Eng',
          levels: {
            junior:    { label: 'Junior Developer / Engineer',  min: 28000, mid: 32000, max: 36000 },
            mid:       { label: 'Mid-Level Engineer',           min: 36000, mid: 45000, max: 54000 },
            senior:    { label: 'Senior Engineer / Tech Lead',  min: 54000, mid: 65000, max: 76000 },
            principal: { label: 'Principal / Staff Engineer',   min: 76000, mid: 90000, max: 105000 }
          }
        }
      }
    }
  },

  operators: {
    entain: {
      label: 'Entain',
      multipliers: { gibraltar: 1.00, malta: 1.00 },
      benefits: [
        { name: 'Group Bonus Plan', verified: 'confirmed' },
        { name: 'ShareSave scheme (save-as-you-earn)', verified: 'confirmed' },
        { name: 'Pension scheme \u2014 matched to 6%', verified: 'confirmed' },
        { name: 'Private medical insurance', verified: 'confirmed' },
        { name: 'Entain & Enhance \u2014 2 paid development days', verified: 'confirmed' },
        { name: 'Buy/sell holiday flexibility', verified: 'confirmed' },
        { name: 'Unmind wellbeing app subscription', verified: 'confirmed' },
        { name: 'Life assurance & income protection', verified: 'confirmed' },
        { name: 'Extra "It\'s Your Game" day off', verified: 'confirmed' },
        { name: 'Hybrid working \u2014 4 office days', verified: 'confirmed' }
      ]
    },
    flutter: {
      label: 'Flutter Entertainment',
      multipliers: { gibraltar: 1.08, malta: 1.05 },
      benefits: [
        { name: 'Annual bonus (10-20% target)', verified: 'typical' },
        { name: 'Share options / RSUs', verified: 'typical' },
        { name: 'Pension \u2014 5-8% employer match', verified: 'typical' },
        { name: 'Private health insurance', verified: 'typical' },
        { name: 'Learning & development fund', verified: 'estimated' },
        { name: '25 days annual leave + buy/sell', verified: 'typical' },
        { name: 'Wellbeing programme', verified: 'typical' },
        { name: 'Life assurance', verified: 'typical' },
        { name: 'Hybrid working model', verified: 'typical' },
        { name: 'Global mobility opportunities', verified: 'estimated' }
      ]
    },
    bet365: {
      label: 'Bet365',
      multipliers: { gibraltar: 0.96, malta: 0.95 },
      benefits: [
        { name: 'Rewarding bonus scheme', verified: 'confirmed' },
        { name: 'No share scheme (private company)', verified: 'estimated' },
        { name: 'Pension scheme', verified: 'typical' },
        { name: 'Enhanced pay rates (shifts/weekends)', verified: 'confirmed' },
        { name: 'Development pathways & training', verified: 'estimated' },
        { name: 'Social & team events', verified: 'confirmed' },
        { name: 'Competitive annual leave', verified: 'typical' },
        { name: 'Life insurance', verified: 'estimated' },
        { name: 'On-site facilities (Stoke-on-Trent HQ)', verified: 'estimated' },
        { name: 'Career progression framework', verified: 'estimated' }
      ]
    }
  },

  lastUpdated: '31 July 2026',
  nextScheduledUpdate: 'Monday, 3 August 2026'
};

// === STATE ===
const state = {
  market: 'gibraltar',
  operator: 'all',
  role: 'all',
  bonusPct: 10,
  sharesValue: 3000,
  pensionPct: 6,
  showNet: false,
  benchmarkSalary: null,
  benchmarkRole: 'customerSupport',
  benchmarkLevel: 'mid'
};

// === HELPERS ===
function getMarket() {
  return salaryData.markets[state.market];
}

function getCurrencySymbol() {
  if (state.market === 'compare') return '\u00A3';
  return getMarket().currencySymbol;
}

function formatMoney(value) {
  const sym = getCurrencySymbol();
  if (value >= 1000) {
    return sym + Math.round(value).toLocaleString('en-GB');
  }
  return sym + Math.round(value);
}

function formatMoneyk(value) {
  return getCurrencySymbol() + Math.round(value / 1000) + 'k';
}

function convertToGBP(value, fromMarket) {
  if (fromMarket === 'malta') {
    return Math.round(value * FX_EUR_GBP);
  }
  return Math.round(value);
}

function getOperatorMultiplier(market) {
  if (state.operator === 'all') return 1.0;
  const op = salaryData.operators[state.operator];
  if (!op) return 1.0;
  // Prefer salaryBands-derived ratio over flat multiplier
  const bands = op.salaryBands && op.salaryBands[market];
  if (bands) {
    const role = state.role !== 'all' ? state.role : null;
    if (role && bands[role] && bands[role].mid) {
      const mktMid = _marketAvgMid(market, role);
      return mktMid > 0 ? bands[role].mid / mktMid : 1.0;
    }
    const vals = Object.values(bands).map(b => b.mid).filter(Boolean);
    if (vals.length) {
      const opAvg = vals.reduce((s, v) => s + v, 0) / vals.length;
      const mktAvg = _marketAvgMid(market, null);
      return mktAvg > 0 ? opAvg / mktAvg : 1.0;
    }
  }
  if (op.multipliers && op.multipliers[market]) return op.multipliers[market];
  return 1.0;
}

function getRoleLevelEntries(market, roleKey) {
  const m = salaryData.markets[market];
  const role = m.roles[roleKey];
  return Object.entries(role.levels).map(([levelKey, level]) => ({
    roleKey,
    roleLabel: role.shortLabel,
    roleFullLabel: role.label,
    levelKey,
    levelLabel: level.label,
    min: level.min,
    mid: level.mid,
    max: level.max
  }));
}

function getFilteredEntries(market) {
  const mkt = market || state.market;
  let entries = [];
  if (state.role === 'all') {
    Object.keys(salaryData.markets[mkt].roles).forEach(roleKey => {
      entries = entries.concat(getRoleLevelEntries(mkt, roleKey));
    });
  } else {
    entries = getRoleLevelEntries(mkt, state.role);
  }

  if (state.operator !== 'all') {
    const mult = getOperatorMultiplier(mkt);
    entries = entries.map(e => ({
      ...e,
      min: Math.round(e.min * mult),
      mid: Math.round(e.mid * mult),
      max: Math.round(e.max * mult)
    }));
  }

  return entries;
}

function calcTotalComp(baseMid) {
  const bonus = baseMid * (state.bonusPct / 100);
  const shares = state.sharesValue;
  const pension = baseMid * (state.pensionPct / 100);
  return {
    base: baseMid,
    bonus: Math.round(bonus),
    shares: shares,
    pension: Math.round(pension),
    total: Math.round(baseMid + bonus + shares + pension)
  };
}

function getChartColor(idx) {
  const colors = [
    getComputedStyle(document.documentElement).getPropertyValue('--chart-1').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--chart-2').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--chart-3').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--chart-4').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--chart-5').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--chart-6').trim()
  ];
  return colors[idx % colors.length];
}

function getTextColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim();
}

function getTextMutedColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--color-text-muted').trim();
}

function getBorderColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim();
}

function getSurfaceColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim();
}

// === CHARTS ===
let salaryChart = null;
let totalCompChart = null;

function renderSalaryRangesChart() {
  const entries = getFilteredEntries();
  const ctx = document.getElementById('chart-salary-ranges').getContext('2d');

  const labels = entries.map(e => e.levelLabel);
  const minData = entries.map(e => e.min);
  const midData = entries.map(e => e.mid);
  const maxData = entries.map(e => e.max);

  if (salaryChart) salaryChart.destroy();

  salaryChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Minimum',
          data: minData,
          backgroundColor: getChartColor(4),
          borderRadius: 4,
          barPercentage: 0.8,
          categoryPercentage: 0.7
        },
        {
          label: 'Mid-Point',
          data: midData,
          backgroundColor: getChartColor(0),
          borderRadius: 4,
          barPercentage: 0.8,
          categoryPercentage: 0.7
        },
        {
          label: 'Maximum',
          data: maxData,
          backgroundColor: getChartColor(1),
          borderRadius: 4,
          barPercentage: 0.8,
          categoryPercentage: 0.7
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: getTextMutedColor(),
            font: { family: 'Satoshi, sans-serif', size: 12 },
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 12,
            boxWidth: 8
          }
        },
        tooltip: {
          backgroundColor: getSurfaceColor(),
          titleColor: getTextColor(),
          bodyColor: getTextMutedColor(),
          borderColor: getBorderColor(),
          borderWidth: 1,
          padding: 10,
          cornerRadius: 6,
          titleFont: { family: 'Satoshi, sans-serif', weight: '600', size: 13 },
          bodyFont: { family: 'Satoshi, sans-serif', size: 12 },
          callbacks: {
            label: function(ctx) {
              return ctx.dataset.label + ': ' + formatMoney(ctx.parsed.y);
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: getTextMutedColor(),
            font: { family: 'Satoshi, sans-serif', size: 11 },
            maxRotation: 45,
            minRotation: 0
          },
          grid: { display: false },
          border: { color: getBorderColor() }
        },
        y: {
          ticks: {
            color: getTextMutedColor(),
            font: { family: 'Satoshi, sans-serif', size: 11 },
            callback: function(value) { return formatMoneyk(value); }
          },
          grid: { color: getBorderColor() + '40' },
          border: { display: false }
        }
      },
      animation: { duration: 600, easing: 'easeOutQuart' }
    }
  });
}

function renderTotalCompChart() {
  const entries = getFilteredEntries();
  const ctx = document.getElementById('chart-total-comp').getContext('2d');

  let roleKeys;
  if (state.role === 'all') {
    roleKeys = Object.keys(getMarket().roles);
  } else {
    roleKeys = [state.role];
  }

  const roleLabels = [];
  const baseData = [];
  const bonusData = [];
  const sharesData = [];
  const pensionData = [];

  const mkt = state.market;
  roleKeys.forEach(roleKey => {
    const role = salaryData.markets[mkt].roles[roleKey];
    const levels = Object.values(role.levels);
    const avgMid = levels.reduce((sum, l) => sum + l.mid, 0) / levels.length;
    const adjustedMid = avgMid * getOperatorMultiplier(mkt);
    const comp = calcTotalComp(adjustedMid);

    roleLabels.push(role.shortLabel);
    baseData.push(Math.round(comp.base));
    bonusData.push(comp.bonus);
    sharesData.push(comp.shares);
    pensionData.push(comp.pension);
  });

  if (totalCompChart) totalCompChart.destroy();

  totalCompChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: roleLabels,
      datasets: [
        { label: 'Base Salary', data: baseData, backgroundColor: getChartColor(0), borderRadius: 4, stack: 'comp' },
        { label: 'Bonus', data: bonusData, backgroundColor: getChartColor(1), borderRadius: 4, stack: 'comp' },
        { label: 'Share Options', data: sharesData, backgroundColor: getChartColor(2), borderRadius: 4, stack: 'comp' },
        { label: 'Pension Value', data: pensionData, backgroundColor: getChartColor(5), borderRadius: 4, stack: 'comp' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: getTextMutedColor(),
            font: { family: 'Satoshi, sans-serif', size: 12 },
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 12,
            boxWidth: 8
          }
        },
        tooltip: {
          backgroundColor: getSurfaceColor(),
          titleColor: getTextColor(),
          bodyColor: getTextMutedColor(),
          borderColor: getBorderColor(),
          borderWidth: 1,
          padding: 10,
          cornerRadius: 6,
          titleFont: { family: 'Satoshi, sans-serif', weight: '600', size: 13 },
          bodyFont: { family: 'Satoshi, sans-serif', size: 12 },
          callbacks: {
            label: function(ctx) { return ctx.dataset.label + ': ' + formatMoney(ctx.parsed.y); },
            footer: function(tooltipItems) {
              const total = tooltipItems.reduce((sum, ti) => sum + ti.parsed.y, 0);
              return 'Total: ' + formatMoney(total);
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          ticks: { color: getTextMutedColor(), font: { family: 'Satoshi, sans-serif', size: 12 } },
          grid: { display: false },
          border: { color: getBorderColor() }
        },
        y: {
          stacked: true,
          ticks: {
            color: getTextMutedColor(),
            font: { family: 'Satoshi, sans-serif', size: 11 },
            callback: function(value) { return formatMoneyk(value); }
          },
          grid: { color: getBorderColor() + '40' },
          border: { display: false }
        }
      },
      animation: { duration: 700, easing: 'easeOutQuart' }
    }
  });
}

// === KPI UPDATES ===
function _opHasSalaryData(opKey, market) {
  if (opKey === 'all') return true;
  const op = salaryData.operators[opKey];
  if (!op || !op.salaryBands) return false;
  // Check if the operator has any salary band data for the relevant market(s)
  const markets = market && market !== 'compare' ? [market] : ['gibraltar', 'malta'];
  return markets.some(m => op.salaryBands[m] && Object.keys(op.salaryBands[m]).length > 0);
}

function updateKPIs() {
  const entries = getFilteredEntries();
  if (entries.length === 0) return;

  const mkt = state.market === 'compare' ? 'gibraltar' : state.market;
  const isEstimate = state.operator !== 'all' && !_opHasSalaryData(state.operator, mkt);

  // Show/hide the no-data notice banner and dim KPI values
  const notice = document.getElementById('kpi-no-data-notice');
  const kpiGrid = document.getElementById('kpi-grid');
  if (notice) {
    if (isEstimate) {
      const opLabel = salaryData.operators[state.operator] ? salaryData.operators[state.operator].label : state.operator;
      const noticeText = document.getElementById('kpi-no-data-notice-text');
      if (noticeText) noticeText.textContent = 'No salary data available for ' + opLabel + '. Showing market-wide estimates as a reference only \u2014 values are not operator-specific.';
      notice.style.display = 'flex';
    } else {
      notice.style.display = 'none';
    }
  }
  if (kpiGrid) {
    kpiGrid.classList.toggle('kpi-estimate-mode', isEstimate);
  }

  const avgMid = entries.reduce((sum, e) => sum + e.mid, 0) / entries.length;
  const avgComp = calcTotalComp(avgMid);
  const allMin = Math.min(...entries.map(e => e.min));
  const allMax = Math.max(...entries.map(e => e.max));

  document.getElementById('kpi-avg-base').textContent = formatMoney(avgMid);
  document.getElementById('kpi-avg-total').textContent = formatMoney(avgComp.total);

  const roleLabel = state.role === 'all' ? 'All roles' : getMarket().roles[state.role].label;
  const opLabel = state.operator === 'all' ? 'all operators' : salaryData.operators[state.operator].label;
  const estSuffix = isEstimate ? ' \u00b7 market est.' : '';
  document.getElementById('kpi-avg-base-sub').textContent = roleLabel + ', ' + opLabel + estSuffix;
  document.getElementById('kpi-avg-total-sub').textContent = roleLabel + ', ' + opLabel + estSuffix;

  document.getElementById('kpi-range').textContent = formatMoneyk(allMin) + ' \u2013 ' + formatMoneyk(allMax);
  const minEntry = entries.reduce((a, b) => a.min < b.min ? a : b);
  const maxEntry = entries.reduce((a, b) => a.max > b.max ? a : b);
  const rangeNote = isEstimate ? ' (market est.)' : '';
  document.getElementById('kpi-range-sub').textContent = minEntry.levelLabel + ' to ' + maxEntry.levelLabel + rangeNote;

  const bestOperator = getBestOperator(entries);
  document.getElementById('kpi-best').textContent = bestOperator.label;
  document.getElementById('kpi-best-sub').textContent = bestOperator.subLabel;
}

function _marketAvgMid(market, role) {
  try {
    const roles = salaryData.markets[market].roles;
    if (role && role !== 'all' && roles[role]) {
      const levels = Object.values(roles[role].levels);
      return levels.reduce((s, l) => s + l.mid, 0) / levels.length;
    }
    // all roles: grand average
    return Object.values(roles)
      .flatMap(r => Object.values(r.levels).map(l => l.mid))
      .reduce((s, v, _, a) => s + v / a.length, 0);
  } catch (_) { return 0; }
}

function getBestOperator(filteredEntries) {
  const market = state.market === 'compare' ? 'gibraltar' : state.market;
  const role = state.role;
  const marketAvg = _marketAvgMid(market, role) || 1;

  let best = null;
  let bestMid = -Infinity;

  Object.entries(salaryData.operators).forEach(([, op]) => {
    const bands = op.salaryBands;
    if (!bands) return;

    let mid = null;
    const mktBands = bands[market] || {};

    if (role && role !== 'all') {
      // Role-specific: only use operators that have data for this exact role
      if (mktBands[role] && mktBands[role].mid) {
        mid = mktBands[role].mid;
      }
    } else {
      // All roles: average over whatever roles the operator has data for
      const vals = Object.values(mktBands).map(b => b.mid).filter(Boolean);
      if (vals.length) mid = vals.reduce((s, v) => s + v, 0) / vals.length;
    }

    if (mid !== null && mid > bestMid) {
      bestMid = mid;
      best = { label: op.label, mid };
    }
  });

  if (!best) return { label: '\u2014', subLabel: 'No data for this filter' };

  const pct = Math.round((bestMid / marketAvg - 1) * 100);
  const sign = pct >= 0 ? '+' : '';
  const subLabel = sign + pct + '% vs market avg'
    + (role && role !== 'all' ? ' (' + (salaryData.markets[market]?.roles[role]?.label || role) + ')' : '');
  return { label: best.label, subLabel };
}

// === PERCENTILE CALC ===
function calcPercentile(salary, min, mid, max) {
  if (salary <= 0) return null;
  if (salary < min)  return Math.max(0,  Math.round(10 * salary / min));
  if (salary <= mid) return Math.round(10 + 40 * (salary - min) / (mid - min));
  if (salary <= max) return Math.round(50 + 40 * (salary - mid) / (max - mid));
  return Math.min(100, Math.round(90 + 10 * (salary - max) / max));
}

// === CSV EXPORT ===
function exportToCSV() {
  const mkt = state.market === 'compare' ? 'gibraltar' : state.market;
  const market = salaryData.markets[mkt];
  const sym = market.currencySymbol;
  const rows = [['Market','Role','Level','Verified','Min','Mid','Max','Operator Multiplier','Eff. Min','Eff. Mid','Eff. Max']];
  const mult = getOperatorMultiplier(mkt);
  const opLabel = state.operator === 'all' ? 'All' : (salaryData.operators[state.operator] ? salaryData.operators[state.operator].label : state.operator);

  let roleKeys = state.role === 'all' ? Object.keys(market.roles) : [state.role];
  roleKeys.forEach(rk => {
    const role = market.roles[rk];
    Object.entries(role.levels).forEach(([lk, lv]) => {
      const ver = getSalaryVerification(mkt, rk, lk);
      rows.push([
        market.label, role.label, lv.label, ver,
        lv.min, lv.mid, lv.max,
        opLabel,
        Math.round(lv.min * mult), Math.round(lv.mid * mult), Math.round(lv.max * mult)
      ]);
    });
  });

  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `igaming-salary-${mkt}-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// === SLIDER SUMMARY ===
function updateSliderSummary() {
  const entries = getFilteredEntries();
  if (entries.length === 0) return;

  const avgMid = entries.reduce((sum, e) => sum + e.mid, 0) / entries.length;
  const bonusVal = Math.round(avgMid * (state.bonusPct / 100));
  const pensionVal = Math.round(avgMid * (state.pensionPct / 100));
  const extraTotal = bonusVal + state.sharesValue + pensionVal;

  document.getElementById('summary-bonus').textContent = formatMoney(bonusVal);
  document.getElementById('summary-pension').textContent = formatMoney(pensionVal);
  document.getElementById('summary-extra').textContent = formatMoney(extraTotal);
}

// === COMPARISON CARDS ===
function _opAvgMidForRoles(op, market, roleKeys) {
  // No fallback for operators with no usable public data
  if (op.dataStatus === 'no-public-data' || op.dataStatus === 'no-salary-listed') return 0;
  // Prefer live salaryBands
  const bands = op.salaryBands && op.salaryBands[market];
  if (bands) {
    const vals = roleKeys.map(r => bands[r] && bands[r].mid).filter(Boolean);
    if (vals.length) return vals.reduce((s, v) => s + v, 0) / vals.length;
  }
  // Seeded/multiplier fallback (entain/flutter/bet365 have explicit salaryBands already)
  const mult = (op.multipliers && op.multipliers[market]) || 1;
  if (mult === 1 && (!op.salaryBands || !op.salaryBands[market])) return 0;
  const mktRoles = salaryData.markets[market].roles;
  let sum = 0, n = 0;
  roleKeys.forEach(roleKey => {
    Object.values(mktRoles[roleKey].levels).forEach(l => { sum += l.mid * mult; n++; });
  });
  return n ? sum / n : 0;
}

function renderComparisonCards() {
  const grid = document.getElementById('comparison-grid');
  grid.innerHTML = '';
  const market = state.market === 'compare' ? 'gibraltar' : state.market;
  const roleKeys = state.role === 'all' ? Object.keys(salaryData.markets[market].roles) : [state.role];
  const marketAvg = _marketAvgMid(market, state.role !== 'all' ? state.role : null);

  const withData = [], noData = [], noPublic = [];
  Object.entries(salaryData.operators).forEach(([opKey, op]) => {
    if (op.dataStatus === 'no-public-data') { noPublic.push({ opKey, op }); return; }
    const avgMid = _opAvgMidForRoles(op, market, roleKeys);
    if (avgMid > 0) withData.push({ opKey, op, avgMid });
    else noData.push({ opKey, op });
  });
  withData.sort((a, b) => b.avgMid - a.avgMid);

  withData.forEach(({ opKey, op, avgMid }) => {
    const comp = calcTotalComp(avgMid);
    const pct = Math.round((avgMid / marketAvg - 1) * 100);
    const badge = (pct >= 0 ? '+' : '') + pct + '% vs mkt avg';
    const sourceLabel = op.dataStatus === 'live' ? 'Live data' : op.dataStatus === 'seeded' ? 'Est.' : '';
    const card = document.createElement('div');
    card.className = 'comparison-card';
    card.setAttribute('data-testid', 'comparison-card-' + opKey);
    card.innerHTML = `
      <div class="comparison-header">
        <span class="comparison-operator-name">${op.label}${sourceLabel ? ' <small style="font-weight:400;opacity:.6">(' + sourceLabel + ')</small>' : ''}</span>
        <span class="comparison-multiplier">${badge}</span>
      </div>
      <div class="comparison-body">
        <div class="comparison-row">
          <span class="comparison-label">Base Salary (avg)</span>
          <span class="comparison-value">${formatMoney(comp.base)}</span>
        </div>
        <div class="comparison-row">
          <span class="comparison-label">Bonus (${state.bonusPct}%)</span>
          <span class="comparison-value">${formatMoney(comp.bonus)}</span>
        </div>
        <div class="comparison-row">
          <span class="comparison-label">Share Options</span>
          <span class="comparison-value">${formatMoney(comp.shares)}</span>
        </div>
        <div class="comparison-row">
          <span class="comparison-label">Pension (${state.pensionPct}%)</span>
          <span class="comparison-value">${formatMoney(comp.pension)}</span>
        </div>
        <div class="comparison-total">
          <span class="comparison-total-label">Total Package</span>
          <span class="comparison-total-value">${formatMoney(comp.total)}</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  // Operators where scraper ran but found no salary figures
  noData.forEach(({ opKey, op }) => {
    const card = document.createElement('div');
    card.className = 'comparison-card comparison-card--no-data';
    card.setAttribute('data-testid', 'comparison-card-' + opKey);
    card.innerHTML = `
      <div class="comparison-header">
        <span class="comparison-operator-name">${op.label}</span>
        <span class="comparison-multiplier" style="background:var(--text-muted);color:#fff;opacity:.6">No salary listed</span>
      </div>
      <div class="comparison-body" style="opacity:.45;font-size:.85rem;padding:.75rem 1rem;">
        Career page is public but no salary figures found. Run a new scan or check ${op.careerUrl ? '<a href="' + op.careerUrl + '" target="_blank" rel="noopener">career page</a>' : 'career page'} directly.
      </div>
    `;
    grid.appendChild(card);
  });

  // Operators where public data is structurally unavailable (LinkedIn login required)
  noPublic.forEach(({ opKey, op }) => {
    const card = document.createElement('div');
    card.className = 'comparison-card comparison-card--no-data';
    card.setAttribute('data-testid', 'comparison-card-' + opKey);
    card.innerHTML = `
      <div class="comparison-header">
        <span class="comparison-operator-name">${op.label}</span>
        <span class="comparison-multiplier" style="background:#888;color:#fff;opacity:.55">Login required</span>
      </div>
      <div class="comparison-body" style="opacity:.4;font-size:.85rem;padding:.75rem 1rem;">
        ${op.dataNote || 'Career data requires login (LinkedIn). Automatic scrape not possible.'}
      </div>
    `;
    grid.appendChild(card);
  });

  if (withData.length === 0 && noData.length === 0 && noPublic.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);padding:1rem;">No operator data available for this filter yet. Run a salary scan to populate.</p>';
  }
}

// === BENEFITS GRID ===
function renderBenefitsGrid() {
  const grid = document.getElementById('benefits-grid');
  grid.innerHTML = '';

  Object.entries(salaryData.operators).forEach(([opKey, op]) => {
    const card = document.createElement('div');
    card.className = 'benefits-card';
    card.setAttribute('data-testid', 'benefits-card-' + opKey);

    const benefitsHTML = op.benefits.map(b => {
      const veriLabel = b.verified === 'confirmed' ? 'Confirmed' :
                       b.verified === 'typical' ? 'Company Typical' : 'Estimated';
      return `
        <div class="benefit-item">
          <svg class="benefit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          <div class="benefit-content">
            <div class="benefit-name">${b.name}</div>
            <span class="veri-badge veri-${b.verified}">${veriLabel}</span>
          </div>
        </div>
      `;
    }).join('');

    card.innerHTML = `
      <div class="benefits-card-header">
        <span class="benefits-card-title">${op.label}</span>
      </div>
      <div class="benefits-list">${benefitsHTML}</div>
    `;
    grid.appendChild(card);
  });
}

// === SALARY BAND VERIFICATION TABLE ===
function renderSalaryBandVerification() {
  const el = document.getElementById('salary-verification-table');
  if (!el) return;
  const mkt = state.market === 'compare' ? null : state.market;
  if (!mkt) { el.innerHTML = ''; return; }
  const market = salaryData.markets[mkt];
  let roleKeys = state.role === 'all' ? Object.keys(market.roles) : [state.role];

  let html = '<div class="veri-table">';
  roleKeys.forEach(rk => {
    const role = market.roles[rk];
    Object.entries(role.levels).forEach(([lk, lv]) => {
      const ver = getSalaryVerification(mkt, rk, lk);
      const verLabel = ver === 'confirmed' ? 'Confirmed' : ver === 'typical' ? 'Company Typical' : 'Estimated';
      const mult = getOperatorMultiplier(mkt);
      const effMid = Math.round(lv.mid * mult);
      const sym = market.currencySymbol;
      html += `<div class="veri-row">
        <span class="veri-row-level">${lv.label}</span>
        <span class="veri-row-mid">${sym}${effMid.toLocaleString('en-GB')}</span>
        <span class="veri-badge veri-${ver}">${verLabel}</span>
      </div>`;
    });
  });
  html += '</div>';
  el.innerHTML = html;
}

// === COL CONTEXT CARD ===
function renderCOLCard() {
  const el = document.getElementById('col-card-body');
  if (!el) return;
  const mkt = state.market === 'compare' ? null : state.market;
  if (!mkt || !colData[mkt]) { el.innerHTML = ''; return; }

  const col = colData[mkt];
  const entries = getFilteredEntries(mkt);
  const avgMid = entries.length ? entries.reduce((s,e) => s + e.mid, 0) / entries.length : 0;
  const monthly = Math.round(avgMid / 12);
  const rentGBP = mkt === 'malta' ? Math.round(col.rentMonthly * FX_EUR_GBP) : col.rentMonthly;
  const sym = salaryData.markets[mkt].currencySymbol;

  let netInfo = '';
  if (state.showNet && avgMid > 0) {
    const n = calcNetSalary(Math.round(avgMid), mkt);
    const monthlyNet = Math.round(n.net / 12);
    const disposable = monthlyNet - rentGBP;
    netInfo = `
      <div class="col-row"><span>Monthly net (est.)</span><span class="col-val">${sym}${monthlyNet.toLocaleString('en-GB')}</span></div>
      <div class="col-row"><span>Monthly after rent (est.)</span><span class="col-val ${disposable < 0 ? 'col-neg' : 'col-pos'}">${disposable < 0 ? '-' : ''}${sym}${Math.abs(disposable).toLocaleString('en-GB')}</span></div>
      <div class="col-note">Effective rate (tax+NI): ~${n.effectiveRate}% — ${taxConfig[mkt].note}</div>`;
  } else if (avgMid > 0) {
    const disposable = monthly - rentGBP;
    netInfo = `
      <div class="col-row"><span>Monthly gross (avg)</span><span class="col-val">${sym}${monthly.toLocaleString('en-GB')}</span></div>
      <div class="col-row"><span>Monthly after rent (gross)</span><span class="col-val ${disposable < 0 ? 'col-neg' : 'col-pos'}">${disposable < 0 ? '-' : ''}${sym}${Math.abs(disposable).toLocaleString('en-GB')}</span></div>`;
  }

  el.innerHTML = `
    <div class="col-row"><span>Typical 1BR rent (city)</span><span class="col-val">${col.currencySymbol}${col.rentMonthly.toLocaleString('en-GB')}/mo</span></div>
    <div class="col-row"><span>COL index (London=100)</span><span class="col-val">${col.colIndex}</span></div>
    ${netInfo}
    <div class="col-source"><a href="${col.sourceUrl}" target="_blank" rel="noopener noreferrer">${col.sourceLabel}</a></div>`;
}

// === BENCHMARK ===
function renderBenchmark() {
  const el = document.getElementById('benchmark-result');
  if (!el) return;
  const salary = parseFloat(state.benchmarkSalary);
  if (!salary || salary <= 0 || state.market === 'compare') {
    el.innerHTML = '<p class="benchmark-hint">Enter your salary above to see where you stand.</p>';
    return;
  }
  const mkt = state.market;
  const market = salaryData.markets[mkt];
  const role = market.roles[state.benchmarkRole];
  if (!role) { el.innerHTML = ''; return; }
  const lv = role.levels[state.benchmarkLevel];
  if (!lv) { el.innerHTML = ''; return; }

  const mult = getOperatorMultiplier(mkt);
  const min = Math.round(lv.min * mult), mid = Math.round(lv.mid * mult), max = Math.round(lv.max * mult);
  const pct = calcPercentile(salary, min, mid, max);
  const sym = market.currencySymbol;

  let label, color;
  if (pct <= 10)       { label = 'Below market floor'; color = 'pct-low'; }
  else if (pct <= 40)  { label = 'Below median'; color = 'pct-below'; }
  else if (pct <= 60)  { label = 'At median'; color = 'pct-mid'; }
  else if (pct <= 90)  { label = 'Above median'; color = 'pct-above'; }
  else                 { label = 'Above market ceiling'; color = 'pct-high'; }

  const netStr = state.showNet ? (() => {
    const n = calcNetSalary(salary, mkt);
    return `<div class="benchmark-net">Estimated net: <strong>${sym}${n.net.toLocaleString('en-GB')}/yr</strong> (effective rate ${n.effectiveRate}% — estimated)</div>`;
  })() : '';

  el.innerHTML = `
    <div class="benchmark-pct-bar-wrap">
      <div class="benchmark-pct-bar">
        <div class="benchmark-pct-fill ${color}" style="width:${pct}%"></div>
        <div class="benchmark-pct-marker" style="left:${pct}%"></div>
      </div>
      <div class="benchmark-pct-labels"><span>${sym}${(min/1000).toFixed(0)}k min</span><span>${sym}${(mid/1000).toFixed(0)}k mid</span><span>${sym}${(max/1000).toFixed(0)}k max</span></div>
    </div>
    <div class="benchmark-verdict ${color}">
      <strong>~${pct}th percentile</strong> — ${label}
    </div>
    <div class="benchmark-context">vs. ${role.label} / ${lv.label} in ${market.label}</div>
    ${netStr}`;
}

// === TREND CHART ===
let trendChart = null;
function renderTrendChart() {
  const emptyEl = document.getElementById('trend-empty');
  const canvasEl = document.getElementById('chart-trend');
  if (!emptyEl || !canvasEl) return;

  const snaps = historicalSnapshots.snapshots;
  if (snaps.length < 2) {
    emptyEl.style.display = 'flex';
    canvasEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  canvasEl.style.display = 'block';

  const mkt = state.market === 'compare' ? 'gibraltar' : state.market;
  const labels = snaps.map(s => s.date);
  let roleKeys = state.role === 'all' ? Object.keys(salaryData.markets[mkt].roles) : [state.role];

  const datasets = roleKeys.map((rk, idx) => ({
    label: salaryData.markets[mkt].roles[rk].shortLabel,
    data: snaps.map(s => s.markets[mkt] ? s.markets[mkt][rk] : null),
    borderColor: getChartColor(idx),
    backgroundColor: getChartColor(idx) + '20',
    borderWidth: 2,
    pointRadius: 4,
    tension: 0.3,
    fill: false
  }));

  if (trendChart) trendChart.destroy();
  const ctx = canvasEl.getContext('2d');
  trendChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: getTextMutedColor(), font: { family: 'Satoshi, sans-serif', size: 12 }, usePointStyle: true, padding: 12, boxWidth: 8 } },
        tooltip: {
          backgroundColor: getSurfaceColor(), titleColor: getTextColor(), bodyColor: getTextMutedColor(),
          borderColor: getBorderColor(), borderWidth: 1, padding: 10, cornerRadius: 6,
          callbacks: { label: ctx => ctx.dataset.label + ': ' + formatMoney(ctx.parsed.y) }
        }
      },
      scales: {
        x: { ticks: { color: getTextMutedColor(), font: { family: 'Satoshi, sans-serif', size: 11 } }, grid: { display: false }, border: { color: getBorderColor() } },
        y: { ticks: { color: getTextMutedColor(), font: { family: 'Satoshi, sans-serif', size: 11 }, callback: v => formatMoneyk(v) }, grid: { color: getBorderColor() + '40' }, border: { display: false } }
      }
    }
  });
}

// === OPEN ROLES ===
let openRolesData = null;
let careerScanData = null;
async function loadOpenRoles() {
  const [rolesResp, scanResp] = await Promise.allSettled([
    fetch('open-roles.json'),
    fetch('career-scan.json'),
  ]);
  try {
    if (rolesResp.status === 'fulfilled' && rolesResp.value.ok)
      openRolesData = await rolesResp.value.json();
  } catch(_) { openRolesData = null; }
  try {
    if (scanResp.status === 'fulfilled' && scanResp.value.ok)
      careerScanData = await scanResp.value.json();
  } catch(_) { careerScanData = null; }
  renderOpenRoles();
  renderWatchedCompanies();
  renderCareerScan();
}

function renderCareerScan() {
  const el = document.getElementById('career-scan-results');
  const meta = document.getElementById('career-scan-meta');
  const badge = document.getElementById('cs-total-badge');
  if (!el) return;

  if (!careerScanData) {
    el.innerHTML = '<p class="open-roles-empty">No career scan data yet. Run <code>scan-career-pages.py</code> to populate.</p>';
    return;
  }

  const gen = careerScanData.generated
    ? new Date(careerScanData.generated).toLocaleString('en-GB', {dateStyle:'medium', timeStyle:'short'})
    : '';
  const cutoff = careerScanData.cutoff_days || 2;
  const total  = careerScanData.total_fresh_jobs || 0;
  const scanned = careerScanData.companies_scanned || 0;

  if (meta) meta.textContent = `${total} fresh posting(s) across ${scanned} companies (last ${cutoff} days) — generated ${gen}`;
  if (badge) {
    badge.textContent = total > 0 ? total : '';
    badge.style.display = total > 0 ? '' : 'none';
  }

  const results = (careerScanData.results || []);
  const withJobs = results.filter(r => r.jobs && r.jobs.length > 0);
  const withErrors = results.filter(r => r.status === 'error');
  const skipped = results.filter(r => r.status === 'skipped');

  if (withJobs.length === 0) {
    let msg = 'No fresh postings found in the last ' + cutoff + ' days.';
    if (withErrors.length) msg += ` ${withErrors.length} site(s) had errors.`;
    if (skipped.length) msg += ` ${skipped.length} site(s) skipped (LinkedIn).`;
    el.innerHTML = `<p class="open-roles-empty">${msg}</p>`;
    return;
  }

  el.innerHTML = withJobs.map(company => {
    const jobsHtml = company.jobs.map(j => {
      const dept = j.department ? `<span class="cs-dept">${j.department}</span>` : '';
      const loc  = j.location   ? `<span class="cs-loc">${j.location}</span>` : '';
      return `<div class="cs-job-row">
        <a href="${j.url}" target="_blank" rel="noopener" class="cs-job-title">${j.title}</a>
        <div class="cs-job-meta">
          <span class="cs-posted">${j.posted}</span>
          ${dept}${loc}
        </div>
      </div>`;
    }).join('');
    const typeTag = `<span class="wc-type wc-type-${company.type}">${company.type}</span>`;
    return `<div class="cs-company-card">
      <div class="cs-company-header">
        <span class="cs-company-name">${company.company}</span>
        ${typeTag}
        <span class="cs-job-count">${company.jobs.length} job${company.jobs.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="cs-jobs-list">${jobsHtml}</div>
    </div>`;
  }).join('');
}

function renderOpenRoles() {
  const el = document.getElementById('open-roles-list');
  if (!el) return;
  if (!openRolesData || openRolesData.count === 0) {
    el.innerHTML = '<p class="open-roles-empty">No recent role mentions found in the Marveen job-hunter logs. Re-run <code>build-open-roles.py</code> to refresh.</p>';
    return;
  }
  const mkt = state.market === 'compare' ? null : state.market;
  const filtered = mkt ? openRolesData.roles.filter(r => r.market === mkt) : openRolesData.roles;
  const roleFilter = state.role === 'all' ? null : state.role;
  const shown = roleFilter ? filtered.filter(r => r.roleCategory === roleFilter) : filtered;

  if (shown.length === 0) {
    el.innerHTML = '<p class="open-roles-empty">No role mentions match the current filters. Try "All Roles".</p>';
    return;
  }

  el.innerHTML = shown.map(r => {
    const marketLabel = r.market === 'gibraltar' ? 'Gibraltar' : 'Malta';
    const catLabel = r.roleCategory ? (salaryData.markets[r.market || 'gibraltar'].roles[r.roleCategory] || {}).label || r.roleCategory : 'General iGaming';
    return `<div class="open-role-card">
      <div class="open-role-header">
        <span class="open-role-title">${r.title.replace(/##\s*\d+:\d+\s*--\s*/, '').slice(0,90)}</span>
        <span class="open-role-market">${marketLabel}</span>
      </div>
      <div class="open-role-meta">
        <span class="open-role-cat">${catLabel}</span>
        <span class="open-role-date">${r.date}</span>
        <span class="open-role-src">via ${r.source}</span>
      </div>
      <p class="open-role-snippet">${r.snippet.slice(0,180)}&hellip;</p>
    </div>`;
  }).join('');

  const gen = openRolesData.generated ? new Date(openRolesData.generated).toLocaleDateString('en-GB') : '';
  const note = document.getElementById('open-roles-generated');
  if (note) note.textContent = `${shown.length} of ${openRolesData.count} total — data generated ${gen}. Re-run build-open-roles.py to refresh.`;
}

function renderWatchedCompanies() {
  const el = document.getElementById('watched-companies-list');
  if (!el) return;
  const companies = openRolesData?.watchedCompanies;
  if (!companies || companies.length === 0) {
    el.innerHTML = '<p class="open-roles-empty">No watched companies data. Re-run build-open-roles.py to refresh.</p>';
    return;
  }
  const active = companies.filter(c => c.active);
  const inactive = companies.filter(c => !c.active);
  const renderGroup = (list, label) => {
    if (!list.length) return '';
    return `<div class="wc-group">
      <div class="wc-group-label">${label} (${list.length})</div>
      ${list.map(c => {
        const typeTag = `<span class="wc-type wc-type-${c.type}">${c.type}</span>`;
        const urlTag = c.career_url
          ? `<a href="${c.career_url}" target="_blank" rel="noopener" class="wc-url">${c.career_url.replace(/^https?:\/\//, '').slice(0, 50)}</a>`
          : '<span class="wc-no-url">no career URL yet</span>';
        return `<div class="wc-row">
          <span class="wc-name">${c.name}</span>
          ${typeTag}
          ${urlTag}
        </div>`;
      }).join('')}
    </div>`;
  };
  const countEl = document.getElementById('watched-companies-count');
  if (countEl) countEl.textContent = `${active.length} active, ${inactive.length} inactive — source: Marveen /api/companies`;
  el.innerHTML = renderGroup(active, 'Active') + renderGroup(inactive, 'Inactive');
}

// === MARKET COMPARISON ===
function renderMarketComparison() {
  const section = document.getElementById('market-comparison-section');
  const grid = document.getElementById('market-comparison-grid');

  if (state.market !== 'compare') {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  grid.innerHTML = '';

  // Get role labels
  let roleKeys;
  if (state.role === 'all') {
    roleKeys = Object.keys(salaryData.markets.gibraltar.roles);
  } else {
    roleKeys = [state.role];
  }

  // Build comparison table
  const table = document.createElement('div');
  table.className = 'market-comparison-table';

  // Header row
  const header = document.createElement('div');
  header.className = 'market-comp-header';
  header.innerHTML = `
    <div class="market-comp-cell market-comp-role">Role / Level</div>
    <div class="market-comp-cell market-comp-gib">Gibraltar (GBP)</div>
    <div class="market-comp-cell market-comp-malta">Malta (EUR)</div>
    <div class="market-comp-cell market-comp-diff">Gib vs Malta (GBP equiv.)</div>
  `;
  table.appendChild(header);

  roleKeys.forEach(roleKey => {
    const gibRole = salaryData.markets.gibraltar.roles[roleKey];
    const maltaRole = salaryData.markets.malta.roles[roleKey];
    const roleLabel = gibRole.label;

    // Role separator
    const sep = document.createElement('div');
    sep.className = 'market-comp-role-sep';
    sep.innerHTML = '<span>' + roleLabel + '</span>';
    table.appendChild(sep);

    Object.entries(gibRole.levels).forEach(([levelKey, gibLevel]) => {
      const maltaLevel = maltaRole.levels[levelKey];
      if (!maltaLevel) return;

      const gibMid = gibLevel.mid * getOperatorMultiplier('gibraltar');
      const maltaMid = maltaLevel.mid * getOperatorMultiplier('malta');
      const maltaMidGBP = convertToGBP(maltaMid, 'malta');
      const diff = gibMid - maltaMidGBP;
      const diffPct = Math.round((diff / maltaMidGBP) * 100);

      const row = document.createElement('div');
      row.className = 'market-comp-row';
      row.setAttribute('data-testid', 'market-comp-row-' + roleKey + '-' + levelKey);

      const diffClass = diff > 0 ? 'market-comp-diff-pos' : 'market-comp-diff-neg';
      const diffSign = diff > 0 ? '+' : '';
      const diffStr = diffSign + formatMoneyk(diff) + ' (' + diffSign + diffPct + '%)';
      const gibTotal = calcTotalComp(gibMid);
      const maltaTotal = calcTotalComp(maltaMid);

      row.innerHTML = `
        <div class="market-comp-cell market-comp-role">${gibLevel.label}</div>
        <div class="market-comp-cell market-comp-gib">
          <span class="market-comp-mid">\u00A3${Math.round(gibMid).toLocaleString('en-GB')}</span>
          <span class="market-comp-total">Total: \u00A3${Math.round(gibTotal.total).toLocaleString('en-GB')}</span>
        </div>
        <div class="market-comp-cell market-comp-malta">
          <span class="market-comp-mid">\u20AC${Math.round(maltaMid).toLocaleString('en-GB')}</span>
          <span class="market-comp-total">Total: \u20AC${Math.round(maltaTotal.total).toLocaleString('en-GB')}</span>
        </div>
        <div class="market-comp-cell market-comp-diff ${diffClass}">
          ${diffStr}
        </div>
      `;
      table.appendChild(row);
    });
  });

  grid.appendChild(table);

  // Add FX note
  const fxNote = document.createElement('div');
  fxNote.className = 'market-comp-fx-note';
  fxNote.innerHTML = `FX rate: 1 EUR = \u00A3${FX_EUR_GBP} (${FX_UPDATED}, ${FX_SOURCE}). Comparison column converts Malta EUR to GBP equivalent using this rate. Total packages include current slider values (${state.bonusPct}% bonus, ${getCurrencySymbolForMarket('gibraltar')}${state.sharesValue.toLocaleString('en-GB')} shares, ${state.pensionPct}% pension).`;
  grid.appendChild(fxNote);
}

function getCurrencySymbolForMarket(market) {
  return salaryData.markets[market].currencySymbol;
}

// === SLIDER VALUE DISPLAYS ===
function updateSliderDisplays() {
  document.getElementById('bonus-value').textContent = state.bonusPct + '%';
  document.getElementById('shares-value').textContent = formatMoney(state.sharesValue);
  document.getElementById('pension-value').textContent = state.pensionPct + '%';
}

// === UPDATE BUTTON ===
function handleDataRefresh() {
  triggerSalaryScan();
}

function _handleDataRefresh_LEGACY() {
  const btn = document.getElementById('btn-refresh-data');
  const status = document.getElementById('refresh-status');

  btn.classList.add('refreshing');
  btn.disabled = true;
  btn.textContent = 'Checking...';
  status.textContent = 'Verifying local dataset against last collected sources...';

  setTimeout(() => {
    // Re-fetch last-sync.json to show the real last data sync time (not "now")
    fetch('last-sync.json?_=' + Date.now())
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.human) {
          salaryData.lastUpdated = data.human;
          document.getElementById('badge-last-updated').textContent = 'Updated ' + data.human;
        }
      })
      .catch(() => {});

    // Calculate next Monday for status text
    const nextMon = new Date();
    const day = nextMon.getDay();
    const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
    nextMon.setDate(nextMon.getDate() + daysUntilMonday);
    salaryData.nextScheduledUpdate = nextMon.toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    btn.classList.remove('refreshing');
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 1 1-3-6.7L21 8"/>
        <path d="M21 3v5h-5"/>
      </svg>
      Dataset verified
    `;
    // Also reload career-scan.json in case scan was run externally
    fetch('career-scan.json').then(r => r.ok ? r.json() : null).then(data => {
      if (data) { careerScanData = data; renderCareerScan(); }
    }).catch(() => {});
    status.textContent = 'Local data verified. For fresh job listings run: python3 scan-career-pages.py';
    status.className = 'refresh-status';

    setTimeout(() => {
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-3-6.7L21 8"/>
          <path d="M21 3v5h-5"/>
        </svg>
        Check for updates
      `;
      status.textContent = 'Next scheduled check: ' + salaryData.nextScheduledUpdate;
    }, 5000);
  }, 2000);
}

// === RE RENDER ALL ===
function renderAll() {
  // When in compare mode, skip single-market rendering
  if (state.market === 'compare') {
    updateSliderDisplays();
    renderMarketComparison();

    // Hide single-market sections
    document.querySelectorAll('.hide-in-compare').forEach(el => {
      el.style.display = 'none';
    });

    // Show compare filters
    const compareFilters = document.getElementById('compare-filters');
    if (compareFilters) compareFilters.style.display = 'flex';

    // Make sliders full width
    const slidersCard = document.getElementById('sliders-card');
    if (slidersCard) {
      slidersCard.style.gridColumn = '1 / -1';
      slidersCard.style.maxWidth = '500px';
    }

    return;
  }

  // Single-market rendering
  updateSliderDisplays();
  updateKPIs();
  updateSliderSummary();
  renderSalaryRangesChart();
  renderTotalCompChart();
  renderComparisonCards();
  renderBenefitsGrid();
  renderSalaryBandVerification();
  renderCOLCard();
  renderBenchmark();
  renderTrendChart();
  renderOpenRoles();

  // Hide market comparison section
  const compSection = document.getElementById('market-comparison-section');
  if (compSection) compSection.style.display = 'none';

  // Show single-market sections
  document.querySelectorAll('.hide-in-compare').forEach(el => {
    el.style.display = '';
  });

  // Hide compare filters
  const compareFilters = document.getElementById('compare-filters');
  if (compareFilters) compareFilters.style.display = 'none';

  // Reset sliders card layout
  const slidersCard = document.getElementById('sliders-card');
  if (slidersCard) {
    slidersCard.style.gridColumn = '';
    slidersCard.style.maxWidth = '';
  }
}

// === EVENT LISTENERS ===
function initEventListeners() {
  // Market toggle
  document.querySelectorAll('[data-market]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-market]').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      state.market = btn.dataset.market;
      renderAll();
    });
  });

  // Operator filter pills
  document.querySelectorAll('[data-operator]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-operator]').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      state.operator = btn.dataset.operator;
      renderAll();
    });
  });

  // Role filter pills
  document.querySelectorAll('[data-role]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-role]').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      state.role = btn.dataset.role;
      renderAll();
    });
  });

  // Sliders
  const bonusSlider = document.getElementById('slider-bonus');
  bonusSlider.addEventListener('input', () => {
    state.bonusPct = parseInt(bonusSlider.value);
    renderAll();
  });

  const sharesSlider = document.getElementById('slider-shares');
  sharesSlider.addEventListener('input', () => {
    state.sharesValue = parseInt(sharesSlider.value);
    renderAll();
  });

  const pensionSlider = document.getElementById('slider-pension');
  pensionSlider.addEventListener('input', () => {
    state.pensionPct = parseInt(pensionSlider.value);
    renderAll();
  });

  // Refresh button
  const refreshBtn = document.getElementById('btn-refresh-data');
  if (refreshBtn) refreshBtn.addEventListener('click', handleDataRefresh);

  // Export CSV
  const exportBtn = document.getElementById('btn-export-csv');
  if (exportBtn) exportBtn.addEventListener('click', exportToCSV);

  // Net/gross toggle
  const netToggle = document.getElementById('toggle-net');
  if (netToggle) {
    netToggle.addEventListener('change', () => {
      state.showNet = netToggle.checked;
      const netLabel = document.getElementById('net-toggle-label');
      if (netLabel) netLabel.textContent = state.showNet ? 'Show net salary (estimated)' : 'Show gross salary';
      renderBenchmark();
      renderCOLCard();
    });
  }

  // Benchmark inputs
  const bSalary = document.getElementById('benchmark-salary');
  const bRole   = document.getElementById('benchmark-role');
  const bLevel  = document.getElementById('benchmark-level');

  function syncBenchmarkLevels() {
    if (!bLevel || !bRole) return;
    const mkt = state.market === 'compare' ? 'gibraltar' : state.market;
    const market = salaryData.markets[mkt];
    const role = market.roles[bRole.value];
    if (!role) return;
    bLevel.innerHTML = Object.entries(role.levels).map(([k,lv]) =>
      `<option value="${k}">${lv.label}</option>`).join('');
    state.benchmarkLevel = bLevel.value;
    renderBenchmark();
  }

  if (bSalary) {
    bSalary.addEventListener('input', () => {
      state.benchmarkSalary = bSalary.value;
      renderBenchmark();
    });
  }
  if (bRole) {
    bRole.addEventListener('change', () => {
      state.benchmarkRole = bRole.value;
      syncBenchmarkLevels();
    });
    // Populate role options
    const mkt = 'gibraltar';
    bRole.innerHTML = Object.entries(salaryData.markets[mkt].roles)
      .map(([k,r]) => `<option value="${k}">${r.label}</option>`).join('');
    syncBenchmarkLevels();
  }
  if (bLevel) {
    bLevel.addEventListener('change', () => {
      state.benchmarkLevel = bLevel.value;
      renderBenchmark();
    });
  }

  // Theme toggle
  const themeToggle = document.querySelector('[data-theme-toggle]');
  let currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';

  themeToggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.setAttribute('aria-label', 'Switch to ' + (currentTheme === 'dark' ? 'light' : 'dark') + ' mode');
    themeToggle.innerHTML = currentTheme === 'dark'
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
    setTimeout(() => {
      renderSalaryRangesChart();
      renderTotalCompChart();
      if (state.market === 'compare') renderMarketComparison();
    }, 50);
  });
}

// === INIT ===
function loadLastSyncBadge() {
  const badge = document.getElementById('badge-last-updated');
  fetch('last-sync.json?_=' + Date.now())
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && data.human) {
        badge.textContent = 'Updated ' + data.human;
        salaryData.lastUpdated = data.human;
        if (data.signal_count !== undefined) {
          const signalEl = document.getElementById('signal-count');
          if (signalEl) signalEl.textContent = data.signal_count + ' signals';
        }
      }
    })
    .catch(() => {});
}

function loadSalaryData() {
  return fetch('salary-data.json?_=' + Date.now())
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data) return;
      // Override FX constants
      if (data.fx) {
        FX_EUR_GBP = data.fx.EUR_GBP || FX_EUR_GBP;
        FX_UPDATED = data.fx.updated || FX_UPDATED;
        FX_SOURCE = data.fx.source || FX_SOURCE;
      }
      // Deep-merge markets — handles both existing markets (field-level merge) and new markets (full copy)
      if (data.markets) {
        for (const [mkt, mktData] of Object.entries(data.markets)) {
          if (!salaryData.markets[mkt]) {
            salaryData.markets[mkt] = mktData;
          } else {
            for (const [role, roleData] of Object.entries(mktData.roles || {})) {
              if (!salaryData.markets[mkt].roles[role]) {
                salaryData.markets[mkt].roles[role] = roleData;
              } else {
                for (const [lvl, lvlData] of Object.entries(roleData.levels || {})) {
                  if (salaryData.markets[mkt].roles[role].levels[lvl]) {
                    Object.assign(salaryData.markets[mkt].roles[role].levels[lvl], lvlData);
                  } else {
                    salaryData.markets[mkt].roles[role].levels[lvl] = lvlData;
                  }
                }
              }
            }
          }
        }
      }
      // Merge operators: add new ones, update salaryBands on existing
      if (data.operators) {
        for (const [key, op] of Object.entries(data.operators)) {
          if (!salaryData.operators[key]) {
            salaryData.operators[key] = op;
          } else {
            if (op.salaryBands) salaryData.operators[key].salaryBands = op.salaryBands;
            if (op.careerUrl) salaryData.operators[key].careerUrl = op.careerUrl;
          }
        }
      }
      if (data.meta && data.meta.lastUpdated) {
        salaryData.lastUpdated = data.meta.lastUpdated;
      }
    })
    .catch(() => {});
}

function buildOperatorPills() {
  ['operator-pills-main', 'operator-pills-compare'].forEach(containerId => {
    const container = document.getElementById(containerId);
    if (!container) return;
    const isCompare = containerId.includes('compare');

    // Remove previously generated pills (keep "All Operators" button)
    container.querySelectorAll('[data-operator]:not([data-operator="all"])').forEach(b => b.remove());

    Object.entries(salaryData.operators).forEach(([key, op]) => {
      const btn = document.createElement('button');
      btn.className = 'pill';
      btn.setAttribute('data-operator', key);
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', 'false');
      btn.setAttribute('data-testid', 'filter-operator-' + key + (isCompare ? '-compare' : ''));
      btn.textContent = op.label;
      container.appendChild(btn);
    });
  });
}

function triggerSalaryScan() {
  const btn = document.getElementById('btn-refresh-data');
  const status = document.getElementById('refresh-status');
  const badge = document.getElementById('badge-last-updated');

  btn.classList.add('refreshing');
  btn.disabled = true;
  btn.textContent = 'Starting scan...';
  status.textContent = 'Triggering background scan...';

  fetch('/api/trigger-scan', { method: 'POST' })
    .then(r => r.json().then(body => ({ ok: r.ok, status: r.status, body })))
    .then(({ ok, status: httpStatus, body }) => {
      if (ok) {
        status.textContent = 'Scan started in the background. Data will auto-update in ~5 minutes — reload the page then.';
        badge.textContent = 'Scan running...';
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg> Scan queued`;
      } else {
        throw new Error(body.error || `HTTP ${httpStatus}`);
      }
    })
    .catch(err => {
      status.textContent = 'Scan trigger failed: ' + err.message;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg> Check for updates`;
    })
    .finally(() => {
      btn.disabled = false;
      btn.classList.remove('refreshing');
    });
}

// === MALTA vs GIBRALTAR TAX COMPARISON ===

function calcGibraltarGIBS(gross) {
  let tax = 0;
  if (gross <= 25000) {
    tax += Math.min(gross, 10000) * 0.06;
    tax += Math.max(0, Math.min(gross, 17000) - 10000) * 0.20;
    tax += Math.max(0, gross - 17000) * 0.28;
  } else {
    tax += Math.min(gross, 17000) * 0.16;
    tax += Math.max(0, Math.min(gross, 25000) - 17000) * 0.19;
    tax += Math.max(0, Math.min(gross, 40000) - 25000) * 0.25;
    tax += Math.max(0, Math.min(gross, 105000) - 40000) * 0.28;
    tax += Math.max(0, gross - 105000) * 0.25;
  }
  return Math.round(tax);
}

function calcGibraltarABS(gross) {
  const PA = 3455;
  const taxable = Math.max(0, gross - PA);
  let tax = 0;
  tax += Math.min(taxable, 4000) * 0.14;
  tax += Math.max(0, Math.min(taxable, 16000) - 4000) * 0.17;
  tax += Math.max(0, taxable - 16000) * 0.39;
  return Math.round(tax);
}

function calcGibraltarSIEmployee(gross) {
  return Math.min(Math.round(gross * 0.10), Math.round(40.79 * 52));
}

function calcGibraltarSIEmployer(gross) {
  return Math.min(Math.round(gross * 0.20), Math.round(81.58 * 52));
}

function calcMaltaIncomeTax(gross, status) {
  const schedules = {
    single:  [{to:12000,r:0},{to:16000,r:0.15},{to:60000,r:0.25},{to:Infinity,r:0.35}],
    married: [{to:15000,r:0},{to:23000,r:0.15},{to:60000,r:0.25},{to:Infinity,r:0.35}],
    parent:  [{to:13000,r:0},{to:17500,r:0.15},{to:60000,r:0.25},{to:Infinity,r:0.35}]
  };
  const brackets = schedules[status] || schedules.single;
  let tax = 0, prev = 0;
  for (const b of brackets) {
    if (gross <= prev) break;
    const top = b.to === Infinity ? gross : Math.min(gross, b.to);
    tax += (top - prev) * b.r;
    prev = b.to === Infinity ? gross : b.to;
  }
  return Math.round(tax);
}

function calcMaltaSSCEmployee(gross) {
  const annualWageCap = Math.round(464.17 * 52);
  return Math.round(Math.min(gross, annualWageCap) * 0.10);
}

function calcMaltaSSCEmployer(gross) {
  return calcMaltaSSCEmployee(gross);
}

function _taxFmt(n) {
  return Math.round(n).toLocaleString('en-GB');
}

function renderTaxSection() {
  const fxEl = document.getElementById('tax-fx-rate');
  if (fxEl) fxEl.textContent = FX_EUR_GBP.toFixed(3);
  const fxSrc = document.getElementById('tax-fx-source');
  if (fxSrc) fxSrc.textContent = FX_SOURCE || 'ECB';

  _renderTaxOverview();
  _renderTaxBrackets();
  _renderTaxSpecialSchemes();
  _renderNetSalaryEstimator();
  _renderEmployerCost();
}

function _renderTaxOverview() {
  const el = document.getElementById('tax-overview-grid');
  if (!el) return;
  const rows = [
    ['Tax System',            'Progressive, 4 brackets (0–35%)',                          'GIBS or ABS — taxpayer uses whichever is lower'],
    ['Zero-Rate Threshold',   '€12,000 single / €15,000 married',                         'N/A for GIBS; £3,455 personal allowance under ABS'],
    ['Top Marginal Rate',     '35% (above €60,000)',                                       '28% (£40k–£105k) / 25% above £105k (GIBS Schedule B)'],
    ['Employee Social Ins.',  '10% weekly wage, cap ~€2,414/yr',                           '10% weekly wage, cap ~£2,121/yr'],
    ['Special Regime',        'HQP: 15% flat on gross (min €65k, MGA role)',               'HEPSS: £39,940 fixed (beneficial at £154k+ only)'],
    ['Corporate Tax',         '35% / ~5% effective (imputation refund)',                   '15% (since July 2024)'],
    ['Currency',              'EUR (€)',                                                    'GBP (£)'],
  ];
  el.innerHTML = `<table class="tax-overview-table">
    <thead><tr><th></th><th>🇲🇹 Malta</th><th>🇬🇮 Gibraltar</th></tr></thead>
    <tbody>${rows.map(r => `<tr><td class="tax-dim-cell">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody>
  </table>`;
}

function _renderTaxBrackets() {
  const el = document.getElementById('tax-brackets-grid');
  if (!el) return;
  el.innerHTML = `
    <div class="tax-brackets-wrapper">
      <div class="tax-bracket-card">
        <div class="tax-bracket-card-title">🇲🇹 Malta — Income Tax Brackets 2026</div>
        <table class="tax-bracket-table">
          <thead><tr><th>Income (EUR)</th><th>Single</th><th>Married</th><th>Parent</th></tr></thead>
          <tbody>
            <tr><td>€0 – €12,000</td><td class="rate-zero">0%</td><td class="rate-zero" rowspan="2">€0 – €15,000: 0%</td><td class="rate-zero" rowspan="2">€0 – €13,000: 0%</td></tr>
            <tr><td>€12,001 – €16,000</td><td class="rate-low">15%</td></tr>
            <tr><td>€16,001 – €23,000</td><td class="rate-mid">25%</td><td class="rate-low">€15,001 – €23,000: 15%</td><td class="rate-low">€13,001 – €17,500: 15%</td></tr>
            <tr><td>€23,001 – €60,000</td><td class="rate-mid">25%</td><td class="rate-mid">€23,001 – €60,000: 25%</td><td class="rate-mid">€17,501 – €60,000: 25%</td></tr>
            <tr><td>€60,001+</td><td class="rate-high">35%</td><td class="rate-high">35%</td><td class="rate-high">35%</td></tr>
          </tbody>
        </table>
        <div class="tax-bracket-note">SSC (employee): 10% of weekly wage, max ~€2,414/yr. Employer SSC: also 10%, same cap.</div>
      </div>
      <div class="tax-bracket-card">
        <div class="tax-bracket-card-title">🇬🇮 Gibraltar — GIBS 2025/26</div>
        <table class="tax-bracket-table">
          <thead><tr><th>Income (GBP)</th><th>Rate</th><th>Schedule</th></tr></thead>
          <tbody>
            <tr><td>£0 – £10,000</td><td class="rate-zero">6%</td><td class="schedule-label" rowspan="3">Schedule A<br><small>(income ≤ £25k)</small></td></tr>
            <tr><td>£10,001 – £17,000</td><td class="rate-mid">20%</td></tr>
            <tr><td>£17,001 – £25,000</td><td class="rate-high">28%</td></tr>
            <tr><td>£0 – £17,000</td><td class="rate-low">16%</td><td class="schedule-label" rowspan="5">Schedule B<br><small>(income > £25k)</small></td></tr>
            <tr><td>£17,001 – £25,000</td><td class="rate-low">19%</td></tr>
            <tr><td>£25,001 – £40,000</td><td class="rate-mid">25%</td></tr>
            <tr><td>£40,001 – £105,000</td><td class="rate-high">28%</td></tr>
            <tr><td>£105,001+</td><td class="rate-mid">25%</td></tr>
          </tbody>
        </table>
        <div class="tax-bracket-note">ABS alternative: 14%/17%/39% after £3,455 personal allowance. System compares both and uses the lower result. SI (employee): 10%, max ~£2,121/yr. No married bracket under GIBS.</div>
      </div>
    </div>`;
}

function _renderTaxSpecialSchemes() {
  const el = document.getElementById('tax-special-schemes');
  if (!el) return;
  el.innerHTML = `
    <h3 class="tax-subsection-title">Special Tax Schemes</h3>
    <div class="tax-schemes-grid">
      <div class="tax-scheme-card">
        <div class="tax-scheme-header"><span class="tax-scheme-flag">🇲🇹</span><span class="tax-scheme-name">HQP — Highly Qualified Persons (Malta)</span></div>
        <ul class="tax-scheme-facts">
          <li><strong>15% flat rate</strong> on gross annual salary (replaces standard income tax)</li>
          <li>Minimum qualifying salary: <strong>€65,000/year</strong></li>
          <li>Eligible roles: senior positions at MGA-licensed operators (C-level, Heads of Department, senior management)</li>
          <li>Duration: up to 5+5+5 years, valid until 2040 (Legal Notice L.N. 20 of 2026)</li>
          <li>Applies to locally-sourced employment income; foreign-source income rules differ</li>
          <li>Employee SSC still applies on top of the 15% rate</li>
          <li>Break-even vs standard single rate: ~€50,000 gross</li>
        </ul>
      </div>
      <div class="tax-scheme-card">
        <div class="tax-scheme-header"><span class="tax-scheme-flag">🇬🇮</span><span class="tax-scheme-name">HEPSS — High Executive Possessing Specialist Skills (Gibraltar)</span></div>
        <ul class="tax-scheme-facts">
          <li><strong>Fixed annual tax: £39,940</strong> on assessed income up to £160,000</li>
          <li>Income above £160,000 assessed: 0% additional income tax</li>
          <li>Eligible: senior executives with specialist skills (CEO, CFO, CTO and equivalent)</li>
          <li>No stated minimum salary, but tax is only beneficial at <strong>~£154,000+ gross</strong> (below this, GIBS is cheaper)</li>
          <li>SI (social insurance) applies separately and is not replaced by HEPSS</li>
          <li>Requires application and approval — not automatic</li>
        </ul>
      </div>
    </div>`;
}

function _renderNetSalaryEstimator() {
  const el = document.getElementById('tax-scenario-estimator');
  if (!el) return;

  const levels = [
    {label: 'Junior–Mid',           malta: 35000,  gib: 30000},
    {label: 'Senior',               malta: 65000,  gib: 55500},
    {label: 'Director / Specialist',malta: 100000, gib: 85500}
  ];
  const scenarios = [
    {id: 'A', label: 'Single, standard',  desc: 'Standard PAYE, single filing status, no special scheme'},
    {id: 'B', label: 'Married / parent',  desc: 'Malta: married or parent filing status. Gibraltar: standard GIBS (no married bracket)'},
    {id: 'C', label: 'Special scheme',    desc: 'Malta HQP (≥€65k, MGA role) / Gibraltar HEPSS (senior exec, beneficial at £154k+ only)'}
  ];

  let html = `<div class="tax-est-table-wrap"><table class="tax-est-table">
    <thead>
      <tr>
        <th class="tax-est-th-level">Salary Level</th>
        ${scenarios.map(s => `<th class="tax-est-th-scenario"><div class="tax-est-sc-name">${s.label}</div><div class="tax-est-sc-desc">${s.desc}</div></th>`).join('')}
      </tr>
    </thead>
    <tbody>`;

  for (const lv of levels) {
    html += `<tr>
      <td class="tax-est-td-level"><strong>${lv.label}</strong><div class="tax-est-gross">Malta €${_taxFmt(lv.malta)}<br>Gib £${_taxFmt(lv.gib)}</div></td>`;

    for (const sc of scenarios) {
      const m = _calcMaltaCell(lv.malta, sc.id);
      const g = _calcGibCell(lv.gib, sc.id);
      html += `<td class="tax-est-td-cell">
        <div class="tax-est-juris tax-est-malta">
          <span class="tax-est-flag-sm">🇲🇹</span>
          <div class="tax-est-net-val">€${_taxFmt(m.net)}<span class="tax-est-eff">${m.eff}%</span></div>
          <div class="tax-est-breakdown">Tax €${_taxFmt(m.tax)} · SSC €${_taxFmt(m.ssc)}</div>
          ${m.tag ? `<div class="tax-est-tag">${m.tag}</div>` : ''}
        </div>
        <div class="tax-est-sep"></div>
        <div class="tax-est-juris tax-est-gib">
          <span class="tax-est-flag-sm">🇬🇮</span>
          <div class="tax-est-net-val">£${_taxFmt(g.net)}<span class="tax-est-eff">${g.eff}%</span></div>
          <div class="tax-est-breakdown">Tax £${_taxFmt(g.tax)} · SI £${_taxFmt(g.si)}</div>
          ${g.tag ? `<div class="tax-est-tag tax-est-tag-note">${g.tag}</div>` : ''}
        </div>
      </td>`;
    }
    html += `</tr>`;
  }

  html += `</tbody></table></div>`;
  el.innerHTML = html;
}

function _calcMaltaCell(gross, scenario) {
  let tax, tag = '';
  const ssc = calcMaltaSSCEmployee(gross);
  if (scenario === 'C') {
    if (gross >= 65000) {
      tax = Math.round(gross * 0.15);
      tag = 'HQP: 15% flat';
    } else {
      tax = calcMaltaIncomeTax(gross, 'single');
      tag = 'HQP: N/A (< €65k)';
    }
  } else if (scenario === 'B') {
    tax = calcMaltaIncomeTax(gross, 'married');
  } else {
    tax = calcMaltaIncomeTax(gross, 'single');
  }
  const net = gross - tax - ssc;
  const eff = ((tax + ssc) / gross * 100).toFixed(1);
  return {tax, ssc, net: Math.round(net), eff, tag};
}

function _calcGibCell(gross, scenario) {
  const gibsTax = calcGibraltarGIBS(gross);
  const absTax = calcGibraltarABS(gross);
  const tax = Math.min(gibsTax, absTax);
  const si = calcGibraltarSIEmployee(gross);
  let tag = '';
  if (scenario === 'B') tag = 'No married bracket in GIBS';
  if (scenario === 'C') tag = 'HEPSS N/A below ~£154k';
  const net = gross - tax - si;
  const eff = ((tax + si) / gross * 100).toFixed(1);
  return {tax, si, net: Math.round(net), eff, tag};
}

function _renderEmployerCost() {
  const el = document.getElementById('tax-employer-cost');
  if (!el) return;
  const levels = [
    {label: 'Junior–Mid',           malta: 35000,  gib: 30000},
    {label: 'Senior',               malta: 65000,  gib: 55500},
    {label: 'Director / Specialist',malta: 100000, gib: 85500}
  ];
  let html = `<div class="tax-est-table-wrap"><table class="tax-employer-table">
    <thead>
      <tr>
        <th>Level</th>
        <th>🇲🇹 Malta Gross</th><th>+ Employer SSC</th><th>Malta Total Cost</th>
        <th>🇬🇮 Gibraltar Gross</th><th>+ Employer SI (est.)</th><th>Gibraltar Total Cost</th>
      </tr>
    </thead>
    <tbody>`;
  for (const lv of levels) {
    const mSSC = calcMaltaSSCEmployer(lv.malta);
    const mTotal = lv.malta + mSSC;
    const gSI = calcGibraltarSIEmployer(lv.gib);
    const gTotal = lv.gib + gSI;
    html += `<tr>
      <td><strong>${lv.label}</strong></td>
      <td>€${_taxFmt(lv.malta)}</td>
      <td>€${_taxFmt(mSSC)} <small>(10%, capped)</small></td>
      <td class="tax-total-col">€${_taxFmt(mTotal)}</td>
      <td>£${_taxFmt(lv.gib)}</td>
      <td>~£${_taxFmt(gSI)} <small>(est. ~20%)</small></td>
      <td class="tax-total-col">~£${_taxFmt(gTotal)}</td>
    </tr>`;
  }
  html += `</tbody>
    <tfoot><tr><td colspan="7" class="tax-table-foot">Gibraltar employer SI rate is approximate — verify current rate with Gibraltar Social Insurance Office. Malta SSC: Class 1 employed, weekly contribution structure (employee + employer each ~10%).</td></tr></tfoot>
  </table></div>`;
  el.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
  loadSalaryData().then(() => {
    buildOperatorPills();
    initEventListeners();
    renderAll();
    loadOpenRoles();
    loadLastSyncBadge();
    renderTaxSection();
  });
});
