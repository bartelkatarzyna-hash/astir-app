export function LoginView() {
  return (
    <div className="login">
      <main className="login-card">
        <div className="brand login-brand">
          <span className="mini" aria-hidden="true">
            <span className="halo" />
            <span className="core" />
          </span>
          <span className="name">Astir</span>
        </div>
        <p className="login-copy">
          A calm job-search companion. Apply mindfully, log it, let go.
        </p>
        <a className="btn solid login-action" href="/api/auth/google">
          Continue with Google
        </a>
      </main>
    </div>
  )
}
