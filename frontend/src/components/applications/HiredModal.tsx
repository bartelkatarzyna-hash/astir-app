'use client'

import { useEffect, useRef, useState } from 'react'
import type { Application } from '@/lib/applications'
import { launchConfetti } from '@/lib/confetti'
import { InfoIcon } from '../icons'

// The celebration when an application reaches "Hired". Offers to close any
// other in-progress applications in one click. Ported from openHiredMoment /
// finishHiredMoment in prototype/app.js.
export function HiredModal({
  application,
  others,
  onClose,
  onCloseOthers,
}: {
  application: Application
  others: Application[]
  onClose: () => void
  onCloseOthers: (ids: string[]) => void
}) {
  const [choice, setChoice] = useState<'self' | 'all'>('self')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) launchConfetti(canvasRef.current)
  }, [])

  function finish() {
    if (choice === 'all' && others.length > 0) {
      onCloseOthers(others.map((item) => item.id))
    }
    onClose()
  }

  return (
    <>
      <canvas className="confetti-canvas" ref={canvasRef} aria-hidden="true" />
      <div
        className="modal-backdrop"
        onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      >
        <section className="modal hired-modal" role="dialog" aria-modal="true" aria-labelledby="hiredTitle">
          <div className="modal-head">
            <h2 id="hiredTitle">Congratulations! 🎉</h2>
          </div>
          <div className="modal-copy">
            You accepted an offer at {application.company}. This is a big deal, give yourself a pat on
            the back.
          </div>
          {others.length > 0 ? (
            <div className="hired-cleanup">
              <div className="hired-cleanup-line">
                <span>
                  You still have a few positions in progress. Would you like to close them one by one
                  or should we clean it up together in one click?
                </span>
                <span
                  className="goal-info hired-info"
                  data-info-tooltip="Closing moves applications to all applications, nothing is deleted."
                >
                  <InfoIcon />
                </span>
              </div>
              <div className="radio-list" role="radiogroup" aria-label="Close other pipeline applications">
                <label className="radio-row">
                  <input
                    type="radio"
                    name="hiredCleanupChoice"
                    value="self"
                    checked={choice === 'self'}
                    onChange={() => setChoice('self')}
                  />
                  <span>I will close them myself</span>
                </label>
                <label className="radio-row">
                  <input
                    type="radio"
                    name="hiredCleanupChoice"
                    value="all"
                    checked={choice === 'all'}
                    onChange={() => setChoice('all')}
                  />
                  <span>Close them for me</span>
                </label>
              </div>
            </div>
          ) : null}
          <div className="modal-actions">
            <button className="btn solid" type="button" onClick={finish}>
              Done
            </button>
          </div>
        </section>
      </div>
    </>
  )
}
