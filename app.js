const defaultState={
  units:580,
  goal:1000,
  booked:14,
  held:10,
  closed:5,
  week:[70,120,0,160,80,150,0],
  referrals:12,
  customers:[
    {id:1,name:'Carlo B.',topic:'Versicherungspaket',status:'Beratung',next:'Angebot besprechen',value:2500},
    {id:2,name:'Frau Abadallah',topic:'Finanzierung',status:'Analyse',next:'Objektunterlagen anfordern',value:6200},
    {id:3,name:'Tamika S.',topic:'Kfz & Sach',status:'Abschluss',next:'Policierung prüfen',value:1200},
    {id:4,name:'Deniz K.',topic:'Immobilienfinanzierung',status:'Interessent',next:'Tragfähigkeit klären',value:7500},
    {id:5,name:'Jahid A.',topic:'Vorsorge',status:'Beratung',next:'Varianten vergleichen',value:3800}
  ],
  tasks:[
    {id:1,title:'3 Empfehlungen aktiv ansprechen',date:'Heute',priority:'Hoch',done:false},
    {id:2,title:'BU-Fall vorbereiten',date:'Heute',priority:'Mittel',done:true},
    {id:3,title:'Objektunterlagen prüfen',date:'Freitag',priority:'Mittel',done:false}
  ],
  referralEntries:[
    {id:1,name:'Sven M.',contact:'Telefon',date:'Heute'},
    {id:2,name:'Angela R.',contact:'E-Mail',date:'Gestern'}
  ],
  revenue:[7200,8600,9100,10400,12480]
};

const clone=value=>window.structuredClone?structuredClone(value):JSON.parse(JSON.stringify(value));
let state;
try{
  state=JSON.parse(localStorage.getItem('ascend-state'))||clone(defaultState);
}catch{
  state=clone(defaultState);
}

state.referralEntries=state.referralEntries||[];
state.revenue=state.revenue||clone(defaultState.revenue);
state.customers=state.customers.map(c=>({...c,value:Number(c.value)||0}));

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

function save(message='Gespeichert'){
  localStorage.setItem('ascend-state',JSON.stringify(state));
  render();
  toast(message);
}

function toast(message){
  const t=$('#toast');
  t.textContent=message;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),1600);
}

function formatCurrency(value){
  return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(value||0);
}

function formatDate(value){
  if(!value||value==='Ohne Datum'||value==='Heute'||value==='Freitag') return value||'Ohne Datum';
  const d=new Date(value+'T12:00:00');
  return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
}

function escapeHtml(v){
  return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

function getTodayIndex(){
  const jsDay=new Date().getDay();
  return jsDay===0?6:jsDay-1;
}

function getLevel(){
  const pct=state.goal?state.units/state.goal:0;
  if(pct>=1) return {name:'Elite',letter:'E',text:'Ziel erreicht. Jetzt Leistung stabilisieren.'};
  if(pct>=.7) return {name:'Performer+',letter:'P+',text:`Noch ${Math.max(0,state.goal-state.units).toLocaleString('de-DE')} Einheiten bis Elite.`};
  if(pct>=.4) return {name:'Performer',letter:'P',text:`Noch ${Math.max(0,state.goal-state.units).toLocaleString('de-DE')} Einheiten bis Elite.`};
  return {name:'Builder',letter:'B',text:'Jede Aktivität bringt dich sichtbar näher ans Ziel.'};
}

function render(){
  renderDashboard();
  renderCustomers();
  renderTasks();
  renderReferrals();
  renderAnalytics();
}

function renderDashboard(){
  $('#unitsValue').textContent=state.units.toLocaleString('de-DE');
  $('#goalValue').textContent=state.goal.toLocaleString('de-DE');

  const pct=Math.min(100,Math.round((state.units/state.goal)*100)||0);
  $('#goalPercent').textContent=pct+' %';
  $('#unitProgress').style.width=pct+'%';

  const level=getLevel();
  $('#levelName').textContent=level.name;
  $('#levelOrb').textContent=level.letter;
  $('#levelText').textContent=level.text;

  $('#bookedValue').textContent=state.booked;
  $('#heldValue').textContent=state.held;
  $('#closedValue').textContent=state.closed;

  const heldRate=state.booked?Math.round(state.held/state.booked*100):0;
  const conversion=state.held?Math.round(state.closed/state.held*100):0;
  $('#conversionValue').textContent=conversion+' %';
  $('#heldHint').textContent=heldRate+' % Terminquote';
  $('#closedHint').textContent=state.closed===1?'1 erfolgreicher Fall':`${state.closed} erfolgreiche Fälle`;
  $('#conversionHint').textContent=conversion>=50?'Starker Wert':conversion>=30?'Solide Basis':'Hier liegt Potenzial';

  const openHigh=state.tasks.filter(t=>!t.done&&t.priority==='Hoch').length;
  const focus=openHigh
    ?`${openHigh} wichtige Aufgabe${openHigh>1?'n':''} zuerst erledigen.`
    :'Heute 1 Termin vereinbaren und 1 Empfehlung aktiv ansprechen.';
  $('#focusMessage').textContent=focus;
  $('#streakBadge').textContent=pct>=100?'Ziel erreicht':pct>=60?'Sehr gut unterwegs':'Auf Kurs';

  const days=['Mo','Di','Mi','Do','Fr','Sa','So'];
  const max=Math.max(...state.week,200);
  $('#weeklyChart').innerHTML=state.week.map((v,i)=>`
    <div class="chart-col" title="${v} Einheiten am ${days[i]}">
      <div class="chart-bar" style="height:${Math.max(6,Math.round(v/max*180))}px"></div>
      ${days[i]}<br><b>${v}</b>
    </div>`).join('');
}

function renderCustomers(){
  const search=($('#customerSearch').value||'').toLowerCase();
  const statuses=['Interessent','Analyse','Beratung','Abschluss'];

  $('#customerBoard').innerHTML=statuses.map(status=>{
    const items=state.customers.filter(c=>
      c.status===status &&
      (`${c.name} ${c.topic} ${c.next}`.toLowerCase().includes(search))
    );

    return `<div class="kanban-column">
      <div class="kanban-title"><strong>${status}</strong><span class="count">${items.length}</span></div>
      ${items.map(c=>`
        <article class="customer-card" data-customer-id="${c.id}" tabindex="0">
          <strong>${escapeHtml(c.name)}</strong>
          <p>${escapeHtml(c.topic)}</p>
          <span class="tag">${escapeHtml(c.next||'Kein nächster Schritt')}</span>
          <div class="customer-meta">
            <span class="value-badge">${formatCurrency(c.value)}</span>
            <span class="muted">Bearbeiten ›</span>
          </div>
        </article>`).join('')||'<p class="muted">Keine Einträge</p>'}
    </div>`;
  }).join('');

  $$('.customer-card').forEach(card=>{
    const open=()=>openCustomer(Number(card.dataset.customerId));
    card.addEventListener('click',open);
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ') open()});
  });
}

function renderTasks(){
  $('#taskList').innerHTML=state.tasks.map(t=>`
    <article class="task-item ${t.done?'done':''}">
      <div class="task-main">
        <input type="checkbox" ${t.done?'checked':''} aria-label="Aufgabe erledigt" onchange="toggleTask(${t.id})">
        <div>
          <strong>${escapeHtml(t.title)}</strong>
          <p>Fällig: ${escapeHtml(formatDate(t.date)||'Ohne Datum')}</p>
        </div>
      </div>
      <div class="task-actions">
        <span class="priority priority-${t.priority}">${t.priority}</span>
        <button class="mini-btn" onclick="deleteTask(${t.id})" aria-label="Aufgabe löschen">×</button>
      </div>
    </article>`).join('')||'<p class="muted">Keine Aufgaben vorhanden.</p>';
}

function renderReferrals(){
  $('#referralCount').textContent=state.referrals;
  const target=Math.ceil(Math.max(state.referrals,1)/20)*20;
  const progress=Math.min(100,Math.round(state.referrals/target*100));
  const remaining=Math.max(0,target-state.referrals);

  $('#referralProgressText').textContent=`${state.referrals} / ${target}`;
  $('#referralProgress').style.width=progress+'%';
  $('#referralRemaining').textContent=remaining
    ?`Noch ${remaining} Empfehlungen bis zum nächsten Bonus.`
    :'Bonus-Stufe erreicht. Stark gemacht.';

  $('#referralList').innerHTML=state.referralEntries.length
    ?state.referralEntries.map(r=>`
      <div class="referral-item">
        <div>
          <strong>${escapeHtml(r.name)}</strong>
          <p>${escapeHtml(r.contact)} · ${escapeHtml(r.date)}</p>
        </div>
        <button class="mini-btn" onclick="deleteReferral(${r.id})">Löschen</button>
      </div>`).join('')
    :'<p class="muted">Noch keine Empfehlungen mit Kontaktdaten erfasst.</p>';
}

function renderAnalytics(){
  const revenue=state.revenue;
  const months=['Mär','Apr','Mai','Jun','Jul'];
  const rmax=Math.max(...revenue,1);
  $('#revenueChart').innerHTML=revenue.map((v,i)=>`
    <div class="chart-col">
      <div class="chart-bar" style="height:${Math.round(v/rmax*240)}px"></div>
      ${months[i]}<br><b>${formatCurrency(v)}</b>
    </div>`).join('');

  const currentRevenue=revenue[revenue.length-1]||0;
  const openCustomers=state.customers.filter(c=>c.status!=='Abschluss');
  const pipeline=openCustomers.reduce((sum,c)=>sum+(Number(c.value)||0),0);
  const closedCustomers=state.customers.filter(c=>c.status==='Abschluss');
  const avg=closedCustomers.length
    ?closedCustomers.reduce((sum,c)=>sum+(Number(c.value)||0),0)/closedCustomers.length
    :0;
  const referralRate=state.booked?Math.round(state.referrals/state.booked*100):0;

  $('#monthlyRevenue').textContent=formatCurrency(currentRevenue);
  $('#pipelineValue').textContent=formatCurrency(pipeline);
  $('#pipelineCases').textContent=`${openCustomers.length} Fälle`;
  $('#avgClosing').textContent=formatCurrency(avg);
  $('#referralRate').textContent=referralRate+' %';
}

function openCustomer(id){
  const customer=state.customers.find(c=>c.id===id);
  if(!customer) return;
  $('#customerModalTitle').textContent='Kunde bearbeiten';
  $('#customerId').value=customer.id;
  $('#customerName').value=customer.name;
  $('#customerTopic').value=customer.topic;
  $('#customerStatus').value=customer.status;
  $('#customerNext').value=customer.next||'';
  $('#customerValue').value=customer.value||'';
  $('#deleteCustomerBtn').classList.remove('hidden');
  $('#customerModal').showModal();
}

function openNewCustomer(){
  $('#customerModalTitle').textContent='Kunde anlegen';
  $('#customerForm').reset();
  $('#customerId').value='';
  $('#deleteCustomerBtn').classList.add('hidden');
  $('#customerModal').showModal();
}

function toggleTask(id){
  const t=state.tasks.find(x=>x.id===id);
  if(t){t.done=!t.done;save('Aufgabe aktualisiert')}
}

function deleteTask(id){
  state.tasks=state.tasks.filter(t=>t.id!==id);
  save('Aufgabe gelöscht');
}

function deleteReferral(id){
  state.referralEntries=state.referralEntries.filter(r=>r.id!==id);
  save('Empfehlung gelöscht');
}

$$('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.nav-item').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  $$('.view').forEach(v=>v.classList.remove('active'));
  $('#'+btn.dataset.view).classList.add('active');
  $('#pageTitle').textContent=btn.querySelector('span')?.textContent||btn.textContent;

  const helps={
    dashboard:'Hier siehst du sofort, wo du stehst und was heute wichtig ist.',
    customers:'Hier verwaltest du alle Kunden und den nächsten konkreten Schritt.',
    tasks:'Hier legst du fest, was zuerst erledigt werden muss.',
    referrals:'Hier werden Empfehlungen und neue Chancen sichtbar.',
    analytics:'Hier erkennst du, ob sich deine Leistung positiv entwickelt.'
  };
  $('#pageHelp').textContent=helps[btn.dataset.view]||'';
}));

$$('[data-open]').forEach(btn=>btn.addEventListener('click',openNewCustomer));
$$('[data-close]').forEach(btn=>btn.addEventListener('click',()=>$('#'+btn.dataset.close).close()));

$('#activityForm').addEventListener('submit',e=>{
  e.preventDefault();
  const addUnits=+$('#unitsInput').value||0;
  state.booked+=+$('#bookedInput').value||0;
  state.held+=+$('#heldInput').value||0;
  state.closed+=+$('#closedInput').value||0;
  state.units+=addUnits;
  state.week[getTodayIndex()]+=addUnits;
  save('Aktivität gespeichert');
  e.target.reset();
  $('#bookedInput').value=1;
  $('#heldInput').value=1;
  $('#closedInput').value=0;
  $('#unitsInput').value=100;
});

$('#customerForm').addEventListener('submit',e=>{
  e.preventDefault();
  const id=Number($('#customerId').value);
  const payload={
    id:id||Date.now(),
    name:$('#customerName').value.trim(),
    topic:$('#customerTopic').value.trim(),
    status:$('#customerStatus').value,
    next:$('#customerNext').value.trim(),
    value:+$('#customerValue').value||0
  };

  if(id){
    const index=state.customers.findIndex(c=>c.id===id);
    if(index>=0) state.customers[index]=payload;
    save('Kunde aktualisiert');
  }else{
    state.customers.push(payload);
    save('Kunde angelegt');
  }

  $('#customerModal').close();
});

$('#deleteCustomerBtn').addEventListener('click',()=>{
  const id=Number($('#customerId').value);
  if(!id) return;
  if(confirm('Diesen Kunden wirklich löschen?')){
    state.customers=state.customers.filter(c=>c.id!==id);
    $('#customerModal').close();
    save('Kunde gelöscht');
  }
});

$('#taskForm').addEventListener('submit',e=>{
  e.preventDefault();
  state.tasks.unshift({
    id:Date.now(),
    title:$('#taskTitle').value.trim(),
    date:$('#taskDate').value||'Ohne Datum',
    priority:$('#taskPriority').value,
    done:false
  });
  save('Aufgabe gespeichert');
  e.target.reset();
});

$('#referralForm').addEventListener('submit',e=>{
  e.preventDefault();
  const name=$('#referralName').value.trim();
  const contact=$('#referralContact').value.trim();
  state.referrals++;
  state.referralEntries.unshift({
    id:Date.now(),
    name,
    contact,
    date:new Intl.DateTimeFormat('de-DE').format(new Date())
  });
  save('Empfehlung erfasst');
  e.target.reset();
});

$('#copyReferral').addEventListener('click',async()=>{
  const value=$('#referralLink').value;
  try{
    await navigator.clipboard.writeText(value);
  }catch{
    $('#referralLink').select();
    document.execCommand('copy');
  }
  toast('Link kopiert');
});

$('#customerSearch').addEventListener('input',renderCustomers);

$('#resetBtn').addEventListener('click',()=>{
  if(confirm('Alle Demo-Daten wirklich zurücksetzen?')){
    state=clone(defaultState);
    save('Demo zurückgesetzt');
  }
});

render();
