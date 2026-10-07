/**
 * Settings — profile, session, and alert threshold configuration.
 *
 * The whole `config/` namespace is admin only (API_SPEC.md §1.7), including the
 * read side, so the threshold query is gated on the role rather than allowed to
 * fail with a 403. Account, environment, and keyboard sections stay open to
 * every signed-in role.
 */

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api, USE_MOCK, type AlertThresholdConfig, type Severity } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { qk } from '../lib/query'
import { SEVERITY, SEVERITY_ORDER } from '../lib/meta'
import { dt, pct } from '../lib/format'
import { Icon } from '../components/ui/Icon'
import {
  Badge,
  Button,
  Field,
  Note,
  Panel,
  PanelBody,
  PanelHead,
  Skeleton,
  TextInput,
} from '../components/ui'

export function Settings() {
  const { user, isAdmin, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const thresholds = useQuery({
    queryKey: qk.thresholds,
    queryFn: ({ signal }) => api.config.thresholds(signal),
    // §1.7 is admin only on both verbs, so an analyst must not request it.
    enabled: isAdmin,
  })

  const [draft, setDraft] = useState<AlertThresholdConfig | undefined>(undefined)
  // Track the source object so a refetch resets the form. Adjusting state
  // during render is React's documented alternative to a syncing effect.
  const [source, setSource] = useState<AlertThresholdConfig | undefined>(undefined)
  if (thresholds.data !== source) {
    setSource(thresholds.data)
    setDraft(thresholds.data)
  }

  const save = useMutation({
    mutationFn: (body: AlertThresholdConfig) => api.config.updateThresholds(body),
    onSuccess: (next) => {
      setDraft(next)
      qc.setQueryData(qk.thresholds, next)
      toast.push('ok', 'Thresholds saved', 'The change applies to newly scored records.')
    },
    onError: (e) => toast.push('error', 'Save failed', e instanceof Error ? e.message : ''),
  })

  const dirty =
    draft && thresholds.data && JSON.stringify(draft) !== JSON.stringify(thresholds.data)

  function setNumber(key: keyof AlertThresholdConfig, value: string) {
    setDraft((d) => (d ? ({ ...d, [key]: Number(value) } as AlertThresholdConfig) : d))
  }

  function setTier(severity: Severity, value: string) {
    setDraft((d) =>
      d
        ? {
            ...d,
            severity_tiers: {
              ...d.severity_tiers,
              [severity]: { min_confidence: Number(value) },
            },
          }
        : d,
    )
  }

  function toggleNotify(severity: Severity) {
    setDraft((d) =>
      d
        ? {
            ...d,
            notification_severities: d.notification_severities.includes(severity)
              ? d.notification_severities.filter((s) => s !== severity)
              : [...d.notification_severities, severity],
          }
        : d,
    )
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h2>Settings</h2>
          <p>Profile, session, and the detection policy applied to newly scored records.</p>
        </div>
      </div>

      <div className="split-side">
        <div className="grid">
          <Panel>
            <PanelHead title="Account" />
            <PanelBody>
              <div className="row gap-3" style={{ marginBottom: '1rem' }}>
                <span className="avatar" style={{ width: '2.5rem', height: '2.5rem', fontSize: '0.75rem' }}>
                  {user?.username.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <div style={{ fontWeight: 600 }}>{user?.username}</div>
                  <div className="faint mono" style={{ fontSize: 'var(--fs-micro)' }}>
                    {user?.email ?? 'no email on file'}
                  </div>
                </div>
              </div>

              <dl className="kv">
                <dt>Username</dt>
                <dd className="mono">{user?.username}</dd>
                <dt>Role</dt>
                <dd>
                  {user?.role === 'admin' ? (
                    <Badge tone="violet" icon="shield">
                      Administrator
                    </Badge>
                  ) : (
                    <Badge tone="cyan" icon="user">
                      Analyst
                    </Badge>
                  )}
                </dd>
                <dt>Joined</dt>
                <dd>{dt(user?.date_joined)}</dd>
                <dt>Last login</dt>
                <dd>{dt(user?.last_login)}</dd>
              </dl>

              <Button
                block
                variant="ghost"
                icon="logout"
                style={{ marginTop: '1rem' }}
                onClick={() => {
                  logout()
                  navigate('/login', { replace: true })
                }}
              >
                Sign out
              </Button>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHead title="Environment" />
            <PanelBody>
              <dl className="kv">
                <dt>Backend</dt>
                <dd>
                  {USE_MOCK ? (
                    <Badge tone="warn">In-browser mock</Badge>
                  ) : (
                    <Badge tone="ok">Live API</Badge>
                  )}
                </dd>
                <dt>Base URL</dt>
                <dd className="mono break">
                  {USE_MOCK ? 'n/a — mock adapter' : (import.meta.env.VITE_API_BASE_URL ?? '/api')}
                </dd>
                <dt>Poll interval</dt>
                <dd className="mono">{import.meta.env.VITE_ALERT_POLL_MS ?? 5000} ms</dd>
              </dl>
              <Note kind="info">
                {USE_MOCK
                  ? 'The mock adapter serves deterministic seeded data and mutates it in memory. Refreshing resets the store.'
                  : 'Talking to a live Django backend. Sessions use JWT access and refresh tokens.'}
              </Note>
            </PanelBody>
          </Panel>
        </div>

        <div className="grid">
          {!isAdmin && (
            <Panel>
              <PanelHead title="Alerting policy" kicker="Administrator only" />
              <PanelBody>
                <Note kind="info">
                  Detection thresholds are part of the admin-only configuration API. Sign in as an
                  administrator to read or change the policy.
                </Note>
              </PanelBody>
            </Panel>
          )}

          {isAdmin && (
            <>
          <Panel>
            <PanelHead
              title="Alerting policy"
              kicker="Editable"
              actions={
                <Button
                  size="sm"
                  variant="primary"
                  icon="check"
                  disabled={!dirty || save.isPending}
                  onClick={() => draft && save.mutate(draft)}
                >
                  {save.isPending ? 'Saving…' : 'Save'}
                </Button>
              }
            />
            <PanelBody>
              {thresholds.isPending || !draft ? (
                <>
                  <Skeleton height={40} />
                  <Skeleton height={180} />
                </>
              ) : (
                <>
                  <div className="grid grid-2" style={{ gap: '0.75rem' }}>
                    <Field label="Alert when confidence ≥" htmlFor="floor">
                      <TextInput
                        id="floor"
                        type="number"
                        step="0.01"
                        min={0}
                        max={1}
                        value={draft.min_confidence_to_alert}
                        onChange={(e) => setNumber('min_confidence_to_alert', e.target.value)}
                      />
                    </Field>
                    <Field label="Normal uncertainty cutoff" htmlFor="unc">
                      <TextInput
                        id="unc"
                        type="number"
                        step="0.01"
                        min={0}
                        max={1}
                        value={draft.normal_uncertainty_threshold}
                        onChange={(e) => setNumber('normal_uncertainty_threshold', e.target.value)}
                      />
                    </Field>
                  </div>

                  <p className="faint" style={{ fontSize: 'var(--fs-xs)', marginTop: '0.5rem' }}>
                    Records scoring {pct(1 - draft.min_confidence_to_alert, 0)} or lower are treated as{' '}
                    <code>normal</code> regardless of the top class.
                  </p>

                  <div className="sub-head" style={{ marginTop: '1.25rem' }}>
                    <span className="micro">Severity tiers</span>
                    <span className="faint mono" style={{ fontSize: 'var(--fs-micro)' }}>
                      confidence floor per tier
                    </span>
                  </div>

                  <div className="tier-list">
                    {SEVERITY_ORDER.map((s) => (
                      <div className="tier" key={s}>
                        <span className="tier-dot" style={{ background: SEVERITY[s].color }} />
                        <span className="tier-name" style={{ color: SEVERITY[s].color }}>
                          {SEVERITY[s].label}
                        </span>
                        <TextInput
                          type="number"
                          step="0.01"
                          min={0}
                          max={1}
                            className="tier-input"
                          value={draft.severity_tiers[s]?.min_confidence ?? 0}
                          onChange={(e) => setTier(s, e.target.value)}
                        />
                        <label className="tier-notify">
                          <input
                            type="checkbox"
                                checked={draft.notification_severities.includes(s)}
                            onChange={() => toggleNotify(s)}
                          />
                          notify
                        </label>
                      </div>
                    ))}
                  </div>

                  {dirty && (
                    <Note kind="warn">
                      Unsaved changes. Saving writes a <code>PUT</code> and records an audit entry.
                    </Note>
                  )}
                </>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHead title="Severity boosts" kicker="Per attack class" />
            <PanelBody>
              {Object.entries(thresholds.data?.attack_type_severity_boost ?? {}).length === 0 ? (
                <p className="faint" style={{ fontSize: 'var(--fs-sm)' }}>
                  No boosts configured.
                </p>
              ) : (
                <div className="boost-grid">
                  {Object.entries(thresholds.data?.attack_type_severity_boost ?? {}).map(
                    ([label, boost]) => (
                      <div className="boost" key={label}>
                        <span className="mono">{label}</span>
                        <strong style={{ color: Number(boost) > 0 ? 'var(--warn)' : 'var(--ink-faint)' }}>
                          {Number(boost) > 0 ? '+' : ''}
                          {Number(boost).toFixed(2)}
                        </strong>
                      </div>
                    ),
                  )}
                </div>
              )}
              <p className="faint" style={{ fontSize: 'var(--fs-xs)', marginTop: '0.75rem' }}>
                Boosts are added to a detection's severity, so a confirmed remote-to-local never
                ranks below a low-confidence probe.
              </p>
            </PanelBody>
          </Panel>
            </>
          )}

          <Panel>
            <PanelHead title="Keyboard" />
            <PanelBody>
              <ul className="bullets mono">
                <li>
                  <Icon name="search" size={11} /> Filter fields focus with <kbd>Tab</kbd>
                </li>
                <li>
                  <kbd>Enter</kbd> submits the search field on the alerts page
                </li>
              </ul>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </main>
  )
}
