import { Component } from '@angular/core';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css']
})
export class RegistroComponent {
  name = '';
  email = '';
  password = '';
  password2 = '';
  terms = false;
  message = '';

  showMessage(msg: string){ this.message = msg; }
  apiBase = (window as any).API_BASE_URL || 'http://localhost:3000';

  showMsg(text: string, ok = true){ this.message = text; }

  async postJson(path: string, body: any){
    const res = await fetch(this.apiBase + path, {
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

  async onSubmit(){
    this.message = '';
    if(this.password !== this.password2){ this.showMsg('Las contraseñas no coinciden', false); return; }
    if(!this.terms){ this.showMsg('Debes aceptar los Términos y Condiciones', false); return; }
    if(this.password.length < 6){ this.showMsg('La contraseña debe tener al menos 6 caracteres', false); return; }

    const payload = {
      nombre: this.name,
      apellidos: undefined,
      correo: this.email,
      contrasena: this.password,
      telefono: undefined,
      rol_id: 4,
      activo: true
    };

    try{
      let recaptchaToken = '';
      if ((window as any).grecaptcha){
        try{ recaptchaToken = (window as any).grecaptcha.getResponse(); } catch(e){ recaptchaToken = ''; }
      }
      if(!recaptchaToken){ this.showMsg('Por favor completa el reCAPTCHA', false); return; }

      this.showMsg('Enviando registro...', true);
      const res = await this.postJson('/usuarios-captcha', { ...payload, recaptchaToken });
      this.showMsg('Registro exitoso. Puedes iniciar sesión.', true);
      setTimeout(()=>{ window.location.href = './index.html'; }, 1200);
    }catch(err:any){
      console.error(err);
      if(err && err.status === 400 && err.body){
        if(err.body.message) this.showMsg(Array.isArray(err.body.message) ? err.body.message.join(', ') : err.body.message, false);
        else this.showMsg('Error en los datos enviados', false);
      } else if(err && err.status === 409){
        this.showMsg(err.body?.message || 'El correo ya está en uso', false);
      } else {
        this.showMsg('Error de conexión o servidor', false);
      }
    }
  }
}
