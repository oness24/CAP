import { CheckCircle, XCircle, Gauge, ShieldCheck } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { zabbixDashboard } from '@/data/zabbix/dashboard'
import { PageLayout } from '@/layouts/PageLayout'
import { LineChartWidget } from '@/components/charts/LineChartWidget'

const SLA_TARGET = 99.5

function parsePct(v: string | number | undefined): number {
	if (typeof v === 'number') return v
	if (!v) return 0
	return Number(String(v).replace('%', '').trim()) || 0
}

export default function SLAReports() {
	const { data, isLoading } = useDashboard('zabbix')
	const d = (data as typeof zabbixDashboard) ?? zabbixDashboard

	const overallAvailability = parsePct(d.kpis.avgAvailability?.value)
	const isCompliant = overallAvailability >= SLA_TARGET
	const groups = d.hostGroupStatus ?? []
	const compliantGroups = groups.filter(g => parsePct(g.availability) >= SLA_TARGET).length
	const breachedGroups = groups.length - compliantGroups

	return (
		<PageLayout
			title="SLA Reports"
			subtitle="Zabbix — Service availability compliance tracking"
		>
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				{[
					{
						icon: Gauge,
						label: 'Current SLA',
						value: isLoading ? '—' : `${overallAvailability.toFixed(2)}%`,
						color: isCompliant ? '#22C55E' : '#EF4444',
					},
					{
						icon: ShieldCheck,
						label: 'SLA Target',
						value: `${SLA_TARGET.toFixed(2)}%`,
						color: '#3B82F6',
					},
					{
						icon: CheckCircle,
						label: 'Compliant Groups',
						value: isLoading ? '—' : String(compliantGroups),
						color: '#22C55E',
					},
					{
						icon: XCircle,
						label: 'Breached Groups',
						value: isLoading ? '—' : String(breachedGroups),
						color: breachedGroups > 0 ? '#EF4444' : '#6B7280',
					},
				].map(({ icon: Icon, label, value, color }) => (
					<div
						key={label}
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
				))}
			</div>

			<LineChartWidget
				title="Availability Trend"
				subtitle={`SLA compliance threshold at ${SLA_TARGET.toFixed(2)}%`}
				data={d.availabilityTrend ?? []}
				lines={[{ key: 'value', label: 'Availability' }]}
				referenceLine={{ value: SLA_TARGET, label: 'SLA Target' }}
				filled
				height={300}
			/>

			<div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
				<div
					className="grid text-[10px] font-semibold uppercase tracking-wider px-4 py-2.5"
					style={{
						gridTemplateColumns: '2fr 1fr 1fr',
						borderBottom: '1px solid var(--border-subtle)',
						background: 'var(--bg-elevated)',
						color: 'var(--text-muted)',
					}}
				>
					<span>Group</span>
					<span>Availability</span>
					<span>SLA Status</span>
				</div>

				{(groups ?? []).map((g, i) => {
					const avail = parsePct(g.availability)
					const ok = avail >= SLA_TARGET
					return (
						<div
							key={g.group}
							className="grid items-center px-4 py-3"
							style={{
								gridTemplateColumns: '2fr 1fr 1fr',
								borderBottom: i < groups.length - 1 ? '1px solid var(--border-subtle)' : undefined,
							}}
						>
							<span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{g.group}</span>
							<span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>{g.availability}</span>
							<span
								className="text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit"
								style={{
									background: ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
									color: ok ? '#22C55E' : '#EF4444',
								}}
							>
								{ok ? 'Compliant' : 'Breach'}
							</span>
						</div>
					)
				})}
			</div>
		</PageLayout>
	)
}
