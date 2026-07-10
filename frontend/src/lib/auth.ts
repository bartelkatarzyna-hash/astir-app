import { cookies } from 'next/headers'
import type { User } from './user'

const SESSION_COOKIE = 'astir_session'

// Server-side requests go straight to the backend (the /api rewrite only
// applies to browser requests). API_TARGET matches next.config.ts.
const apiTarget = process.env.API_TARGET ?? 'http://localhost:3000'

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE)
  if (!session) {
    return null
  }
  try {
    const response = await fetch(`${apiTarget}/api/users/me`, {
      headers: { cookie: `${SESSION_COOKIE}=${session.value}` },
      cache: 'no-store',
    })
    if (!response.ok) {
      return null
    }
    return (await response.json()) as User
  } catch {
    // Backend unreachable: treat as signed out rather than crashing the page.
    return null
  }
}
