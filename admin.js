const loginView=document.getElementById("loginView");const dashboardView=document.getElementById("dashboardView");const loginForm=document.getElementById("loginForm");const loginMessage=document.getElementById("loginMessage");const dashboardMessage=document.getElementById("dashboardMessage");const roomsContainer=document.getElementById("roomsContainer");const roomCount=document.getElementById("roomCount");const availableCount=document.getElementById("availableCount");

function showMessage(el,text,success=false){el.textContent=text;el.className=success?"message success":"message";}
function showDashboard(){loginView.classList.add("hidden");dashboardView.classList.remove("hidden");loadRooms();}
function showLogin(){dashboardView.classList.add("hidden");loginView.classList.remove("hidden");}

async function checkSession(){const {data}=await supabaseClient.auth.getSession();if(data.session)showDashboard();else showLogin();}

loginForm.addEventListener("submit",async e=>{e.preventDefault();showMessage(loginMessage,"");const email=document.getElementById("loginEmail").value.trim();const password=document.getElementById("loginPassword").value;const {error}=await supabaseClient.auth.signInWithPassword({email,password});if(error){showMessage(loginMessage,error.message);return}loginForm.reset();showDashboard();});

document.getElementById("logoutBtn").addEventListener("click",async()=>{await supabaseClient.auth.signOut();showLogin();});
document.getElementById("refreshBtn").addEventListener("click",loadRooms);

async function loadRooms(){roomsContainer.innerHTML="<div class='room-card'>Loading rooms...</div>";showMessage(dashboardMessage,"");const {data,error}=await supabaseClient.from("rooms").select("id,room_name,price,total_rooms,available_rooms,active").order("id");if(error){roomsContainer.innerHTML="";showMessage(dashboardMessage,error.message);return}roomCount.textContent=data.length;availableCount.textContent=data.reduce((sum,r)=>sum+Number(r.available_rooms||0),0);roomsContainer.innerHTML="";data.forEach(room=>{const card=document.createElement("div");card.className="room-card";card.innerHTML=`<h3>${escapeHtml(room.room_name)}</h3><div class="field"><label>Price per night (₹)</label><input class="price" type="number" min="0" step="1" value="${Number(room.price)}"></div><div class="field"><label>Total rooms</label><input class="total" type="number" min="0" step="1" value="${Number(room.total_rooms)}"></div><div class="field"><label>Available rooms</label><input class="available" type="number" min="0" step="1" value="${Number(room.available_rooms)}"></div><div class="field toggle"><input class="active" type="checkbox" ${room.active?"checked":""}><label>Active on website</label></div><button class="save">Save Changes</button>`;card.querySelector(".save").addEventListener("click",()=>saveRoom(room.id,card));roomsContainer.appendChild(card)});}

async function saveRoom(id,card){const button=card.querySelector(".save");const price=Number(card.querySelector(".price").value);const total=Number(card.querySelector(".total").value);const available=Number(card.querySelector(".available").value);const active=card.querySelector(".active").checked;if(!Number.isFinite(price)||price<0||!Number.isInteger(total)||total<0||!Number.isInteger(available)||available<0||available>total){showMessage(dashboardMessage,"Please enter valid room values. Available rooms cannot exceed total rooms.");return}button.disabled=true;button.textContent="Saving...";const {error}=await supabaseClient.from("rooms").update({price,total_rooms:total,available_rooms:available,active}).eq("id",id);button.disabled=false;button.textContent="Save Changes";if(error){showMessage(dashboardMessage,error.message);return}showMessage(dashboardMessage,"Room updated successfully.",true);loadRooms();}

function escapeHtml(value){
    return String(value).replace(/[&<>\"']/g, function(c){
        return {
            "&":"&amp;",
            "<":"&lt;",
            ">":"&gt;",
            "\"":"&quot;",
            "'":"&#039;"
        }[c];
    });
}

checkSession();
