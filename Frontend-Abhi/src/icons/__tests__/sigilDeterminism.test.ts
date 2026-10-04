import { describe, it, expect } from 'vitest';
import { generateSigilData, fnv1a } from '../sigilGenerator';

/**
 * Determinism verification suite for Sigil Generator.
 */
export function runSigilDeterminismTests(): { passed: boolean; message: string } {
  const testId = '10.0.0.5';

  // 1. Consistency check: run 1,000 times and verify identical outputs
  const baseline = generateSigilData(testId);
  const baselineJson = JSON.stringify(baseline);

  for (let i = 0; i < 1000; i++) {
    const current = generateSigilData(testId);
    if (JSON.stringify(current) !== baselineJson) {
      return {
        passed: false,
        message: `Determinism failure on iteration ${i} for input "${testId}"`,
      };
    }
  }

  // 2. Uniqueness test: different inputs must generate different hashes
  const distinctInputs = [
    '10.0.0.5',
    '192.168.1.1',
    '172.16.4.12',
    'alt-940182',
    'alt-940179',
    '203.0.113.195',
  ];
  const hashes = new Set<number>();
  for (const input of distinctInputs) {
    const hash = fnv1a(input);
    if (hashes.has(hash)) {
      return {
        passed: false,
        message: `Collision detected for input "${input}"`,
      };
    }
    hashes.add(hash);
  }

  // 3. Severity tint check
  const critData = generateSigilData('10.0.0.1', 'critical');
  if (critData.strokeColor !== 'var(--sev-critical)') {
    return {
      passed: false,
      message: `Expected critical stroke color to be var(--sev-critical), got ${critData.strokeColor}`,
    };
  }

  const highData = generateSigilData('10.0.0.1', 'high');
  if (highData.strokeColor !== 'var(--sev-high)') {
    return {
      passed: false,
      message: `Expected high stroke color to be var(--sev-high), got ${highData.strokeColor}`,
    };
  }

  return {
    passed: true,
    message: 'All sigil determinism & collision tests passed successfully (1000 iterations checked).',
  };
}

describe('Sigil Determinism & Generator Suite', () => {
  it('passes 1,000 iterations and collision verification', () => {
    const result = runSigilDeterminismTests();
    expect(result.passed).toBe(true);
  });
});

