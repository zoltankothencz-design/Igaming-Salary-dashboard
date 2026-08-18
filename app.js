/* app.js — Gibraltar iGaming Salary Dashboard 2026 */

// === FX RATE ===
// EUR to GBP conversion (ECB reference rate, 30 July 2026)
const FX_EUR_GBP = 0.855;
const FX_UPDATED = '30 July 2026';
const FX_SOURCE = 'European Central Bank reference rate';

// === TAX ESTIMATION CONFIG ===
// Approximate effective rates — estimates only, individual circumstances vary.
const taxConfig = {
  gibraltar: {
    note: 'Gibraltar ABS — est. Single person, basic allowance ~£3,345. Source: Gibraltar Income Tax Office 2026.',
    personalAllowance: 3345,
    brackets: [
      { from: 0,     to: 10000,    rate: 0.16 },
      { from: 10000, to: 17000,    rate: 0.19 },
      { from: 17000, to: Infinity, rate: 0.28 }
    ],
    ni: { rate: 0.10, annualCap: 3740 }
  },
  malta: {
    note: 'Malta single-person income tax — est. Source: Malta Commissioner for Revenue 2026.',
    personalAllowance: 0,
    brackets: [
      { from: 0,     to: 9100,     rate: 0    },
      { from: 9100,  to: 14500,    rate: 0.15 },
      { from: 14500, to: 19500,    rate: 0.25 },
      { from: 19500, to: Infinity, rate: 0.35 }
    ],
    ni: { rate: 0.10, annualCap: 2493 }
  }
};

function calcNetSalary(gross, market) {
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
    director:           { director: 'typical', seniorDirector: 'estimated', cLevel: 'estimated' }
  },
  malta: {
    customerSupport:    { entry: 'typical', mid: 'typical',   senior: 'estimated'  },
    productManager:     { junior: 'estimated', mid: 'typical', senior: 'estimated', director: 'estimated' },
    compliance:         { officer: 'typical', manager: 'typical', seniorManager: 'estimated', director: 'estimated' },
    marketingAffiliate: { executive: 'typical', manager: 'typical', senior: 'estimated', head: 'estimated', director: 'estimated' },
    crmVipOps:          { coordinator: 'typical', vipManager: 'typical', crmManager: 'typical', seniorVip: 'estimated', director: 'estimated' },
    director:           { director: 'estimated', seniorDirector: 'estimated', cLevel: 'estimated' }
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
  return salaryData.operators[state.operator].multipliers[market];
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
    const mult = salaryData.operators[state.operator].multipliers[mkt];
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
function updateKPIs() {
  const entries = getFilteredEntries();
  if (entries.length === 0) return;

  const avgMid = entries.reduce((sum, e) => sum + e.mid, 0) / entries.length;
  const avgComp = calcTotalComp(avgMid);
  const allMin = Math.min(...entries.map(e => e.min));
  const allMax = Math.max(...entries.map(e => e.max));

  document.getElementById('kpi-avg-base').textContent = formatMoney(avgMid);
  document.getElementById('kpi-avg-total').textContent = formatMoney(avgComp.total);

  const roleLabel = state.role === 'all' ? 'All roles' : getMarket().roles[state.role].label;
  const opLabel = state.operator === 'all' ? 'all operators' : salaryData.operators[state.operator].label;
  document.getElementById('kpi-avg-base-sub').textContent = roleLabel + ', ' + opLabel;
  document.getElementById('kpi-avg-total-sub').textContent = roleLabel + ', ' + opLabel;

  document.getElementById('kpi-range').textContent = formatMoneyk(allMin) + ' \u2013 ' + formatMoneyk(allMax);
  const minEntry = entries.reduce((a, b) => a.min < b.min ? a : b);
  const maxEntry = entries.reduce((a, b) => a.max > b.max ? a : b);
  document.getElementById('kpi-range-sub').textContent = minEntry.levelLabel + ' to ' + maxEntry.levelLabel;

  const bestOperator = getBestOperator();
  document.getElementById('kpi-best').textContent = bestOperator.label;
  document.getElementById('kpi-best-sub').textContent = '+' + Math.round((bestOperator.multiplier - 1) * 100) + '% vs market avg';
}

function getBestOperator() {
  let best = { label: '\u2014', multiplier: 1 };
  Object.entries(salaryData.operators).forEach(([key, op]) => {
    const mult = op.multipliers[state.market];
    if (mult > best.multiplier) {
      best = { label: op.label, multiplier: mult };
    }
  });
  return best;
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
function renderComparisonCards() {
  const grid = document.getElementById('comparison-grid');
  grid.innerHTML = '';

  Object.entries(salaryData.operators).forEach(([opKey, op]) => {
    let roleKeys = state.role === 'all' ? Object.keys(getMarket().roles) : [state.role];
    let avgMid = 0;
    let count = 0;

    roleKeys.forEach(roleKey => {
      const role = salaryData.markets[state.market].roles[roleKey];
      Object.values(role.levels).forEach(level => {
        avgMid += level.mid * op.multipliers[state.market];
        count++;
      });
    });
    avgMid = avgMid / count;

    const comp = calcTotalComp(avgMid);
    const card = document.createElement('div');
    card.className = 'comparison-card';
    card.setAttribute('data-testid', 'comparison-card-' + opKey);

    const mult = op.multipliers[state.market];
    const multiplierBadge = mult >= 1
      ? '+' + Math.round((mult - 1) * 100) + '% base'
      : Math.round((mult - 1) * 100) + '% base';

    card.innerHTML = `
      <div class="comparison-header">
        <span class="comparison-operator-name">${op.label}</span>
        <span class="comparison-multiplier">${multiplierBadge}</span>
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
  const btn = document.getElementById('btn-refresh-data');
  const status = document.getElementById('refresh-status');

  btn.classList.add('refreshing');
  btn.disabled = true;
  btn.textContent = 'Checking...';
  status.textContent = 'Verifying local dataset against last collected sources...';

  setTimeout(() => {
    salaryData.lastUpdated = new Date().toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    // Calculate next Monday
    const nextMon = new Date();
    const day = nextMon.getDay();
    const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
    nextMon.setDate(nextMon.getDate() + daysUntilMonday);
    salaryData.nextScheduledUpdate = nextMon.toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    document.getElementById('badge-last-updated').textContent = 'Updated ' + salaryData.lastUpdated;

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
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  renderAll();
  loadOpenRoles();
});
