/**
 * Model health — is the thing making our decisions still trustworthy?
 *
 * A single accuracy figure hides per-class failure, so this page leads with the
 * per-class radar and the confusion matrix, then the macro averages.
 */

import { useQuery } from '@tanstack/react-query'
import { api, ApiError, type ClassLabel } from '../lib/api'
import { SLOW_POLL_MS, qk } from '../lib/query'
import { CLASS_ORDER, classInfo } from '../lib/meta'
import { num, pct, ratio, relTime } from '../lib/format'
import { ChartLegend, ConfusionMatrixGrid, Radar, type RadarSeries } from '../components/charts'
import { Icon } from '../components/ui/Icon'
import { EmptyState, KeyValue, Note, Panel, PanelBody, PanelHead, Skeleton } from '../components/ui'

function NoModel() {
  return (
    <Panel>
      <PanelHead title="Model health" />
      <PanelBody>
        <EmptyState
          glyph="◎"
          title="No model is deployed"
          body="Metrics are computed from the active model. Deploy a trained artifact from the registry to populate this page."
        />
      </PanelBody>
    </Panel>
  )
}

export function ModelHealth() {
  const model = useQuery({
    queryKey: qk.modelMetrics,
    queryFn: ({ signal }) => api.metrics.model(signal),
    refetchInterval: SLOW_POLL_MS,
  })

  if (model.isPending) {
    return (
      <main className="page">
        <div className="page-head">
          <div>
            <h2>Model health</h2>
            <p>Loading metrics…</p>
          </div>
        </div>
        <div className="grid grid-2">
          <Panel>
            <Skeleton height={200} />
          </Panel>
          <Panel>
            <Skeleton height={200} />
          </Panel>
        </div>
        <Panel>
          <Skeleton height={240} />
        </Panel>
      </main>
    )
  }

  if (model.isError) {
    if (model.error instanceof ApiError && model.error.isModelUnavailable) {
      return (
        <main className="page">
          <div className="page-head">
            <div>
              <h2>Model health</h2>
              <p>No active model.</p>
            </div>
          </div>
          <NoModel />
        </main>
      )
    }
    return (
      <main className="page">
        <NoModel />
      </main>
    )
  }

  const data = model.data!
  const overall = data.overall_metrics
  const series: RadarSeries[] = [
    {
      label: 'Precision',
      color: 'var(--cyan)',
      values: CLASS_ORDER.map((c) => data.per_class_metrics[c]?.precision ?? 0),
    },
    {
      label: 'Recall',
      color: 'var(--violet)',
      values: CLASS_ORDER.map((c) => data.per_class_metrics[c]?.recall ?? 0),
    },
    {
      label: 'F1',
      color: 'var(--warn)',
      values: CLASS_ORDER.map((c) => data.per_class_metrics[c]?.f1 ?? 0),
    },
  ]

  // The weakest class is the one that should worry an operator.
  const weakest = [...CLASS_ORDER].sort(
    (a, b) => (data.per_class_metrics[a]?.f1 ?? 0) - (data.per_class_metrics[b]?.f1 ?? 0),
  )[0]

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h2>Model health</h2>
          <p>
            {data.active_model.model_type} trained on {data.active_model.dataset}, deployed{' '}
            {relTime(data.active_model.deployed_at)}.
          </p>
        </div>
        <div className="page-tools">
          <span className="mono faint" style={{ fontSize: 'var(--fs-micro)' }}>
            {data.active_model.version}
          </span>
        </div>
      </div>

      <div className="grid grid-4">
        {(
          [
            ['Accuracy', overall.accuracy, 'var(--cyan)'],
            ['Macro F1', overall.f1_macro, 'var(--ok)'],
            ['Macro recall', overall.recall_macro, 'var(--violet)'],
            ['Macro AUC', overall.auc_macro, 'var(--warn)'],
          ] as const
        ).map(([label, value, color]) => (
          <Panel className="stat stat-sev" key={label} style={{ ['--sev-color' as string]: color }}>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{pct(value)}</div>
            <div className="stat-sub">
              <Icon name="pulse" size={11} />
              macro over {CLASS_ORDER.length} classes
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid grid-2">
        <Panel>
          <PanelHead
            title="Per-class quality"
            kicker="Precision · Recall · F1"
            actions={
              <span className="faint mono" style={{ fontSize: 'var(--fs-micro)' }}>
                weakest: {classInfo(weakest).label} F1 {pct(data.per_class_metrics[weakest]?.f1)}
              </span>
            }
          />
          <PanelBody style={{ display: 'grid', placeItems: 'center' }}>
            <Radar
              axes={CLASS_ORDER.map((c) => classInfo(c).label)}
              series={series}
              size={320}
              min={0}
              max={1}
            />
            <ChartLegend items={series.map((s) => ({ label: s.label, color: s.color }))} />
          </PanelBody>
        </Panel>

        <Panel flush>
          <PanelHead title="Per-class detail" kicker="Support-weighted" />
          <PanelBody>
            <div className="table-wrap">
              <table className="table table-compact">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th className="ta-r">Prec</th>
                    <th className="ta-r">Rec</th>
                    <th className="ta-r">F1</th>
                    <th className="ta-r">AUC</th>
                    <th className="ta-r">Support</th>
                  </tr>
                </thead>
                <tbody>
                  {CLASS_ORDER.map((c: ClassLabel) => {
                    const m = data.per_class_metrics[c]
                    return (
                      <tr key={c}>
                        <td>
                          <span className="class-dot" style={{ background: classInfo(c).color }} />
                          {classInfo(c).label}
                        </td>
                        <td className="ta-r num-cell">{ratio(m?.precision)}</td>
                        <td className="ta-r num-cell">{ratio(m?.recall)}</td>
                        <td className="ta-r num-cell" style={{ color: 'var(--ink)' }}>
                          {ratio(m?.f1)}
                        </td>
                        <td className="ta-r num-cell">{ratio(m?.auc)}</td>
                        <td className="ta-r num-cell faint">{num(m?.support)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHead
          title="Confusion matrix"
          kicker="Rows actual · columns predicted"
          actions={
            <span className="faint mono" style={{ fontSize: 'var(--fs-micro)' }}>
              false positive rate {pct(overall.fpr)}
            </span>
          }
        />
        <PanelBody>
          <ConfusionMatrixGrid
            labels={data.confusion_matrix.labels}
            matrix={data.confusion_matrix.matrix}
            labelFor={(l) => classInfo(l)}
          />
          {data.class_imbalance_note && <Note kind="info">{data.class_imbalance_note}</Note>}
        </PanelBody>
      </Panel>

      <div className="grid grid-2">
        <Panel>
          <PanelHead title="Model provenance" />
          <PanelBody>
            <KeyValue
              items={[
                ['Version', data.active_model.version],
                ['Type', data.active_model.model_type],
                ['Dataset', data.active_model.dataset],
                ['Training date', data.active_model.training_date],
                ['Deployed', relTime(data.active_model.deployed_at)],
              ]}
            />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHead title="Reading these numbers" />
          <PanelBody>
            <ul className="bullets">
              <li>
                <strong>Macro</strong> averages weight every class equally. On NSL-KDD the attack
                classes are rare, so a micro average would be dominated by <code>normal</code>.
              </li>
              <li>
                <strong>Recall</strong> on <code>dos</code> and <code>r2l</code> matters more than
                overall F1 — those are the misses that matter.
              </li>
              <li>
                <strong>False positive rate</strong> is the operational cost: every point of it is
                analyst time spent on nothing.
              </li>
            </ul>
          </PanelBody>
        </Panel>
      </div>
    </main>
  )
}
