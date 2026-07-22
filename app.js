
(() => {
'use strict';
const DATA=window.OATF_DATA;
const KEY='oatf-oc-dayof-2026-v02';
const clone=x=>JSON.parse(JSON.stringify(x));
const base={delay:0,completed:[],ready:[],talent:{},issues:[],contacts:clone(DATA.contacts),handoff:'',screen:'live'};
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
function showScreen(name){
  state.screen=name;
  $$('.screen').forEach(x=>x.classList.toggle('active',x.dataset.screen===name));
  $$('.tab-bar button').forEach(x=>x.classList.toggle('active',x.dataset.tab===name));
  $('#screenTitle').textContent=name[0].toUpperCase()+name.slice(1);
  localStorage.setItem(KEY,JSON.stringify(state));
  document.querySelector(`.screen[data-screen="${name}"]`).scrollTop=0;
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
  const checked=DATA.talent.filter(p=>state.talent[p.id]?.checked).length;
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
function renderTalent(){
  $('#talentList').innerHTML=DATA.talent.map(p=>{const s=state.talent[p.id]||{},phone=s.phone??p.phone,email=s.email??p.email,arrival=s.arrival??p.arrival,notes=s.notes??p.notes;return `<article class="talent-card">
  <div class="talent-head"><div class="avatar">${initials(p.name)}</div><div class="talent-copy"><b>${p.name}</b><small>${arrival||'Arrival not entered'} · ${notes||'No notes'}</small></div></div>
  <div class="talent-actions"><button data-check="${p.id}" class="${s.checked?'is-on':''}">${s.checked?'In ✓':'Check In'}</button><button data-talent-ready="${p.id}" class="${s.ready?'is-on':''}">${s.ready?'Ready ✓':'Ready'}</button><a class="${phone?'':'disabled'}" href="${phone?`tel:${phone}`:'#'}">Call</a><a class="${phone?'':'disabled'}" href="${phone?`sms:${phone}`:'#'}">Text</a><a class="${email?'':'disabled'}" href="${email?`mailto:${email}`:'#'}">Email</a><button data-edit="${p.id}">Edit</button></div></article>`}).join('')
}
function renderIssues(){
  $('#issueList').innerHTML=state.issues.length?state.issues.map(x=>`<article class="issue-card"><i class="issue-dot"></i><div><b>${x.title}</b><small>${x.details||'No details'} · ${x.time}</small></div><button data-resolve="${x.id}">Done</button></article>`).join(''):`<div class="empty">No open production issues.</div>`
}
function renderContacts(){
  $('#contactList').innerHTML=state.contacts.map((c,i)=>`<article class="contact-card"><div><b>${c.name}</b><small>${c.role}${c.phone?` · ${c.phone}`:''}</small></div><div class="contact-actions"><a class="${c.phone?'':'disabled'}" href="${c.phone?`tel:${c.phone}`:'#'}">Call</a><a class="${c.email?'':'disabled'}" href="${c.email?`mailto:${c.email}`:'#'}">Email</a></div></article>`).join('');
  $('#handoffNotes').value=state.handoff||''
}
function render(){renderLive();renderSchedule();renderTalent();renderIssues();renderContacts();showScreen(state.screen||'live')}
function addIssue(title,details=''){state.issues.unshift({id:String(Date.now()),title,details,time:new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})});save();showScreen('issues')}
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
  const check=e.target.dataset.check;if(check){state.talent[check]={...(state.talent[check]||{}),checked:!state.talent[check]?.checked};save()}
  const tr=e.target.dataset.talentReady;if(tr){state.talent[tr]={...(state.talent[tr]||{}),ready:!state.talent[tr]?.ready};save()}
  const edit=e.target.dataset.edit;if(edit){const p=DATA.talent.find(x=>x.id===edit),s=state.talent[edit]||{};const phone=prompt(`${p.name} phone`,s.phone??p.phone);if(phone===null)return;const email=prompt(`${p.name} email`,s.email??p.email);if(email===null)return;const arrival=prompt(`${p.name} arrival`,s.arrival??p.arrival);if(arrival===null)return;const notes=prompt(`${p.name} notes`,s.notes??p.notes);if(notes===null)return;state.talent[edit]={...s,phone,email,arrival,notes};save()}
  const rid=e.target.dataset.resolve;if(rid){state.issues=state.issues.filter(x=>x.id!==rid);save()}
  if(e.target.id==='editContacts'){const ed=$('#contactsEditor');ed.innerHTML=state.contacts.map((c,i)=>`<div class="contact-editor"><input name="name-${i}" value="${c.name}" placeholder="Name"><input name="phone-${i}" value="${c.phone||''}" placeholder="Phone"><input name="email-${i}" value="${c.email||''}" placeholder="Email"></div>`).join('');$('#contactsDialog').showModal()}
  if(e.target.id==='saveHandoff'){state.handoff=$('#handoffNotes').value;save()}
  if(e.target.id==='copyHandoff'){navigator.clipboard?.writeText(handoffText());alert('Handoff copied.')}
})
$('#issueForm').addEventListener('submit',e=>{const f=new FormData(e.target);if(!f.get('title'))return;addIssue(f.get('title'),f.get('details'));e.target.reset()})
$('#contactsForm').addEventListener('submit',e=>{const f=new FormData(e.target);state.contacts=state.contacts.map((c,i)=>({...c,name:f.get(`name-${i}`)||c.name,phone:f.get(`phone-${i}`)||'',email:f.get(`email-${i}`)||''}));save()})
function handoffText(){const i=currentIndex(),cur=DATA.schedule[i],next=DATA.schedule[i+1];const issues=state.issues.map(x=>`• ${x.title}: ${x.details||'No details'}`).join('\n')||'• None';return `OATF OC FAIR HANDOFF\nCurrent: ${cur.title}\nNext: ${next?.title||'End of day'}\nDelay: ${state.delay} minutes\nCompleted: ${state.completed.length}/${DATA.schedule.length}\nIssues:\n${issues}\nNotes:\n${$('#handoffNotes').value||'None'}`}
setInterval(renderClock,30000);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
render();
})();