/* ============================================================
   SpeakFlow AI – login.js
   ============================================================ */
'use strict';

// Admin credentials
const ADMIN_EMAIL = 'admin@speakflow.ai';
const ADMIN_PASS  = 'admin123';

// Redirect if already logged in
(function(){
  const s = JSON.parse(localStorage.getItem('sf_session')||'null');
  if(s && s.loggedIn){
    if(s.isAdmin) window.location.href='admin.html';
    else window.location.href='index.html';
  }
})();

/* ── Particles ─────────────────────────────────────────────── */
(function(){
  const c=document.getElementById('authParticles');
  for(let i=0;i<20;i++){
    const p=document.createElement('div');p.className='particle';
    const sz=Math.random()*5+2;
    Object.assign(p.style,{width:sz+'px',height:sz+'px',left:Math.random()*100+'%',bottom:'-10px',animationDuration:(Math.random()*20+15)+'s',animationDelay:(Math.random()*10)+'s',opacity:Math.random()*.4+.1});
    c.appendChild(p);
  }
})();

/* ── Remember Me pre-fill ──────────────────────────────────── */
const remembered = localStorage.getItem('sf_remember');
if(remembered){
  document.getElementById('loginEmail').value = remembered;
  document.getElementById('rememberMe').checked = true;
}

document.addEventListener('DOMContentLoaded', () => {

  const togglePass = document.getElementById('togglePass');
  const loginForm = document.getElementById('loginForm');
  const forgotBtn = document.getElementById('forgotBtn');
  const forgotClose = document.getElementById('forgotClose');
  const forgotModal = document.getElementById('forgotModal');
  const forgotSubmit = document.getElementById('forgotSubmit');

  // Show/Hide Password
  if (togglePass) {
    togglePass.addEventListener('click', () => {
      const inp = document.getElementById('loginPass');
      const icon = document.querySelector('#togglePass i');
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      icon.className = show ? 'fas fa-eye-slash' : 'fas fa-eye';
    });
  }

  // Login Form
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const email = document.getElementById('loginEmail').value.trim().toLowerCase();
      const pass = document.getElementById('loginPass').value;
      const remember = document.getElementById('rememberMe').checked;
      const globalErr = document.getElementById('globalErr');
      const btnText = document.getElementById('loginBtnText');
      const btnLoader = document.getElementById('loginBtnLoader');

      if (globalErr) globalErr.textContent = '';

      let valid = true;

      if (!email) {
        document.getElementById('emailErr').textContent = 'Email is required.';
        valid = false;
      } else {
        document.getElementById('emailErr').textContent = '';
      }

      if (!pass) {
        document.getElementById('passErr').textContent = 'Password is required.';
        valid = false;
      } else {
        document.getElementById('passErr').textContent = '';
      }

      if (!valid) return;

      if (btnText) btnText.style.display = 'none';
      if (btnLoader) btnLoader.style.display = 'flex';

      setTimeout(() => {

        // Admin check
        if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
          if (remember) localStorage.setItem('sf_remember', email);
          else localStorage.removeItem('sf_remember');

          localStorage.setItem('sf_session', JSON.stringify({
            loggedIn: true,
            name: 'Admin',
            email,
            isAdmin: true
          }));

          window.location.href = 'admin.html';
          return;
        }

        // User check
        const users = JSON.parse(localStorage.getItem('sf_users') || '[]');
        const user = users.find(u => u.email === email && u.password === pass);

        if (btnText) btnText.style.display = 'flex';
        if (btnLoader) btnLoader.style.display = 'none';

        if (!user) {
          if (globalErr) globalErr.textContent = '❌ Incorrect email or password.';
          return;
        }

        if (remember) localStorage.setItem('sf_remember', email);
        else localStorage.removeItem('sf_remember');

        localStorage.setItem('sf_session', JSON.stringify({
          loggedIn: true,
          name: user.name,
          email: user.email,
          id: user.id,
          isAdmin: false
        }));

        window.location.href = 'index.html';

      }, 800);
    });
  }

  // Forgot modal
  if (forgotBtn && forgotModal) {
    forgotBtn.addEventListener('click', () => {
      forgotModal.style.display = 'flex';
    });

    forgotClose?.addEventListener('click', () => {
      forgotModal.style.display = 'none';
    });

    forgotModal.addEventListener('click', function (e) {
      if (e.target === this) this.style.display = 'none';
    });

    forgotSubmit?.addEventListener('click', () => {
      const email = document.getElementById('forgotEmail').value.trim().toLowerCase();
      const msg = document.getElementById('forgotMsg');

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        msg.textContent = '❌ Enter a valid email.';
        msg.style.color = 'var(--red)';
        msg.style.display = 'block';
        return;
      }

      msg.textContent = '✅ (Demo) Reset link sent to ' + email;
      msg.style.color = 'var(--green)';
      msg.style.display = 'block';
    });
  }

});