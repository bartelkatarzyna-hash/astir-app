'use client'

import { useEffect, useRef } from 'react'
import { type Note, type NoteBlock, noteBlocksFromText } from '@/lib/applications'

const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.5l4.2 4.2 8.8-9.4"/></svg>'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function blockHtml(block: NoteBlock): string {
  if (block.type === 'check') {
    return `<span class="note-check" contenteditable="false" data-note-check="${block.checked ? 'true' : 'false'}" role="checkbox" aria-checked="${block.checked ? 'true' : 'false'}" tabindex="0"><span class="note-box" aria-hidden="true">${block.checked ? CHECK_SVG : ''}</span></span>`
  }
  return `<span class="note-text">${escapeHtml(block.text)}</span>`
}

function noteHtml(note: Note | null): string {
  const blocks = note?.blocks ?? []
  return blocks.map(blockHtml).join('')
}

// Read the current DOM back into the block model, mirroring serializeNoteField.
function serialize(field: HTMLElement): Note {
  const blocks: NoteBlock[] = []
  field.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) blocks.push({ type: 'text', text: node.textContent })
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const element = node as HTMLElement
    if (element.classList.contains('note-check')) {
      blocks.push({ type: 'check', checked: element.dataset.noteCheck === 'true', text: '' })
      return
    }
    if (element.textContent) blocks.push({ type: 'text', text: element.textContent })
  })
  return {
    kind: 'blocks',
    blocks: blocks.filter((block) => block.type === 'check' || block.text),
  }
}

// Rich note editor: free text plus checkbox blocks. Type "[]" to drop in a
// checkbox. Uncontrolled contenteditable (React never re-renders it mid-edit,
// which would drop the caret); we only rewrite innerHTML on a "[]" conversion.
export function NoteField({
  note,
  onChange,
}: {
  note: Note | null
  onChange: (note: Note) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Seed once from the incoming note; further edits are DOM-driven so React
  // never re-renders the contenteditable (which would drop the caret).
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !ref.current) return
    seeded.current = true
    ref.current.innerHTML = noteHtml(note)
  }, [note])

  function handleInput() {
    const field = ref.current
    if (!field) return
    if ((field.textContent || '').includes('[]')) {
      const next: Note = { kind: 'blocks', blocks: noteBlocksFromText(field.textContent || '') }
      field.innerHTML = noteHtml(next)
      // Place the caret at the end after the rewrite.
      const range = document.createRange()
      range.selectNodeContents(field)
      range.collapse(false)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
      onChange(next)
      return
    }
    onChange(serialize(field))
  }

  function handleClick(event: React.MouseEvent) {
    const target = (event.target as HTMLElement).closest('.note-check') as HTMLElement | null
    if (!target || !ref.current) return
    event.stopPropagation()
    const next = target.dataset.noteCheck === 'true' ? 'false' : 'true'
    target.dataset.noteCheck = next
    target.setAttribute('aria-checked', next)
    const box = target.querySelector('.note-box')
    if (box) box.innerHTML = next === 'true' ? CHECK_SVG : ''
    onChange(serialize(ref.current))
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    const target = (event.target as HTMLElement).closest('.note-check') as HTMLElement | null
    if (target && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      target.click()
    }
  }

  return (
    <div
      className="note-field"
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label="Application note"
      data-placeholder="Add a note"
      ref={ref}
      onInput={handleInput}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    />
  )
}
