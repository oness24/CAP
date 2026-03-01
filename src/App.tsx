import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RootLayout } from './layouts/RootLayout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

const LoginPage = lazy(() => import('./pages/auth/LoginPage'))

// CrowdStrike
const CrowdStrikeDashboard = lazy(() => import('./pages/crowdstrike/CrowdStrikeDashboard'))
const Endpoints = lazy(() => import('./pages/crowdstrike/Endpoints'))
const CSDetections = lazy(() => import('./pages/crowdstrike/Detections'))
const Incidents = lazy(() => import('./pages/crowdstrike/Incidents'))
const CSVulnerabilities = lazy(() => import('./pages/crowdstrike/Vulnerabilities'))
const Policies = lazy(() => import('./pages/crowdstrike/Policies'))
const CSReports = lazy(() => import('./pages/crowdstrike/Reports'))

// Wazuh
const WazuhDashboard = lazy(() => import('./pages/wazuh/WazuhDashboard'))
const LogAnalysis = lazy(() => import('./pages/wazuh/LogAnalysis'))
const WazuhAlerts = lazy(() => import('./pages/wazuh/Alerts'))
const RuleMonitoring = lazy(() => import('./pages/wazuh/RuleMonitoring'))
const Agents = lazy(() => import('./pages/wazuh/Agents'))
const Compliance = lazy(() => import('./pages/wazuh/Compliance'))
const WazuhReports = lazy(() => import('./pages/wazuh/Reports'))

// Safetica
const SafeticaDashboard = lazy(() => import('./pages/safetica/SafeticaDashboard'))
const DataTransfers = lazy(() => import('./pages/safetica/DataTransfers'))
const PolicyViolations = lazy(() => import('./pages/safetica/PolicyViolations'))
const UserActivity = lazy(() => import('./pages/safetica/UserActivity'))
const RiskAnalytics = lazy(() => import('./pages/safetica/RiskAnalytics'))
const SafeticaReports = lazy(() => import('./pages/safetica/Reports'))

// Outpost24
const Outpost24Dashboard = lazy(() => import('./pages/outpost24/Outpost24Dashboard'))
const ScanResults = lazy(() => import('./pages/outpost24/ScanResults'))
const CVEAnalysis = lazy(() => import('./pages/outpost24/CVEAnalysis'))
const RiskScoring = lazy(() => import('./pages/outpost24/RiskScoring'))
const Remediation = lazy(() => import('./pages/outpost24/Remediation'))
const Outpost24Reports = lazy(() => import('./pages/outpost24/Reports'))

// Executive
const ResumoExecutivo = lazy(() => import('./pages/executive/ResumoExecutivo'))

// Keeper
const KeeperDashboard = lazy(() => import('./pages/keeper/KeeperDashboard'))
const WeakPasswords = lazy(() => import('./pages/keeper/WeakPasswords'))
const SecurityScore = lazy(() => import('./pages/keeper/SecurityScore'))
const UserAudit = lazy(() => import('./pages/keeper/UserAudit'))
const PolicyCompliance = lazy(() => import('./pages/keeper/PolicyCompliance'))
const KeeperReports = lazy(() => import('./pages/keeper/Reports'))

// Zabbix
const ZabbixDashboard = lazy(() => import('./pages/zabbix/ZabbixDashboard'))
const HostAvailability = lazy(() => import('./pages/zabbix/HostAvailability'))
const HostGroups = lazy(() => import('./pages/zabbix/HostGroups'))
const Triggers = lazy(() => import('./pages/zabbix/Triggers'))
const NetworkMonitoring = lazy(() => import('./pages/zabbix/NetworkMonitoring'))
const SLAReports = lazy(() => import('./pages/zabbix/SLAReports'))
const ZabbixReports = lazy(() => import('./pages/zabbix/Reports'))

function PageSkeleton() {
  return (
    <div className="p-6 flex flex-col gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
      ))}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Suspense fallback={null}><LoginPage /></Suspense>} />

        {/* Protected */}
        <Route path="/" element={<ProtectedRoute><RootLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/crowdstrike/dashboard" replace />} />

          {/* Executive */}
          <Route path="executive-summary" element={<Suspense fallback={<PageSkeleton />}><ResumoExecutivo /></Suspense>} />

          {/* CrowdStrike */}
          <Route path="crowdstrike">
            <Route path="dashboard" element={<Suspense fallback={<PageSkeleton />}><CrowdStrikeDashboard /></Suspense>} />
            <Route path="endpoints" element={<Suspense fallback={<PageSkeleton />}><Endpoints /></Suspense>} />
            <Route path="detections" element={<Suspense fallback={<PageSkeleton />}><CSDetections /></Suspense>} />
            <Route path="incidents" element={<Suspense fallback={<PageSkeleton />}><Incidents /></Suspense>} />
            <Route path="vulnerabilities" element={<Suspense fallback={<PageSkeleton />}><CSVulnerabilities /></Suspense>} />
            <Route path="policies" element={<Suspense fallback={<PageSkeleton />}><Policies /></Suspense>} />
            <Route path="reports" element={<Suspense fallback={<PageSkeleton />}><CSReports /></Suspense>} />
          </Route>

          {/* Wazuh */}
          <Route path="wazuh">
            <Route path="dashboard" element={<Suspense fallback={<PageSkeleton />}><WazuhDashboard /></Suspense>} />
            <Route path="log-analysis" element={<Suspense fallback={<PageSkeleton />}><LogAnalysis /></Suspense>} />
            <Route path="alerts" element={<Suspense fallback={<PageSkeleton />}><WazuhAlerts /></Suspense>} />
            <Route path="rule-monitoring" element={<Suspense fallback={<PageSkeleton />}><RuleMonitoring /></Suspense>} />
            <Route path="agents" element={<Suspense fallback={<PageSkeleton />}><Agents /></Suspense>} />
            <Route path="compliance" element={<Suspense fallback={<PageSkeleton />}><Compliance /></Suspense>} />
            <Route path="reports" element={<Suspense fallback={<PageSkeleton />}><WazuhReports /></Suspense>} />
          </Route>

          {/* Safetica */}
          <Route path="safetica">
            <Route path="dashboard" element={<Suspense fallback={<PageSkeleton />}><SafeticaDashboard /></Suspense>} />
            <Route path="data-transfers" element={<Suspense fallback={<PageSkeleton />}><DataTransfers /></Suspense>} />
            <Route path="policy-violations" element={<Suspense fallback={<PageSkeleton />}><PolicyViolations /></Suspense>} />
            <Route path="user-activity" element={<Suspense fallback={<PageSkeleton />}><UserActivity /></Suspense>} />
            <Route path="risk-analytics" element={<Suspense fallback={<PageSkeleton />}><RiskAnalytics /></Suspense>} />
            <Route path="reports" element={<Suspense fallback={<PageSkeleton />}><SafeticaReports /></Suspense>} />
          </Route>

          {/* Outpost24 */}
          <Route path="outpost24">
            <Route path="dashboard" element={<Suspense fallback={<PageSkeleton />}><Outpost24Dashboard /></Suspense>} />
            <Route path="scan-results" element={<Suspense fallback={<PageSkeleton />}><ScanResults /></Suspense>} />
            <Route path="cve-analysis" element={<Suspense fallback={<PageSkeleton />}><CVEAnalysis /></Suspense>} />
            <Route path="risk-scoring" element={<Suspense fallback={<PageSkeleton />}><RiskScoring /></Suspense>} />
            <Route path="remediation" element={<Suspense fallback={<PageSkeleton />}><Remediation /></Suspense>} />
            <Route path="reports" element={<Suspense fallback={<PageSkeleton />}><Outpost24Reports /></Suspense>} />
          </Route>

          {/* Keeper */}
          <Route path="keeper">
            <Route path="dashboard" element={<Suspense fallback={<PageSkeleton />}><KeeperDashboard /></Suspense>} />
            <Route path="weak-passwords" element={<Suspense fallback={<PageSkeleton />}><WeakPasswords /></Suspense>} />
            <Route path="security-score" element={<Suspense fallback={<PageSkeleton />}><SecurityScore /></Suspense>} />
            <Route path="user-audit" element={<Suspense fallback={<PageSkeleton />}><UserAudit /></Suspense>} />
            <Route path="policy-compliance" element={<Suspense fallback={<PageSkeleton />}><PolicyCompliance /></Suspense>} />
            <Route path="reports" element={<Suspense fallback={<PageSkeleton />}><KeeperReports /></Suspense>} />
          </Route>

          {/* Zabbix */}
          <Route path="zabbix">
            <Route path="dashboard" element={<Suspense fallback={<PageSkeleton />}><ZabbixDashboard /></Suspense>} />
            <Route path="host-availability" element={<Suspense fallback={<PageSkeleton />}><HostAvailability /></Suspense>} />
            <Route path="host-groups" element={<Suspense fallback={<PageSkeleton />}><HostGroups /></Suspense>} />
            <Route path="triggers" element={<Suspense fallback={<PageSkeleton />}><Triggers /></Suspense>} />
            <Route path="network-monitoring" element={<Suspense fallback={<PageSkeleton />}><NetworkMonitoring /></Suspense>} />
            <Route path="sla-reports" element={<Suspense fallback={<PageSkeleton />}><SLAReports /></Suspense>} />
            <Route path="reports" element={<Suspense fallback={<PageSkeleton />}><ZabbixReports /></Suspense>} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/crowdstrike/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
