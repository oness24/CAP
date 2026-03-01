import { generateTimeSeries, ts, r } from '../mockHelpers'

const departments = ['Engineering', 'Finance', 'HR', 'Sales', 'Legal', 'Marketing', 'IT']
const classifications = ['PII', 'Financial', 'Intellectual Property', 'Health Data', 'Confidential']
const channels = ['Email', 'USB/Removable', 'Cloud Upload', 'Print', 'Clipboard']
const actions = ['Blocked', 'Warned', 'Allowed (Logged)']

export const safeticaDashboard = {
  kpis: {
    dataTransfers: { value: '12,483', trend: 340, label: 'Transfers (24h)' },
    blockedTransfers: { value: 28, trend: 6, label: 'Blocked' },
    policyViolations: { value: 14, trend: -2, label: 'Violations' },
    usersAtRisk: { value: 9, trend: 3, label: 'Users at Risk' },
    sensitiveFiles: { value: 67, trend: 12, label: 'Sensitive Files Moved' },
    dlpCoverage: { value: '99.1%', trend: 0, label: 'DLP Coverage' },
  },
  transferTrend: generateTimeSeries(24, 520, 200),
  channelBreakdown: [
    { name: 'Email', value: 4820, color: '#0D9488' },
    { name: 'USB/Removable', value: 1240, color: '#14B8A6' },
    { name: 'Cloud Upload', value: 3890, color: '#0F766E' },
    { name: 'Print', value: 2533, color: '#134E4A' },
  ],
  violationsByType: [
    { type: 'PII Transfer', count: 34 },
    { type: 'Financial Data', count: 28 },
    { type: 'IP / Source Code', count: 19 },
    { type: 'Health Records', count: 12 },
    { type: 'Confidential Docs', count: 8 },
  ],
  recentViolations: Array.from({ length: 10 }, (_, i) => ({
    id: `VIO-2024-${1000 + i}`,
    user: `user${r(100, 999)}@corp.com`,
    department: departments[r(0, departments.length - 1)],
    channel: channels[r(0, channels.length - 1)],
    classification: classifications[r(0, classifications.length - 1)],
    action: actions[r(0, actions.length - 1)],
    riskScore: r(40, 95),
    timestamp: ts(r(1, 24)),
  })),
}

export type SafeticaViolation = typeof safeticaDashboard.recentViolations[number]
