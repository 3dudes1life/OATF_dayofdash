
(() => {
'use strict';
const DATA=window.OATF_DATA;
const KEY='oatf-oc-dayof-2026-v03';
const clone=x=>JSON.parse(JSON.stringify(x));
const defaultFair=clone(DATA.contacts[0]||{name:'OC Fair Entertainment',role:'Entertainment Department',phone:'',email:''});
const base={delay:0,completed:[],ready:[],people:{},issues:[],fairContact:defaultFair,handoff:'',screen:'live'};
let state=load();
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

function load(){try{return {...base,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return clone(base)}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));render()}
function mins(v){const [h,m]=v.split(':').map(Number);return h*60+m}
function fmt(total){total=(total+1440)%1440;let h=Math.floor(total/60),m=total%60,a=h>=12?'PM':'AM';h=h%12||12;return `${h}:${String(m).padStart(2,'0')} ${a}`}
function nowM(){const d=new Date();return d.getHours()*60+d.getMinutes()}
function shifted(item){return {start:mins(item.start)+state.delay,end:mins(item.end)+state.delay}}
function currentIndex(){
  const now=nowM();
  let i=DATA.schedule.findIndex(item=>{const t=shifted(item);return now>=t.start&&now<t.end&&!state.completed.includes(item.id)});
  if(i<0)i=DATA.schedule.findIndex(item=>!state.completed.includes(item.id));
  return i<0?DATA.schedule.length-1:i
}
function typeLabel(t){return ({setup:'Setup',performance:'Performance',transition:'Transition',storytime:'Story Time',games:'Games & Giveaways',glam:'Glam Show',end:'Closing'})[t]||'Production'}
function initials(n){return n.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()}
function personData(p){const s=state.people[p.id]||{};return {...p,...s}}
function showScreen(name){
  state.screen=name;
  $$('.screen').forEach(x=>x.classList.toggle('active',x.dataset.screen===name));
  $$('.tab-bar button').forEach(x=>x.classList.toggle('active',x.dataset.tab===name));
  $('#screenTitle').textContent=name==='people'?'People':name[0].toUpperCase()+name.slice(1);
  localStorage.setItem(KEY,JSON.stringify(state));
  const screen=document.querySelector(`.screen[data-screen="${name}"]`);
  if(screen)screen.scrollTop=0;
}
function renderClock(){
  const d=new Date();$('#clock').textContent=d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});$('#date').textContent=d.toLocaleDateString([], {weekday:'long'});
  const i=currentIndex(),item=DATA.schedule[i],t=shifted(item),left=t.end-nowM();
  $('#remaining').textContent=left>0?`${left} min left`:left===0?'Ending now':`${Math.abs(left)} min over`;
  const pct=Math.max(0,Math.min(100,((nowM()-t.start)/(t.end-t.start))*100));$('#liveProgress').style.width=`${pct}%`;
}
function fill(prefix,item){
  if(!item){$(`#${prefix}Title`).textContent='End of day';$(`#${prefix}Meta`).textContent='—';return}
  const t=shifted(item);$(`#${prefix}Title`).textContent=item.title;$(`#${prefix}Meta`).textContent=`${fmt(t.start)} · ${item.subtitle||typeLabel(item.type)}`
}
function renderLive(){
  const i=currentIndex(),item=DATA.schedule[i],t=shifted(item);
  $('#liveType').textContent=typeLabel(item.type);$('#liveTitle').textContent=item.title;$('#liveSubtitle').textContent=[item.subtitle,item.talent,item.notes].filter(Boolean).join(' · ');
  $('#liveRange').textContent=`${fmt(t.start)} – ${fmt(t.end)}`;$('#delayBadge').textContent=state.delay?`${state.delay>0?'+':''}${state.delay} MIN`:'';
  fill('next',DATA.schedule[i+1]);fill('after',DATA.schedule[i+2]);
  const checked=DATA.talent.filter(p=>state.people[p.id]?.checked).length;
  $('#checkedCount').textContent=`${checked}/${DATA.talent.length}`;$('#issueCount').textContent=state.issues.length;$('#doneCount').textContent=`${state.completed.length}/${DATA.schedule.length}`;
  $('#readyCurrent').classList.toggle('is-on',state.ready.includes(item.id));$('#readyCurrent').textContent=state.ready.includes(item.id)?'Stage Ready ✓':'Stage Ready';
  renderClock()
}
function renderSchedule(){
  const ci=currentIndex();
  $('#scheduleList').innerHTML=DATA.schedule.map((item,i)=>{const t=shifted(item),done=state.completed.includes(item.id),ready=state.ready.includes(item.id);return `<article class="schedule-card ${i===ci?'current':''} ${done?'complete':''} ${ready?'ready':''}">
  <div class="schedule-top"><div class="schedule-time">${fmt(t.start)}</div><div class="schedule-copy"><b>${item.title}</b><small>${[item.subtitle,item.talent,item.notes].filter(Boolean).join(' · ')}</small></div><span>${done?'✓':''}</span></div>
  <div class="card-actions"><button data-ready="${item.id}" class="${ready?'is-on':''}">${ready?'Ready ✓':'Stage Ready'}</button><button data-complete="${item.id}">${done?'Undo':'Complete'}</button></div></article>`}).join('')
}
function renderIssues(){
  $('#issueList').innerHTML=state.issues.length?state.issues.map(x=>`<article class="issue-card"><i class="issue-dot"></i><div><b>${x.title}</b><small>${x.details||'No details'} · ${x.time}</small></div><button data-resolve="${x.id}">Done</button></article>`).join(''):`<div class="empty">No open production issues.</div>`
}
function renderPeople(){
  const fair=state.fairContact||defaultFair;
  $('#fairContactCard').innerHTML=`<article class="fair-contact-card"><div class="person-copy"><b>${fair.name}</b><small>${fair.role||'OC Fair'}${fair.phone?` · ${fair.phone}`:''}</small></div><div></div><div class="fair-actions"><a class="${fair.phone?'':'disabled'}" href="${fair.phone?`tel:${fair.phone}`:'#'}">Call</a><a class="${fair.email?'':'disabled'}" href="${fair.email?`mailto:${fair.email}`:'#'}">Email</a></div></article>`;
  $('#peopleList').innerHTML=DATA.talent.map(p=>{
    const s=personData(p);
    return `<article class="person-card">
      <div class="person-head">
        <div class="avatar">${initials(s.name)}</div>
        <div class="person-copy"><b>${s.name}</b><small>${s.arrival||'Arrival not entered'} · ${s.notes||'No notes'}</small></div>
        <button class="person-edit" data-edit-person="${p.id}">Edit</button>
      </div>
      <div class="person-actions">
        <button data-check="${p.id}" class="${s.checked?'is-on':''}">${s.checked?'In ✓':'Check In'}</button>
        <button data-person-ready="${p.id}" class="${s.ready?'is-on':''}">${s.ready?'Ready ✓':'Ready'}</button>
        <a class="${s.phone?'':'disabled'}" href="${s.phone?`tel:${s.phone}`:'#'}">Call</a>
        <a class="${s.phone?'':'disabled'}" href="${s.phone?`sms:${s.phone}`:'#'}">Text</a>
        <a class="${s.email?'':'disabled'}" href="${s.email?`mailto:${s.email}`:'#'}">Email</a>
      </div>
    </article>`
  }).join('');
  $('#handoffNotes').value=state.handoff||''
}
function render(){renderLive();renderSchedule();renderIssues();renderPeople();showScreen(state.screen||'live')}
function addIssue(title,details=''){state.issues.unshift({id:String(Date.now()),title,details,time:new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})});save();showScreen('issues')}
function openPersonEditor(id){
  const p=DATA.talent.find(x=>x.id===id),s=personData(p),f=$('#personForm');
  $('#personDialogTitle').textContent=`Edit ${s.name}`;
  f.elements.id.value=id;f.elements.name.value=s.name||'';f.elements.phone.value=s.phone||'';f.elements.email.value=s.email||'';f.elements.arrival.value=s.arrival||'';f.elements.notes.value=s.notes||'';
  $('#personDialog').showModal()
}
function openFairEditor(){
  const f=$('#fairForm'),c=state.fairContact||defaultFair;
  f.elements.name.value=c.name||'';f.elements.role.value=c.role||'';f.elements.phone.value=c.phone||'';f.elements.email.value=c.email||'';
  $('#fairDialog').showModal()
}
document.addEventListener('click',e=>{
  const tab=e.target.closest('[data-tab]');if(tab){showScreen(tab.dataset.tab);return}
  const nav=e.target.closest('[data-nav]');if(nav){showScreen(nav.dataset.nav);return}
  const i=currentIndex(),cur=DATA.schedule[i];
  if(e.target.id==='completeCurrent'){if(!state.completed.includes(cur.id))state.completed.push(cur.id);save()}
  if(e.target.id==='readyCurrent'){state.ready.includes(cur.id)?state.ready=state.ready.filter(x=>x!==cur.id):state.ready.push(cur.id);save()}
  if(e.target.id==='delayMenu')$('#delayDialog').showModal()
  if(e.target.dataset.delay){state.delay+=Number(e.target.dataset.delay);$('#delayDialog').close();save()}
  if(e.target.id==='quickIssue'||e.target.id==='newIssue')$('#issueDialog').showModal()
  if(e.target.dataset.issueType)addIssue(e.target.dataset.issueType)
  if(e.target.id==='resetDay'&&confirm('Reset all progress, check-ins, delays, contacts, and issues?')){state=clone(base);save()}
  const id=e.target.dataset.ready;if(id){state.ready.includes(id)?state.ready=state.ready.filter(x=>x!==id):state.ready.push(id);save()}
  const cid=e.target.dataset.complete;if(cid){state.completed.includes(cid)?state.completed=state.completed.filter(x=>x!==cid):state.completed.push(cid);save()}
  const check=e.target.dataset.check;if(check){state.people[check]={...(state.people[check]||{}),checked:!state.people[check]?.checked};save()}
  const pr=e.target.dataset.personReady;if(pr){state.people[pr]={...(state.people[pr]||{}),ready:!state.people[pr]?.ready};save()}
  const ep=e.target.dataset.editPerson;if(ep)openPersonEditor(ep)
  const rid=e.target.dataset.resolve;if(rid){state.issues=state.issues.filter(x=>x.id!==rid);save()}
  if(e.target.id==='editFairContact')openFairEditor()
  if(e.target.id==='saveHandoff'){state.handoff=$('#handoffNotes').value;save()}
  if(e.target.id==='copyHandoff'){navigator.clipboard?.writeText(handoffText());alert('Handoff copied.')}
})
$('#issueForm').addEventListener('submit',e=>{const f=new FormData(e.target);if(!f.get('title'))return;addIssue(f.get('title'),f.get('details'));e.target.reset()})
$('#personForm').addEventListener('submit',e=>{
  const f=new FormData(e.target),id=f.get('id');
  state.people[id]={...(state.people[id]||{}),name:f.get('name'),phone:f.get('phone'),email:f.get('email'),arrival:f.get('arrival'),notes:f.get('notes')};
  save()
})
$('#fairForm').addEventListener('submit',e=>{
  const f=new FormData(e.target);state.fairContact={name:f.get('name'),role:f.get('role'),phone:f.get('phone'),email:f.get('email')};save()
})
function handoffText(){const i=currentIndex(),cur=DATA.schedule[i],next=DATA.schedule[i+1];const issues=state.issues.map(x=>`• ${x.title}: ${x.details||'No details'}`).join('\n')||'• None';return `OATF OC FAIR HANDOFF\nCurrent: ${cur.title}\nNext: ${next?.title||'End of day'}\nDelay: ${state.delay} minutes\nCompleted: ${state.completed.length}/${DATA.schedule.length}\nIssues:\n${issues}\nNotes:\n${$('#handoffNotes').value||'None'}`}
setInterval(renderClock,30000);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
render();
})();