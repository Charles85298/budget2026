document.getElementById('show-password').addEventListener('click', () => {
  const input = document.getElementById('password');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  document.getElementById('show-password').textContent = show ? 'Hide' : 'Show';
});
document.getElementById('login-form').addEventListener('submit', event => {
  event.preventDefault();
  alert('Sign-in will be enabled when Supabase authentication is connected. You can explore the sample dashboard now.');
});
