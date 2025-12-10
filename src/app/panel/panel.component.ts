import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-panel',
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.css']
})
export class PanelComponent implements OnInit {
  API_BASE = (window as any).API_BASE_URL || 'http://localhost:3000';

  constructor() { }

  ngOnInit(): void {
    // Basic initialization: wire buttons to functions. The original static HTML contains a full
    // set of fetch calls; here we initialize event listeners and call a lightweight init.
    try{ this.init(); }catch(e){ console.warn('Panel init error', e); }
  }

  init(){
    const searchBtn = document.getElementById('searchBtn');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const exportTicketsCsvBtn = document.getElementById('exportTicketsCsvBtn');
    const newTicket = document.getElementById('newTicket');
    const filterSistema = document.getElementById('filterSistema');
    const filterEdificio = document.getElementById('filterEdificio');

    if(searchBtn) searchBtn.addEventListener('click', ()=> this.loadTickets());
    if(exportJsonBtn) exportJsonBtn.addEventListener('click', ()=> this.exportAllAsJson());
    if(exportTicketsCsvBtn) exportTicketsCsvBtn.addEventListener('click', ()=> this.exportTicketsCsv());
    if(newTicket) newTicket.addEventListener('click', ()=> alert('Crear ticket (demo)'));
    if(filterSistema) filterSistema.addEventListener('change', ()=> this.loadTickets());
    if(filterEdificio) filterEdificio.addEventListener('change', ()=> this.loadTickets());

    // try to load tickets (non-fatal)
    this.loadTickets().catch(()=>{});
  }

  async loadTickets(){
    // A minimal implementation that fetches tickets and renders them similar to the static page.
    const q = (document.getElementById('q') as HTMLInputElement)?.value || '';
    const sistema = (document.getElementById('filterSistema') as HTMLSelectElement)?.value || '';
    const edificio = (document.getElementById('filterEdificio') as HTMLSelectElement)?.value || '';
    const url = this.API_BASE + '/asignaciones-tickets' + (q || sistema ? ('?q=' + encodeURIComponent(q) + '&sistema=' + encodeURIComponent(sistema)) : '');
    try{
      const res = await fetch(url);
      let data = [];
      if(res.ok) data = await res.json();
      // render minimal list
      const list = document.getElementById('ticketsList'); if(!list) return;
      list.innerHTML = '';
      if(!Array.isArray(data) || data.length===0){ list.appendChild(document.createElement('div')).textContent = 'No hay tickets'; return; }
      data.forEach((a:any)=>{
        const t = a.ticket || a;
        const article = document.createElement('article'); article.className = 'card';
        const meta = document.createElement('div'); meta.className='meta';
        const idDiv = document.createElement('div'); idDiv.className='id'; idDiv.textContent = (t.codigo_ticket||t.codigoTicket||'') + ' — ' + ((t.tipo_sistema && t.tipo_sistema.nombre) || (t.tipoSistema && t.tipoSistema.nombre) || '');
        const dateDiv = document.createElement('div'); dateDiv.textContent = t.fecha_creacion || t.fechaCreacion || '';
        meta.appendChild(idDiv); meta.appendChild(dateDiv); article.appendChild(meta);
        const p = document.createElement('p'); p.innerHTML = '<strong>Descripción: </strong>' + (t.descripcion || ''); article.appendChild(p);
        list.appendChild(article);
      });
    }catch(e){ console.warn('loadTickets failed', e); }
  }

  exportAllAsJson(){ alert('Export JSON (demo).'); }
  exportTicketsCsv(){ alert('Export CSV (demo).'); }
}
