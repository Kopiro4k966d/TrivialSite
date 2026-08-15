document.querySelectorAll('.password-toggle').forEach(button => {
  button.addEventListener('click', () => {
    const input = button.parentElement.querySelector('input');
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    button.textContent = visible ? 'Показать' : 'Скрыть';
  });
});
