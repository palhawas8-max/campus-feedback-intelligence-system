import clsx from 'clsx'

const URGENCY_CONFIG = {
  Low:      { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-200',  dot: 'bg-green-500' },
  Medium:   { bg: 'bg-amber-100',  text: 'text-amber-800',  border: 'border-amber-200',  dot: 'bg-amber-500' },
  High:     { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-500' },
  Critical: { bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-200',    dot: 'bg-red-500' },
}

export default function UrgencyBadge({ level, size = 'sm' }) {
  const cfg = URGENCY_CONFIG[level] || URGENCY_CONFIG.Low
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full border',
        cfg.bg, cfg.text, cfg.border,
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
      )}
      aria-label={`Urgency: ${level}`}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', cfg.dot)} aria-hidden="true" />
      {level}
    </span>
  )
}
