(() => {
  const modal = document.getElementById('paymentModal');
  if (!modal) return;
  const name = document.getElementById('orderName');
  const price = document.getElementById('orderPrice');
  const continueButton = document.getElementById('continuePayment');
  const links = {
    week: 'https://funpay.com/lots/offer?id=68733469',
    month: 'https://funpay.com/lots/offer?id=73921141',
    quarter: 'payment-success.html?plan=quarter'
  };
  let selected = { plan: 'month', name: 'Стандартный', price: '899 ₽' };
  const close = () => { modal.classList.remove('open'); document.body.style.overflow = ''; };
  document.querySelectorAll('[data-buy]').forEach(button => button.addEventListener('click', () => {
    selected = { plan: button.dataset.plan, name: button.dataset.name, price: button.dataset.price };
    name.textContent = selected.name; price.textContent = selected.price;
    modal.classList.add('open'); document.body.style.overflow = 'hidden';
  }));
  modal.querySelectorAll('[data-close-modal]').forEach(button => button.addEventListener('click', close));
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  document.querySelectorAll('.payment-method').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('selected')); button.classList.add('selected');
  }));
  continueButton.addEventListener('click', () => { localStorage.setItem('trivial_selected_plan', JSON.stringify(selected)); location.href = links[selected.plan] || 'payment-success.html'; });
})();
