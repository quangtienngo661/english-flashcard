import { describe, expect, it } from 'vitest';
import { grantRefusal, touchesAiLimits, type GrantRefusalInput } from './grant-rules.js';

const ACTOR = 'actor';
const LEARNER = { targetId: 'learner', targetRole: null } as const;
const SELF = { targetId: ACTOR, targetRole: null } as const;
const EDITOR = { targetId: 'other-editor', targetRole: 'editor' } as const;
const ADMIN = { targetId: 'an-admin', targetRole: 'admin' } as const;

const ask = (actorRole: 'admin' | 'editor', action: GrantRefusalInput['action'], target: typeof LEARNER | typeof SELF | typeof EDITOR | typeof ADMIN, touches: boolean) =>
  grantRefusal({ action, actorId: ACTOR, actorRole, ...target, touchesAiLimits: touches });

describe('grantRefusal — design §10 table', () => {
  describe('admin: every action on every target is allowed', () => {
    for (const action of ['create', 'revoke', 'update'] as const) {
      for (const [name, target] of Object.entries({ LEARNER, SELF, EDITOR, ADMIN })) {
        for (const touches of [false, true]) {
          it(`${action} for ${name}, AI limits ${touches} → allowed`, () => {
            expect(ask('admin', action, target, touches)).toBeNull();
          });
        }
      }
    }
  });

  describe('editor', () => {
    it('Pro plan or practice limits for a non-staff learner → allowed (create, revoke, update)', () => {
      for (const action of ['create', 'revoke', 'update'] as const) expect(ask('editor', action, LEARNER, false)).toBeNull();
    });

    it('B5E33: editor grants to an admin, another editor, or themselves → target-is-admin / target-is-staff / self-grant', () => {
      expect(ask('editor', 'create', ADMIN, false)).toBe('target-is-admin');
      expect(ask('editor', 'create', EDITOR, false)).toBe('target-is-staff');
      expect(ask('editor', 'create', SELF, false)).toBe('self-grant');
    });

    it('B5E34: editor sets AI limits → ai-limits-admin-only', () => {
      expect(ask('editor', 'create', LEARNER, true)).toBe('ai-limits-admin-only');
    });

    it('B5E82: editor revokes a grant with AI limits (even "AI: 0") → ai-limits-admin-only', () => {
      expect(ask('editor', 'revoke', LEARNER, true)).toBe('ai-limits-admin-only');
    });

    it('B5E38: editor revokes a grant of a learner who became an editor → target-is-staff', () => {
      expect(ask('editor', 'revoke', EDITOR, false)).toBe('target-is-staff');
      expect(ask('editor', 'revoke', ADMIN, false)).toBe('target-is-admin');
    });

    it('B5E97: editor changes the dates of a grant with AI limits, or of an admin / another editor → refused', () => {
      expect(ask('editor', 'update', LEARNER, true)).toBe('ai-limits-admin-only');
      expect(ask('editor', 'update', ADMIN, false)).toBe('target-is-admin');
      expect(ask('editor', 'update', EDITOR, false)).toBe('target-is-staff');
    });

    it('editor self-grant of AI limits → self-grant wins', () => {
      expect(ask('editor', 'create', SELF, true)).toBe('self-grant');
    });
  });
});

describe('touchesAiLimits', () => {
  it('true for any ai_* key, even 0; false for practice only, a plan grant or no limits', () => {
    expect(touchesAiLimits({ ai_practice_per_cycle: 0 })).toBe(true);
    expect(touchesAiLimits({ ai_lookup_per_cycle: 5, practice_sessions_per_day: 3 })).toBe(true);
    expect(touchesAiLimits({ practice_sessions_per_day: 0 })).toBe(false);
    expect(touchesAiLimits(null)).toBe(false);
  });
});
