/**
 * In-memory diagnostics logger for API shape mismatches and contract checks.
 * Displayed on /app/connection.
 */

export interface ShapeMismatchEntry {
  endpoint: string;
  timestamp: string;
  fieldPath: string;
  expected: string;
  received: unknown;
  rawPayload: unknown;
}

export interface ContractCheckResult {
  endpoint: string;
  method: string;
  status: number | 'NETWORK_ERROR' | 'CORS_ERROR';
  latencyMs: number;
  passed: boolean;
  shapeMismatch?: string;
  errorDetail?: string;
}

export interface DetectedDifferences {
  loginField: 'username' | 'email' | 'unknown';
  thresholdField: 'novelty_threshold' | 'anomaly_score_novelty_threshold' | 'unknown';
  refreshHasRotatedToken: boolean | 'unknown';
}

class DiagnosticsStore {
  private mismatches: ShapeMismatchEntry[] = [];
  private contractResults: ContractCheckResult[] = [];
  private differences: DetectedDifferences = {
    loginField: 'unknown',
    thresholdField: 'unknown',
    refreshHasRotatedToken: 'unknown',
  };

  public recordMismatch(entry: Omit<ShapeMismatchEntry, 'timestamp'>) {
    const fullEntry: ShapeMismatchEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    this.mismatches.unshift(fullEntry);
    if (this.mismatches.length > 50) this.mismatches.pop();
    console.warn('[Contract Mismatch]', fullEntry);
  }

  public getMismatches(): ShapeMismatchEntry[] {
    return [...this.mismatches];
  }

  public setContractResults(results: ContractCheckResult[]) {
    this.contractResults = results;
  }

  public getContractResults(): ContractCheckResult[] {
    return [...this.contractResults];
  }

  public setDifference<K extends keyof DetectedDifferences>(key: K, value: DetectedDifferences[K]) {
    this.differences[key] = value;
  }

  public getDifferences(): DetectedDifferences {
    return { ...this.differences };
  }

  public generateReport(): string {
    const date = new Date().toISOString();
    return [
      `=== SignSight Connection & Contract Diagnostics ===`,
      `Generated: ${date}`,
      ``,
      `-- Detected Schema Variants --`,
      `Login payload field: ${this.differences.loginField}`,
      `Threshold novelty field: ${this.differences.thresholdField}`,
      `Refresh payload returns new refresh token: ${this.differences.refreshHasRotatedToken}`,
      ``,
      `-- Contract Check Results (${this.contractResults.length} endpoints tested) --`,
      ...this.contractResults.map(
        (r) =>
          `[${r.passed ? 'PASS' : 'FAIL'}] ${r.method} ${r.endpoint} -> Status: ${r.status} (${r.latencyMs}ms)${
            r.shapeMismatch ? ` | Mismatch: ${r.shapeMismatch}` : ''
          }${r.errorDetail ? ` | Error: ${r.errorDetail}` : ''}`
      ),
      ``,
      `-- Schema Mismatch Log (${this.mismatches.length} events) --`,
      ...this.mismatches.map(
        (m) =>
          `[${m.timestamp}] ${m.endpoint} - Field: ${m.fieldPath} (Expected: ${m.expected})`
      ),
    ].join('\n');
  }
}

export const diagnostics = new DiagnosticsStore();
