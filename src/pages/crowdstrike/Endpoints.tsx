import { useState, useCallback, useMemo } from 'react'
import { Monitor, Server, Cpu, Globe, Shield, Search, X, ExternalLink, AlertCircle, type LucideIcon } from 'lucide-react'
import { PageLayout } from '@/layouts/PageLayout'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { useDashboard } from '@/hooks/useDashboard'
import { usePagedData } from '@/hooks/usePagedData'
import { crowdstrikeDashboard } from '@/data/crowdstrike/dashboard'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Device {
  id: string
  hostname: string
  device_type: string
  platform: string
  os: string
  status: string
  local_ip: string
  external_ip: string
  last_seen: string
  first_seen: string
  last_login_user: string
  machine_domain: string
  agent_version: string
  manufacturer: string
  model: string
  serial_number: string
  bios_version: string
  bios_manufacturer: string
  mac_address: string
  tags: string[]
  chassis_type: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString()
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function EndpointModal({ device, onClose }: { device: Device; onClose: () => void }) {
  const [containing, setContaining] = useState(false)
  const [containMsg, setContainMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const falconUrl = `https://falcon.us-2.crowdstrike.com/hosts/hosts-detail/${device.id}`

  async function handleContain() {
    if (!confirm(`Contain ${device.hostname}? This will isolate it from the network.`)) return
    setContaining(true)
    setContainMsg(null)
    try {
      await api.post(`/platforms/crowdstrike/devices/${device.id}/contain`, {})
      setContainMsg({ type: 'ok', text: 'Host containment initiated successfully.' })
    } catch (e) {
      setContainMsg({ type: 'err', text: (e as Error).message ?? 'Containment failed.' })
    } finally {
      setContaining(false)
    }
  }

  function InfoField({ label, value }: { label: string; value: string }) {
    return (
      <div
        className="flex flex-col gap-1 p-3 rounded-lg"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
      >
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="text-sm font-medium font-mono" style={{ color: 'var(--text-primary)' }}>
          {value || 'N/A'}
        </span>
      </div>
    )
  }

  function SectionHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <Icon size={14} style={{ color: 'var(--accent-primary)' }} />
        <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h4>
      </div>
    )
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Modal panel */}
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl flex flex-col"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start gap-3 p-5 border-b sticky top-0 z-10"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(29,106,229,0.15)', border: '1px solid rgba(29,106,229,0.3)' }}
          >
            {device.device_type === 'Server' ? (
              <Server size={18} style={{ color: '#8B5CF6' }} />
            ) : (
              <Monitor size={18} style={{ color: 'var(--accent-primary)' }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{device.hostname}</p>
            <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
              ID: {device.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">

          {/* Status / Type pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={device.status} />
            <span
              className="px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{ background: 'rgba(139,92,246,0.12)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.25)' }}
            >
              {device.device_type || 'Unknown'}
            </span>
            <span
              className="px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{ background: 'rgba(29,106,229,0.12)', color: '#60A5FA', border: '1px solid rgba(29,106,229,0.25)' }}
            >
              {device.platform}
            </span>
            {device.machine_domain && (
              <span
                className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{ background: 'rgba(22,163,74,0.1)', color: '#34D399', border: '1px solid rgba(22,163,74,0.2)' }}
              >
                {device.machine_domain}
              </span>
            )}
          </div>

          {/* Hardware */}
          <div>
            <SectionHeader icon={Cpu} title="Hardware" />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <InfoField label="Manufacturer" value={device.manufacturer} />
              <InfoField label="Product" value={device.model} />
              <InfoField label="Serial" value={device.serial_number} />
              <InfoField label="BIOS" value={device.bios_version || device.bios_manufacturer} />
            </div>
          </div>

          {/* Network */}
          <div>
            <SectionHeader icon={Globe} title="Network" />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <InfoField label="Local IP" value={device.local_ip} />
              <InfoField label="External IP" value={device.external_ip} />
              <InfoField label="MAC" value={device.mac_address} />
              <InfoField label="OS Version" value={device.os} />
            </div>
          </div>

          {/* Agent */}
          <div>
            <SectionHeader icon={Shield} title="Agent" />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <InfoField label="Agent Version" value={device.agent_version} />
              <InfoField label="Last User" value={device.last_login_user} />
            </div>
          </div>

          {/* Tags */}
          {device.tags && device.tags.length > 0 && (
            <div>
              <SectionHeader icon={Monitor} title="Tags" />
              <div className="flex flex-wrap gap-2 mt-2">
                {device.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                    style={{ background: 'rgba(29,106,229,0.1)', color: '#60A5FA', border: '1px solid rgba(29,106,229,0.2)' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <SectionHeader icon={AlertCircle} title="Timeline" />
            <div
              className="mt-2 rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--border-subtle)' }}
            >
              {[
                { label: 'First Seen', value: fmtDate(device.first_seen) },
                { label: 'Last Seen',  value: fmtDate(device.last_seen) },
              ].map(({ label, value }, i, arr) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-4 py-3"
                  style={{
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    background: i % 2 === 0 ? 'var(--bg-elevated)' : 'transparent',
                  }}
                >
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback message */}
          {containMsg && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-xs"
              style={{
                background: containMsg.type === 'ok' ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${containMsg.type === 'ok' ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: containMsg.type === 'ok' ? '#22C55E' : '#EF4444',
              }}
            >
              {containMsg.text}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={handleContain}
            disabled={containing}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
            style={{ background: '#DC2626', color: '#fff' }}
          >
            <AlertCircle size={15} />
            {containing ? 'Containing…' : 'Contain Host'}
          </button>
          <a
            href={falconUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'var(--accent-primary)', color: '#fff' }}
          >
            <ExternalLink size={15} />
            View in Falcon
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────
const TYPE_TABS = [
  { label: 'All',          deviceType: '',            platform: '' },
  { label: 'Workstations', deviceType: 'Workstation', platform: '' },
  { label: 'Servers',      deviceType: 'Server',      platform: '' },
  { label: 'Windows',      deviceType: '',            platform: 'Windows' },
  { label: 'macOS',        deviceType: '',            platform: 'Mac' },
  { label: 'Linux',        deviceType: '',            platform: 'Linux' },
]

// ─── Mock endpoint data (used as fallback when API has no Hosts:Read scope) ───
const _now = Date.now()
const _ago = (h: number) => new Date(_now - h * 3_600_000).toISOString()

const MOCK_DEVICES: Device[] = [
  { id: 'mock-ws-001', hostname: 'CORP-WKSTN-001', device_type: 'Workstation', platform: 'Windows', os: 'Windows 11 Pro 22H2', status: 'Online', local_ip: '10.0.1.101', external_ip: '203.0.113.10', last_seen: _ago(0.5), first_seen: _ago(8760), last_login_user: 'jsilva', machine_domain: 'CORPNET', agent_version: '7.14.16703', manufacturer: 'Dell Inc.', model: 'OptiPlex 7090', serial_number: 'DL9K3X7', bios_version: 'A09', bios_manufacturer: 'Dell', mac_address: 'A4:BB:6D:22:11:01', tags: ['Finance', 'CriticalAsset'], chassis_type: 'Desktop' },
  { id: 'mock-ws-002', hostname: 'CORP-WKSTN-002', device_type: 'Workstation', platform: 'Windows', os: 'Windows 10 Pro 22H2', status: 'Online', local_ip: '10.0.1.102', external_ip: '203.0.113.10', last_seen: _ago(1), first_seen: _ago(8760), last_login_user: 'mferreira', machine_domain: 'CORPNET', agent_version: '7.14.16703', manufacturer: 'HP', model: 'EliteDesk 800 G6', serial_number: 'HP7R2X1', bios_version: 'Q78', bios_manufacturer: 'HP', mac_address: 'A4:BB:6D:22:11:02', tags: [], chassis_type: 'Desktop' },
  { id: 'mock-ws-003', hostname: 'CORP-WKSTN-003', device_type: 'Workstation', platform: 'Windows', os: 'Windows 11 Pro 22H2', status: 'Reduced Functionality', local_ip: '10.0.1.103', external_ip: '203.0.113.10', last_seen: _ago(3), first_seen: _ago(5000), last_login_user: 'acosta', machine_domain: 'CORPNET', agent_version: '7.13.15604', manufacturer: 'Lenovo', model: 'ThinkCentre M90q', serial_number: 'LN3K9X2', bios_version: 'M3EKT60A', bios_manufacturer: 'Lenovo', mac_address: 'A4:BB:6D:22:11:03', tags: ['HR'], chassis_type: 'Desktop' },
  { id: 'mock-ws-004', hostname: 'CORP-WKSTN-004', device_type: 'Workstation', platform: 'Windows', os: 'Windows 11 Pro 22H2', status: 'Online', local_ip: '10.0.1.104', external_ip: '203.0.113.10', last_seen: _ago(0.2), first_seen: _ago(3650), last_login_user: 'rpereira', machine_domain: 'CORPNET', agent_version: '7.14.16703', manufacturer: 'Dell Inc.', model: 'OptiPlex 5090', serial_number: 'DL5K1X2', bios_version: 'A07', bios_manufacturer: 'Dell', mac_address: 'A4:BB:6D:22:11:04', tags: ['IT'], chassis_type: 'Desktop' },
  { id: 'mock-ws-005', hostname: 'CORP-WKSTN-005', device_type: 'Workstation', platform: 'Windows', os: 'Windows 10 Pro 21H2', status: 'Online', local_ip: '10.0.1.105', external_ip: '203.0.113.10', last_seen: _ago(2), first_seen: _ago(8760), last_login_user: 'tsousa', machine_domain: 'CORPNET', agent_version: '7.14.16703', manufacturer: 'HP', model: 'ProDesk 600 G6', serial_number: 'HP4R8X3', bios_version: 'P88', bios_manufacturer: 'HP', mac_address: 'A4:BB:6D:22:11:05', tags: ['Accounts'], chassis_type: 'Desktop' },
  { id: 'mock-ws-006', hostname: 'CORP-WKSTN-006', device_type: 'Workstation', platform: 'Windows', os: 'Windows 11 Pro 22H2', status: 'Online', local_ip: '10.0.1.106', external_ip: '203.0.113.10', last_seen: _ago(1.5), first_seen: _ago(2190), last_login_user: 'bmoura', machine_domain: 'CORPNET', agent_version: '7.14.16703', manufacturer: 'Dell Inc.', model: 'OptiPlex 7090', serial_number: 'DL8K4X5', bios_version: 'A09', bios_manufacturer: 'Dell', mac_address: 'A4:BB:6D:22:11:06', tags: [], chassis_type: 'Desktop' },
  { id: 'mock-ws-007', hostname: 'CORP-WKSTN-007', device_type: 'Workstation', platform: 'Windows', os: 'Windows 11 Pro 22H2', status: 'Offline', local_ip: '10.0.1.107', external_ip: '203.0.113.10', last_seen: _ago(36), first_seen: _ago(5000), last_login_user: 'lpinto', machine_domain: 'CORPNET', agent_version: '7.12.14104', manufacturer: 'Lenovo', model: 'ThinkCentre M90q', serial_number: 'LN9K2X4', bios_version: 'M3EKT60A', bios_manufacturer: 'Lenovo', mac_address: 'A4:BB:6D:22:11:07', tags: ['Finance'], chassis_type: 'Desktop' },
  { id: 'mock-ws-008', hostname: 'CORP-WKSTN-008', device_type: 'Workstation', platform: 'Windows', os: 'Windows 10 Pro 22H2', status: 'Online', local_ip: '10.0.1.108', external_ip: '203.0.113.10', last_seen: _ago(0.8), first_seen: _ago(8760), last_login_user: 'cfonseca', machine_domain: 'CORPNET', agent_version: '7.14.16703', manufacturer: 'HP', model: 'EliteDesk 800 G6', serial_number: 'HP2K6X8', bios_version: 'Q78', bios_manufacturer: 'HP', mac_address: 'A4:BB:6D:22:11:08', tags: ['Legal'], chassis_type: 'Desktop' },
  { id: 'mock-ws-009', hostname: 'CORP-LAPTOP-009', device_type: 'Workstation', platform: 'Windows', os: 'Windows 11 Pro 22H2', status: 'Online', local_ip: '10.0.2.101', external_ip: '198.51.100.5', last_seen: _ago(0.3), first_seen: _ago(3650), last_login_user: 'dcarvalho', machine_domain: 'CORPNET', agent_version: '7.14.16703', manufacturer: 'Dell Inc.', model: 'Latitude 5530', serial_number: 'DL3K7X9', bios_version: 'A08', bios_manufacturer: 'Dell', mac_address: 'A4:BB:6D:22:22:01', tags: ['Remote', 'Sales'], chassis_type: 'Laptop' },
  { id: 'mock-ws-010', hostname: 'CORP-LAPTOP-010', device_type: 'Workstation', platform: 'Windows', os: 'Windows 11 Pro 22H2', status: 'Online', local_ip: '10.0.2.102', external_ip: '198.51.100.6', last_seen: _ago(0.4), first_seen: _ago(1825), last_login_user: 'erodrigues', machine_domain: 'CORPNET', agent_version: '7.14.16703', manufacturer: 'HP', model: 'EliteBook 840 G9', serial_number: 'HP1K5X3', bios_version: 'R89', bios_manufacturer: 'HP', mac_address: 'A4:BB:6D:22:22:02', tags: ['Remote'], chassis_type: 'Laptop' },
  { id: 'mock-ws-011', hostname: 'CORP-LAPTOP-011', device_type: 'Workstation', platform: 'Windows', os: 'Windows 11 Pro 22H2', status: 'Offline', local_ip: '10.0.2.103', external_ip: '198.51.100.7', last_seen: _ago(72), first_seen: _ago(2190), last_login_user: 'gmendes', machine_domain: 'CORPNET', agent_version: '7.13.15604', manufacturer: 'Lenovo', model: 'ThinkPad X1 Carbon', serial_number: 'LN4K8X2', bios_version: 'N2UET91W', bios_manufacturer: 'Lenovo', mac_address: 'A4:BB:6D:22:22:03', tags: ['Remote', 'VIP'], chassis_type: 'Laptop' },
  { id: 'mock-ws-012', hostname: 'CORP-MAC-001', device_type: 'Workstation', platform: 'Mac', os: 'macOS 14.4 Sonoma', status: 'Online', local_ip: '10.0.1.201', external_ip: '203.0.113.10', last_seen: _ago(0.6), first_seen: _ago(3650), last_login_user: 'hrocha', machine_domain: '', agent_version: '7.14.16703', manufacturer: 'Apple Inc.', model: 'MacBook Pro M3 Pro', serial_number: 'C02ZK4XXMD6T', bios_version: 'N/A', bios_manufacturer: 'Apple', mac_address: 'F4:D4:88:33:11:01', tags: ['Design', 'Creative'], chassis_type: 'Laptop' },
  { id: 'mock-ws-013', hostname: 'CORP-LNX-WKS-001', device_type: 'Workstation', platform: 'Linux', os: 'Ubuntu 22.04.3 LTS', status: 'Online', local_ip: '10.0.1.211', external_ip: '203.0.113.10', last_seen: _ago(0.1), first_seen: _ago(1095), last_login_user: 'imoreira', machine_domain: '', agent_version: '7.14.16703', manufacturer: 'Dell Inc.', model: 'Precision 5570', serial_number: 'DL7K1X5', bios_version: 'A06', bios_manufacturer: 'Dell', mac_address: 'A4:BB:6D:33:11:01', tags: ['DevOps', 'Engineering'], chassis_type: 'Desktop' },
  // Servers
  { id: 'mock-srv-001', hostname: 'CORP-SRV-001', device_type: 'Server', platform: 'Windows', os: 'Windows Server 2022 Standard', status: 'Online', local_ip: '10.0.10.11', external_ip: '203.0.113.20', last_seen: _ago(0.05), first_seen: _ago(17520), last_login_user: 'svc_admin', machine_domain: 'CORPNET', agent_version: '7.14.16703', manufacturer: 'Dell Inc.', model: 'PowerEdge R750', serial_number: 'SRV1K9X1', bios_version: '2.5.4', bios_manufacturer: 'Dell', mac_address: 'EC:F4:BB:55:11:01', tags: ['Production', 'Web'], chassis_type: 'Server' },
  { id: 'mock-srv-002', hostname: 'CORP-SRV-002', device_type: 'Server', platform: 'Windows', os: 'Windows Server 2019 Standard', status: 'Online', local_ip: '10.0.10.12', external_ip: '203.0.113.20', last_seen: _ago(0.1), first_seen: _ago(17520), last_login_user: 'svc_backup', machine_domain: 'CORPNET', agent_version: '7.14.16703', manufacturer: 'HP', model: 'ProLiant DL380 Gen10', serial_number: 'HP9K2X7', bios_version: '2.82', bios_manufacturer: 'HPE', mac_address: 'EC:F4:BB:55:11:02', tags: ['Production', 'DB'], chassis_type: 'Server' },
  { id: 'mock-srv-003', hostname: 'CORP-SRV-003', device_type: 'Server', platform: 'Windows', os: 'Windows Server 2022 Datacenter', status: 'Reduced Functionality', local_ip: '10.0.10.13', external_ip: '203.0.113.20', last_seen: _ago(4), first_seen: _ago(8760), last_login_user: 'svc_monitor', machine_domain: 'CORPNET', agent_version: '7.13.15604', manufacturer: 'Lenovo', model: 'ThinkSystem SR650', serial_number: 'LN5K3X8', bios_version: '3.10', bios_manufacturer: 'Lenovo', mac_address: 'EC:F4:BB:55:11:03', tags: ['Production', 'App'], chassis_type: 'Server' },
  { id: 'mock-srv-004', hostname: 'CORP-LNX-SRV-001', device_type: 'Server', platform: 'Linux', os: 'RHEL 9.2', status: 'Online', local_ip: '10.0.10.21', external_ip: '203.0.113.20', last_seen: _ago(0.05), first_seen: _ago(5000), last_login_user: 'root', machine_domain: '', agent_version: '7.14.16703', manufacturer: 'Dell Inc.', model: 'PowerEdge R650', serial_number: 'SRV2K8X4', bios_version: '2.3.1', bios_manufacturer: 'Dell', mac_address: 'EC:F4:BB:55:22:01', tags: ['Production', 'API'], chassis_type: 'Server' },
  { id: 'mock-srv-005', hostname: 'CORP-LNX-SRV-002', device_type: 'Server', platform: 'Linux', os: 'Ubuntu 22.04 LTS', status: 'Online', local_ip: '10.0.10.22', external_ip: '203.0.113.20', last_seen: _ago(0.2), first_seen: _ago(3650), last_login_user: 'ubuntu', machine_domain: '', agent_version: '7.14.16703', manufacturer: 'HP', model: 'ProLiant DL360 Gen10', serial_number: 'HP6K4X2', bios_version: '2.80', bios_manufacturer: 'HPE', mac_address: 'EC:F4:BB:55:22:02', tags: ['Staging'], chassis_type: 'Server' },
  { id: 'mock-srv-006', hostname: 'CORP-LNX-SRV-003', device_type: 'Server', platform: 'Linux', os: 'RHEL 8.9', status: 'Offline', local_ip: '10.0.10.23', external_ip: '203.0.113.20', last_seen: _ago(48), first_seen: _ago(8760), last_login_user: 'svc_deploy', machine_domain: '', agent_version: '7.12.14104', manufacturer: 'Dell Inc.', model: 'PowerEdge R740', serial_number: 'SRV3K5X6', bios_version: '2.1.7', bios_manufacturer: 'Dell', mac_address: 'EC:F4:BB:55:22:03', tags: ['Dev'], chassis_type: 'Server' },
  // Domain Controllers
  { id: 'mock-dc-001', hostname: 'CORP-DC-001', device_type: 'DC', platform: 'Windows', os: 'Windows Server 2022 Standard', status: 'Online', local_ip: '10.0.0.11', external_ip: '203.0.113.20', last_seen: _ago(0.05), first_seen: _ago(17520), last_login_user: 'svc_domain', machine_domain: 'CORPNET', agent_version: '7.14.16703', manufacturer: 'Dell Inc.', model: 'PowerEdge R750xs', serial_number: 'DC1K7X3', bios_version: '2.5.4', bios_manufacturer: 'Dell', mac_address: 'EC:F4:BB:66:11:01', tags: ['CriticalAsset', 'AD'], chassis_type: 'Server' },
  { id: 'mock-dc-002', hostname: 'CORP-DC-002', device_type: 'DC', platform: 'Windows', os: 'Windows Server 2019 Standard', status: 'Online', local_ip: '10.0.0.12', external_ip: '203.0.113.20', last_seen: _ago(0.1), first_seen: _ago(17520), last_login_user: 'svc_domain', machine_domain: 'CORPNET', agent_version: '7.14.16703', manufacturer: 'HP', model: 'ProLiant DL380 Gen10', serial_number: 'DC2K4X9', bios_version: '2.82', bios_manufacturer: 'HPE', mac_address: 'EC:F4:BB:66:11:02', tags: ['CriticalAsset', 'AD'], chassis_type: 'Server' },
]

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: LucideIcon
  label: string; value: string | number; sub?: string; accent: string
}) {
  return (
    <div
      className="flex flex-col gap-1 p-4 rounded-xl"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderTop: `2px solid ${accent}` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}18` }}>
          <Icon size={14} style={{ color: accent }} />
        </div>
      </div>
      <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</span>
      {sub && <span className="text-[10px]" style={{ color: accent, opacity: 0.8 }}>{sub}</span>}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Endpoints() {
  const [activeTab, setActiveTab]   = useState(0)
  const [search, setSearch]         = useState('')
  const [selected, setSelected]     = useState<Device | null>(null)

  const { data: dash } = useDashboard('crowdstrike')
  const d = (dash as typeof crowdstrikeDashboard) ?? crowdstrikeDashboard

  const { deviceType, platform } = TYPE_TABS[activeTab]
  const params: Record<string, string> = {}
  if (deviceType) params.device_type = deviceType
  if (platform)   params.platform    = platform
  if (search)     params.search      = search

  const { items, total, isLoading, page, setPage } = usePagedData<Device>(
    '/platforms/crowdstrike/devices', params, 25,
  )

  // Client-side filtered mock data (used when API has no Hosts:Read scope)
  const filteredMock = useMemo(() => {
    let result = MOCK_DEVICES
    if (deviceType) result = result.filter(d => d.device_type === deviceType)
    if (platform)   result = result.filter(d => d.platform === platform)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(d =>
        d.hostname.toLowerCase().includes(q) ||
        d.local_ip.includes(q) ||
        d.external_ip.includes(q) ||
        d.last_login_user.toLowerCase().includes(q) ||
        d.os.toLowerCase().includes(q)
      )
    }
    return result
  }, [deviceType, platform, search])

  const useApiData    = !isLoading && total > 0
  const displayItems  = useApiData ? items          : filteredMock.slice((page - 1) * 25, page * 25)
  const displayTotal  = useApiData ? total          : filteredMock.length

  // type counts from live dashboard
  const typeMap: Record<string, number> = {}
  for (const t of (d as typeof crowdstrikeDashboard & { endpointsByType?: { type: string; count: number }[] }).endpointsByType ?? []) {
    typeMap[t.type] = t.count
  }
  const osByName: Record<string, number> = {}
  for (const e of d.endpointsByOS) osByName[e.os] = (osByName[e.os] ?? 0) + e.count

  const totalNum = parseInt(String(d.kpis.totalEndpoints.value).replace(/,/g, '')) || 0

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val)
    setPage(1)
  }, [setPage])

  return (
    <PageLayout title="Endpoints" subtitle="CrowdStrike — Managed endpoint inventory">

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Monitor} label="Total Endpoints" value={d.kpis.totalEndpoints.value}
          sub={`↑ ${d.kpis.totalEndpoints.trend} this week`} accent="#3B82F6" />
        <StatCard icon={Cpu} label="Workstations" value={(typeMap.Workstation ?? 0).toLocaleString()}
          sub={`${Math.round(((typeMap.Workstation ?? 0) / totalNum) * 100) || 0}% of fleet`} accent="#06B6D4" />
        <StatCard icon={Server} label="Servers" value={(typeMap.Server ?? 0).toLocaleString()}
          sub={`${Math.round(((typeMap.Server ?? 0) / totalNum) * 100) || 0}% of fleet`} accent="#8B5CF6" />
        <StatCard icon={Shield} label="Domain Controllers" value={(typeMap.DC ?? 0).toLocaleString()}
          sub="Active directory nodes" accent="#F97316" />
      </div>

      {/* ── OS Breakdown ──────────────────────────────────────────────────── */}
      <div
        className="grid grid-cols-3 gap-4 rounded-xl p-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        {[
          { label: 'Windows', count: osByName.Windows ?? 0, color: '#3B82F6' },
          { label: 'macOS',   count: osByName.macOS   ?? 0, color: '#9CA3AF' },
          { label: 'Linux',   count: osByName.Linux   ?? 0, color: '#F97316' },
        ].map(({ label, count, color }) => {
          const pct = totalNum > 0 ? Math.round((count / totalNum) * 100) : 0
          return (
            <div key={label} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{count.toLocaleString()}</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
              </div>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{pct}% of fleet</span>
            </div>
          )
        })}
      </div>

      {/* ── Search + Filters ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search bar */}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search hostname, IP…"
            className="w-full pl-8 pr-8 py-2 text-xs rounded-lg border outline-none"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          />
          {search && (
            <button
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
              onClick={() => handleSearchChange('')}
            >
              <X size={12} style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
        </div>

        {/* Type filter tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {TYPE_TABS.map(({ label }, i) => (
            <button
              key={label}
              onClick={() => { setActiveTab(i); setPage(1) }}
              className="px-3 py-1.5 text-xs rounded-lg border transition-colors"
              style={{
                background:  activeTab === i ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                color:       activeTab === i ? '#fff' : 'var(--text-muted)',
                borderColor: activeTab === i ? 'var(--accent-primary)' : 'var(--border-default)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <span className="text-xs tabular-nums ml-auto" style={{ color: 'var(--text-muted)' }}>
          {displayTotal > 0 ? `${(page - 1) * 25 + 1}–${Math.min(page * 25, displayTotal)}` : '0'} of {displayTotal.toLocaleString()} hosts
        </span>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading endpoints…</p>
        </div>
      ) : displayItems.length > 0 ? (
        <>
          <DataTable<Device>
            columns={[
              { key: 'hostname',    label: 'Hostname',   sortable: true },
              { key: 'device_type', label: 'Type',       width: '120px' },
              { key: 'platform',    label: 'Platform',   width: '100px' },
              { key: 'os',          label: 'OS Version' },
              { key: 'status',      label: 'Status',     width: '100px', render: (v) => <StatusBadge status={String(v)} /> },
              { key: 'local_ip',    label: 'Local IP',   width: '130px' },
              { key: 'last_seen',   label: 'Last Seen',  sortable: true, render: (v) => fmtDate(String(v)) },
              { key: 'agent_version', label: 'Agent',    width: '110px' },
            ]}
            data={displayItems}
            onRowClick={(row) => setSelected(row)}
          />
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>Page {page} · {displayItems.length} of {displayTotal.toLocaleString()} endpoints</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border disabled:opacity-40"
                style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                ← Prev
              </button>
              <button onClick={() => setPage(page + 1)} disabled={page * 25 >= displayTotal}
                className="px-3 py-1.5 rounded-lg border disabled:opacity-40"
                style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                Next →
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <Globe size={26} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {search ? `No results for "${search}"` : 'No endpoints found'}
          </p>
          <p className="text-xs text-center max-w-sm" style={{ color: 'var(--text-muted)' }}>
            {typeMap.Server ?? 0} servers · {typeMap.Workstation ?? 0} workstations · {typeMap.DC ?? 0} domain controllers
          </p>
        </div>
      )}

      {/* ── Device Detail Modal ───────────────────────────────────────────── */}
      {selected && <EndpointModal device={selected} onClose={() => setSelected(null)} />}
    </PageLayout>
  )
}
