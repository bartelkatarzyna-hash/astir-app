'use client'

import { useEffect, useState, type ComponentType } from 'react'

type AgentationProps = {
  endpoint?: string
  copyToClipboard?: boolean
  className?: string
}

// Dev-only annotation overlay, mirroring prototype/dev-agentation.js:
// opt in by appending ?agentation=1 to any page URL.
export function DevAgentation() {
  const [Agentation, setAgentation] = useState<ComponentType<AgentationProps> | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('agentation') !== '1') return

    import('agentation')
      .then((mod) => setAgentation(() => mod.Agentation as ComponentType<AgentationProps>))
      .catch((error) => console.error('Agentation failed to load', error))
  }, [])

  if (!Agentation) return null
  return <Agentation endpoint="http://localhost:4747" copyToClipboard className="astir-agentation" />
}
