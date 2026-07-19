/**
 * useTimer.js
 * Returns a live countdown string for a given expiry Date object.
 * Updates every second for short countdowns, every minute otherwise.
 */

import { useState, useEffect } from 'react'

function formatCountdown(expiresAt) {
  const now = new Date()
  const diffMs = expiresAt - now

  if (diffMs <= 0) return { label: 'Expired', urgency: 'critical' }

  const totalSeconds = Math.floor(diffMs / 1000)
  const days    = Math.floor(totalSeconds / 86400)
  const hours   = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  let label = ''
  let urgency = 'normal' // 'normal' | 'warning' | 'critical'

  if (days > 0) {
    label = `Expires in ${days}d ${hours}h`
    urgency = days <= 1 ? 'warning' : 'normal'
  } else if (hours > 0) {
    label = `Expires in ${hours}h ${minutes}m`
    urgency = 'warning'
  } else {
    label = `Expires in ${minutes}m ${seconds}s`
    urgency = 'critical'
  }

  return { label, urgency }
}

export function useTimer(expiresAt) {
  const [state, setState] = useState(() => formatCountdown(expiresAt))

  useEffect(() => {
    if (!expiresAt) return
    const interval = setInterval(() => {
      setState(formatCountdown(expiresAt))
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  return state
}
