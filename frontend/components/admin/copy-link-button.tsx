'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

// Kopierar den publika länken, t.ex. http://localhost:3000/q/hostquiz
export function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/q/${slug}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Webbläsaren tillät inte kopiering. Då gör vi inget.
    }
  }

  return (
    <Button variant="secondary" onClick={copy} aria-live="polite">
      {copied ? 'Kopierad ✓' : 'Kopiera länk'}
    </Button>
  )
}
