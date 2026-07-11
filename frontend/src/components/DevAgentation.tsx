'use client'

import { useEffect, useState, type ComponentType } from 'react'

type AgentationProps = {
  endpoint?: string
  copyToClipboard?: boolean
  className?: string
}

// Dev-only annotation overlay, mirroring prototype/dev-agentation.js. It shows
// automatically in local development so UI notes are always one click away, and
// never ships to production. Force it on/off anywhere with ?agentation=1 / =0.
export function DevAgentation() {
  const [Agentation, setAgentation] = useState<ComponentType<AgentationProps> | null>(null)

  useEffect(() => {
    const flag = new URLSearchParams(window.location.search).get('agentation')
    const enabled = flag === '1' || (flag !== '0' && process.env.NODE_ENV !== 'production')
    if (!enabled) return

    import('agentation')
      .then((mod) => setAgentation(() => mod.Agentation as ComponentType<AgentationProps>))
      .catch((error) => console.error('Agentation failed to load', error))
  }, [])

  if (!Agentation) return null
  return <Agentation endpoint="http://localhost:4747" copyToClipboard className="astir-agentation" />
}
