import { generateTimeSeries, generateDualTimeSeries, ts, tsDays, randomIP, r } from '../mockHelpers'

const osList = ['Windows Server 2022', 'Windows Server 2019', 'Ubuntu 22.04', 'CentOS 7', 'RHEL 8', 'Windows 11']
const assetTypes = ['Web Server', 'Database', 'Workstation', 'Network Device', 'File Server', 'Load Balancer']

const products = [
  'Fortinet FortiOS', 'Palo Alto PAN-OS', 'VMware vCenter',
  'Microsoft Exchange', 'Apache Log4j', 'OpenSSL', 'Cisco IOS XE',
  'Ivanti Connect Secure', 'MOVEit Transfer', 'ConnectWise ScreenConnect',
]
const severityList: Array<'Critical' | 'High' | 'Medium' | 'Low'> = [
  'Critical', 'High', 'High', 'Medium', 'Medium', 'Medium', 'Low', 'Low',
]
const cveStatusList = ['Active', 'Patched', 'Mitigated', 'Accepted', 'Active', 'Active', 'Patched']

const scanTargets = [
  'prod-web-cluster', 'db-servers', 'corp-workstations', 'dmz-segment',
  'cloud-assets', 'iot-devices', 'vpn-gateways', 'dev-environment',
]
const scanTypeList = ['Full Scan', 'Quick Scan', 'Web App', 'Network', 'Authenticated']
const scanStatusList = ['Completed', 'Completed', 'Completed', 'In Progress', 'Failed', 'Completed', 'Scheduled']

const reportTypes = [
  'Executive Summary', 'Vulnerability Detail', 'Asset Risk',
  'Compliance', 'Remediation Status', 'CVE Exposure', 'Patch Compliance',
]
const schedules  = ['Daily', 'Weekly', 'Monthly', 'On Demand', 'Weekly', 'Monthly']
const formats: Array<'PDF' | 'CSV' | 'HTML' | 'JSON'>  = ['PDF', 'CSV', 'HTML', 'JSON', 'PDF', 'CSV']
const reportStatuses: Array<'Ready' | 'Running' | 'Scheduled' | 'Failed'> = ['Ready', 'Ready', 'Running', 'Scheduled', 'Failed', 'Ready']

// ── Shared blocks ────────────────────────────────────────────────

const topCVEs = [
  { cveId: 'CVE-2024-21762', score: 9.8,  severity: 'Critical' as const, affected: 34, product: 'Fortinet FortiOS',            published: tsDays(45), status: 'Active' },
  { cveId: 'CVE-2024-3400',  score: 10.0, severity: 'Critical' as const, affected: 12, product: 'Palo Alto PAN-OS',             published: tsDays(62), status: 'Mitigated' },
  { cveId: 'CVE-2024-1709',  score: 10.0, severity: 'Critical' as const, affected: 28, product: 'ConnectWise ScreenConnect',    published: tsDays(30), status: 'Active' },
  { cveId: 'CVE-2024-4577',  score: 9.8,  severity: 'Critical' as const, affected: 19, product: 'PHP CGI Argument Injection',   published: tsDays(55), status: 'Active' },
  { cveId: 'CVE-2024-22024', score: 9.1,  severity: 'Critical' as const, affected: 8,  product: 'Ivanti Connect Secure',        published: tsDays(78), status: 'Patched' },
  { cveId: 'CVE-2024-20767', score: 8.4,  severity: 'High' as const,     affected: 22, product: 'Adobe ColdFusion',             published: tsDays(35), status: 'Active' },
  { cveId: 'CVE-2024-27198', score: 8.3,  severity: 'High' as const,     affected: 17, product: 'JetBrains TeamCity',           published: tsDays(48), status: 'Patched' },
  { cveId: 'CVE-2024-21893', score: 8.2,  severity: 'High' as const,     affected: 11, product: 'Ivanti Connect Secure',        published: tsDays(60), status: 'Mitigated' },
  { cveId: 'CVE-2024-28995', score: 8.6,  severity: 'High' as const,     affected: 9,  product: 'SolarWinds Serv-U',            published: tsDays(22), status: 'Active' },
  { cveId: 'CVE-2024-38080', score: 7.8,  severity: 'High' as const,     affected: 31, product: 'Microsoft Windows Hyper-V',    published: tsDays(15), status: 'Active' },
  ...Array.from({ length: 12 }, (_, i) => ({
    cveId:     `CVE-2024-${10000 + i * 317}`,
    score:     Number((4 + Math.random() * 3).toFixed(1)),
    severity:  severityList[(i + 3) % severityList.length],
    affected:  r(1, 45),
    product:   products[i % products.length],
    published: tsDays(r(5, 120)),
    status:    cveStatusList[i % cveStatusList.length],
  })),
]

const assets = Array.from({ length: 20 }, (_, i) => {
  const critical = r(0, 6)
  const high     = r(0, 25)
  const medium   = r(5, 60)
  const score    = Math.min(100, Math.round(critical * 18 + high * 4 + medium * 0.5 + r(10, 30)))
  return {
    asset:       `asset-${String(i + 1).padStart(3, '0')}`,
    ip:          randomIP(),
    type:        assetTypes[i % assetTypes.length],
    os:          osList[i % osList.length],
    critical,
    high,
    medium,
    riskScore:   score,
    band:        score >= 80 ? 'Critical' : score >= 60 ? 'High' : score >= 40 ? 'Medium' : 'Low',
    lastScanned: tsDays(r(0, 7)),
  }
})

const scans = Array.from({ length: 18 }, (_, i) => ({
  id:       `SCN-${String(1024 + i).padStart(4, '0')}`,
  target:   scanTargets[i % scanTargets.length],
  type:     scanTypeList[i % scanTypeList.length],
  status:   scanStatusList[i % scanStatusList.length],
  started:  i < 5 ? ts(i * 4 + 1) : tsDays(Math.floor(i / 2)),
  duration: `${r(8, 240)}m`,
  critical: r(0, 5),
  high:     r(0, 25),
  medium:   r(5, 80),
  low:      r(10, 200),
}))

const reports = Array.from({ length: 16 }, (_, i) => ({
  id:       `RPT-${String(800 + i).padStart(4, '0')}`,
  name:     `${reportTypes[i % reportTypes.length]} — ${['Q1', 'Q2', 'Weekly', 'Monthly', 'Ad-hoc'][i % 5]} ${2024 + Math.floor(i / 8)}`,
  type:     reportTypes[i % reportTypes.length],
  schedule: schedules[i % schedules.length],
  lastRun:  tsDays(r(0, 14)),
  nextRun:  tsDays(-(r(1, 14))),
  format:   formats[i % formats.length],
  status:   reportStatuses[i % reportStatuses.length],
  pages:    r(4, 48),
}))

const riskBands = [
  { label: 'Critical (80–100)', count: assets.filter(a => a.band === 'Critical').length, color: '#EF4444' },
  { label: 'High (60–79)',      count: assets.filter(a => a.band === 'High').length,     color: '#F97316' },
  { label: 'Medium (40–59)',    count: assets.filter(a => a.band === 'Medium').length,   color: '#EAB308' },
  { label: 'Low (0–39)',        count: assets.filter(a => a.band === 'Low').length,      color: '#22C55E' },
]

export const outpost24Dashboard = {
  // Main Dashboard
  kpis: {
    totalVulns: { value: '3,847', trend: -124, label: 'Total Vulnerabilities' },
    criticalCVEs: { value: 23, trend: -4, label: 'Critical CVEs' },
    avgCVSS: { value: '6.8', trend: -0.3, label: 'Avg CVSS Score' },
    assetsScanned: { value: 847, trend: 12, label: 'Assets Scanned' },
    remediated7d: { value: 156, trend: 34, label: 'Remediated (7d)' },
    patchCompliance: { value: '76.4%', trend: 2.1, label: 'Patch Compliance' },
  },
  vulnTrend: generateDualTimeSeries(30, 3800, 156, 200, 24 * 60 / 30),
  cvssDistribution: [
    { range: '9.0–10.0', label: 'Critical', count: 23, color: '#EF4444' },
    { range: '7.0–8.9', label: 'High', count: 187, color: '#F97316' },
    { range: '4.0–6.9', label: 'Medium', count: 1423, color: '#EAB308' },
    { range: '0.1–3.9', label: 'Low', count: 2214, color: '#22C55E' },
  ],
  topCVEs,
  assetRiskRankings: assets,

  // Scan Results page
  scanKpis: {
    scansToday:    { value: 7,       trend: 2,   label: 'Scans Today' },
    avgDuration:   { value: '42m',   trend: -5,  label: 'Avg Duration' },
    totalFindings: { value: '1,284', trend: -89, label: 'Total Findings' },
    openFindings:  { value: 847,     trend: -34, label: 'Open Findings' },
  },
  scans,
  findingsTrend: generateTimeSeries(14, 120, 40),
  scansByType: [
    { label: 'Full Scan',  count: 14 },
    { label: 'Quick Scan', count: 31 },
    { label: 'Web App',    count: 8  },
    { label: 'Network',    count: 19 },
    { label: 'Auth',       count: 11 },
  ],

  // CVE Analysis page
  cveKpis: {
    totalCVEs:     { value: '3,847', trend: -124, label: 'Total CVEs Tracked' },
    criticalCVEs2: { value: 23,      trend: -4,   label: 'Critical CVEs' },
    patchedCVEs:   { value: 312,     trend: 87,   label: 'CVEs Patched (30d)' },
    affectedAssets: { value: 847,    trend: 12,   label: 'Affected Assets' },
  },
  cves: topCVEs,
  severityPie: [
    { name: 'Critical', value: 23,   color: '#EF4444' },
    { name: 'High',     value: 187,  color: '#F97316' },
    { name: 'Medium',   value: 1423, color: '#EAB308' },
    { name: 'Low',      value: 2214, color: '#22C55E' },
  ],
  topAffectedProducts: [
    { label: 'Fortinet FortiOS',   count: 34 },
    { label: 'MS Windows Hyper-V', count: 31 },
    { label: 'ConnectWise',        count: 28 },
    { label: 'PHP CGI',            count: 19 },
    { label: 'JetBrains TeamCity', count: 17 },
    { label: 'Adobe ColdFusion',   count: 14 },
  ],

  // Risk Scoring page
  riskKpis: {
    assetsScored:   { value: assets.length,                                    trend: 3,   label: 'Assets Scored' },
    avgRiskScore:   { value: Math.round(assets.reduce((s, a) => s + a.riskScore, 0) / assets.length), trend: -2, label: 'Avg Risk Score' },
    criticalAssets: { value: assets.filter(a => a.band === 'Critical').length, trend: -1,  label: 'Critical Assets' },
    scoreImproved:  { value: '76.4%',                                          trend: 2.1, label: 'Score Improved' },
  },
  riskTrend: generateTimeSeries(30, 62, 8, 24 * 60 / 30),
  riskBands,

  // Reports page
  reportKpis: {
    totalReports:  { value: reports.length,                                    trend: 3,  label: 'Total Reports' },
    readyExport:   { value: reports.filter(rp => rp.status === 'Ready').length,   trend: 2,  label: 'Ready to Export' },
    scheduled:     { value: reports.filter(rp => rp.status === 'Scheduled').length, trend: 0, label: 'Scheduled' },
    generated30d:  { value: 47,                                                 trend: 12, label: 'Generated (30d)' },
  },
  reports,
  reportVolume: [
    { label: 'Sep',  count: 12 },
    { label: 'Oct',  count: 15 },
    { label: 'Nov',  count: 11 },
    { label: 'Dec',  count: 9  },
    { label: 'Jan',  count: 18 },
    { label: 'Feb',  count: 21 },
  ],
  reportsByType: reportTypes.map((t, i) => ({ label: t.split(' ')[0], count: r(3, 12) + i })),
}

export type OutpostAsset = typeof outpost24Dashboard.assetRiskRankings[number]
export type OutpostScan  = typeof outpost24Dashboard.scans[number]
export type OutpostCVE   = typeof outpost24Dashboard.cves[number]
export type OutpostReport = typeof outpost24Dashboard.reports[number]
