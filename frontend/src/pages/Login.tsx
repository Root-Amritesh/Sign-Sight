/**
 * Sign-in screen.
 *
 * The left panel is a reduced WebGL globe so the console does not feel like a
 * different product from the landing page. Demo personas are only offered when
 * the mock backend is live — against a real deployment they would be lies.
 */

import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, USE_MOCK } from '../lib/api'
import { useAuth } from '../lib/auth'
import { usePrefersReducedMotion } from '../lib/motion'
import { LazyGlobe } from '../components/three/LazyGlobe'
import { BrandMark, Icon } from '../components/ui/Icon'
import { Button, Field, Note, TextInput } from '../components/ui'

const PERSONAS = [
  { username: 'analyst_1', password: 'analyst_pass_123', role: 'Analyst', glyph: '◐', hint: 'Triage only' },
  { username: 'admin', password: 'admin_pass_123', role: 'Administrator', glyph: '◆', hint: 'Full access' },
]

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const reduced = usePrefersReducedMotion()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/app'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.isAuth
            ? 'Those credentials were not accepted.'
            : err.message
          : 'Could not reach the API.',
      )
    } finally {
      setBusy(false)
    }
  }

  function fillPersona(p: (typeof PERSONAS)[number]) {
    setUsername(p.username)
    setPassword(p.password)
    setError(null)
  }

  return (
    <div className="auth">
      <aside className="auth-aside">
        <div className="auth-canvas">
          <LazyGlobe variant="mini" motion={!reduced} />
        </div>
        <div className="auth-aside-veil" />

        <div className="auth-aside-inner">
          <Link to="/" className="brand">
            <BrandMark size={28} />
            <span className="brand-name">
              Sign<em>Sight</em>
            </span>
          </Link>

          <div>
            <h2>The console for the alerts that matter.</h2>
            <p
              style={{
                marginTop: '0.875rem',
                fontSize: 'var(--fs-md)',
                lineHeight: 1.65,
                color: 'var(--ink-dim)',
              }}
            >
              Triage the queue, check the model is still healthy, and see drift before it becomes
              an incident.
            </p>
          </div>

          <ul className="auth-points">
            <li>
              <Icon name="pulse" size={14} />
              Per-class precision, recall, F1, and AUC
            </li>
            <li>
              <Icon name="drift" size={14} />
              Population stability against the training set
            </li>
            <li>
              <Icon name="audit" size={14} />
              Every triage action written to the audit log
            </li>
          </ul>
        </div>
      </aside>

      <div className="auth-panel">
        <div className="auth-card">
          <span className="micro">SignSight console</span>
          <h1 className="auth-title">Sign in</h1>
          <p className="auth-sub">Use your SOC analyst or administrator account.</p>

          <form className="auth-form" onSubmit={onSubmit}>
            <Field label="Username" htmlFor="username">
              <TextInput
                id="username"
                name="username"
                autoComplete="username"
                autoFocus
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="analyst_1"
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <TextInput
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </Field>

            {error && <Note kind="danger" icon="warning">{error}</Note>}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              disabled={busy}
              icon={busy ? undefined : 'arrowRight'}
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          {USE_MOCK && (
            <div className="personas">
              <span className="micro">Demo accounts — click to fill</span>
              {PERSONAS.map((p) => (
                <button type="button" className="persona" key={p.username} onClick={() => fillPersona(p)}>
                  <span className="persona-glyph">{p.glyph}</span>
                  <span>
                    <span className="persona-name">{p.username}</span>
                    <br />
                    <span className="persona-role">{p.role}</span>
                  </span>
                  <span className="persona-hint">{p.hint}</span>
                </button>
              ))}
            </div>
          )}

          <div className="auth-foot">
            <Link to="/" className="lnav-link" style={{ padding: 0 }}>
              ← Back to overview
            </Link>
            <div style={{ marginTop: '0.5rem' }}>
              {USE_MOCK ? 'Mock backend · no Django required' : 'Live API · VITE_USE_MOCK=false'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
