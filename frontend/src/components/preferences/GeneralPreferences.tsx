'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useUser } from '../UserProvider'
import { AvatarCropper } from './AvatarCropper'

export function GeneralPreferences() {
  const user = useUser()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(user.name)
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const dirty = name.trim() !== user.name || avatarUrl !== user.avatarUrl

  function closeCropper() {
    if (cropSrc) {
      URL.revokeObjectURL(cropSrc)
    }
    setCropSrc(null)
  }

  function pickAvatar(file: File | undefined) {
    if (!file) {
      return
    }
    setStatus('idle')
    setCropSrc(URL.createObjectURL(file))
  }

  async function save() {
    const trimmed = name.trim()
    if (!trimmed) {
      return
    }
    setStatus('saving')
    const response = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed, avatarUrl }),
    })
    if (!response.ok) {
      setStatus('error')
      return
    }
    setStatus('saved')
    router.refresh()
  }

  return (
    <section className="screen">
      <div className="page-head">
        <h1>General</h1>
      </div>
      <div className="prefs-card">
        <div className="prefs-avatar-row">
          {avatarUrl ? (
            <img className="prefs-avatar" src={avatarUrl} alt="Your avatar" referrerPolicy="no-referrer" />
          ) : (
            <span className="prefs-avatar" aria-hidden="true" />
          )}
          <div className="prefs-avatar-actions">
            <button className="btn ghost" type="button" onClick={() => fileInputRef.current?.click()}>
              Change photo
            </button>
            {avatarUrl ? (
              <button className="text-button" type="button" onClick={() => setAvatarUrl(null)}>
                Remove photo
              </button>
            ) : null}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              pickAvatar(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </div>
        <label>
          Username
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setStatus('idle')
            }}
            maxLength={120}
            autoComplete="name"
          />
        </label>
        <div className="prefs-actions">
          <button className="btn solid" type="button" disabled={!dirty || !name.trim() || status === 'saving'} onClick={save}>
            {status === 'saving' ? 'Saving…' : 'Save changes'}
          </button>
          {status === 'saved' ? <span className="prefs-status">Saved</span> : null}
          {status === 'error' ? (
            <span className="prefs-status error">Something went wrong. Try again.</span>
          ) : null}
        </div>
      </div>
      {cropSrc ? (
        <AvatarCropper
          imageUrl={cropSrc}
          onCancel={closeCropper}
          onError={() => {
            closeCropper()
            setStatus('error')
          }}
          onConfirm={(dataUrl) => {
            setAvatarUrl(dataUrl)
            closeCropper()
          }}
        />
      ) : null}
    </section>
  )
}
