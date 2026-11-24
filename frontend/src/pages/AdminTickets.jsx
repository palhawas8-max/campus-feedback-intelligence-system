import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/client'
import UrgencyBadge from '../components/UrgencyBadge'
import TicketDrawer from '../components/TicketDrawer'
import { CardSkeleton } from '../components/Skeleton'

const STATUS_OPTIONS = ['', 'Pending', 'In Progress', 'Resolved']
const URGENCY_OPTIONS = ['', 'Low', 'Medium', 'High', 'Critical']
const DEPT_OPTIONS = [
  '',
  'Electrical Maintenance Wing',
  'Public Health and Civil Works',
  'IT Services',
  'General Administration',
]

const BLOCK_OPTIONS = [
  '',
  'Computer Engineering Department',
  'Electrical Engineering Department',
  'Electronics Engineering Department',
  'Cafeteria Building',
  'CV Raman Block',
  'Auditorium',
]

const STATUS_STYLES = {
  Pending:       'bg-amber-50 text-amber-800 border-amber-200',
  'In Progress': 'bg-blue-50 text-blue-800 border-blue-200',
  Resolved:      'bg-emerald-50 text-emerald-800 border-emerald-200',
}

export default function AdminTickets() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [tickets, setTickets] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState(null)

  // Initialize filters from URL parameters (e.g. from heatmap or critical alert)
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    dept: searchParams.get('dept') || '',
    urgency: searchParams.get('urgency') || '',
    block: searchParams.get('block') || '',
    search: searchParams.get('search') || '',
  })
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, page_size: 20 })
      if (filters.status) params.set('status', filters.status)
      if (filters.dept) params.set('dept', filters.dept)
      if (filters.urgency) params.set('urgency', filters.urgency)
      if (filters.block) params.set('block', filters.block)
      if (filters.search) params.set('search', filters.search)

      const res = await api.get(`/admin/tickets?${params}`)
      setTickets(res.data.items)
      setTotal(res.data.total)
      setTotalPages(res.data.total_pages)
    } catch {
      toast.error('Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const handleSearch = (e) => {
    e.preventDefault()
    setFilters((f) => ({ ...f, search: searchInput }))
    setPage(1)
  }

  const updateStatus = async (ticketId, newStatus) => {
    try {
      await api.patch(`/admin/tickets/${ticketId}`, { status: newStatus })
      toast.success(`Ticket #${ticketId} → ${newStatus}`)
      fetchTickets()
      if (selectedTicket?.ticket_id === ticketId) {
        setSelectedTicket((t) => ({ ...t, status: newStatus }))
      }
    } catch {
      toast.error('Failed to update status')
    }
  }

  const setFilter = (key, val) => {
    setFilters((f) => {
      const updated = { ...f, [key]: val }
      // Clean query params
      const newParams = {}
      for (const [k, v] of Object.entries(updated)) {
        if (v) newParams[k] = v
      }
      setSearchParams(newParams)
      return updated
    })
    setPage(1)
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
            <span>🎫</span> Maintenance Dispatch Queue
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Facility Issue Tickets</h2>
          <p className="text-xs text-slate-500 mt-0.5">{total} total tickets registered in system</p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="btn-secondary text-xs py-2 px-3 self-start sm:self-auto flex items-center gap-1.5 shadow-none"
        >
          <span>🖨️</span> Print Tickets Table
        </button>
      </div>

      {/* Interactive Filters Card */}
      <div className="card space-y-4">
        
        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              className="input pl-9"
              placeholder="Search feedback text, complaints, or keywords…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
          </div>
          <button type="submit" className="btn-primary px-5 text-xs font-bold shadow-none">Search</button>
          {filters.search && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); setFilter('search', '') }}
              className="btn-secondary px-3 text-xs shadow-none"
            >
              Clear
            </button>
          )}
        </form>

        {/* Filter Pills and Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          
          {/* Status Quick Pills */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs">
            {['', 'Pending', 'In Progress', 'Resolved'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilter('status', st)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  filters.status === st
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {st || 'All Status'}
              </button>
            ))}
          </div>

          {/* Urgency selector */}
          <select
            className="input w-auto text-xs py-1.5 px-3"
            value={filters.urgency}
            onChange={(e) => setFilter('urgency', e.target.value)}
          >
            <option value="">All Urgency</option>
            {URGENCY_OPTIONS.filter(Boolean).map((u) => <option key={u} value={u}>{u}</option>)}
          </select>

          {/* Department selector */}
          <select
            className="input w-auto text-xs py-1.5 px-3"
            value={filters.dept}
            onChange={(e) => setFilter('dept', e.target.value)}
          >
            <option value="">All Departments</option>
            {DEPT_OPTIONS.filter(Boolean).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          {/* Campus Block filter */}
          <select
            className="input w-auto text-xs py-1.5 px-3"
            value={filters.block}
            onChange={(e) => setFilter('block', e.target.value)}
          >
            <option value="">All Campus Blocks</option>
            {BLOCK_OPTIONS.filter(Boolean).map((b) => <option key={b} value={b}>{b}</option>)}
          </select>

          {(filters.status || filters.urgency || filters.dept || filters.block || filters.search) && (
            <button
              onClick={() => {
                setFilters({ status: '', dept: '', urgency: '', block: '', search: '' })
                setSearchInput('')
                setSearchParams({})
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline ml-2"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>
      ) : tickets.length === 0 ? (
        <div className="card text-center py-16 space-y-3">
          <div className="text-5xl">🎫</div>
          <h3 className="text-lg font-bold text-slate-900">No tickets match criteria</h3>
          <p className="text-slate-500 text-xs max-w-sm mx-auto">
            Try resetting your search query or department/urgency filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilters({ status: '', dept: '', urgency: '', block: '', search: '' })
              setSearchInput('')
              setSearchParams({})
            }}
            className="btn-secondary text-xs inline-block"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/80">
                <tr>
                  {['Ticket #', 'Urgency', 'Department', 'Location', 'Original Feedback', 'Status', 'Reported', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-left font-bold text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-50 font-medium">
                {tickets.map((t) => (
                  <tr key={t.ticket_id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      TK-#{t.ticket_id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <UrgencyBadge level={t.urgency_level} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-[150px]">
                      <span title={t.assigned_dept} className="truncate block font-semibold">
                        {t.assigned_dept.replace(' and ', ' & ').replace(' Wing', '')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      <span className="font-semibold text-slate-900">{t.location_block}</span>
                      <span className="text-slate-400"> · {t.location_floor}</span>
                      {t.location_room && <span className="text-slate-500"> ({t.location_room})</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-[220px]">
                      <span className="truncate block" title={t.raw_text}>{t.raw_text}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={t.status}
                        onChange={(e) => updateStatus(t.ticket_id, e.target.value)}
                        className={`text-xs rounded-full px-2.5 py-1 border font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${STATUS_STYLES[t.status]}`}
                      >
                        {STATUS_OPTIONS.filter(Boolean).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {new Date(t.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedTicket(t)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all"
                      >
                        Investigate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Page {page} of {totalPages} ({total} tickets)</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary text-xs py-1 px-3 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary text-xs py-1 px-3 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail slide-over drawer */}
      {selectedTicket && (
        <TicketDrawer
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdateStatus={updateStatus}
        />
      )}
    </div>
  )
}
