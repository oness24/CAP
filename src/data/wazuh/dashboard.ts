import { generateTimeSeries, ts, hostname, r, randomIP } from '../mockHelpers'

export const wazuhDashboard = {
  kpis: {
    totalAgents: { value: 312, trend: 5, label: 'Total Agents' },
    activeAlerts: { value: '1,482', trend: 234, label: 'Alerts (24h)' },
    criticalEvents: { value: 18, trend: -3, label: 'Critical Events' },
    complianceScore: { value: '94.2%', trend: 1.1, label: 'PCI-DSS Score' },
    agentsOnline: { value: '298/312', trend: 0, label: 'Agents Online' },
    rulesTriggered: { value: 47, trend: 8, label: 'Rules Triggered' },
  },
  alertTrend: generateTimeSeries(24, 62, 40),
  topRules: [
    { ruleId: '5712', description: 'SSHD: Attempt to login using a denied user', count: 847, level: 'High' },
    { ruleId: '31101', description: 'Web attack: SQL injection attempt', count: 423, level: 'High' },
    { ruleId: '5710', description: 'SSHD: Attempt to login using non-existent user', count: 312, level: 'Medium' },
    { ruleId: '1002', description: 'Unknown problem somewhere in the system', count: 287, level: 'Medium' },
    { ruleId: '2932', description: 'Shellshock attack detected', count: 156, level: 'Critical' },
    { ruleId: '18149', description: 'Suricata: Alert - Emerging Threats', count: 134, level: 'High' },
    { ruleId: '87104', description: 'VirusTotal: Alert - Known malware hash', count: 98, level: 'Critical' },
  ],
  complianceBreakdown: [
    { framework: 'PCI-DSS', score: 94 },
    { framework: 'GDPR', score: 88 },
    { framework: 'HIPAA', score: 91 },
    { framework: 'NIST', score: 85 },
    { framework: 'ISO 27001', score: 89 },
  ],
  agentsByOS: [
    { os: 'Ubuntu 22.04', count: 124 },
    { os: 'Windows Server 2022', count: 87 },
    { os: 'CentOS 7', count: 56 },
    { os: 'Windows 10', count: 45 },
  ],
  recentAlerts: [
    { id: `ALT-${r(10000,99999)}`, rule: '5712', description: 'SSHD login denied', agent: hostname('srv', r(1,50)), ip: randomIP(), level: 'High', tactic: 'Credential Access', timestamp: ts(0.1) },
    { id: `ALT-${r(10000,99999)}`, rule: '31101', description: 'SQL injection attempt', agent: hostname('web', r(1,20)), ip: randomIP(), level: 'High', tactic: 'Initial Access', timestamp: ts(0.3) },
    { id: `ALT-${r(10000,99999)}`, rule: '2932', description: 'Shellshock detected', agent: hostname('srv', r(1,50)), ip: randomIP(), level: 'Critical', tactic: 'Execution', timestamp: ts(0.5) },
    { id: `ALT-${r(10000,99999)}`, rule: '5710', description: 'SSH non-existent user', agent: hostname('srv', r(1,50)), ip: randomIP(), level: 'Medium', tactic: 'Discovery', timestamp: ts(1) },
    { id: `ALT-${r(10000,99999)}`, rule: '87104', description: 'Malware hash detected', agent: hostname('wkstn', r(1,100)), ip: randomIP(), level: 'Critical', tactic: 'Execution', timestamp: ts(1.5) },
    { id: `ALT-${r(10000,99999)}`, rule: '18149', description: 'Suricata ET alert', agent: hostname('fw', r(1,10)), ip: randomIP(), level: 'High', tactic: 'Lateral Movement', timestamp: ts(2) },
    { id: `ALT-${r(10000,99999)}`, rule: '1002', description: 'System error detected', agent: hostname('srv', r(1,50)), ip: randomIP(), level: 'Medium', tactic: 'Impact', timestamp: ts(2.5) },
    { id: `ALT-${r(10000,99999)}`, rule: '5712', description: 'SSHD login denied', agent: hostname('srv', r(1,50)), ip: randomIP(), level: 'High', tactic: 'Credential Access', timestamp: ts(3) },
  ],
}

export type WazuhAlert = typeof wazuhDashboard.recentAlerts[number]
