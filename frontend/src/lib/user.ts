export type User = {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  createdAt: string
  // Whether this user may see the Admin Panel / curate the Remote Job Board.
  isAdmin: boolean
}
