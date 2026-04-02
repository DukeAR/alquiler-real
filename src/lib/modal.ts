export function showLoginModal() {
  window.dispatchEvent(new CustomEvent('open-login'));
}

export function closeLoginModal() {
  window.dispatchEvent(new CustomEvent('close-login'));
}
