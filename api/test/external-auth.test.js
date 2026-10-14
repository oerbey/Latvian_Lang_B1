/* eslint-env node */
const test = require('node:test');
const assert = require('node:assert/strict');
const { authProbeHandler } = require('../src/functions/authProbe');
const { authProbeConfigHandler } = require('../src/functions/authProbeConfig');
const {
  requireExternalAccessToken,
  readExternalAuthSettings,
} = require('../src/lib/external-auth');

const tenantId = '11111111-1111-4111-8111-111111111111';
const apiId = '22222222-2222-4222-8222-222222222222';
const spaId = '33333333-3333-4333-8333-333333333333';
const userId = '44444444-4444-4444-8444-444444444444';
const issuer = `https://test.ciamlogin.com/${tenantId}/v2.0`;
const settings = {
  EXTERNAL_AUTH_AUTHORITY: 'https://test.ciamlogin.com/',
  AUTH_PROBE_ENABLED: 'true',
  COSMOS_PROGRESS_CONTAINER: 'progress_dev',
  EXTERNAL_AUTH_ISSUER: issuer,
  EXTERNAL_AUTH_TENANT_ID: tenantId,
  EXTERNAL_AUTH_API_AUDIENCE: apiId,
  EXTERNAL_AUTH_SPA_CLIENT_ID: spaId,
  EXTERNAL_AUTH_SCOPE: 'progress.access',
  EXTERNAL_AUTH_JWKS_URI: `https://test.ciamlogin.com/${tenantId}/discovery/v2.0/keys`,
};

test('probe config returns only public values and is absent when disabled', async () => {
  const response = await authProbeConfigHandler({}, { settings });
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(response.jsonBody).sort(), [
    'authority',
    'clientId',
    'knownAuthorities',
    'scope',
  ]);
  assert.deepEqual(response.jsonBody.knownAuthorities, ['test.ciamlogin.com']);
  const guidIssuer = `https://${tenantId}.ciamlogin.com/${tenantId}/v2.0`;
  const guidResponse = await authProbeConfigHandler(
    {},
    {
      settings: { ...settings, EXTERNAL_AUTH_ISSUER: guidIssuer },
    },
  );
  assert.deepEqual(guidResponse.jsonBody.knownAuthorities, [
    'test.ciamlogin.com',
    `${tenantId}.ciamlogin.com`,
  ]);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.equal(
    (await authProbeConfigHandler({}, { settings: { ...settings, AUTH_PROBE_ENABLED: 'false' } }))
      .status,
    404,
  );
  assert.equal(
    (
      await authProbeConfigHandler(
        {},
        { settings: { ...settings, EXTERNAL_AUTH_AUTHORITY: 'https://evil.example/' } },
      )
    ).status,
    503,
  );
});

function request(token, otherHeaders = {}) {
  return {
    headers: new Headers({
      ...(token ? { 'X-Latvian-Authorization': `Bearer ${token}` } : {}),
      ...otherHeaders,
    }),
  };
}

async function fixture() {
  const jose = await import('jose');
  const { privateKey, publicKey } = await jose.generateKeyPair('RS256');
  const sign = (claims = {}, options = {}) =>
    new jose.SignJWT({
      tid: tenantId,
      oid: userId,
      azp: spaId,
      scp: 'progress.access',
      ver: '2.0',
      ...claims,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(options.issuer || issuer)
      .setAudience(options.audience || apiId)
      .setIssuedAt()
      .setExpirationTime(options.expiration || '5m')
      .sign(privateKey);
  return { sign, publicKey, jose, privateKey };
}

test('probe validates signed access tokens and returns only acceptance status', async () => {
  const { sign, publicKey } = await fixture();
  const token = await sign();
  const deps = { settings, keyResolver: publicKey };
  const auth = await requireExternalAccessToken(request(token), deps);
  assert.match(auth.principal.userId, /^extid:[a-f0-9]{64}$/);
  assert.equal(auth.principal.identityProvider, 'external-id');
  const response = await authProbeHandler(request(token), deps);
  assert.deepEqual(response.jsonBody, { ok: true });
  assert.equal(response.status, 200);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.equal(JSON.stringify(response).includes(userId), false);
  const another = await requireExternalAccessToken(request(await sign({ oid: spaId })), deps);
  assert.notEqual(auth.principal.userId, another.principal.userId);
});

test('invalid signatures, issuer, audience, lifetime and user claims fail closed', async () => {
  const { sign, publicKey, jose } = await fixture();
  const deps = { settings, keyResolver: publicKey };
  const otherKeys = await jose.generateKeyPair('RS256');
  const cases = [
    await sign({}, { issuer: 'https://other.ciamlogin.com/other/v2.0' }),
    await sign({}, { audience: spaId }),
    await sign({}, { expiration: Math.floor(Date.now() / 1000) - 120 }),
    await sign({ nbf: Math.floor(Date.now() / 1000) + 120 }),
    await sign({ tid: spaId }),
    await sign({ oid: '' }),
    await sign({ ver: '1.0' }),
    await new jose.SignJWT({}).setProtectedHeader({ alg: 'RS256' }).sign(otherKeys.privateKey),
    'broken.token.value',
  ];
  for (const token of cases) {
    assert.equal((await requireExternalAccessToken(request(token), deps)).response.status, 401);
  }
  const unsigned = await new jose.UnsecuredJWT({}).encode();
  assert.equal((await requireExternalAccessToken(request(unsigned), deps)).response.status, 401);
});

test('delegated scope and authorized client are required; SWA headers grant no probe access', async () => {
  const { sign, publicKey } = await fixture();
  const deps = { settings, keyResolver: publicKey };
  for (const claims of [
    { scp: 'other.scope' },
    { scp: '' },
    { azp: apiId },
    { roles: ['progress.access'], scp: undefined },
  ]) {
    assert.equal(
      (await requireExternalAccessToken(request(await sign(claims)), deps)).response.status,
      403,
    );
  }
  const principal = Buffer.from(
    JSON.stringify({ userId, identityProvider: 'aad', userRoles: ['authenticated'] }),
  ).toString('base64');
  assert.equal(
    (await authProbeHandler(request(null, { 'x-ms-client-principal': principal }), deps)).status,
    401,
  );
});

test('probe is disabled by default and unavailable against production containers', async () => {
  for (const overrides of [
    { AUTH_PROBE_ENABLED: undefined },
    { AUTH_PROBE_ENABLED: 'false' },
    { COSMOS_PROGRESS_CONTAINER: 'progress_prod' },
  ]) {
    const response = await authProbeHandler(request('broken.token.value'), {
      settings: { ...settings, ...overrides },
    });
    assert.equal(response.status, 404);
  }
});

test('trust configuration and signing-key outages produce controlled errors', async () => {
  const { sign } = await fixture();
  for (const overrides of [
    { EXTERNAL_AUTH_JWKS_URI: 'http://localhost/keys' },
    { EXTERNAL_AUTH_ISSUER: 'https://evil.example/v2.0' },
    { EXTERNAL_AUTH_API_AUDIENCE: spaId },
    { EXTERNAL_AUTH_SCOPE: '' },
  ]) {
    assert.throws(() => readExternalAuthSettings({ ...settings, ...overrides }));
    const response = await authProbeHandler(request(await sign()), {
      settings: { ...settings, ...overrides },
    });
    assert.equal(response.status, 503);
  }
  const response = await authProbeHandler(request(await sign()), {
    settings,
    keyResolver: () => {
      throw new Error('private network diagnostic');
    },
  });
  assert.deepEqual(response.jsonBody, {
    error: 'authentication service unavailable',
    code: 'authentication_unavailable',
  });
});

test('only the Dev probe exposes bounded rejection codes without token claims', async () => {
  const { sign, publicKey } = await fixture();
  const deps = { settings, keyResolver: publicKey };
  const cases = [
    [null, 'missing_bearer'],
    ['not-a-token', 'invalid_bearer'],
    [await sign({}, { audience: spaId }), 'audience_mismatch'],
    [await sign({}, { issuer: 'https://other.ciamlogin.com/other/v2.0' }), 'issuer_mismatch'],
    [await sign({}, { expiration: Math.floor(Date.now() / 1000) - 120 }), 'token_expired'],
    [await sign({ tid: spaId }), 'tenant_mismatch'],
    [await sign({ oid: '' }), 'invalid_user_id'],
    [await sign({ ver: '1.0' }), 'invalid_version'],
    [await sign({ azp: apiId }), 'client_mismatch'],
    [await sign({ scp: 'other.scope' }), 'missing_scope'],
  ];
  for (const [token, code] of cases) {
    const response = await authProbeHandler(request(token), deps);
    assert.equal(response.jsonBody.code, code);
    assert.deepEqual(Object.keys(response.jsonBody).sort(), ['code', 'error']);
    const base = await requireExternalAccessToken(request(token), deps);
    assert.equal(base.response.jsonBody.code, undefined);
  }
  const platformHeader = await authProbeHandler(
    request(null, { Authorization: `Bearer ${await sign()}` }),
    deps,
  );
  assert.equal(platformHeader.jsonBody.code, 'missing_bearer');
  const preserved = await authProbeHandler(
    request(await sign(), { Authorization: 'Bearer platform-managed-token' }),
    deps,
  );
  assert.deepEqual(preserved.jsonBody, { ok: true });
  const disabled = await authProbeHandler(request(null), {
    settings: { ...settings, COSMOS_PROGRESS_CONTAINER: 'progress_prod' },
  });
  assert.deepEqual(disabled.jsonBody, { error: 'not available' });
});
