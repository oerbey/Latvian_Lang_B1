let statusHandler = null;

/**
 * Register callback to handle status messages (e.g., error/feedback text).
 * @param {(message: string | null) => void} handler
 */
export function setStatusHandler(handler) {
  statusHandler = typeof handler === 'function' ? handler : null;
}

/**
 * Dispatch status message to registered handler (e.g., display in UI).
 * @param {string | null} message
 */
export function setStatus(message) {
  if (statusHandler) {
    statusHandler(message);
  }
}
