const { createHash } = require('node:crypto');
const tenantId = '11111111-1111-4111-8111-111111111111';
const spaId = '33333333-3333-4333-8333-333333333333';
const settings = {
  EXTERNAL_AUTH_AUTHORITY: 'https://test.ciamlogin.com/',
  EXTERNAL_AUTH_TENANT_ID: tenantId,
  EXTERNAL_AUTH_ISSUER: `https://test.ciamlogin.com/${tenantId}/v2.0`,
  EXTERNAL_AUTH_API_AUDIENCE: '22222222-2222-4222-8222-222222222222',
  EXTERNAL_AUTH_SPA_CLIENT_ID: spaId,
  EXTERNAL_AUTH_SCOPE: 'progress.access',
  EXTERNAL_AUTH_JWKS_URI: `https://test.ciamlogin.com/${tenantId}/discovery/v2.0/keys`,
};
let keys;
async function identity(oid = '44444444-4444-4444-8444-444444444444', overrides = {}) {
  const jose = await import('jose');
  keys ||= await jose.generateKeyPair('RS256');
  const token = await new jose.SignJWT({
    tid: tenantId,
    oid,
    azp: spaId,
    scp: 'progress.access',
    ver: '2.0',
    ...overrides,
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(settings.EXTERNAL_AUTH_ISSUER)
    .setAudience(settings.EXTERNAL_AUTH_API_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(keys.privateKey);
  return {
    token,
    userId: `extid:${createHash('sha256').update(`${tenantId}\0${oid}`).digest('hex')}`,
    dependencies: { settings, keyResolver: keys.publicKey },
  };
}
module.exports = { identity, settings };
