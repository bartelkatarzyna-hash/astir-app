'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { User } from '@/lib/user'

const UserContext = createContext<User | null>(null)

export function UserProvider({ user, children }: { user: User; children: ReactNode }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>
}

export function useUser(): User {
  const user = useContext(UserContext)
  if (!user) {
    throw new Error('useUser must be used inside UserProvider')
  }
  return user
}

export function firstName(user: User): string {
  return user.name.split(' ')[0] || user.name
}
