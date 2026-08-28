(() => {
  const $ = id => document.getElementById(id);
  const loginView = $('loginView'), dashboard = $('dashboardView');
  let currentRole = null;
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const date = s => s ? new Date(`${s}T00:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '-';
  const money = n => '₹' + Number(n||0).toLocaleString('en-IN');
  function msg(t, bad=true){ $('message').textContent=t; $('message').style.color=bad?'#b42318':'#067647'; }
  function showLogin(){loginView.classList.remove('hidden');dashboard.classList.add('hidden');}
  function showDash(){loginView.classList.add('hidden');dashboard.classList.remove('hidden');}

  async function getRole(){
    const {data:{user}} = await supabaseClient.auth.getUser();
    if(!user) return null;
    const {data,error}=await supabaseClient.from('user_roles').select('role').eq('user_id',user.id).maybeSingle();
    if(error) throw error;
    return data?.role || null;
  }

  async function load(){
    msg('');
    const [{data:rooms,error:re},{data:bookings,error:be}] = await Promise.all([
      supabaseClient.from('rooms').select('id,room_name,price,total_rooms,available_rooms,active').order('id'),
      supabaseClient.from('bookings').select('booking_id,guest_name,guest_phone,guest_email,room_name,check_in,check_out,guests,rooms_booked,amount,payment_status,booking_status,created_at').order('created_at',{ascending:false})
    ]);
    if(re||be){msg((re||be).message);return;}
    const r=rooms||[], b=bookings||[];
    $('roomTypes').textContent=r.length;
    $('availableRooms').textContent=r.reduce((s,x)=>s+Number(x.available_rooms||0),0);
    $('bookedRooms').textContent=r.reduce((s,x)=>s+Math.max(0,Number(x.total_rooms||0)-Number(x.available_rooms||0)),0);
    $('bookingCount').textContent=b.length;
    $('rooms').innerHTML=r.map(x=>{if(currentRole==='admin') return `<div class="room"><h3>${esc(x.room_name)}</h3><label>Price / night</label><input class="editPrice" data-id="${x.id}" type="number" min="0" value="${Number(x.price)}"><label>Total rooms</label><input class="editTotal" data-id="${x.id}" type="number" min="0" value="${Number(x.total_rooms)}"><label>Available rooms</label><input class="editAvailable" data-id="${x.id}" type="number" min="0" value="${Number(x.available_rooms)}"><label class="check"><input class="editActive" data-id="${x.id}" type="checkbox" ${x.active?'checked':''}> Active on website</label><button class="saveRoom" data-id="${x.id}">Save Changes</button></div>`; return `<div class="room"><h3>${esc(x.room_name)}</h3><div class="line"><span>Price</span><strong>${money(x.price)}/night</strong></div><div class="line"><span>Available</span><strong class="available">${Number(x.available_rooms)}/${Number(x.total_rooms)}</strong></div><div class="line"><span>Status</span><span>${x.active?'Active':'Inactive'}</span></div></div>`}).join('');
    if(currentRole==='admin') document.querySelectorAll('.saveRoom').forEach(btn=>btn.addEventListener('click',()=>saveRoom(Number(btn.dataset.id),btn)));
    $('bookings').innerHTML=b.map(x=>`<tr><td><strong>${esc(x.booking_id)}</strong><br><small>${date((x.created_at||'').slice(0,10))}</small></td><td>${esc(x.guest_name)}<br><small>${esc(x.guest_phone||'')} ${x.guest_email?'<br>'+esc(x.guest_email):''}</small></td><td>${esc(x.room_name)}<br><small>${Number(x.rooms_booked||1)} room</small></td><td>${date(x.check_in)} → ${date(x.check_out)}<br><small>${Number(x.guests||1)} guest(s)</small></td><td>${money(x.amount)}</td><td><span class="paid">${esc(x.payment_status)}</span><br>${esc(x.booking_status)}</td></tr>`).join('');
    $('noBookings').classList.toggle('hidden',b.length!==0);
  }

  async function saveRoom(id, btn){
    const card=btn.closest('.room'); const price=Number(card.querySelector('.editPrice').value); const total=Number(card.querySelector('.editTotal').value); const available=Number(card.querySelector('.editAvailable').value); const active=card.querySelector('.editActive').checked;
    if(!Number.isFinite(price)||price<0||!Number.isInteger(total)||total<0||!Number.isInteger(available)||available<0||available>total){msg('Available rooms cannot exceed total rooms.');return;}
    btn.disabled=true; btn.textContent='Saving...';
    const {error}=await supabaseClient.from('rooms').update({price,total_rooms:total,available_rooms:available,active}).eq('id',id);
    btn.disabled=false; btn.textContent='Save Changes';
    if(error){msg(error.message);return;}
    msg('Room updated successfully.',false); await load();
  }

  $('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginMessage').textContent='Logging in...';const {error}=await supabaseClient.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});if(error){$('loginMessage').textContent=error.message;return}try{currentRole=await getRole();if(!['admin','employee'].includes(currentRole)){await supabaseClient.auth.signOut();throw new Error('This account is not authorized for the staff panel.')} $('roleText').textContent=currentRole==='admin'?'Admin — rate & inventory controls enabled':'Employee — view only';showDash();await load();}catch(err){$('loginMessage').textContent=err.message;await supabaseClient.auth.signOut();}});
  $('logoutBtn').addEventListener('click',async()=>{await supabaseClient.auth.signOut();showLogin();});
  $('refreshBtn').addEventListener('click',load);
  (async()=>{const {data:{session}}=await supabaseClient.auth.getSession();if(session){try{currentRole=await getRole();if(['admin','employee'].includes(currentRole)){showDash();await load();}else await supabaseClient.auth.signOut();}catch(e){console.error(e)}}})();
})();
