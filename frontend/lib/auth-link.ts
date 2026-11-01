'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'

// Länken i mejlet går först till Supabase. Supabase skickar sedan hit med resultatet efter ett #:
//   lyckades:  /admin/reset-password#access_token=...&type=recovery
//   misslyckades: /admin/reset-password#error=access_denied&error_code=otp_expired&...
// Sådant efter # skickas aldrig till någon server. Vi läser det i webbläsaren och
// tar sedan bort det ur adressfältet (så det inte hamnar i historiken).
export type AuthLink =
  | { status: 'loading' }
  | { status: 'ready'; accessToken: string }
  | { status: 'failed'; message: string } // Supabase sa att länken inte fungerar
  | { status: 'missing' } // ingen kod alls i adressen

function parseHash(hash: string): AuthLink {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const accessToken = params.get('access_token')
  if (accessToken) return { status: 'ready', accessToken }

  if (params.get('error') || params.get('error_code')) {
    const expired = params.get('error_code') === 'otp_expired'
    return {
      status: 'failed',
      message: expired
        ? 'Länken har gått ut eller har redan använts. (Vissa mejlprogram öppnar länkar i förväg.)'
        : 'Länken fungerar inte.',
    }
  }
  return { status: 'missing' }
}

const subscribeNothing = () => () => {}

export function useAuthLink(): AuthLink {
  // false på servern och under första renderingen i webbläsaren, sedan true.
  // Så visar servern och webbläsaren samma sak först ("Laddar…") och vi undviker hydreringsfel.
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false)

  // Vi läser adressen EN gång och sparar den, eftersom vi tar bort den ur adressfältet nedan.
  const [hash] = useState(() => (typeof window === 'undefined' ? '' : window.location.hash))
  const link = useMemo(() => (mounted ? parseHash(hash) : ({ status: 'loading' } as const)), [mounted, hash])

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  return link
}
