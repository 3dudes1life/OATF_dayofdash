
(() => {
'use strict';
const DATA=window.OATF_DATA;
const KEY='oatf-oc-dayof-2026-v01';
const clone=x=>JSON.parse(JSON.stringify(x));
const base={delay:0,completed:[],ready:[],talent:{},issues:[],contacts:clone(DATA.contacts),handoff:''};
let state=load();

function load(){try{return {...base,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return clone(base)}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));render()}
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const pad=n=>String(n).padStart(2,'0');

function mins(value){const [h,m]=value.split(':').map(Number);return h*60+m}
function format(total){total=(total+1440)%1440;let h=Math.floor(total/60),m=total%60,amp=h>=12?'PM':'AM';h=h%12||12;return `${h}:${pad(m)} ${amp}`}
function nowMinutes(){const d=new Date();return d.getHours()*60+d.getMinutes()}
function shifted(item){return {start:mins(item.start)+state.delay,end:mins(item.end)+state.delay}}
function statusIndex(){
  const now=nowMinutes();
  let idx=DATA.schedule.findIndex((item,i)=>{
    const t=shifted(item); return now>=t.start&&now<t.end&&!state.completed.includes(item.id)
  });
  if(idx<0) idx=DATA.schedule.findIndex(item=>!state.completed.includes(item.id));
  return idx<0?DATA.schedule.length-1:idx
}
function typeLabel(type){return ({setup:'Setup',performance:'Performance',transition:'Transition',storytime:'Story Time',games:'Games & Giveaways',glam:'Glam Show',end:'Closing'})[type]||'Production'}
function initials(name){return name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()}

function renderClock(){
  const d=new Date(); $('#clock').textContent=d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
  $('#date').textContent=d.toLocaleDateString([], {weekday:'long'});
  const idx=statusIndex(), item=DATA.schedule[idx], t=shifted(item), left=t.end-nowMinutes();
  $('#remaining').textContent=left>0?`${left} min remaining`:left===0?'Ending now':`${Math.abs(left)} min over`;
}
function renderLive(){
  const idx=statusIndex(), item=DATA.schedule[idx], t=shifted(item);
  $('#liveType').textContent=typeLabel(item.type); $('#liveTitle').textContent=item.title;
  $('#liveSubtitle').textContent=[item.subtitle,item.talent,item.notes].filter(Boolean).join(' · ');
  $('#liveRange').textContent=`${format(t.start)} – ${format(t.end)}`;
  const next=DATA.schedule[idx+1], after=DATA.schedule[idx+2];
  fillNext('next',next); fillNext('after',after);
}
function fillNext(prefix,item){
  if(!item){$(`#${prefix}Title`).textContent='End of day';$(`#${prefix}Meta`).textContent='—';return}
  const t=shifted(item);$(`#${prefix}Title`).textContent=item.title;$(`#${prefix}Meta`).textContent=`${format(t.start)} · ${item.subtitle||typeLabel(item.type)}`
}
function renderProgress(){
  const done=state.completed.length,total=DATA.schedule.length,pct=Math.round(done/total*100);
  $('#progressText').textContent=`${done} of ${total} complete`;$('#progressBar').style.width=`${pct}%`;$('#progressPercent').textContent=`${pct}%`
}
function renderSchedule(){
  const current=statusIndex();
  $('#scheduleList').innerHTML=DATA.schedule.map((item,i)=>{
    const t=shifted(item),complete=state.completed.includes(item.id),ready=state.ready.includes(item.id);
    return `<article class="schedule-row ${i===current?'current':''} ${complete?'complete':''} ${ready?'ready':''}">
      <div class="schedule-time">${format(t.start)}<br><span>${format(t.end)}</span></div>
      <div class="schedule-copy"><b>${item.title}</b><small>${[item.subtitle,item.talent,item.notes].filter(Boolean).join(' · ')}</small></div>
      <div class="schedule-actions">
        <button data-ready="${item.id}">${ready?'Ready ✓':'Ready'}</button>
        <button data-complete="${item.id}">${complete?'Undo':'Complete'}</button>
      </div>
    </article>`
  }).join('')
}
function renderTalent(){
  $('#talentList').innerHTML=DATA.talent.map(person=>{
    const s=state.talent[person.id]||{}, phone=s.phone??person.phone,email=s.email??person.email,arrival=s.arrival??person.arrival,notes=s.notes??person.notes;
    return `<article class="talent-card">
      <div class="avatar">${initials(person.name)}</div>
      <div class="talent-copy"><b>${person.name}</b><small>Arrival: ${arrival||'Not entered'} · ${notes||'No notes'}</small></div>
      <div class="talent-actions">
        <button data-talent-check="${person.id}" class="${s.checked?'checked':''}">${s.checked?'Checked In ✓':'Check In'}</button>
        <button data-talent-ready="${person.id}" class="${s.ready?'checked':''}">${s.ready?'Stage Ready ✓':'Stage Ready'}</button>
        <a class="${phone?'':'disabled'}" href="${phone?`tel:${phone}`:'#'}">Call</a>
        <a class="${phone?'':'disabled'}" href="${phone?`sms:${phone}`:'#'}">Text</a>
        <a class="${email?'':'disabled'}" href="${email?`mailto:${email}`:'#'}">Email</a>
        <button data-edit-talent="${person.id}">Edit</button>
      </div>
    </article>`
  }).join('')
}
function renderIssues(){
  $('#issueList').innerHTML=state.issues.length?state.issues.map(issue=>`<article class="issue-row ${issue.severity.toLowerCase()}"><i class="issue-dot"></i><div><b>${issue.title}</b><small>${issue.details||issue.severity} · ${issue.time}</small></div><button data-resolve="${issue.id}">Resolve</button></article>`).join(''):`<div class="empty">No production issues logged.</div>`
}
function renderContacts(){
  $('#contactList').innerHTML=state.contacts.map((c,i)=>`<article class="contact-row"><div class="contact-copy"><b>${c.name}</b><small>${c.role}${c.phone?` · ${c.phone}`:''}</small></div><div class="contact-actions"><a class="${c.phone?'':'disabled'}" href="${c.phone?`tel:${c.phone}`:'#'}">☎</a><a class="${c.email?'':'disabled'}" href="${c.email?`mailto:${c.email}`:'#'}">✉</a></div></article>`).join('')
}
function render(){renderLive();renderProgress();renderSchedule();renderTalent();renderIssues();renderContacts();$('#handoffNotes').value=state.handoff||'';renderClock()}

document.addEventListener('click',e=>{
  const idx=statusIndex(), current=DATA.schedule[idx];
  if(e.target.id==='completeCurrent'){if(!state.completed.includes(current.id))state.completed.push(current.id);save()}
  if(e.target.id==='readyCurrent'){state.ready.includes(current.id)?state.ready=state.ready.filter(x=>x!==current.id):state.ready.push(current.id);save()}
  if(e.target.id==='delay5'){state.delay+=5;save()}
  if(e.target.id==='delay10'){state.delay+=10;save()}
  if(e.target.id==='resetDay'&&confirm('Reset all day-of progress, delays, check-ins, and issues?')){state=clone(base);localStorage.setItem(KEY,JSON.stringify(state));render()}
  const ready=e.target.dataset.ready;if(ready){state.ready.includes(ready)?state.ready=state.ready.filter(x=>x!==ready):state.ready.push(ready);save()}
  const complete=e.target.dataset.complete;if(complete){state.completed.includes(complete)?state.completed=state.completed.filter(x=>x!==complete):state.completed.push(complete);save()}
  const check=e.target.dataset.talentCheck;if(check){state.talent[check]={...(state.talent[check]||{}),checked:!(state.talent[check]?.checked)};save()}
  const tr=e.target.dataset.talentReady;if(tr){state.talent[tr]={...(state.talent[tr]||{}),ready:!(state.talent[tr]?.ready)};save()}
  const edit=e.target.dataset.editTalent;if(edit){const p=DATA.talent.find(x=>x.id===edit),s=state.talent[edit]||{};const phone=prompt(`${p.name} phone`,s.phone??p.phone);if(phone===null)return;const email=prompt(`${p.name} email`,s.email??p.email);if(email===null)return;const arrival=prompt(`${p.name} arrival`,s.arrival??p.arrival);if(arrival===null)return;const notes=prompt(`${p.name} notes`,s.notes??p.notes);if(notes===null)return;state.talent[edit]={...s,phone,email,arrival,notes};save()}
  const resolve=e.target.dataset.resolve;if(resolve){state.issues=state.issues.filter(x=>x.id!==resolve);save()}
  const jump=e.target.dataset.jump;if(jump){document.getElementById(jump)?.scrollIntoView({behavior:'smooth',block:'start'})}
  if(e.target.id==='newIssue')$('#issueDialog').showModal()
  if(e.target.id==='editContacts'){ $('#contactsEditor').innerHTML=state.contacts.map((c,i)=>`<div class="contact-editor-row"><input name="name-${i}" value="${c.name}" placeholder="Name"><input name="phone-${i}" value="${c.phone||''}" placeholder="Phone"><input name="email-${i}" value="${c.email||''}" placeholder="Email"></div>`).join('');$('#contactsDialog').showModal()}
  if(e.target.id==='saveHandoff'){state.handoff=$('#handoffNotes').value;save()}
  if(e.target.id==='copyHandoff'){const text=handoffText();navigator.clipboard?.writeText(text);alert('Handoff copied.')}
})
$('#issueForm').addEventListener('submit',e=>{const f=new FormData(e.target);if(!f.get('title'))return;state.issues.unshift({id:Date.now().toString(),title:f.get('title'),severity:f.get('severity'),details:f.get('details'),time:new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})});e.target.reset();save()})
$('#contactsForm').addEventListener('submit',e=>{const f=new FormData(e.target);state.contacts=state.contacts.map((c,i)=>({...c,name:f.get(`name-${i}`)||c.name,phone:f.get(`phone-${i}`)||'',email:f.get(`email-${i}`)||''}));save()})
function handoffText(){const idx=statusIndex(),cur=DATA.schedule[idx],next=DATA.schedule[idx+1];const open=state.issues.map(x=>`• ${x.title}: ${x.details||x.severity}`).join('\n')||'• No open issues';return `OATF OC FAIR HANDOFF\nCurrent: ${cur.title}\nNext: ${next?.title||'End of day'}\nDelay: ${state.delay} minutes\nProgress: ${state.completed.length}/${DATA.schedule.length}\nIssues:\n${open}\nNotes:\n${$('#handoffNotes').value||'None'}`}
setInterval(renderClock,30000);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
render();
})();