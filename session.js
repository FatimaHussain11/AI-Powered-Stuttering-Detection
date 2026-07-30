/* ============================================================
   SpeakFlow AI – session.js
   Shared session management for index.html
   ============================================================ */
'use strict';

(function initSession() {
  const session = JSON.parse(localStorage.getItem('sf_session') || 'null');

  // Route protection – redirect to login if not logged in
  if (!session || !session.loggedIn) {
    window.location.href = 'login.html';
    return;
  }

  // Show user info in navbar
  const info = document.getElementById('navUserInfo');
  const nameEl = document.getElementById('navUserName');
  if (info && nameEl) {
    nameEl.textContent = session.name || 'User';
    info.style.display = 'flex';
  }

  // Profile button → open profile modal
  const profileBtn = document.getElementById('navProfileBtn');
  if (profileBtn) {
    profileBtn.addEventListener('click', openProfileModal);
  }

  // Logout
  const logoutBtn = document.getElementById('navLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('sf_session');
      window.location.href = 'login.html';
    });
  }

  // ── Profile Modal ────────────────────────────────────────
  function openProfileModal() {
    if (document.getElementById('sfProfileModal')) return;

    const users = JSON.parse(localStorage.getItem('sf_users') || '[]');
    const user = users.find(u => u.email === session.email) || {};
    const history = JSON.parse(localStorage.getItem('sf_analysis_history') || '[]');
    const userAnalyses = history.filter(h => h.userEmail === session.email).length;

    const modal = document.createElement('div');
    modal.id = 'sfProfileModal';
    modal.innerHTML = `
      <div class="sf-modal-overlay" id="sfModalOverlay">
        <div class="sf-modal-box glass-card">
          <div class="sf-modal-header">
            <div class="sf-modal-avatar"><i class="fas fa-user-circle"></i></div>
            <h2>My Profile</h2>
            <button class="sf-modal-close" id="sfModalClose"><i class="fas fa-times"></i></button>
          </div>
          <div class="sf-modal-body" id="sfProfileView">
            <div class="sf-profile-row"><span><i class="fas fa-user"></i> Full Name</span><strong id="pName">${session.name}</strong></div>
            <div class="sf-profile-row"><span><i class="fas fa-envelope"></i> Email</span><strong>${session.email}</strong></div>
            <div class="sf-profile-row"><span><i class="fas fa-chart-bar"></i> Total Analyses</span><strong>${userAnalyses}</strong></div>
            <div class="sf-profile-row"><span><i class="fas fa-calendar-alt"></i> Member Since</span><strong>${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</strong></div>
            <div class="sf-modal-actions">
              <button class="btn btn-primary" id="sfEditProfileBtn"><i class="fas fa-edit"></i> Edit Profile</button>
              <button class="btn btn-outline" id="sfChangePassBtn"><i class="fas fa-key"></i> Change Password</button>
            </div>
          </div>
          <div class="sf-modal-body" id="sfEditView" style="display:none;">
            <label>Full Name</label>
            <input class="sf-input" type="text" id="sfNewName" value="${session.name}" placeholder="Full Name" />
            <div class="sf-modal-actions">
              <button class="btn btn-primary" id="sfSaveNameBtn"><i class="fas fa-save"></i> Save Changes</button>
              <button class="btn btn-ghost" id="sfCancelEditBtn"><i class="fas fa-arrow-left"></i> Back</button>
            </div>
            <p id="sfEditMsg" style="color:var(--green);margin-top:8px;display:none;"></p>
          </div>
          <div class="sf-modal-body" id="sfPassView" style="display:none;">
            <label>Current Password</label>
            <input class="sf-input" type="password" id="sfOldPass" placeholder="Current password" />
            <label>New Password</label>
            <input class="sf-input" type="password" id="sfNewPass" placeholder="New password" />
            <label>Confirm New Password</label>
            <input class="sf-input" type="password" id="sfConfPass" placeholder="Confirm new password" />
            <div class="sf-modal-actions">
              <button class="btn btn-primary" id="sfSavePassBtn"><i class="fas fa-save"></i> Update Password</button>
              <button class="btn btn-ghost" id="sfCancelPassBtn"><i class="fas fa-arrow-left"></i> Back</button>
            </div>
            <p id="sfPassMsg" style="margin-top:8px;display:none;"></p>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    // inject modal CSS if not already
    if (!document.getElementById('sfModalStyle')) {
      const s = document.createElement('style');
      s.id = 'sfModalStyle';
      s.textContent = `
        #sfProfileModal { position:fixed;inset:0;z-index:9999; }
        .sf-modal-overlay { position:absolute;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px; }
        .sf-modal-box { background:var(--surface);border-radius:24px;padding:32px;width:100%;max-width:480px;position:relative;box-shadow:var(--shadow-lg); }
        .sf-modal-header { display:flex;align-items:center;gap:16px;margin-bottom:24px; }
        .sf-modal-avatar { font-size:2.5rem;color:var(--blue); }
        .sf-modal-header h2 { font-size:1.4rem;font-weight:700;flex:1; }
        .sf-modal-close { background:var(--surface-2);border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:1rem;cursor:pointer;border:none;color:var(--text-muted); }
        .sf-profile-row { display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);font-size:0.95rem; }
        .sf-profile-row span { color:var(--text-muted);display:flex;align-items:center;gap:8px; }
        .sf-modal-actions { display:flex;gap:12px;margin-top:24px;flex-wrap:wrap; }
        .sf-input { width:100%;padding:12px 16px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2);color:var(--text);font-size:0.95rem;margin-bottom:16px;margin-top:4px;outline:none; }
        .sf-input:focus { border-color:var(--blue); }
        .sf-modal-body label { font-size:0.85rem;font-weight:600;color:var(--text-muted); }
        .nav-user-info { display:flex;align-items:center;gap:8px; }
        .btn-user-profile { display:flex;align-items:center;gap:8px;padding:8px 14px;background:rgba(37,99,235,0.1);border-radius:50px;color:var(--blue);font-weight:600;font-size:0.9rem;cursor:pointer;border:none;transition:all .2s; }
        .btn-user-profile:hover { background:rgba(37,99,235,0.2); }
        .btn-logout { display:flex;align-items:center;gap:6px;padding:8px 14px;background:rgba(239,68,68,0.1);border-radius:50px;color:var(--red);font-weight:600;font-size:0.9rem;cursor:pointer;border:none;transition:all .2s; }
        .btn-logout:hover { background:rgba(239,68,68,0.2); }
      `;
      document.head.appendChild(s);
    }

    document.getElementById('sfModalClose').onclick = closeModal;
    document.getElementById('sfModalOverlay').onclick = (e) => { if(e.target.id==='sfModalOverlay') closeModal(); };

    document.getElementById('sfEditProfileBtn').onclick = () => {
      document.getElementById('sfProfileView').style.display = 'none';
      document.getElementById('sfEditView').style.display = 'block';
    };
    document.getElementById('sfCancelEditBtn').onclick = () => {
      document.getElementById('sfEditView').style.display = 'none';
      document.getElementById('sfProfileView').style.display = 'block';
    };
    document.getElementById('sfSaveNameBtn').onclick = () => {
      const newName = document.getElementById('sfNewName').value.trim();
      if (!newName) return;
      // Update user in localStorage
      const users2 = JSON.parse(localStorage.getItem('sf_users') || '[]');
      const idx = users2.findIndex(u => u.email === session.email);
      if (idx !== -1) { users2[idx].name = newName; localStorage.setItem('sf_users', JSON.stringify(users2)); }
      session.name = newName;
      localStorage.setItem('sf_session', JSON.stringify(session));
      document.getElementById('navUserName').textContent = newName;
      document.getElementById('pName').textContent = newName;
      const msg = document.getElementById('sfEditMsg');
      msg.textContent = '✅ Name updated successfully!';
      msg.style.display = 'block';
    };

    document.getElementById('sfChangePassBtn').onclick = () => {
      document.getElementById('sfProfileView').style.display = 'none';
      document.getElementById('sfPassView').style.display = 'block';
    };
    document.getElementById('sfCancelPassBtn').onclick = () => {
      document.getElementById('sfPassView').style.display = 'none';
      document.getElementById('sfProfileView').style.display = 'block';
    };
    document.getElementById('sfSavePassBtn').onclick = () => {
      const old = document.getElementById('sfOldPass').value;
      const nw = document.getElementById('sfNewPass').value;
      const conf = document.getElementById('sfConfPass').value;
      const msg = document.getElementById('sfPassMsg');
      const users3 = JSON.parse(localStorage.getItem('sf_users') || '[]');
      const idx = users3.findIndex(u => u.email === session.email);
      if (idx === -1 || users3[idx].password !== old) {
        msg.textContent = '❌ Current password is incorrect.'; msg.style.color='var(--red)'; msg.style.display='block'; return;
      }
      if (nw.length < 6) { msg.textContent = '❌ Password must be at least 6 characters.'; msg.style.color='var(--red)'; msg.style.display='block'; return; }
      if (nw !== conf) { msg.textContent = '❌ Passwords do not match.'; msg.style.color='var(--red)'; msg.style.display='block'; return; }
      users3[idx].password = nw;
      localStorage.setItem('sf_users', JSON.stringify(users3));
      msg.textContent = '✅ Password updated!'; msg.style.color='var(--green)'; msg.style.display='block';
    };
  }

  function closeModal() {
    const m = document.getElementById('sfProfileModal');
    if (m) m.remove();
  }

})();
