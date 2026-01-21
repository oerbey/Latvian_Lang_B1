let statusHandler = null;

export function setStatusHandler(handler) {
  statusHandler = typeof handler === 'function' ? handler : null;
}

export function setStatus(message) {
  if (statusHandler) {
    statusHandler(message);
  }
}
