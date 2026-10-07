/** 404 — a dead end still has to look like part of the product. */

import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { BrandMark } from '../components/ui/Icon'
import { LinkButton } from '../components/ui'

export function NotFound() {
  const { user } = useAuth()

  return (
    <main className="nf">
      <BrandMark size={44} />
      <div className="nf-code">404</div>
      <h1 className="nf-title">No route matches that address</h1>
      <p className="nf-text">
        The path you asked for does not exist in this build. Nothing was logged, and nothing is
        broken on the server side.
      </p>
      <div className="row gap-2" style={{ marginTop: '0.5rem' }}>
        <LinkButton to={user ? '/app' : '/'} variant="primary" icon="arrowRight">
          {user ? 'Back to dashboard' : 'Back to overview'}
        </LinkButton>
        <Link to="/login" className="btn">
          Sign in
        </Link>
      </div>
    </main>
  )
}
