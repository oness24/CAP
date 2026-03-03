import { PageLayout } from '@/layouts/PageLayout'
import { ScoreCard } from '@/components/cards/ScoreCard'
import { LineChartWidget } from '@/components/charts/LineChartWidget'
import { BarChartWidget } from '@/components/charts/BarChartWidget'
import { DataTable } from '@/components/tables/DataTable'
import { keeperDashboard } from '@/data/keeper/dashboard'
import { useDashboard } from '@/hooks/useDashboard'

type DeptRow = {
	dept: string
	score: number
	users: number
}

export default function SecurityScore() {
	const { data } = useDashboard('keeper')
	const d = (data as typeof keeperDashboard) ?? keeperDashboard

	const deptRows: DeptRow[] = [...d.deptRiskScores].sort((a, b) => Number(a.score) - Number(b.score))

	return (
		<PageLayout title="Security Score" subtitle="Keeper — organizational password health breakdown">
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<ScoreCard
					title={d.kpis.securityScore.label}
					score={Number(d.kpis.securityScore.value)}
					maxScore={100}
					trend={d.kpis.securityScore.trend}
					label="current"
				/>
			</div>

			<LineChartWidget
				title="Security Score History"
				subtitle="Last 30 days"
				data={d.scoreHistory}
				lines={[{ key: 'value', label: 'Security Score' }]}
				height={240}
			/>

			<BarChartWidget
				title="Department Score"
				subtitle="Average score per team"
				data={deptRows}
				dataKey="score"
				labelKey="dept"
				layout="vertical"
				height={260}
			/>

			<DataTable<DeptRow>
				columns={[
					{ key: 'dept', label: 'Department', sortable: true },
					{ key: 'score', label: 'Score', sortable: true },
					{ key: 'users', label: 'Users', sortable: true },
				]}
				data={deptRows}
			/>
		</PageLayout>
	)
}
