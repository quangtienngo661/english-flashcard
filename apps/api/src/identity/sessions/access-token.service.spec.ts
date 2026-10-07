import { randomBytes, randomUUID } from 'node:crypto';
import { decodeJwt, decodeProtectedHeader, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { AppConfig } from '../../common/config/app-config.js';
import { testConfig } from '../../../test/support/test-config.js';
import { AccessTokenService } from './access-token.service.js';

describe('AccessTokenService', () => {
  let config: AppConfig;
  let clock: FakeClock;
  let service: AccessTokenService;
  const user = { userId: randomUUID(), sessionChainId: randomUUID() };

  beforeEach(() => {
    config = testConfig();
    clock = new FakeClock(new Date('2026-10-07T12:00:00.750Z'));
    service = new AccessTokenService(config, clock);
  });

  function claims(): JWTPayload {
    const iat = Math.floor(clock.now().getTime() / 1000);
    return {
      sub: user.userId, sid: user.sessionChainId, iat, exp: iat + 900,
      iss: config.jwt.issuer, aud: config.jwt.audience,
    };
  }

  function signClaims(payload: JWTPayload, kid = config.jwt.keys[0].kid, secret = config.jwt.keys[0].secret) {
    return new SignJWT(payload).setProtectedHeader({ alg: 'HS256', kid }).sign(secret);
  }

  it('B1#14: round-trips sub and sid with the configured header, claims and TTL', async () => {
    config.jwt.accessTtlSeconds = 120;
    const token = await service.sign(user);
    expect(await service.verify(token)).toEqual(user);
    expect(decodeProtectedHeader(token)).toEqual({ alg: 'HS256', kid: config.jwt.keys[0].kid });
    expect(decodeJwt(token)).toEqual({ ...claims(), exp: claims().iat! + 120 });
  });

  it('B1#14: rejected after FakeClock +901 s', async () => {
    const token = await service.sign(user);
    clock.advance(901_000);
    expect(await service.verify(token)).toBeNull();
  });

  it('B1#14: expires exactly at exp with no clock tolerance', async () => {
    const token = await service.sign(user);
    clock.set(new Date((claims().exp! - 1) * 1000));
    expect(await service.verify(token)).toEqual(user);
    clock.advance(1000);
    expect(await service.verify(token)).toBeNull();
  });

  it('B1E14: rejects alg none', async () => {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${encode({ alg: 'none', kid: config.jwt.keys[0].kid })}.${encode(claims())}.`;
    expect(await service.verify(token)).toBeNull();
  });

  it('B1E14: rejects a correctly signed RS256 token', async () => {
    const { privateKey } = await generateKeyPair('RS256');
    const token = await new SignJWT(claims())
      .setProtectedHeader({ alg: 'RS256', kid: config.jwt.keys[0].kid }).sign(privateKey);
    expect(await service.verify(token)).toBeNull();
  });

  it('B1E14: rejects unknown kid even when signed with a configured secret', async () => {
    expect(await service.verify(await signClaims(claims(), 'unknown'))).toBeNull();
  });

  it('B1E14: rejects a missing kid', async () => {
    const token = await new SignJWT(claims()).setProtectedHeader({ alg: 'HS256' })
      .sign(config.jwt.keys[0].secret);
    expect(await service.verify(token)).toBeNull();
  });

  it.each([
    ['aud', 'wrong-audience'], ['iss', 'wrong-issuer'],
  ])('B1E14: rejects wrong %s', async (claim, value) => {
    expect(await service.verify(await signClaims({ ...claims(), [claim]: value }))).toBeNull();
  });

  it('B1E14: rejects an invalid signature', async () => {
    expect(await service.verify(await signClaims(claims(), config.jwt.keys[0].kid, randomBytes(32))))
      .toBeNull();
  });

  it.each(['exp', 'iat', 'sub', 'sid'])('B1#37: rejects a correctly signed token without %s', async (claim) => {
    const payload = claims();
    delete payload[claim];
    expect(await service.verify(await signClaims(payload))).toBeNull();
  });

  it.each([
    ['sub', 'x'], ['sub', 42], ['sid', 'x'], ['sid', 42],
    ['exp', '9999999999'], ['iat', '1791374400'],
  ])('B1#37: rejects a correctly signed token with invalid %s %j', async (claim, value) => {
    expect(await service.verify(await signClaims({ ...claims(), [claim]: value }))).toBeNull();
  });

  it.each(['', 'not-a-jwt', 'a.b.c'])('B1E14: malformed token %j returns null', async (token) => {
    expect(await service.verify(token)).toBeNull();
  });

  it('IE10: signs with the first key; the second key verifies until it is dropped', async () => {
    const secondKey = { kid: 'previous', secret: randomBytes(32) };
    config.jwt.keys.push(secondKey);
    expect(decodeProtectedHeader(await service.sign(user)).kid).toBe(config.jwt.keys[0].kid);
    const token = await signClaims(claims(), secondKey.kid, secondKey.secret);
    expect(await service.verify(token)).toEqual(user);
    const rotatedConfig = { ...config, jwt: { ...config.jwt, keys: [config.jwt.keys[0]] } };
    expect(await new AccessTokenService(rotatedConfig, clock).verify(token)).toBeNull();
  });
});
