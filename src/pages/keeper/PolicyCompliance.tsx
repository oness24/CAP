import { ClipboardList, ShieldAlert, ShieldCheck } from 'lucide-react'
import { PageLayout } from '@/layouts/PageLayout'
import { MetricCard } from '@/components/cards/MetricCard'
import { DataTable } from '@/components/tables/DataTable'
import { keeperDashboard, type KeeperUser } from '@/data/keeper/dashboard'
import { useDashboard } from '@/hooks/useDashboard'

type ComplianceRow = KeeperUser & { issue: string }

export default function PolicyCompliance() {
	const { data } = useDashboard('keeper')
	const d = (data as typeof keeperDashboard) ?? keeperDashboard

	const nonCompliant: ComplianceRow[] = d.highRiskUsers
		.filter((item) => String(item.mfaStatus).toLowerCase() !== 'enabled' || Number(item.weakCount) > 0 || Number(item.reusedCount) > 0)
		.map((item) => ({
			...item,
			issue: String(item.mfaStatus).toLowerCase() !== 'enabled'
				? 'MFA not enabled'
				: Number(item.reusedCount) > 0
					? 'Reused credentials'
					: 'Weak passwords',
		}))

	return (
		<PageLayout title="Policy Compliance" subtitle="Keeper — policy enforcement and non-compliant users">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<MetricCard title="Policy Compliance" value={d.kpis.policyCompliance.value} icon={ClipboardList} trend={d.kpis.policyCompliance.trend} />
				<MetricCard title="Compliant Users" value={Math.max(Number(d.kpis.totalUsers.value) - nonCompliant.length, 0)} icon={ShieldCheck} trend={0} />
				<MetricCard title="Non-Compliant Users" value={nonCompliant.length} icon={ShieldAlert} trend={0} />
			</div>

			<DataTable<ComplianceRow>
				columns={[
					{ key: 'user', label: 'User', sortable: true },
					{ key: 'department', label: 'Department', sortable: true },
					{ key: 'issue', label: 'Issue', sortable: true },
					{ key: 'weakCount', label: 'Weak', sortable: true },
					{ key: 'reusedCount', label: 'Reused', sortable: true },
					{ key: 'riskScore', label: 'Risk Score', sortable: true },
				]}
				data={nonCompliant}
			/>
		</PageLayout>
	)
}
