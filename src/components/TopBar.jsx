/**
 * TopBar.jsx — Refactored
 * Whop-native fixed top navigation.
 * Pure black background, 1px bottom border #1A1A1A.
 * Whop Blue used only for active state / CTA — not decorative.
 */

import { Zap } from 'lucide-react'

export default function TopBar() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-12 bg-black border-b border-[#1A1A1A] flex items-center justify-between px-4"
      role="banner"
    >
      {/* ── Brand ──────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Zap
          size={15}
          className="text-whop-blue fill-whop-blue"
          strokeWidth={0}
          aria-hidden="true"
        />
        <span
          className="text-white font-semibold text-[14px]"
          style={{ letterSpacing: 'var(--letter-spacing-3)' }}
        >
          Virality Predictor
        </span>

        {/* Context label */}
        <span
          className="hidden sm:inline text-[#333333] text-[11px] font-medium pl-1"
          style={{ letterSpacing: 'var(--letter-spacing-6)' }}
        >
          · Home
        </span>
      </div>

      {/* ── Right — user avatar ─────────────────────────── */}
      <div
        className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#222222] flex items-center justify-center select-none cursor-pointer"
        role="button"
        aria-label="Your profile"
        tabIndex={0}
      >
        <span className="text-[10px] font-bold text-[#555555]" style={{ letterSpacing: 'var(--letter-spacing-7)' }}>
          YU
        </span>
      </div>
    </header>
  )
}
