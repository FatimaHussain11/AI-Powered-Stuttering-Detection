/* ============================================================
   SpeakFlow AI – signup.js
   ============================================================ */
'use strict';

// Redirect if already logged in
(function(){
  const s = JSON.parse(localStorage.getItem('sf_session')||'null');
  if(s && s.loggedIn) window.location.href = 'index.html';
})();

/* ── Particles ─────────────────────────────────────────────── */
(function(){
  const c = document.getElementById('authParticles');
  for(let i=0;i<20;i++){
    const p=document.createElement('div');p.className='particle';
    const sz=Math.random()*5+2;
    Object.assign(p.style,{width:sz+'px',height:sz+'px',left:Math.random()*100+'%',bottom:'-10px',animationDuration:(Math.random()*20+15)+'s',animationDelay:(Math.random()*10)+'s',opacity:Math.random()*.4+.1});
    c.appendChild(p);
  }
})();

/* ── DOM refs ──────────────────────────────────────────────── */
const form       = document.getElementById('signupForm');
const nameInp    = document.getElementById('signupName');
const emailInp   = document.getElementById('signupEmail');
const passInp    = document.getElementById('signupPass');
const confirmInp = document.getElementById('signupConfirm');
const nameErr    = document.getElementById('nameErr');
const emailErr   = document.getElementById('emailErr');
const passErr    = document.getElementById('passErr');
const confirmErr = document.getElementById('confirmErr');
const globalErr  = document.getElementById('globalErr');
const globalOk   = document.getElementById('globalSuccess');
const btnText    = document.getElementById('signupBtnText');
const btnLoader  = document.getElementById('signupBtnLoader');
const strengthFill  = document.getElementById('strengthFill');
const strengthLabel = document.getElementById('strengthLabel');

/* ── Show/Hide Password ────────────────────────────────────── */
function toggleVis(inputEl, btn){
  btn.addEventListener('click',()=>{
    const show = inputEl.type==='password';
    inputEl.type = show?'text':'password';
    btn.querySelector('i').className = show?'fas fa-eye-slash':'fas fa-eye';
  });
}
toggleVis(passInp, document.getElementById('togglePass1'));
toggleVis(confirmInp, document.getElementById('togglePass2'));

/* ── Password Strength ─────────────────────────────────────── */
passInp.addEventListener('input',()=>{
  const v = passInp.value;
  let score = 0;
  if(v.length>=8) score++;
  if(/[A-Z]/.test(v)) score++;
  if(/[0-9]/.test(v)) score++;
  if(/[^A-Za-z0-9]/.test(v)) score++;
  const levels = [
    {pct:0,   color:'transparent', label:'Enter password'},
    {pct:25,  color:'#EF4444',     label:'Weak'},
    {pct:50,  color:'#F59E0B',     label:'Fair'},
    {pct:75,  color:'#3B82F6',     label:'Good'},
    {pct:100, color:'#10B981',     label:'Strong'},
  ];
  const l = v.length===0 ? levels[0] : levels[Math.max(1,score)];
  strengthFill.style.width  = l.pct+'%';
  strengthFill.style.background = l.color;
  strengthLabel.textContent = l.label;
  strengthLabel.style.color = l.color;
});

/* ── Validation helpers ────────────────────────────────────── */
function setErr(el,fgId,msg){
  el.textContent=msg;
  const fg=document.getElementById(fgId);
  fg.classList.add('has-error');fg.classList.remove('has-ok');
}
function setOk(el,fgId){
  el.textContent='';
  const fg=document.getElementById(fgId);
  fg.classList.remove('has-error');fg.classList.add('has-ok');
}
function clearState(el,fgId){
  el.textContent='';
  const fg=document.getElementById(fgId);
  fg.classList.remove('has-error','has-ok');
}

function validateEmail(e){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);}

/* ── Submit ────────────────────────────────────────────────── */
form.addEventListener('submit',function(e){
  e.preventDefault();
  globalErr.textContent=''; globalOk.style.display='none';
  let valid=true;

  const name    = nameInp.value.trim();
  const email   = emailInp.value.trim().toLowerCase();
  const pass    = passInp.value;
  const confirm = confirmInp.value;

  // Name
  if(!name){setErr(nameErr,'fg-name','Full name is required.');valid=false;}
  else if(name.length<2){setErr(nameErr,'fg-name','Name must be at least 2 characters.');valid=false;}
  else setOk(nameErr,'fg-name');

  // Email
  if(!email){setErr(emailErr,'fg-email','Email is required.');valid=false;}
  else if(!validateEmail(email)){setErr(emailErr,'fg-email','Enter a valid email address.');valid=false;}
  else setOk(emailErr,'fg-email');

  // Password
  if(!pass){setErr(passErr,'fg-pass','Password is required.');valid=false;}
  else if(pass.length<6){setErr(passErr,'fg-pass','Password must be at least 6 characters.');valid=false;}
  else setOk(passErr,'fg-pass');

  // Confirm
  if(!confirm){setErr(confirmErr,'fg-confirm','Please confirm your password.');valid=false;}
  else if(confirm!==pass){setErr(confirmErr,'fg-confirm','Passwords do not match.');valid=false;}
  else setOk(confirmErr,'fg-confirm');

  if(!valid) return;

  // Prevent admin email
  if(email==='admin@speakflow.ai'){globalErr.textContent='❌ This email is reserved.';return;}

  // Check duplicate
  const users = JSON.parse(localStorage.getItem('sf_users')||'[]');
  if(users.find(u=>u.email===email)){globalErr.textContent='❌ An account with this email already exists.';return;}

  // Show loader
  btnText.style.display='none'; btnLoader.style.display='flex';

  setTimeout(()=>{
    const newUser = {
      id: 'usr_'+Date.now(),
      name, email, password:pass,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem('sf_users',JSON.stringify(users));

    // Auto-login after signup
    const session = {loggedIn:true, name, email, id:newUser.id};
    localStorage.setItem('sf_session',JSON.stringify(session));

    globalOk.textContent='✅ Account created! Redirecting...';
    globalOk.style.display='block';
    btnText.style.display='flex'; btnLoader.style.display='none';

    setTimeout(()=>{ window.location.href='index.html'; },1000);
  },900);
});

/* ── Live validation on blur ───────────────────────────────── */
nameInp.addEventListener('blur',()=>{ if(!nameInp.value.trim()) setErr(nameErr,'fg-name','Full name is required.'); });
emailInp.addEventListener('blur',()=>{
  const v=emailInp.value.trim();
  if(!v) setErr(emailErr,'fg-email','Email is required.');
  else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) setErr(emailErr,'fg-email','Enter a valid email address.');
});
passInp.addEventListener('blur',()=>{ if(!passInp.value) setErr(passErr,'fg-pass','Password is required.'); });
confirmInp.addEventListener('blur',()=>{
  if(confirmInp.value && confirmInp.value!==passInp.value) setErr(confirmErr,'fg-confirm','Passwords do not match.');
  else if(!confirmInp.value) setErr(confirmErr,'fg-confirm','Please confirm your password.');
});
