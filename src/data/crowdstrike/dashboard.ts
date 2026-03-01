import { generateTimeSeries, generateDualTimeSeries, ts, hostname, r } from '../mockHelpers'

export const crowdstrikeDashboard = {
  kpis: {
    totalEndpoints: { value: '2,847', trend: 12, label: 'Total Endpoints' },
    activeDetections: { value: 34, trend: -8, label: 'Active Detections' },
    openIncidents: { value: 7, trend: 2, label: 'Open Incidents' },
    protectionCoverage: { value: '98.6%', trend: 0.4, label: 'Coverage' },
    criticalAlerts: { value: 3, trend: -1, label: 'Critical Alerts' },
    mttr: { value: '4.2m', trend: -0.8, label: 'Avg MTTR' },
  },
  detectionTrend: generateTimeSeries(24, 14, 10),
  incidentTrend: generateDualTimeSeries(30, 4, 2, 3, 24 * 60 / 30),
  severityBreakdown: [
    { name: 'Critical', value: 3, color: '#EF4444' },
    { name: 'High', value: 12, color: '#F97316' },
    { name: 'Medium', value: 19, color: '#EAB308' },
    { name: 'Low', value: 28, color: '#22C55E' },
  ],
  endpointsByOS: [
    { os: 'Windows', count: 435 },
    { os: 'macOS',   count: 2 },
    { os: 'Linux',   count: 16 },
  ],
  endpointsByType: [
    { type: 'Workstation', count: 397 },
    { type: 'Server',      count: 56 },
    { type: 'DC',          count: 0 },
  ],
  recentDetections: [
    { id: 'DET-2024-0891', hostname: hostname('CORP-WKSTN', r(1,300)), technique: 'T1055 — Process Injection', severity: 'Critical', status: 'Investigating', timestamp: ts(1), analyst: 'J. Chen' },
    { id: 'DET-2024-0890', hostname: hostname('CORP-WKSTN', r(1,300)), technique: 'T1003 — Credential Dumping', severity: 'High', status: 'Investigating', timestamp: ts(2), analyst: 'A. Patel' },
    { id: 'DET-2024-0889', hostname: hostname('CORP-SRV', r(1,50)), technique: 'T1059 — Command & Script', severity: 'High', status: 'Resolved', timestamp: ts(3), analyst: 'M. Kim' },
    { id: 'DET-2024-0888', hostname: hostname('CORP-WKSTN', r(1,300)), technique: 'T1486 — Data Encryption', severity: 'Critical', status: 'Investigating', timestamp: ts(4), analyst: 'J. Chen' },
    { id: 'DET-2024-0887', hostname: hostname('CORP-WKSTN', r(1,300)), technique: 'T1566 — Phishing', severity: 'Medium', status: 'Resolved', timestamp: ts(6), analyst: 'R. Torres' },
    { id: 'DET-2024-0886', hostname: hostname('CORP-SRV', r(1,50)), technique: 'T1071 — C2 Communication', severity: 'High', status: 'Investigating', timestamp: ts(8), analyst: 'A. Patel' },
    { id: 'DET-2024-0885', hostname: hostname('CORP-WKSTN', r(1,300)), technique: 'T1078 — Valid Accounts', severity: 'Medium', status: 'Resolved', timestamp: ts(10), analyst: 'M. Kim' },
    { id: 'DET-2024-0884', hostname: hostname('CORP-WKSTN', r(1,300)), technique: 'T1547 — Boot Persistence', severity: 'Low', status: 'Resolved', timestamp: ts(12), analyst: 'R. Torres' },
    { id: 'DET-2024-0883', hostname: hostname('CORP-SRV', r(1,50)), technique: 'T1021 — Remote Services', severity: 'Medium', status: 'Resolved', timestamp: ts(14), analyst: 'J. Chen' },
    { id: 'DET-2024-0882', hostname: hostname('CORP-WKSTN', r(1,300)), technique: 'T1110 — Brute Force', severity: 'Low', status: 'Resolved', timestamp: ts(16), analyst: 'A. Patel' },
  ],
}

export type CrowdStrikeDetection = typeof crowdstrikeDashboard.recentDetections[number]
