/* eslint-env node */
const { createHash } = require('node:crypto');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const resolvers = new Map();

function trustedUrl(value) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    (url.port && url.port !== '443') ||
    !(url.hostname.endsWith('.ciamlogin.com') || url.hostname === 'login.microsoftonline.com')
  ) {
    throw new Error('Invalid authority configuration');
  }
  return url;
}

/** Read server-owned trust settings; no token-supplied URL can select an issuer or key server. */
function readExternalAuthSettings(settings = process.env) {
  const issuer = settings.EXTERNAL_AUTH_ISSUER;
  const tenantId = settings.EXTERNAL_AUTH_TENANT_ID;
  const audience = settings.EXTERNAL_AUTH_API_AUDIENCE;
  const spaClientId = settings.EXTERNAL_AUTH_SPA_CLIENT_ID;
  const scope = settings.EXTERNAL_AUTH_SCOPE;
  const jwksUrl = trustedUrl(settings.EXTERNAL_AUTH_JWKS_URI);
  const issuerUrl = trustedUrl(issuer);
  if (
    !UUID.test(tenantId || '') ||
    !UUID.test(audience || '') ||
    !UUID.test(spaClientId || '') ||
    audience.toLowerCase() === spaClientId.toLowerCase() ||
    !/^[a-zA-Z0-9._-]+$/.test(scope || '') ||
    issuerUrl.search ||
    !issuerUrl.pathname.toLowerCase().includes(`/${tenantId.toLowerCase()}/`) ||
    !issuerUrl.pathname.endsWith('/v2.0')
  ) {
    throw new Error('Invalid authentication configuration');
  }
  return { issuer, tenantId, audience, spaClientId, scope, jwksUrl };
}

async function remoteKeys(config, jose) {
  const key = config.jwksUrl.href;
  if (!resolvers.has(key)) {
    resolvers.set(
      key,
      jose.createRemoteJWKSet(config.jwksUrl, {
        timeoutDuration: 5000,
        cooldownDuration: 30000,
        cacheMaxAge: 10 * 60 * 1000,
      }),
    );
  }
  return resolvers.get(key);
}

function rejectionReason(error) {
  const codes = {
    ERR_JWT_EXPIRED: 'token_expired',
    ERR_JWS_SIGNATURE_VERIFICATION_FAILED: 'invalid_signature',
    ERR_JWKS_NO_MATCHING_KEY: 'unrecognized_signing_key',
  };
  if (codes[error.code]) return codes[error.code];
  if (error.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
    if (error.reason === 'missing') return 'missing_required_claim';
    return (
      { iss: 'issuer_mismatch', aud: 'audience_mismatch', nbf: 'token_not_active' }[error.claim] ||
      'invalid_token_claim'
    );
  }
  return 'invalid_token';
}

/** Validate an API access token and derive ownership only from verified tenant/user claims. */
async function requireExternalAccessToken(request, { settings = process.env, keyResolver } = {}) {
  const unauthorized = { status: 401, jsonBody: { error: 'authentication required' } };
  // SWA reserves Authorization for its managed Function gateway token.
  const authorization = request.headers.get('x-latvian-authorization') || '';
  const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(authorization);
  if (!match || authorization.length > 16 * 1024) {
    return { response: unauthorized, reason: authorization ? 'invalid_bearer' : 'missing_bearer' };
  }

  let config;
  let payload;
  try {
    config = readExternalAuthSettings(settings);
    const jose = await import('jose');
    const keys = keyResolver || (await remoteKeys(config, jose));
    ({ payload } = await jose.jwtVerify(match[1], keys, {
      issuer: config.issuer,
      audience: config.audience,
      algorithms: ['RS256'],
      requiredClaims: ['exp', 'iat', 'iss', 'aud', 'tid', 'oid', 'ver'],
      clockTolerance: 30,
    }));
  } catch (error) {
    const invalidToken = [
      'ERR_JWT_EXPIRED',
      'ERR_JWT_CLAIM_VALIDATION_FAILED',
      'ERR_JWS_SIGNATURE_VERIFICATION_FAILED',
      'ERR_JOSE_ALG_NOT_ALLOWED',
      'ERR_JWS_INVALID',
      'ERR_JWT_INVALID',
      'ERR_JWKS_NO_MATCHING_KEY',
      'ERR_JOSE_NOT_SUPPORTED',
    ].includes(error.code);
    return {
      reason: invalidToken ? rejectionReason(error) : 'authentication_unavailable',
      response: invalidToken
        ? unauthorized
        : { status: 503, jsonBody: { error: 'authentication service unavailable' } },
    };
  }

  if (payload.ver !== '2.0' || payload.tid !== config.tenantId || !UUID.test(payload.oid || '')) {
    const reason =
      payload.ver !== '2.0'
        ? 'invalid_version'
        : payload.tid !== config.tenantId
          ? 'tenant_mismatch'
          : 'invalid_user_id';
    return { response: unauthorized, reason };
  }
  if (
    payload.azp !== config.spaClientId ||
    typeof payload.scp !== 'string' ||
    !payload.scp.split(/\s+/).includes(config.scope)
  ) {
    return {
      response: { status: 403, jsonBody: { error: 'access not permitted' } },
      reason: payload.azp !== config.spaClientId ? 'client_mismatch' : 'missing_scope',
    };
  }

  const userId = `extid:${createHash('sha256')
    .update(`${payload.tid}\0${payload.oid}`)
    .digest('hex')}`;
  return { principal: { userId, identityProvider: 'external-id' } };
}

module.exports = { readExternalAuthSettings, requireExternalAccessToken };
