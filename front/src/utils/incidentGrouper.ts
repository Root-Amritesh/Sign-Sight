import type { UIAlertListItem, Severity } from '../types/api';

export interface Incident {
  id: string;
  attack_family: string;
  severity: Severity;
  alert_count: number;
  first_seen: string;
  last_seen: string;
  status: 'active' | 'investigating' | 'resolved';
  alerts: UIAlertListItem[];
}

export function groupAlertsIntoIncidents(alerts: UIAlertListItem[], windowMinutes = 15): Incident[] {
  if (!alerts || alerts.length === 0) return [];

  // Sort alerts by timestamp ascending
  const sorted = [...alerts].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const incidents: Incident[] = [];
  const windowMs = windowMinutes * 60 * 1000;

  sorted.forEach((alert) => {
    const alertTime = new Date(alert.createdAt).getTime();
    const family = alert.predictedLabel || 'normal';

    // Group in the browser by attack class (predictedLabel) and temporal proximity window
    const existing = incidents.find(
      (inc) =>
        inc.attack_family.toLowerCase() === family.toLowerCase() &&
        Math.abs(alertTime - new Date(inc.last_seen).getTime()) <= windowMs
    );

    if (existing) {
      existing.alerts.push(alert);
      existing.alert_count++;
      existing.last_seen = alert.createdAt;

      // Upgrade incident severity to highest observed
      const SEV_ORDER: Severity[] = ['info', 'low', 'medium', 'high', 'critical'];
      if (SEV_ORDER.indexOf(alert.severity) > SEV_ORDER.indexOf(existing.severity)) {
        existing.severity = alert.severity;
      }
    } else {
      const incId = `INC-${family.toUpperCase()}-${alertTime.toString().slice(-4)}`;
      incidents.push({
        id: incId,
        attack_family: family,
        severity: alert.severity,
        alert_count: 1,
        first_seen: alert.createdAt,
        last_seen: alert.createdAt,
        status: alert.status === 'resolved' ? 'resolved' : 'active',
        alerts: [alert],
      });
    }
  });

  return incidents.sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime());
}
