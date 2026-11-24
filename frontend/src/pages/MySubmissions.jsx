import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/client'
import UrgencyBadge from '../components/UrgencyBadge'
import KeywordChips from '../components/KeywordChips'
import { CardSkeleton } from '../components/Skeleton'

const STATUS_STYLES = {
  Pending:     'bg-amber-50 text-amber-800 border-amber-200',
  'In Progress': 'bg-blue-50 text-blue-800 border-blue-200',
  Resolved:    'bg-emerald-50 text-emerald-800 border-emerald-200',
}

export default function MySubmissions() {
  const [surveys, setSurveys] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  
  // Interactive filters
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterUrgency, setFilterUrgency] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    api.get('/surveys/mine')
      .then((res) => setSurveys(res.data))
      .catch(() => toast.error('Failed to load submissions'))
      .finally(() => setLoading(false))
  }, [])

  const filteredSurveys = useMemo(() => {
    return surveys.filter((s) => {
      const matchStatus = filterStatus === 'All' || s.ticket?.status === filterStatus
      const matchUrgency = filterUrgency === 'All' || s.analysis?.urgency_level === filterUrgency
      const matchSearch = !searchQuery || s.raw_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.analysis?.assigned_dept?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchStatus && matchUrgency && matchSearch
    })
  }, [surveys, filterStatus, filterUrgency, searchQuery])

  if (loading) return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="skeleton h-8 w-48" />
      {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
    </div>
  )

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>📋</span> My Feedback Submissions
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Track real-time status and department routing for your reported campus issues.
          </p>
        </div>
        <Link to="/feedback" className="btn-primary text-xs py-2 px-3 shadow-none self-start sm:self-auto">
          + New Feedback
        </Link>
      </div>

      {/* Interactive Filter Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by keywords, text, or department…"
              className="input pl-9 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status pills */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs">
              {['All', 'Pending', 'In Progress', 'Resolved'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    filterStatus === st
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Urgency dropdown */}
            <select
              className="input text-xs w-auto py-1 px-2.5"
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value)}
            >
              <option value="All">All Urgency</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      {filteredSurveys.length === 0 ? (
        <div className="card text-center py-16 space-y-3">
          <div className="text-5xl">📭</div>
          <h3 className="text-lg font-bold text-slate-900">No submissions found</h3>
          <p className="text-slate-500 text-xs max-w-sm mx-auto">
            {surveys.length === 0
              ? "You haven't submitted any feedback yet. Report a facility issue to get started!"
              : "No feedback matches the selected filters. Try clearing your search."}
          </p>
          {surveys.length === 0 && (
            <Link to="/feedback" className="btn-primary text-xs inline-block mt-2">
              Submit Your First Feedback
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSurveys.map((s) => (
            <div key={s.survey_id} className="card card-hover space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {s.analysis && <UrgencyBadge level={s.analysis.urgency_level} />}
                    {s.ticket && (
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${STATUS_STYLES[s.ticket.status] || ''}`}>
                        {s.ticket.status === 'Resolved' ? '✅' : s.ticket.status === 'In Progress' ? '🔧' : '🕐'} {s.ticket.status}
                      </span>
                    )}
                    <span className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-bold">
                      TK-#{s.ticket?.ticket_id || s.survey_id}
                    </span>
                    <span className="text-xs text-slate-400 ml-auto">
                      {new Date(s.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </div>

                  <p className="text-sm text-slate-800 font-medium leading-relaxed">{s.raw_text}</p>
                  
                  {s.analysis && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 font-medium">
                      <span>🏢 {s.analysis.assigned_dept}</span>
                      <span>•</span>
                      <span>Input: {s.input_mode === 'voice' ? '🎙️ Voice' : '⌨️ Typed'}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setExpanded(expanded === s.survey_id ? null : s.survey_id)}
                  className="btn-secondary text-xs py-1.5 px-3 shrink-0"
                  aria-expanded={expanded === s.survey_id}
                >
                  {expanded === s.survey_id ? 'Hide Details' : 'View Details &amp; Timeline'}
                </button>
              </div>

              {/* Expanded detail & Timeline */}
              {expanded === s.survey_id && s.analysis && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-in">
                  
                  {/* Interactive Status Timeline */}
                  <div>
                    <div className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Ticket Resolution Workflow</div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                        <div className="font-bold">1. Ingested</div>
                        <div className="text-[10px] text-emerald-600 mt-0.5">NLP Analyzed</div>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${
                        s.ticket?.status === 'In Progress' || s.ticket?.status === 'Resolved'
                          ? 'bg-blue-50 border-blue-200 text-blue-800 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        <div className="font-bold">2. Dispatched</div>
                        <div className="text-[10px] mt-0.5">{s.analysis.assigned_dept.split(' ')[0]} Wing</div>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${
                        s.ticket?.status === 'Resolved'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        <div className="font-bold">3. Resolved</div>
                        <div className="text-[10px] mt-0.5">
                          {s.ticket?.resolved_at ? new Date(s.ticket.resolved_at).toLocaleDateString('en-IN') : 'Pending SLA'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Keywords */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1.5">Keyphrases Identified:</p>
                    <KeywordChips keywords={s.analysis.extracted_keywords} />
                  </div>

                  {/* NLP Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Urgency Score</p>
                      <p className="font-mono font-bold text-slate-800 mt-0.5">{(s.analysis.urgency_score * 100).toFixed(0)}%</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-slate-400 text-[10px] uppercase font-bold">VADER Sentiment</p>
                      <p className="font-mono font-bold text-slate-800 mt-0.5">{s.analysis.sentiment_compound.toFixed(3)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Input Mode</p>
                      <p className="font-bold text-slate-800 mt-0.5 capitalize">{s.input_mode}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Cleaned Tokens</p>
                      <p className="text-slate-700 truncate mt-0.5" title={s.analysis.cleaned_text}>{s.analysis.cleaned_text}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
