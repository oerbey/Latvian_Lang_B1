import { initializeAuth } from './lib/email-auth.js';
import { authProbeErrorSummary } from './lib/auth-probe-errors.js';

const status = document.getElementById('callback-status');
initializeAuth()
  .then(() => location.replace('/word-quest.html'))
  .catch((error) => {
    status.textContent = `Sign-in could not complete${authProbeErrorSummary(error)}. Return to Word Quest to try again.`;
  });
