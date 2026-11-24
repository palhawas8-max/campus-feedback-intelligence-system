import { useEffect, useState } from 'react'
import UrgencyBadge from './UrgencyBadge'
import KeywordChips from './KeywordChips'
import toast from 'react-hot-toast'

export default function TicketDrawer({ ticket, onClose, onUpdateStatus }) {
  const [copied, setCopied] = useState(false)
  const [resolutionNote, setResolutionNote] = useState('')

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!ticket) return null

  const copyId = () => {
    navigator.clipboard.writeText(`TK-${ticket.ticket_id}`)
    setCopied(true)
    toast.success('Ticket ID copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrintWorkOrder = () => {
    window.print()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer */}
      <aside
        className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 overflow-y-auto flex flex-col animate-in"
        role="dialog"
        aria-modal="true"
        aria-label="Ticket Investigation Details"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-md">
                TK-#{ticket.ticket_id}
              </span>
              <UrgencyBadge level={ticket.urgency_level} size="sm" />
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-1">Maintenance Work Order</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyId}
              className="btn-secondary text-xs py-1.5 px-2.5 shadow-none"
              title="Copy Ticket ID"
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
            <button
              type="button"
              onClick={handlePrintWorkOrder}
              className="btn-secondary text-xs py-1.5 px-2.5 shadow-none"
              title="Print Work Order"
            >
              🖨️ Print
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-200/60 text-slate-500 font-bold ml-1"
              aria-label="Close drawer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Status Bar & Quick Actions */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between flex-wrap gap-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Status</span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border mt-1 ${
                ticket.status === 'Resolved'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : ticket.status === 'In Progress'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {ticket.status === 'Resolved' ? '✅' : ticket.status === 'In Progress' ? '🔧' : '🕐'} {ticket.status}
              </span>
            </div>

            {onUpdateStatus && (
              <div className="flex items-center gap-2">
                {ticket.status !== 'In Progress' && (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(ticket.ticket_id, 'In Progress')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    🔧 Mark In Progress
                  </button>
                )}
                {ticket.status !== 'Resolved' && (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(ticket.ticket_id, 'Resolved')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    ✅ Mark Resolved
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Location & Routing Details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Campus Location</span>
              <p className="font-bold text-slate-800">
                {ticket.location_block} · {ticket.location_floor}
                {ticket.location_room && ` · Room ${ticket.location_room}`}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Assigned Department</span>
              <p className="font-bold text-indigo-700">
                🏢 {ticket.assigned_dept}
              </p>
            </div>
          </div>

          {/* Original Student Feedback */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="label mb-0">Original Student Feedback</h3>
              <span className="text-[11px] text-slate-400 font-medium">
                {ticket.input_mode === 'voice' ? '🎙️ Voice Dictation' : '⌨️ Typed Input'}
              </span>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-800 leading-relaxed border border-slate-200/60 font-medium">
              &ldquo;{ticket.raw_text}&rdquo;
            </div>
          </div>

          {/* Cleaned text from Preprocessing */}
          <div>
            <h3 className="label">Cleaned Text (NLP Preprocessing Stage)</h3>
            <div className="bg-indigo-50/70 rounded-xl p-3.5 text-xs text-indigo-950 leading-relaxed border border-indigo-100 font-mono">
              {ticket.cleaned_text}
            </div>
          </div>

          {/* Extracted Keyphrases */}
          <div>
            <h3 className="label">Extracted Problem Keyphrases (KeyBERT + TF-IDF)</h3>
            <KeywordChips keywords={ticket.extracted_keywords} />
          </div>

          {/* AI Intelligence Scores */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">VADER Polarity</p>
              <p className="text-2xl font-black text-slate-900 font-mono">
                {ticket.sentiment_compound?.toFixed(3)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Sentiment polarity (-1 to +1)</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Calculated Urgency</p>
              <p className="text-2xl font-black text-indigo-600 font-mono">
                {(ticket.urgency_score * 100).toFixed(0)}%
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Normalized score with hazard boost</p>
            </div>
          </div>

          {/* Resolution timestamps */}
          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Reported at:</span>
              <span className="font-mono text-slate-700">{new Date(ticket.submitted_at).toLocaleString('en-IN')}</span>
            </div>
            {ticket.resolved_at && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Resolved at:</span>
                <span className="font-mono">{new Date(ticket.resolved_at).toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

        </div>
      </aside>
    </>
  )
}
