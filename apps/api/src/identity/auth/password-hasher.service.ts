import { Injectable, type OnModuleInit } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { normalizePassword } from './password-policy.js';

export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class PasswordHasher implements OnModuleInit {
  private active = 0;
  private readonly waiters: Array<() => void> = [];
  private dummyHash: Promise<string> | undefined;

  async onModuleInit(): Promise<void> {
    this.dummyHash ??= this.hash(randomBytes(32).toString('base64url'));
    await this.dummyHash;
  }

  hash(pw: string): Promise<string> {
    return this.withSlot(() => argon2.hash(normalizePassword(pw), ARGON2_OPTIONS));
  }

  verify(hash: string, pw: string): Promise<boolean> {
    return this.withSlot(() => argon2.verify(hash, normalizePassword(pw)));
  }

  async verifyDummy(pw: string): Promise<false> {
    await this.onModuleInit();
    await this.verify(await this.dummyHash!, pw);
    return false;
  }

  private async withSlot<T>(operation: () => Promise<T>): Promise<T> {
    if (this.active >= 4) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    } else {
      this.active++;
    }
    try {
      return await operation();
    } finally {
      // Hand the occupied slot straight to a waiter so new arrivals cannot take it.
      const next = this.waiters.shift();
      if (next) next();
      else this.active--;
    }
  }
}
