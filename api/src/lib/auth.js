/* eslint-env node */

function parseClientPrincipal(request) {
  const encoded = request.headers.get('x-ms-client-principal');
  if (!encoded) return null;

  try {
    const principal = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    const userId = typeof principal.userId === 'string' ? principal.userId.trim() : '';
    const identityProvider =
      typeof principal.identityProvider === 'string' ? principal.identityProvider.trim() : '';
    const roles = Array.isArray(principal.userRoles) ? principal.userRoles : [];

    if (!userId || !identityProvider || !roles.includes('authenticated')) return null;

    return { identityProvider, userId };
  } catch {
    return null;
  }
}

function requireClientPrincipal(request) {
  const principal = parseClientPrincipal(request);
  if (principal) return { principal };

  return {
    response: {
      status: 401,
      jsonBody: { error: 'authentication required' },
    },
  };
}

module.exports = {
  parseClientPrincipal,
  requireClientPrincipal,
};
