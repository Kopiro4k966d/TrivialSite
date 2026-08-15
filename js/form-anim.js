document.querySelectorAll('.password-toggle').forEach(button => {
  button.addEventListener('click', () => {
    const input = button.closest('.password-wrap')?.querySelector('input');
    if (!input) return;
    const visible = input.type === 'text'; input.type = visible ? 'password' : 'text'; button.textContent = visible ? '●' : '○';
  });
});
