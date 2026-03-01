import { useMemo } from 'react'
import { Network, ArrowDownToLine, ArrowUpToLine, Activity, AlertTriangle } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { zabbixDashboard } from '@/data/zabbix/dashboard'
import { PageLayout } from '@/layouts/PageLayout'
import { AreaChartWidget } from '@/components/charts/AreaChartWidget'
import { BarChartWidget } from '@/components/charts/BarChartWidget'

type ThroughputPoint = { time: string; value1: number; value2: number }

function StatCard({
	icon: Icon,
	label,
	value,
	color,
}: {
	icon: typeof Network
	label: string
	value: string
	color: string
}) {
	return (
		<div
			className="rounded-xl px-4 py-4 flex items-center gap-3"
			style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
		>
			<div
				className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
				style={{ background: `${color}18`, border: `1px solid ${color}30` }}
			>
				<Icon size={16} style={{ color }} />
			</div>
			<div>
				<p className="text-xl font-bold tabular-nums leading-none" style={{ color: 'var(--text-primary)' }}>
					{value}
				</p>
				<p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>
					{label}
				</p>
			</div>
		</div>
	)
}

export default function NetworkMonitoring() {
	const { data, isLoading } = useDashboard('zabbix')
	const d = (data as typeof zabbixDashboard) ?? zabbixDashboard

	const throughput = (d.networkThroughput ?? []) as ThroughputPoint[]
	const latest = throughput[throughput.length - 1]

	const rxNow = latest?.value1 ?? 0
	const txNow = latest?.value2 ?? 0

	const peak = useMemo(() => {
		if (!throughput.length) return 0
		return Math.max(...throughput.map(p => Math.max(p.value1 ?? 0, p.value2 ?? 0)))
	}, [throughput])

	const groupsByIssues = useMemo(() => {
		return [...(d.hostGroupStatus ?? [])]
			.sort((a, b) => b.down - a.down)
			.slice(0, 8)
			.map(g => ({ group: g.group, down: g.down }))
	}, [d.hostGroupStatus])

	return (
		<PageLayout
			title="Network Monitoring"
			subtitle="Zabbix — Throughput and CAP group network health overview"
		>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<StatCard
					icon={ArrowDownToLine}
					label="RX Throughput"
					value={isLoading ? '—' : `${rxNow.toLocaleString()} kbps`}
					color="#3B82F6"
				/>
				<StatCard
					icon={ArrowUpToLine}
					label="TX Throughput"
					value={isLoading ? '—' : `${txNow.toLocaleString()} kbps`}
					color="#F97316"
				/>
				<StatCard
					icon={Activity}
					label="Peak (24h)"
					value={isLoading ? '—' : `${peak.toLocaleString()} kbps`}
					color="#22C55E"
				/>
			</div>

			{throughput.length === 0 ? (
				<div
					className="rounded-xl px-4 py-10 flex items-center justify-center gap-2"
					style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
				>
					<AlertTriangle size={14} />
					<span className="text-sm">No network throughput data available.</span>
				</div>
			) : (
				<AreaChartWidget
					title="Network Throughput (24h)"
					subtitle="Inbound (RX) and outbound (TX) traffic trend"
					data={throughput}
					dataKey="value1"
					secondKey="value2"
					secondLabel="TX"
					height={300}
				/>
			)}

			{groupsByIssues.length > 0 && (
				<BarChartWidget
					title="Groups With Active Network Issues"
					subtitle="CAP groups ranked by hosts down"
					data={groupsByIssues}
					dataKey="down"
					labelKey="group"
					layout="vertical"
					height={300}
				/>
			)}
		</PageLayout>
	)
}
