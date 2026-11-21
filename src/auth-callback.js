import { initializeAuth } from './lib/email-auth.js';
import { authProbeErrorSummary } from './lib/auth-probe-errors.js';
import { consumeAuthReturn, readAuthReturn } from './lib/auth-return.js';

const status = document.getElementById('callback-status');
document.getElementById('callback-return').href = readAuthReturn();
initializeAuth()
  .then(() => location.replace(consumeAuthReturn()))
  .catch((error) => {
    status.textContent = `Sign-in could not complete${authProbeErrorSummary(error)}. Use the return link to try again.`;
  });
