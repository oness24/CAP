import { generateTimeSeries, ts, r } from '../mockHelpers'

const departments = ['Engineering', 'Finance', 'HR', 'Sales', 'Legal', 'Marketing', 'IT', 'Operations']
const mfaStatuses = ['Enabled', 'Disabled', 'Enforced']

export const keeperDashboard = {
  kpis: {
    securityScore: { value: 82, trend: 3, label: 'Org Security Score' },
    totalUsers: { value: 487, trend: 8, label: 'Total Users' },
    weakPasswords: { value: 143, trend: -12, label: 'Weak Passwords' },
    breachedPasswords: { value: 7, trend: -2, label: 'Breached Detected' },
    mfaAdoption: { value: '91.4%', trend: 2.3, label: 'MFA Adoption' },
    policyCompliance: { value: '88.2%', trend: 1.1, label: 'Policy Compliance' },
  },
  scoreHistory: generateTimeSeries(30, 79, 5, 24 * 60),
  passwordStrength: [
    { name: 'Strong', value: 8920, color: '#22C55E' },
    { name: 'Fair', value: 2340, color: '#EAB308' },
    { name: 'Weak', value: 143, color: '#F97316' },
    { name: 'Reused', value: 412, color: '#EF4444' },
  ],
  deptRiskScores: departments.map((dept) => ({
    dept,
    score: r(60, 97),
    users: r(20, 150),
  })),
  highRiskUsers: Array.from({ length: 10 }, (_, i) => ({
    id: `USR-${1000 + i}`,
    user: `user${r(100, 999)}@corp.com`,
    department: departments[r(0, departments.length - 1)],
    weakCount: r(2, 25),
    reusedCount: r(0, 15),
    lastLogin: ts(r(1, 72)),
    mfaStatus: mfaStatuses[r(0, 2)],
    riskScore: r(55, 95),
  })),
}

export type KeeperUser = typeof keeperDashboard.highRiskUsers[number]
