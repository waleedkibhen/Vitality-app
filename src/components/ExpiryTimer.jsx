/**
 * ExpiryTimer.jsx
 * Live countdown badge. Updates every second.
 * Color: Vermilion (#FA4616) for all states — urgency communicated by label copy.
 */

import { Clock } from 'lucide-react'
import { useTimer } from '../hooks/useTimer'

export default function ExpiryTimer({ expiresAt }) {
  const { label, urgency } = useTimer(expiresAt)

  const colorClass =
    urgency === 'critical'
      ? 'text-[#ef4444]'
      : urgency === 'warning'
      ? 'text-brand-accent'
      : 'text-brand-dust'

  return (
    <div
      className={`flex items-center gap-1.5 tabular-nums ${colorClass}`}
      aria-live="polite"
      aria-label={label}
      role="timer"
    >
      <Clock
        size={11}
        strokeWidth={2}
        aria-hidden="true"
        className="shrink-0"
      />
      <span className="text-[11px] font-semibold tracking-tight">{label}</span>
    </div>
  )
}
