(() => {
  const modal = document.getElementById('paymentModal');
  if (!modal) return;
  const name = document.getElementById('orderName');
  const price = document.getElementById('orderPrice');
  const hint = document.getElementById('paymentHint');
  const continueButton = document.getElementById('continuePayment');
  const links = {
    week: 'https://funpay.com/lots/offer?id=68733469',
    month: 'https://funpay.com/lots/offer?id=73921141',
    quarter: '/payment-success?plan=quarter'
  };
  const supportUrl = '';
  let selected = { plan: 'month', name: 'Стандартный', price: '899 ₽' };
  let method = 'funpay';

  function updateAction() {
    if (method === 'support' && !supportUrl) {
      hint.textContent = 'Ссылка поддержки пока не настроена.';
      continueButton.disabled = true;
      continueButton.textContent = 'Поддержка недоступна';
      return;
    }
    hint.textContent = selected.plan === 'quarter'
      ? 'Для тарифа 90 дней используется демонстрационная страница. Подключите реальную платёжную ссылку.'
      : '';
    continueButton.disabled = false;
    continueButton.textContent = method === 'support' ? 'Открыть поддержку →' : 'Перейти к оплате →';
  }

  const close = () => {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  };

  document.querySelectorAll('[data-buy]').forEach(button => button.addEventListener('click', () => {
    selected = { plan: button.dataset.plan, name: button.dataset.name, price: button.dataset.price };
    name.textContent = selected.name;
    price.textContent = selected.price;
    method = 'funpay';
    document.querySelectorAll('.payment-method').forEach(element => element.classList.toggle('selected', element.dataset.payment === method));
    updateAction();
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }));

  modal.querySelectorAll('[data-close-modal]').forEach(button => button.addEventListener('click', close));
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });

  document.querySelectorAll('.payment-method').forEach(button => button.addEventListener('click', () => {
    method = button.dataset.payment || 'funpay';
    document.querySelectorAll('.payment-method').forEach(element => element.classList.remove('selected'));
    button.classList.add('selected');
    updateAction();
  }));

  continueButton.addEventListener('click', () => {
    const target = method === 'support' ? supportUrl : links[selected.plan];
    if (!target) return;
    localStorage.setItem('trivial_selected_plan', JSON.stringify({ ...selected, method }));
    location.href = target;
  });
})();
