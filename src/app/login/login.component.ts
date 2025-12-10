import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  API_BASE = (window as any).API_BASE_URL || 'http://localhost:3000';

  email = '';
  password = '';
  message = '';

  ngOnInit(): void {
    const token = localStorage.getItem('jwt');
    if (token) {
      // si ya hay token, redirigir al panel
      this.showMessage('Restaurando sesión...');
      window.location.href = './panel.html';
    }
  }

  showMessage(text: string){ this.message = text; }

  async postJson(path: string, body: any){
    const res = await fetch(this.API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const txt = await res.text();
    let json;
    try{ json = txt ? JSON.parse(txt) : {}; }catch(e){ json = { message: txt }; }
    if(!res.ok) throw { status: res.status, body: json };
    return json;
  }

  async onSubmit(e?: Event){
    if(e) e.preventDefault();
    this.showMessage('');
    if(!this.email || !this.password){ this.showMessage('Completa email y contraseña.'); return; }

    this.showMessage('Enviando credenciales...');
    try{
      let recaptchaToken = '';
      if ((window as any).grecaptcha){
        try{ recaptchaToken = (window as any).grecaptcha.getResponse(); } catch(e){ recaptchaToken = ''; }
      }
      if(!recaptchaToken){ this.showMessage('Por favor, completa el reCAPTCHA antes de continuar.'); return; }

      const body = await this.postJson('/auth-captcha/login-step1-totp', { correo: this.email.trim(), contrasena: this.password, recaptchaToken });

      const userId = body.userId ?? body.id ?? body.user?.id;
      this.showMessage(body.message || 'Código 2FA enviado. Revisa tu correo.');

      const method = await this.choose2FAMethod();
      if(method === 'email'){
        const code = await this.askForCode(); if(!code){ this.showMessage('Verificación cancelada'); return; }
        this.showMessage('Verificando código...');
        const verifyBody = await this.postJson('/auth-captcha/login-verify-2fa', { userId: Number(userId), code });
        const token = verifyBody.access_token || verifyBody.token || verifyBody.jwt || verifyBody.accessToken || verifyBody.data?.access_token;
        if(!token){ this.showMessage('Respuesta inválida del servidor: no se obtuvo token.'); console.error('verify response', verifyBody); return; }
        localStorage.setItem('jwt', token);
        this.showMessage('Login exitoso. Redirigiendo...');
        location.href = './panel.html';
      } else if(method === 'totp'){
        this.showMessage('Generando QR efímero...');
        try{
          const setup = await this.postJson('/auth-totp/ephemeral/setup-anon', { userId: Number(userId) });
          const token = await this.askForTotp(setup.qr, setup.ephemeralId, Number(userId));
          if(!token){ this.showMessage('Verificación cancelada'); return; }
          this.showMessage('Verificando token TOTP...');
          const verifyBody = await this.postJson('/auth-totp/ephemeral/verify-login', { ephemeralId: setup.ephemeralId, userId: Number(userId), token });
          const jwt = verifyBody.access_token || verifyBody.token || verifyBody.jwt || verifyBody.accessToken || verifyBody.data?.access_token || verifyBody;
          const tokenStr = typeof jwt === 'string' ? jwt : (jwt.access_token || jwt.token || jwt.accessToken || jwt.data?.access_token);
          if(!tokenStr){ this.showMessage('No se obtuvo token del servidor.'); console.error('verify response', verifyBody); return; }
          localStorage.setItem('jwt', tokenStr);
          this.showMessage('Login exitoso con Authenticator. Redirigiendo...');
          location.href = './panel.html';
        }catch(err: any){ console.error(err); const e = err as any; if(e && e.body && e.body.message) this.showMessage('Error: '+e.body.message); else this.showMessage('Error verificando TOTP'); }
      } else {
        this.showMessage('Verificación cancelada');
      }

    }catch(err: any){ console.error(err); const e = err as any; if(e && e.body && e.body.message) this.showMessage('Error: ' + e.body.message); else if(e && e.status) this.showMessage('Error HTTP: ' + e.status); else this.showMessage('Error de conexión'); }
  }

  askForCode(){
    return new Promise<string|null>((resolve)=>{
      const modal = document.createElement('div');
      modal.style.position = 'fixed'; modal.style.left='0'; modal.style.top='0'; modal.style.right='0'; modal.style.bottom='0';
      modal.style.display='grid'; modal.style.placeItems='center'; modal.style.background='rgba(0,0,0,.35)';

      const box = document.createElement('div');
      box.style.background='#fff'; box.style.padding='20px'; box.style.borderRadius='12px'; box.style.width='320px';
      box.innerHTML = `<div style="font-weight:700;margin-bottom:8px">Código 2FA</div><div style="font-size:13px;color:#616161;margin-bottom:12px">Introduce el código de 6 dígitos que te enviamos por correo.</div>`;
      const input = document.createElement('input'); input.type='text'; input.maxLength=6; input.placeholder='123456';
      input.style.width='100%'; input.style.padding='10px'; input.style.fontSize='16px'; input.style.border='1px solid #e5e7eb'; input.style.borderRadius='8px';
      box.appendChild(input);

      const row = document.createElement('div'); row.style.display='flex'; row.style.gap='8px'; row.style.marginTop='12px';
      const btnOk = document.createElement('button'); btnOk.textContent='Verificar'; btnOk.style.flex='1'; btnOk.style.padding='10px'; btnOk.style.borderRadius='8px'; btnOk.style.border='0'; btnOk.style.background='#29c150'; btnOk.style.color='#fff';
      const btnCancel = document.createElement('button'); btnCancel.textContent='Cancelar'; btnCancel.style.flex='1'; btnCancel.style.padding='10px'; btnCancel.style.borderRadius='8px'; btnCancel.style.border='0'; btnCancel.style.background='#e2e8f0';
      row.appendChild(btnOk); row.appendChild(btnCancel); box.appendChild(row);

      modal.appendChild(box); document.body.appendChild(modal); input.focus();

      btnOk.addEventListener('click', ()=>{ const v = input.value.trim(); document.body.removeChild(modal); resolve(v || null); });
      btnCancel.addEventListener('click', ()=>{ document.body.removeChild(modal); resolve(null); });
      input.addEventListener('keydown',(ev)=>{ if(ev.key==='Enter'){ ev.preventDefault(); btnOk.click(); } });
    });
  }

  choose2FAMethod(){
    return new Promise<'email'|'totp'|null>((resolve)=>{
      const modal = document.createElement('div');
      modal.style.position = 'fixed'; modal.style.left='0'; modal.style.top='0'; modal.style.right='0'; modal.style.bottom='0';
      modal.style.display='grid'; modal.style.placeItems='center'; modal.style.background='rgba(0,0,0,.35)';

      const box = document.createElement('div');
      box.style.background='#fff'; box.style.padding='20px'; box.style.borderRadius='12px'; box.style.width='360px';
      box.innerHTML = `<div style="font-weight:700;margin-bottom:8px">Verificación</div><div style="font-size:13px;color:#616161;margin-bottom:12px">Elige cómo verificar tu identidad:</div>`;

      const btnEmail = document.createElement('button'); btnEmail.textContent='Usar código por correo'; btnEmail.className='btn btn-primary'; btnEmail.style.marginBottom='8px';
      const btnTotp = document.createElement('button'); btnTotp.textContent='Usar Authenticator (QR)'; btnTotp.className='btn btn-ghost'; btnTotp.style.display='block'; btnTotp.style.width='100%';
      const row = document.createElement('div'); row.style.display='grid'; row.style.gap='8px'; row.appendChild(btnEmail); row.appendChild(btnTotp); box.appendChild(row);

      const btnCancel = document.createElement('button'); btnCancel.textContent='Cancelar'; btnCancel.style.marginTop='12px'; btnCancel.className='btn'; btnCancel.style.background='#e2e8f0'; box.appendChild(btnCancel);

      modal.appendChild(box); document.body.appendChild(modal);

      btnEmail.addEventListener('click', ()=>{ document.body.removeChild(modal); resolve('email'); });
      btnTotp.addEventListener('click', ()=>{ document.body.removeChild(modal); resolve('totp'); });
      btnCancel.addEventListener('click', ()=>{ document.body.removeChild(modal); resolve(null); });
    });
  }

  askForTotp(qrDataUrl: string, ephemeralId: string, userId: number){
    return new Promise<string|null>((resolve)=>{
      const modal = document.createElement('div');
      modal.style.position = 'fixed'; modal.style.left='0'; modal.style.top='0'; modal.style.right='0'; modal.style.bottom='0';
      modal.style.display='grid'; modal.style.placeItems='center'; modal.style.background='rgba(0,0,0,.35)';

      const box = document.createElement('div');
      box.style.background='#fff'; box.style.padding='18px'; box.style.borderRadius='12px'; box.style.width='360px';
      box.innerHTML = `<div style="font-weight:700;margin-bottom:8px">Escanea el QR</div><div style="font-size:13px;color:#616161;margin-bottom:12px">Escanea este código con tu app Authenticator y luego introduce el código de 6 dígitos.</div>`;

      const img = document.createElement('img'); img.src = qrDataUrl; img.style.display='block'; img.style.margin='0 auto 12px'; img.style.maxWidth='240px'; img.style.borderRadius='8px'; box.appendChild(img);

      const input = document.createElement('input'); input.type='text'; input.maxLength=6; input.placeholder='123456'; input.style.width='100%'; input.style.padding='10px'; input.style.fontSize='16px'; input.style.border='1px solid #e5e7eb'; input.style.borderRadius='8px'; box.appendChild(input);

      const row = document.createElement('div'); row.style.display='flex'; row.style.gap='8px'; row.style.marginTop='12px';
      const btnOk = document.createElement('button'); btnOk.textContent='Verificar'; btnOk.style.flex='1'; btnOk.className='btn btn-primary';
      const btnCancel = document.createElement('button'); btnCancel.textContent='Cancelar'; btnCancel.style.flex='1'; btnCancel.className='btn'; btnCancel.style.background='#e2e8f0';
      row.appendChild(btnOk); row.appendChild(btnCancel); box.appendChild(row);

      modal.appendChild(box); document.body.appendChild(modal); input.focus();

      btnOk.addEventListener('click', ()=>{ const v = (input as HTMLInputElement).value.trim(); document.body.removeChild(modal); resolve(v || null); });
      btnCancel.addEventListener('click', ()=>{ document.body.removeChild(modal); resolve(null); });
      input.addEventListener('keydown',(ev)=>{ if(ev.key==='Enter'){ ev.preventDefault(); btnOk.click(); } });
    });
  }
}
