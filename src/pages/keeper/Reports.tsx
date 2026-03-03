import { BarChart2, FileText, Users } from 'lucide-react'
import { PageLayout } from '@/layouts/PageLayout'
import { MetricCard } from '@/components/cards/MetricCard'
import { DataTable } from '@/components/tables/DataTable'
import { keeperDashboard } from '@/data/keeper/dashboard'
import { useDashboard } from '@/hooks/useDashboard'

type ReportRow = {
	section: string
	metric: string
	value: string | number
}

export default function Reports() {
	const { data } = useDashboard('keeper')
	const d = (data as typeof keeperDashboard) ?? keeperDashboard

	const reportRows: ReportRow[] = [
		{ section: 'Overview', metric: 'Security Score', value: d.kpis.securityScore.value },
		{ section: 'Overview', metric: 'Total Users', value: d.kpis.totalUsers.value },
		{ section: 'Credentials', metric: 'Weak Passwords', value: d.kpis.weakPasswords.value },
		{ section: 'Credentials', metric: 'Breached Detected', value: d.kpis.breachedPasswords.value },
		{ section: 'Identity', metric: 'MFA Adoption', value: d.kpis.mfaAdoption.value },
		{ section: 'Policy', metric: 'Policy Compliance', value: d.kpis.policyCompliance.value },
	]

	return (
		<PageLayout title="Reports" subtitle="Keeper — real-time security and compliance report data">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<MetricCard title="Report Sections" value={4} icon={FileText} trend={0} />
				<MetricCard title="Users Covered" value={d.kpis.totalUsers.value} icon={Users} trend={0} />
				<MetricCard title="Risk Entries" value={d.highRiskUsers.length} icon={BarChart2} trend={0} />
			</div>

			<DataTable<ReportRow>
				columns={[
					{ key: 'section', label: 'Section', sortable: true },
					{ key: 'metric', label: 'Metric', sortable: true },
					{ key: 'value', label: 'Value', sortable: true },
				]}
				data={reportRows}
			/>
		</PageLayout>
	)
}
