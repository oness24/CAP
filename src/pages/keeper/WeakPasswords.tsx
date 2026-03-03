import { AlertTriangle, KeyRound, ShieldAlert } from 'lucide-react'
import { PageLayout } from '@/layouts/PageLayout'
import { MetricCard } from '@/components/cards/MetricCard'
import { DataTable } from '@/components/tables/DataTable'
import { keeperDashboard } from '@/data/keeper/dashboard'
import { useDashboard } from '@/hooks/useDashboard'

type WeakUserRow = {
	user: string
	department: string
	weakCount: number
	reusedCount: number
	riskScore: number
}

export default function WeakPasswords() {
	const { data } = useDashboard('keeper')
	const d = (data as typeof keeperDashboard) ?? keeperDashboard

	const weakUsers: WeakUserRow[] = [...d.highRiskUsers]
		.filter((item) => Number(item.weakCount) > 0 || Number(item.reusedCount) > 0)
		.sort((a, b) => (Number(b.weakCount) + Number(b.reusedCount)) - (Number(a.weakCount) + Number(a.reusedCount)))

	return (
		<PageLayout title="Weak Passwords" subtitle="Keeper — users with weak or reused credentials">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<MetricCard title="Weak Passwords" value={d.kpis.weakPasswords.value} icon={AlertTriangle} trend={d.kpis.weakPasswords.trend} />
				<MetricCard title="Reused Credentials" value={d.passwordStrength.find((x) => x.name === 'Reused')?.value ?? 0} icon={KeyRound} trend={0} />
				<MetricCard title="Users Flagged" value={weakUsers.length} icon={ShieldAlert} trend={0} />
			</div>

			<DataTable<WeakUserRow>
				columns={[
					{ key: 'user', label: 'User', sortable: true },
					{ key: 'department', label: 'Department', sortable: true },
					{ key: 'weakCount', label: 'Weak', sortable: true },
					{ key: 'reusedCount', label: 'Reused', sortable: true },
					{ key: 'riskScore', label: 'Risk Score', sortable: true },
				]}
				data={weakUsers}
			/>
		</PageLayout>
	)
}
