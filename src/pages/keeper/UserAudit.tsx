import { ClipboardCheck, Shield, Users } from 'lucide-react'
import { PageLayout } from '@/layouts/PageLayout'
import { MetricCard } from '@/components/cards/MetricCard'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { keeperDashboard, type KeeperUser } from '@/data/keeper/dashboard'
import { useDashboard } from '@/hooks/useDashboard'

export default function UserAudit() {
	const { data } = useDashboard('keeper')
	const d = (data as typeof keeperDashboard) ?? keeperDashboard

	return (
		<PageLayout title="User Audit" subtitle="Keeper — vault user risk and access posture">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<MetricCard title="Total Users" value={d.kpis.totalUsers.value} icon={Users} trend={d.kpis.totalUsers.trend} />
				<MetricCard title="MFA Adoption" value={d.kpis.mfaAdoption.value} icon={Shield} trend={0} />
				<MetricCard title="High Risk Reviewed" value={d.highRiskUsers.length} icon={ClipboardCheck} trend={0} />
			</div>

			<DataTable<KeeperUser>
				columns={[
					{ key: 'user', label: 'User', sortable: true },
					{ key: 'department', label: 'Department', sortable: true },
					{ key: 'lastLogin', label: 'Last Login', sortable: true },
					{ key: 'mfaStatus', label: 'MFA', render: (v) => <StatusBadge status={String(v)} /> },
					{ key: 'weakCount', label: 'Weak', sortable: true },
					{ key: 'reusedCount', label: 'Reused', sortable: true },
					{ key: 'riskScore', label: 'Risk Score', sortable: true },
				]}
				data={d.highRiskUsers}
			/>
		</PageLayout>
	)
}
