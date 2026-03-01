import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import type { PlatformId } from '@/types'

export interface WeeklyMetric {
  label: string
  value: string
  delta: string        // e.g. "+12%" or "-3"
  direction: 'up' | 'down' | 'flat'
  positive: boolean    // is the direction desirable? (down in incidents = positive)
}

export type RiskRating = 'Critical' | 'Elevated' | 'Moderate' | 'Stable' | 'Improving'

export interface PlatformWeeklyReport {
  platformLabel: string
  riskRating: RiskRating
  headline: string           // One-sentence strategic headline for the week
  narrative: string          // 2–3 sentence executive prose
  metrics: WeeklyMetric[]    // 4 headline stats shown inline
  incidentRows: IncidentRow[]
  recommendations: string[]
  preparedBy: string
  reviewedBy: string
}

export interface IncidentRow {
  ref: string
  date: string
  category: string
  description: string
  severity: string
  status: string
  owner: string
}

// ── Date helpers ─────────────────────────────────────────────────────────────

export function getWeekRange(weeksBack = 0): { start: Date; end: Date; label: string } {
  const base = weeksBack === 0 ? new Date() : subWeeks(new Date(), weeksBack)
  const start = startOfWeek(base, { weekStartsOn: 1 }) // Monday
  const end = endOfWeek(base, { weekStartsOn: 1 })     // Sunday
  const label = `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
  return { start, end, label }
}

// ── Risk rating helpers ───────────────────────────────────────────────────────

const ratingColors: Record<RiskRating, { bg: string; text: string; border: string }> = {
  Critical:  { bg: 'rgba(239,68,68,0.12)',  text: '#EF4444', border: 'rgba(239,68,68,0.3)' },
  Elevated:  { bg: 'rgba(249,115,22,0.12)', text: '#F97316', border: 'rgba(249,115,22,0.3)' },
  Moderate:  { bg: 'rgba(234,179,8,0.12)',  text: '#EAB308', border: 'rgba(234,179,8,0.3)' },
  Stable:    { bg: 'rgba(34,197,94,0.12)',  text: '#22C55E', border: 'rgba(34,197,94,0.3)' },
  Improving: { bg: 'rgba(34,197,94,0.15)',  text: '#4ADE80', border: 'rgba(74,222,128,0.35)' },
}

export function getRatingStyle(rating: RiskRating) {
  return ratingColors[rating]
}

// ── Per-platform weekly reports ───────────────────────────────────────────────

const REPORTS: Record<PlatformId, PlatformWeeklyReport> = {

  crowdstrike: {
    platformLabel: 'CrowdStrike · Deteção e Resposta de Endpoint — Club Paulistano',
    riskRating: 'Stable',
    headline: 'A postura de segurança dos endpoints manteve-se robusta; o volume de incidentes críticos diminuiu 19% face à semana anterior.',
    narrative:
      'Esta semana, o Club Paulistano manteve uma proteção robusta dos endpoints em 2.847 ativos geridos, com o desempenho de resposta a deteções a operar dentro dos parâmetros de SLA estabelecidos pela Contego Security. ' +
      'A equipa SOC registou 34 deteções ativas e resolveu com sucesso 6 incidentes escalados, com 1 incidente ainda em investigação ativa, alcançando um tempo médio de resposta de 4,2 minutos — uma melhoria de 16% face ao período anterior. ' +
      'Três ameaças de severidade crítica relacionadas com injeção de processos e extração de credenciais foram totalmente contidas; não foi confirmado movimento lateral nem exfiltração de dados. ' +
      'A postura de risco dos endpoints é classificada como Estável, com uma trajetória de melhoria contínua apoiada por uma cobertura de aplicação de políticas de 98,6% em toda a frota gerida.',
    metrics: [
      { label: 'Incidentes Resolvidos',      value: '6',     delta: '1 em aberto',            direction: 'up',   positive: true },
      { label: 'Incidentes em Aberto',       value: '1',     delta: '–3 vs. semana anterior', direction: 'down', positive: true },
      { label: 'Tempo Médio de Resposta',    value: '4,2m',  delta: '–16%',                   direction: 'down', positive: true },
      { label: 'Cobertura de Endpoints',     value: '98,6%', delta: '+0,4pp',                 direction: 'up',   positive: true },
    ],
    recommendations: [
      'Acelerar a implementação da política de prevenção atualizada nos 1,4% de endpoints ainda sem proteção até ao final da próxima semana útil.',
      'Realizar uma revisão pós-incidente para os três eventos de contenção de severidade crítica, de forma a validar a lógica de deteção e atualizar os runbooks operacionais.',
      'Avaliar a expansão da cobertura de análise comportamental para os endpoints macOS, que atualmente representam 10% da frota gerida sem política de prevenção completa.',
    ],
    incidentRows: [
      { ref: 'INC-2024-0891', date: format(subWeeks(new Date(), 0), 'dd/MM'), category: 'Malware', description: 'Injeção de processos detetada em endpoint CORP-WKSTN', severity: 'Critical', status: 'Resolvido', owner: 'Contego SOC' },
      { ref: 'INC-2024-0890', date: format(subWeeks(new Date(), 0), 'dd/MM'), category: 'Roubo de Credenciais', description: 'Tentativa de extração de credenciais via LSASS', severity: 'Critical', status: 'Resolvido', owner: 'Contego SOC' },
      { ref: 'INC-2024-0889', date: format(subWeeks(new Date(), 0), 'dd/MM'), category: 'Execução', description: 'Execução suspeita de script PowerShell detetada', severity: 'High', status: 'Resolvido', owner: 'Contego SOC' },
      { ref: 'INC-2024-0888', date: format(subWeeks(new Date(), 0), 'dd/MM'), category: 'Ransomware', description: 'Tentativa de encriptação de ficheiros detetada e bloqueada', severity: 'Critical', status: 'Resolvido', owner: 'Contego SOC' },
      { ref: 'INC-2024-0887', date: format(subWeeks(new Date(), 0), 'dd/MM'), category: 'Phishing', description: 'Entrega de payload via phishing direcionado bloqueada', severity: 'Medium', status: 'Resolvido', owner: 'Contego SOC' },
      { ref: 'INC-2024-0886', date: format(subWeeks(new Date(), 0), 'dd/MM'), category: 'Comunicação C2', description: 'Beacon C2 não autorizado para o exterior detetado', severity: 'High', status: 'A Investigar', owner: 'Contego SOC' },
      { ref: 'INC-2024-0885', date: format(subWeeks(new Date(), 0), 'dd/MM'), category: 'Persistência', description: 'Conta não autorizada com credenciais válidas identificada', severity: 'Medium', status: 'Resolvido', owner: 'Contego SOC' },
    ],
    preparedBy: 'Contego Security — Operações SOC',
    reviewedBy: 'Diretor de Segurança da Informação — Club Paulistano',
  },

  wazuh: {
    platformLabel: 'Wazuh · Security Information & Event Management',
    riskRating: 'Moderate',
    headline: 'Alert volume elevated 19% week-over-week; compliance frameworks maintained above threshold across all standards.',
    narrative:
      'The SIEM platform processed 1,482 security alerts this week across 312 monitored agents, representing a 19% increase in event volume versus the prior period, driven primarily by elevated SSH brute-force activity originating from external IP ranges. ' +
      'Critical event count declined by 3 incidents to 18, indicating effective upstream blocking measures. ' +
      'Compliance posture remains strong, with PCI-DSS coverage at 94.2% and all five monitored frameworks scoring above the 85% target threshold. ' +
      'Risk rating is assessed at Moderate; the increase in authentication-based attack attempts warrants continued monitoring and potential geo-blocking policy review.',
    metrics: [
      { label: 'Security Alerts',    value: '1,482', delta: '+19% volume',    direction: 'up',   positive: false },
      { label: 'Critical Events',    value: '18',    delta: '–3 vs prior',    direction: 'down', positive: true },
      { label: 'PCI-DSS Compliance', value: '94.2%', delta: '+1.1pp',         direction: 'up',   positive: true },
      { label: 'Agents Online',      value: '298',   delta: '95.5% of fleet', direction: 'flat', positive: true },
    ],
    recommendations: [
      'Implement geo-based IP blocking rules for SSH traffic originating from high-risk regions to reduce authentication noise.',
      'Investigate 14 agents currently reporting offline status and restore full coverage within 48 hours.',
      'Review and consolidate the 47 triggered detection rules to eliminate duplicative alerting and reduce analyst fatigue.',
    ],
    incidentRows: [
      { ref: 'EVT-5712-001', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Authentication', description: 'Sustained SSH brute-force campaign — 847 attempts', severity: 'High', status: 'Monitoring', owner: 'L. Ahmed' },
      { ref: 'EVT-31101-001', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Web Attack', description: 'SQL injection attempts against web application tier', severity: 'High', status: 'Blocked', owner: 'S. Tanaka' },
      { ref: 'EVT-2932-001', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Exploitation', description: 'Shellshock exploitation attempt on legacy web server', severity: 'Critical', status: 'Contained', owner: 'L. Ahmed' },
      { ref: 'EVT-87104-001', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Malware', description: 'Known malware hash identified on workstation asset', severity: 'Critical', status: 'Quarantined', owner: 'P. Osei' },
      { ref: 'EVT-18149-001', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Network Intrusion', description: 'Suricata IDS: Emerging threat signature match on perimeter', severity: 'High', status: 'Investigating', owner: 'S. Tanaka' },
      { ref: 'EVT-5710-001', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Reconnaissance', description: 'Repeated login attempts with non-existent usernames', severity: 'Medium', status: 'Monitoring', owner: 'P. Osei' },
    ],
    preparedBy: 'SOC Operations — SIEM Team',
    reviewedBy: 'Chief Information Security Officer',
  },

  safetica: {
    platformLabel: 'Safetica · Data Loss Prevention',
    riskRating: 'Elevated',
    headline: 'DLP engine blocked 28 unauthorized transfers; 9 high-risk users identified requiring immediate review.',
    narrative:
      'The organization\'s data loss prevention platform monitored 12,483 outbound data transfer events this week, successfully blocking 28 policy violations before exfiltration could occur. ' +
      'Nine users have been flagged as high-risk based on repeated sensitive data movement patterns across unapproved channels, including USB removable media and personal cloud storage uploads. ' +
      'Fourteen policy violations were formally logged, representing a 2-event improvement over the prior period; however, the volume of sensitive file movements involving PII and financial data remains above acceptable baseline thresholds. ' +
      'Risk posture is rated Elevated and immediate review of flagged user accounts is recommended to the CISO.',
    metrics: [
      { label: 'Transfers Monitored', value: '12,483', delta: '+340 vs prior', direction: 'up',   positive: false },
      { label: 'Blocked Transfers',   value: '28',     delta: '+6 blocked',    direction: 'up',   positive: true },
      { label: 'Policy Violations',   value: '14',     delta: '–2 vs prior',   direction: 'down', positive: true },
      { label: 'Users at Risk',       value: '9',      delta: '+3 flagged',    direction: 'up',   positive: false },
    ],
    recommendations: [
      'Initiate HR-led review of the 9 flagged high-risk users and suspend USB data transfer rights pending investigation.',
      'Update DLP classification engine to include new financial quarter document templates currently not captured in policy scope.',
      'Brief department managers on acceptable use policies, with emphasis on cloud upload channels showing the highest violation rate.',
    ],
    incidentRows: [
      { ref: 'DLP-2024-0114', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'PII Exposure', description: 'Employee HR records uploaded to personal cloud storage', severity: 'Critical', status: 'Blocked', owner: 'K. Sharma' },
      { ref: 'DLP-2024-0113', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Financial Data', description: 'Q4 financial projections transferred to USB device', severity: 'High', status: 'Blocked', owner: 'N. Williams' },
      { ref: 'DLP-2024-0112', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'IP Transfer', description: 'Source code repository copied to external storage', severity: 'Critical', status: 'Investigating', owner: 'K. Sharma' },
      { ref: 'DLP-2024-0111', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Email Exfil', description: 'Customer database extract sent via personal email', severity: 'High', status: 'Blocked', owner: 'N. Williams' },
      { ref: 'DLP-2024-0110', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Print / Copy', description: 'Bulk print of sensitive client contracts (unregistered device)', severity: 'Medium', status: 'Logged', owner: 'T. Ferreira' },
    ],
    preparedBy: 'SOC Operations — DLP Team',
    reviewedBy: 'Chief Information Security Officer',
  },

  outpost24: {
    platformLabel: 'Outpost24 · Vulnerability Management',
    riskRating: 'Moderate',
    headline: 'Vulnerability backlog reduced by 124 items; critical CVE exposure declined 4 findings week-over-week.',
    narrative:
      'The vulnerability management programme made measurable progress this week, with the total open vulnerability count declining from 3,971 to 3,847 — a net reduction of 124 findings, representing 156 remediated versus 32 newly discovered. ' +
      'Critical CVE exposure decreased to 23 unresolved items, with two zero-day vulnerabilities (CVE-2024-3400 and CVE-2024-1709) confirmed as patched across all 28 affected assets. ' +
      'Patch compliance across the 847-asset estate stands at 76.4%, below the 85% organizational target, requiring accelerated remediation focus on the Windows Server 2019 cohort. ' +
      'Overall risk posture is rated Moderate, with a positive remediation trajectory but continued exposure in network appliance and legacy infrastructure categories.',
    metrics: [
      { label: 'Open Vulnerabilities', value: '3,847',  delta: '–124 this week', direction: 'down', positive: true },
      { label: 'Critical CVEs',        value: '23',     delta: '–4 resolved',    direction: 'down', positive: true },
      { label: 'Remediated (7d)',       value: '156',    delta: '+34 vs target',  direction: 'up',   positive: true },
      { label: 'Patch Compliance',      value: '76.4%',  delta: '+2.1pp',         direction: 'up',   positive: true },
    ],
    recommendations: [
      'Prioritize emergency patching of Windows Server 2019 assets to close the 8.6% gap to the 85% patch compliance target within the next 10 business days.',
      'Escalate CVE-2024-21762 (CVSS 9.8) affecting 34 Fortinet assets to the network team for immediate patch deployment.',
      'Commission a targeted penetration test on the 23 assets with confirmed critical CVE exposure to validate current compensating controls.',
    ],
    incidentRows: [
      { ref: 'CVE-2024-21762', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Network Appliance', description: 'CVSS 9.8 — Fortinet FortiOS heap-based buffer overflow (34 assets)', severity: 'Critical', status: 'In Remediation', owner: 'Infra Team' },
      { ref: 'CVE-2024-3400',  date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Firewall',          description: 'CVSS 10.0 — Palo Alto PAN-OS command injection (12 assets)', severity: 'Critical', status: 'Patched',       owner: 'Network Ops' },
      { ref: 'CVE-2024-1709',  date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Remote Access',     description: 'CVSS 10.0 — ConnectWise ScreenConnect auth bypass (28 assets)', severity: 'Critical', status: 'Patched',       owner: 'Endpoint Team' },
      { ref: 'CVE-2024-4577',  date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Web Server',        description: 'CVSS 9.8 — PHP CGI argument injection (19 assets)', severity: 'Critical', status: 'In Remediation', owner: 'Web Team' },
      { ref: 'CVE-2024-22024', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'VPN / Access',      description: 'CVSS 9.1 — Ivanti Connect Secure XXE injection (8 assets)', severity: 'High',     status: 'Scheduled',     owner: 'Infra Team' },
    ],
    preparedBy: 'SOC Operations — Vulnerability Management Team',
    reviewedBy: 'Chief Information Security Officer',
  },

  keeper: {
    platformLabel: 'Keeper · Password Security & Vault Management',
    riskRating: 'Stable',
    headline: 'Organizational security score improved to 82/100; breached credential count reduced by 2 this week.',
    narrative:
      'The organization\'s credential security posture continued its positive trajectory this week, with the overall Keeper Security Score improving 3 points to 82 out of 100. ' +
      'The vault audit identified 143 weak passwords requiring remediation — a 12-credential improvement over the prior period — and detected 7 credentials matching known breach databases, down from 9. ' +
      'MFA adoption across the 487-user fleet reached 91.4%, with 43 users in Finance and HR departments remaining non-compliant with the mandatory MFA policy. ' +
      'Password policy compliance stands at 88.2%, trending upward; leadership is advised to prioritize the Sales department, which represents the lowest departmental score at 69.',
    metrics: [
      { label: 'Security Score',    value: '82/100', delta: '+3 this week',  direction: 'up',   positive: true },
      { label: 'Weak Passwords',    value: '143',    delta: '–12 resolved',  direction: 'down', positive: true },
      { label: 'Breached Detected', value: '7',      delta: '–2 cleared',    direction: 'down', positive: true },
      { label: 'MFA Adoption',      value: '91.4%',  delta: '+2.3pp gained', direction: 'up',   positive: true },
    ],
    recommendations: [
      'Issue mandatory password rotation notice to all 143 users with weak credentials, with a 5-business-day compliance deadline.',
      'Enforce MFA policy for the 43 non-compliant users in Finance and HR; escalate persistent non-compliance to department heads.',
      'Target the Sales department (69/100 score) with a focused security awareness session and automated password strength enforcement.',
    ],
    incidentRows: [
      { ref: 'KPR-2024-0043', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Credential Breach', description: '7 user passwords confirmed in HaveIBeenPwned breach database', severity: 'High',   status: 'Notified', owner: 'IT Security' },
      { ref: 'KPR-2024-0042', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Policy Violation',  description: 'Finance Dept: 12 users exceeding 180-day password age limit', severity: 'Medium', status: 'Remediation', owner: 'Help Desk' },
      { ref: 'KPR-2024-0041', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'MFA Gap',           description: '43 users in Finance and HR without MFA enrollment', severity: 'High',   status: 'In Progress', owner: 'IAM Team' },
      { ref: 'KPR-2024-0040', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Reused Credentials','description': '412 reused passwords detected across shared vault entries', severity: 'Medium', status: 'Review',   owner: 'IT Security' },
      { ref: 'KPR-2024-0039', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Privileged Access', description: 'Admin vault: 3 entries without rotation in 365+ days', severity: 'High',   status: 'Escalated', owner: 'CISO Office' },
    ],
    preparedBy: 'SOC Operations — Identity & Access Team',
    reviewedBy: 'Chief Information Security Officer',
  },

  zabbix: {
    platformLabel: 'Zabbix · Infrastructure Monitoring',
    riskRating: 'Moderate',
    headline: 'Overall infrastructure availability held at 99.79%; 13 hosts offline with elevated trigger activity in database tier.',
    narrative:
      'The organization\'s monitored infrastructure maintained 99.79% average availability across 634 managed hosts this week, operating within the 99.5% SLA target. ' +
      'Thirteen hosts are currently in a degraded or offline state, with the majority concentrated in the database cluster group; root cause analysis is in progress for 2 Disaster-severity triggers affecting production database connectivity. ' +
      'Active trigger count rose by 8 to 47, driven by capacity-related warnings in the web tier following a traffic spike on Wednesday. ' +
      'Risk posture is assessed at Moderate; immediate attention is recommended for the database cluster events to mitigate potential service continuity impact before the upcoming quarter-end processing window.',
    metrics: [
      { label: 'Infrastructure Availability', value: '99.79%', delta: '–0.02pp vs target', direction: 'down', positive: true },
      { label: 'Hosts Offline',               value: '13',     delta: '+2 this week',       direction: 'up',   positive: false },
      { label: 'Active Triggers',             value: '47',     delta: '+8 new triggers',    direction: 'up',   positive: false },
      { label: 'Problems Resolved (7d)',       value: '41',     delta: '87% resolution rate', direction: 'up',  positive: true },
    ],
    recommendations: [
      'Escalate the 2 Disaster-severity database triggers to the DBA team for immediate resolution ahead of quarter-end processing.',
      'Provision additional web-tier capacity to address the Wednesday traffic spike and prevent recurrence of the 19 Average-severity warnings.',
      'Review the 13 offline hosts and establish a remediation SLA; assets offline beyond 72 hours should be flagged to the infrastructure owner.',
    ],
    incidentRows: [
      { ref: 'ZBX-2024-D001', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Database',         description: 'Production DB cluster — primary node unavailable (2h 14m)', severity: 'Disaster', status: 'Investigating', owner: 'DBA Team' },
      { ref: 'ZBX-2024-D002', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Database',         description: 'MySQL replication lag exceeded 120s threshold', severity: 'Disaster', status: 'Mitigated',     owner: 'DBA Team' },
      { ref: 'ZBX-2024-H001', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Server',           description: 'db-prod-001: CPU utilization sustained above 90%', severity: 'High',     status: 'Monitoring',    owner: 'Infra Ops' },
      { ref: 'ZBX-2024-H002', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Storage',          description: 'web-lb-002: Disk utilization exceeded 85% warning threshold', severity: 'Average',  status: 'In Progress',  owner: 'Storage Team' },
      { ref: 'ZBX-2024-H003', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Network',          description: 'Core switch interface flap detected — 3 occurrences', severity: 'High',     status: 'Resolved',      owner: 'Network Ops' },
      { ref: 'ZBX-2024-W001', date: format(subWeeks(new Date(), 0), 'MMM d'), category: 'Web Tier',         description: 'Load balancer: Request queue depth warning (traffic spike)', severity: 'Average',  status: 'Resolved',      owner: 'Web Ops' },
    ],
    preparedBy: 'SOC Operations — Infrastructure Team',
    reviewedBy: 'Chief Information Security Officer',
  },
}

export function getWeeklyReport(platformId: PlatformId): PlatformWeeklyReport {
  return REPORTS[platformId]
}
