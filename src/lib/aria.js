export function announceLive(node, message) {
  if (!node) return;
  const next = String(message ?? '');
  if (node.dataset.lastMessage === next) return;
  node.dataset.lastMessage = next;
  node.textContent = '';
  const commit = () => {
    node.textContent = next;
  };
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(commit);
  } else {
    setTimeout(commit, 0);
  }
}
