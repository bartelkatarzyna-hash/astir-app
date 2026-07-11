// Who counts as an admin. There is no RBAC yet (see docs) — admin access is a
// simple email allow-list read from ADMIN_EMAILS (comma-separated). The default
// matches config/env.ts so behaviour is identical whether the value is set
// explicitly or falls back.
const DEFAULT_ADMIN_EMAILS = 'bartel.katarzyna@gmail.com'

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? DEFAULT_ADMIN_EMAILS)
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false
  }
  return adminEmails().includes(email.trim().toLowerCase())
}
