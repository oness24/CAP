import { generateTimeSeries, generateDualTimeSeries, ts, hostname, r } from '../mockHelpers'

const zabbixGroups = ['Production Servers', 'Database Cluster', 'Web Tier', 'Network Devices', 'Development', 'DMZ']
const severities = ['Disaster', 'High', 'Average', 'Warning', 'Information']

export const zabbixDashboard = {
  kpis: {
    totalHosts: { value: 634, trend: 3, label: 'Total Hosts' },
    hostsUp: { value: 621, trend: 0, label: 'Hosts Up' },
    hostsDown: { value: 13, trend: 2, label: 'Hosts Down' },
    activeTriggers: { value: 47, trend: 8, label: 'Active Triggers' },
    problems1h: { value: 6, trend: -3, label: 'Problems (1h)' },
    avgAvailability: { value: '99.79%', trend: -0.02, label: 'Avg Availability' },
  },
  availabilityTrend: generateTimeSeries(24, 99.7, 0.4),
  networkThroughput: generateDualTimeSeries(24, 1240, 820, 300),
  triggersBySeverity: [
    { name: 'Disaster', value: 2, color: '#7C3AED' },
    { name: 'High', value: 8, color: '#EF4444' },
    { name: 'Average', value: 18, color: '#F97316' },
    { name: 'Warning', value: 19, color: '#EAB308' },
  ],
  hostGroupStatus: zabbixGroups.map((group) => {
    const total = r(20, 120)
    const down = r(0, 5)
    return {
      group,
      total,
      up: total - down,
      down,
      availability: `${(99 + Math.random()).toFixed(2)}%`,
    }
  }),
  activeProblems: Array.from({ length: 10 }, (_, i) => ({
    id: `PROB-${10000 + i}`,
    host: hostname(zabbixGroups[r(0, zabbixGroups.length - 1)].split(' ')[0].toLowerCase(), r(1, 30)),
    problem: ['High CPU utilization', 'Disk space warning', 'Interface down', 'MySQL down', 'High memory usage', 'Ping timeout'][r(0, 5)],
    severity: severities[r(0, severities.length - 1)],
    duration: `${r(1, 8)}h ${r(0, 59)}m`,
    group: zabbixGroups[r(0, zabbixGroups.length - 1)],
    age: ts(r(1, 12)),
  })),
}

export type ZabbixProblem = typeof zabbixDashboard.activeProblems[number]
