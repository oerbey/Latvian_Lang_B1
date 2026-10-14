const safeCodes = new Set([
  'access_denied',
  'missing_bearer',
  'invalid_bearer',
  'token_expired',
  'invalid_signature',
  'unrecognized_signing_key',
  'missing_required_claim',
  'issuer_mismatch',
  'audience_mismatch',
  'token_not_active',
  'invalid_token_claim',
  'invalid_token',
  'authentication_unavailable',
  'invalid_version',
  'tenant_mismatch',
  'invalid_user_id',
  'client_mismatch',
  'missing_scope',
  'auth_code_required',
  'consent_required',
  'crypto_nonexistent',
  'endpoints_resolution_error',
  'failed_to_parse_response',
  'get_request_failed',
  'hash_does_not_contain_known_properties',
  'hash_empty_error',
  'interaction_in_progress',
  'interaction_required',
  'invalid_client',
  'invalid_grant',
  'invalid_scope',
  'issuer_validation_failed',
  'login_required',
  'network_error',
  'no_token_request_cache_error',
  'nonce_mismatch',
  'post_request_failed',
  'state_interaction_type_mismatch',
  'state_not_found',
  'temporarily_unavailable',
  'unauthorized_client',
]);

/** Return only allowlisted SDK codes and numeric Entra codes, never raw error details. */
export function authProbeErrorSummary(error) {
  const code = safeCodes.has(error?.errorCode) ? error.errorCode : null;
  const entraCode =
    typeof error?.message === 'string' ? error.message.match(/\bAADSTS\d{5,9}\b/)?.[0] : null;
  const codes = [code, entraCode].filter(Boolean);
  return codes.length ? ` (${codes.join('; ')})` : '';
}
