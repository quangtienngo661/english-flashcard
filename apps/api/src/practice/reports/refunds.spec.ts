import { describe, expect, it } from 'vitest';
import { allowedStatus, refundDecision } from './refunds.js';

describe('allowedStatus (design §9.3)', () => {
  it.each([
    ['rule', 'no_error', true], ['rule', 'fixed', true], ['rule', 'confirmed', false],
    ['ai', 'no_error', true], ['ai', 'confirmed', true], ['ai', 'fixed', false],
  ] as const)('B7E84: a %s question resolved %s → %s', (source, status, expected) => {
    expect(allowedStatus(source, status)).toBe(expected);
  });
});

describe('refundDecision (design §9.3, D27)', () => {
  it.each([
    ['B7E73: confirmed, refundable reason, charged', { questionSource: 'ai', aiCharged: true, status: 'confirmed' }, true, 'refund'],
    ['B7E75 / B7E118: confirmed but the question was free', { questionSource: 'ai', aiCharged: false, status: 'confirmed' }, true, 'no-refund'],
    ['confirmed with a reason that is not refundable', { questionSource: 'ai', aiCharged: true, status: 'confirmed' }, false, 'no-refund'],
    ['no_error on a charged AI question', { questionSource: 'ai', aiCharged: true, status: 'no_error' }, true, 'no-refund'],
    ['fixed on a rule question', { questionSource: 'rule', aiCharged: false, status: 'fixed' }, true, 'no-refund'],
  ] as const)('%s → %s', (_name, report, refundable, expected) => {
    expect(refundDecision(report, { refundable })).toBe(expected);
  });
});
