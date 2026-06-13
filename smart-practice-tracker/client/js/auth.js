// ── Auth Page Logic ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // If already logged in, go to app
  const { data: { session } } = await sb.auth.getSession();
  if (session) { window.location.href = 'app.html'; return; }

  setupTabs();
  setupSignIn();
  setupSignUp();
  setupForgot();
});

function showMsg(id, text, type = 'error') {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'auth-msg ' + type;
}

function setupTabs() {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  document.getElementById('forgot-link').addEventListener('click', () => switchTab('forgot'));
  document.getElementById('back-to-signin').addEventListener('click', () => switchTab('signin'));
}

function switchTab(name) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  const tab = document.querySelector(`.auth-tab[data-tab="${name}"]`);
  if (tab) tab.classList.add('active');
  document.getElementById(name + '-form').classList.add('active');
}

function setupSignIn() {
  document.getElementById('signin-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;
    const btn = e.target.querySelector('.auth-btn');
    btn.textContent = 'Signing in…'; btn.disabled = true;

    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      showMsg('signin-msg', error.message);
      btn.textContent = 'Sign In'; btn.disabled = false;
    } else {
      window.location.href = 'app.html';
    }
  });
}

function setupSignUp() {
  document.getElementById('signup-form').addEventListener('submit', async e => {
    e.preventDefault();
    const full_name = document.getElementById('signup-name').value.trim();
    const username  = document.getElementById('signup-username').value.trim().replace(/^@/, '');
    const email     = document.getElementById('signup-email').value.trim();
    const password  = document.getElementById('signup-password').value;
    const confirm   = document.getElementById('signup-confirm').value;
    const agreed    = document.getElementById('agree-terms').checked;

    if (password !== confirm) return showMsg('signup-msg', 'Passwords do not match.');
    if (!agreed)               return showMsg('signup-msg', 'Please agree to the Terms & Conditions.');
    if (username.length < 3)   return showMsg('signup-msg', 'Username must be at least 3 characters.');

    const btn = e.target.querySelector('.auth-btn');
    btn.textContent = 'Creating account…'; btn.disabled = true;

    const { error } = await sb.auth.signUp({
      email, password,
      options: {
        data: { full_name, username },
        emailRedirectTo: window.location.origin + '/callback.html'
      }
    });

    if (error) {
      showMsg('signup-msg', error.message);
      btn.textContent = 'Create Account'; btn.disabled = false;
    } else {
      showMsg('signup-msg', 'Account created! Check your email to verify, then sign in.', 'success');
      btn.textContent = 'Create Account'; btn.disabled = false;
      setTimeout(async () => {
        const { data: { session } } = await sb.auth.getSession();
        if (session) window.location.href = 'app.html';
      }, 1500);
    }
  });
}

function setupForgot() {
  document.getElementById('forgot-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    const btn = e.target.querySelector('.auth-btn');
    btn.textContent = 'Sending…'; btn.disabled = true;

    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/callback.html'
    });

    if (error) {
      showMsg('forgot-msg', error.message);
    } else {
      showMsg('forgot-msg', '✓ Reset link sent! Check your inbox.', 'success');
    }
    btn.textContent = 'Send Reset Link'; btn.disabled = false;
  });
}
