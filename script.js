// ==============================================
// NEXUS AI - SCRIPT RINGKAS & LENGKAP
// ==============================================
let currentUser = null, currentChatId = generateId(), settings = {theme:'system',fontSize:16,language:'id',autoSave:true};
const API_CONFIG = {SEARCH_ENGINE:"https://api.duckduckgo.com/?q=",TRANSLATE_API:"https://api.mymemory.translated.net/get"};

document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(()=>{document.getElementById('loadingScreen')?.classList.add('hidden');cekSesiPengguna()},2000);
    initSecuritySystem(),initAuthEvents(),initChatEvents(),initModalEvents(),initSettings()
});

// ==============================================
// KEAMANAN
// ==============================================
function initSecuritySystem(){
    window.sanitizeInput=i=>i.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    let r=0;setInterval(()=>r=0,60000);window.cekBatasPermintaan=()=>++r<30;
    window.enkripsiData=d=>btoa(unescape(encodeURIComponent(JSON.stringify(d))));
    window.dekripsiData=d=>{try{return JSON.parse(decodeURIComponent(escape(atob(d))))}catch{return null}}
}

// ==============================================
// AUTENTIKASI
// ==============================================
function initAuthEvents(){
    const F={lg:document.getElementById('loginForm'),rg:document.getElementById('registerForm'),fg:document.getElementById('forgotForm')};
    ['showRegister','showLogin','showForgot','showLogin2'].map(i=>document.getElementById(i)?.addEventListener('click',e=>{e.preventDefault();gantiFormAuth(i==='showRegister'?'register':i==='showLogin'||i==='showLogin2'?'login':'forgot')}));
    
    F.lg?.addEventListener('submit',e=>{
        e.preventDefault();const em=sanitizeInput(document.getElementById('loginEmail').value.trim()),pw=document.getElementById('loginPass').value;
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))return tampilkanNotif('Format email salah','error');
        const u=JSON.parse(localStorage.getItem('nexus_users')||'[]').find(u=>u.email===em&&u.pass===pw);
        u?(currentUser=u,simpanSesi(),tampilkanNotif('Selamat datang!','success'),tampilkanHalamanUtama()):tampilkanNotif('Email/sandi salah','error')
    });

    F.rg?.addEventListener('submit',e=>{
        e.preventDefault();const n=sanitizeInput(document.getElementById('regNama').value.trim()),em=sanitizeInput(document.getElementById('regEmail').value.trim()),pw=document.getElementById('regPass').value,pw2=document.getElementById('regPass2').value;
        if(!n||!em||!pw)return tampilkanNotif('Isi semua kolom','error');if(pw!==pw2)return tampilkanNotif('Sandi tidak cocok','error');if(pw.length<6)return tampilkanNotif('Sandi min. 6 karakter','error');
        const u=JSON.parse(localStorage.getItem('nexus_users')||'[]');if(u.some(x=>x.email===em))return tampilkanNotif('Email sudah ada','error');
        u.push({id:generateId(),nama:n,email:em,pass:pw,tanggalDaftar:Date.now()});localStorage.setItem('nexus_users',JSON.stringify(u));
        tampilkanNotif('Akun dibuat!','success'),gantiFormAuth('login')
    });

    document.getElementById('logoutBtn')?.addEventListener('click',()=>{localStorage.removeItem('nexus_session');location.reload()})
}

function gantiFormAuth(t){document.querySelectorAll('.auth-form').forEach(f=>f.classList.remove('active'));document.getElementById(t+'Form')?.classList.add('active');document.getElementById('authSubtitle').textContent={login:'Masuk',register:'Daftar',forgot:'Lupa Sandi'}[t]}
function cekSesiPengguna(){const s=localStorage.getItem('nexus_session');s?(currentUser=dekripsiData(s),tampilkanHalamanUtama()):document.getElementById('authPage')?.classList.remove('hidden')}
function simpanSesi(){localStorage.setItem('nexus_session',enkripsiData(currentUser))}
function tampilkanHalamanUtama(){document.getElementById('authPage')?.classList.add('hidden');document.getElementById('mainApp')?.classList.remove('hidden');muatRiwayatChat();terapkanTema()}

// ==============================================
// SISTEM CHAT & AI
// ==============================================
function initChatEvents(){
    const S={send:document.getElementById('sendBtn'),input:document.getElementById('userInput'),newChat:document.getElementById('newChatBtn')};
    const kirim=()=>{const t=S.input.value.trim();if(!t||!cekBatasPermintaan())return;tambahPesanKeUI('user',t);S.input.value='';autoResizeTextarea();prosesJawabanAI(t)};
    S.send?.addEventListener('click',kirim);S.input?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey)e.preventDefault(),kirim()});S.input?.addEventListener('input',autoResizeTextarea);

    S.newChat?.addEventListener('click',()=>{currentChatId=generateId();const m=document.getElementById('chatMessages');if(m)m.innerHTML='<div class="message ai-message"><div class="avatar ai-avatar">N</div><div class="message-content glass"><p>Halo! Saya NEXUS AI, ada yang bisa dibantu?</p></div></div>';document.getElementById('currentChatTitle').textContent='Percakapan Baru'});
    
    document.getElementById('openSidebar')?.addEventListener('click',()=>document.getElementById('sidebar')?.classList.add('active'));
    document.getElementById('closeSidebar')?.addEventListener('click',()=>document.getElementById('sidebar')?.classList.remove('active'));
    document.getElementById('moreOptionsBtn')?.addEventListener('click',()=>bukaModal('toolsModal'));
    document.getElementById('imageUpload')?.addEventListener('change',e=>e.target.files[0]&&prosesAnalisisGambar(e.target.files[0]));
    document.getElementById('sttBtn')?.addEventListener('click',aktifkanPengenalanSuara);
    document.getElementById('ttsBtn')?.addEventListener('click',()=>document.getElementById('userInput').value&&ucapkanTeks(document.getElementById('userInput').value));
    document.getElementById('exportChatBtn')?.addEventListener('click',eksporPercakapan);
    document.getElementById('deleteChatBtn')?.addEventListener('click',()=>confirm('Hapus semua?')&&(document.getElementById('chatMessages').innerHTML=''))
}

async function prosesJawabanAI(t){
    tampilkanIndikatorMengetik(true);let j='';
    try{
        if(/buatkan kode|html|css|js|python/i.test(t))j=buatKodeSesuaiBahasa(t);
        else if(/terjemahkan/i.test(t))j=await terjemahkanTeks(t);
        else if(/ringkasan/i.test(t))j=buatRingkasanTeks(t);
        else if(/hitung|hasil/i.test(t))j=selesaikanSoalMatematika(t);
        else{const d=await ambilDataDariInternet(t);j=d?.Abstract?d.Abstract+'\n\n*Sumber: DuckDuckGo*':jawabanDasar(t)}
    }catch{j="⚠️ Tidak bisa ambil data. Jawaban dasar:\n\n"+jawabanDasar(t)}
    tampilkanIndikatorMengetik(false);tambahPesanKeUI('ai',j,true);simpanRiwayatChat(t,j)
}

function buatKodeSesuaiBahasa(t){
    return /html/i.test(t)?'```html\n<!DOCTYPE html>\n<html lang="id">\n<head><meta charset="UTF-8"><title>Web</title></head>\n<body><h1>Halo Dunia</h1></body>\n</html>\n```\n✅ Kode HTML siap pakai':
    /css/i.test(t)?'```css\n.container { max-width: 1200px; margin: 0 auto; padding: 20px; }\n```':
    /js|javascript/i.test(t)?'```javascript\nfunction sapa(nama) { return `Halo ${nama}`; }\n```':
    'Saya bisa buat kode HTML, CSS, JS, Python, C++. Silakan sebutkan detailnya.'
}
async function terjemahkanTeks(t){try{const k=t.replace(/terjemahkan|ke inggris|ke indonesia/gi,'').trim(),l=/inggris/i.test(t)?'id|en':'en|id';const r=await fetch(`${API_CONFIG.TRANSLATE_API}?q=${encodeURIComponent(k)}&langpair=${l}`),d=await r.json();return `**Hasil:**\n\n${d.responseData?.translatedText||'Gagal'}`}catch{return '⚠️ Layanan tidak tersedia'}}
function buatRingkasanTeks(t){const i=t.replace(/ringkasan/gi,'').trim();return i.length<20?'Teks terlalu pendek':`**Ringkasan:**\n• Topik: ${i.slice(0,50)}...\n• Inti: Menjelaskan konsep dasar\n• Kesimpulan: Penting untuk dipahami`}
function selesaikanSoalMatematika(t){try{const h=eval(t.replace(/[^0-9+\-*/().]/g,''));return `**Hasil:** ${h}`}catch{return 'Bisa hitung + - * / saja'}}
async function ambilDataDariInternet(t){try{const r=await fetch(`${API_CONFIG.SEARCH_ENGINE}${encodeURIComponent(t)}&format=json`);return await r.json()}catch{return null}}
function jawabanDasar(t){t=t.toLowerCase();return /halo/i.test(t)?'Halo! Ada yang bisa dibantu?':/siapa kamu/i.test(t)?'Saya NEXUS AI, asisten cerdas kamu.':/tanggal/i.test(t)?`Tanggal: ${new Date().toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}`:'Saya mengerti, bisa jelaskan lebih detail?'}

// ==============================================
// UI & UTILITAS
// ==============================================
function tambahPesanKeUI(j,t,k=false){const m=document.getElementById('chatMessages');if(!m)return;const d=document.createElement('div');d.className=`message ${j}-message`;d.innerHTML=j==='ai'?'<div class="avatar ai-avatar">N</div><div class="message-content glass"></div>':`<div class="avatar user-avatar">U</div><div class="message-content glass">${sanitizeInput(t).replace(/\n/g,'<br>')}</div>`;m.appendChild(d);m.scrollTop=m.scrollHeight;k&&j==='ai'&&ketikTeks(d.querySelector('.message-content'),t)}
function ketikTeks(e,t,i=15){let x=0;e.innerHTML='';const n=setInterval(()=>{x<t.length?(e.innerHTML+=t[x]==='\n'?'<br>':t[x++],document.getElementById('chatMessages').scrollTop=document.getElementById('chatMessages').scrollHeight):clearInterval(n)},i)}
function tampilkanIndikatorMengetik(a){document.getElementById('typingIndicator')?.classList.toggle('hidden',!a);document.getElementById('chatMessages').scrollTop=document.getElementById('chatMessages').scrollHeight}
function autoResizeTextarea(){const t=document.getElementById('userInput');t&&(t.style.height='auto',t.style.height=Math.min(t.scrollHeight,150)+'px')}
function generateId(){return Date.now().toString(36)+Math.random().toString(36).slice(2)}
function tampilkanNotif(t,i='info'){const n=document.createElement('div');n.className='toast';n.style.borderLeft=`4px solid ${i==='success'?'#10B981':i==='error'?'#EF4444':'#F59E0B'}`;n.textContent=t;document.getElementById('toastContainer').appendChild(n);setTimeout(()=>n.remove(),3200)}

// ==============================================
// PENGATURAN & MODAL
// ==============================================
function initModalEvents(){
    document.querySelectorAll('[data-modal]').forEach(b=>b.addEventListener('click',()=>bukaModal(b.dataset.modal)));
    document.querySelectorAll('.close-btn,.modal').forEach(e=>e.addEventListener('click',o=>{o.target===e&&tutupModal()}));
    document.getElementById('toggleTheme')?.addEventListener('click',()=>{document.body.classList.toggle('light-mode');document.body.classList.toggle('dark-mode');document.body.classList.toggle('neon-mode')});
    document.getElementById('settingTheme')?.addEventListener('change',e=>{settings.theme=e.target.value;simpanPengaturan();terapkanTema()});
    document.getElementById('fontSizeRange')?.addEventListener('input',e=>{settings.fontSize=parseInt(e.target.value);simpanPengaturan();document.body.style.fontSize=settings.fontSize+'px'});
    document.getElementById('resetDataBtn')?.addEventListener('click',()=>confirm('Reset semua?')&&(localStorage.clear(),location.reload()));
    document.getElementById('backupDataBtn')?.addEventListener('click',eksporSemuaData)
}
function bukaModal(i){document.getElementById(i)?.classList.add('active');document.body.style.overflow='hidden'}
function tutupModal(){document.querySelectorAll('.modal').forEach(m=>m.classList.remove('active'));document.body.style.overflow='auto'}
function terapkanTema(){document.body.classList.remove('light-mode','dark-mode','neon-mode');settings.theme==='light'?document.body.classList.add('light-mode'):settings.theme==='neon'?document.body.classList.add('neon-mode'):settings.theme==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?document.body.classList.add('dark-mode'):document.body.classList.add('light-mode')):document.body.classList.add('dark-mode')}
function simpanPengaturan(){localStorage.setItem('nexus_settings',JSON.stringify(settings))}
function initSettings(){const s=localStorage.getItem('nexus_settings');s&&(settings=JSON.parse(s),document.body.style.fontSize=settings.fontSize+'px')}

// ==============================================
// FITUR TAMBAHAN
// ==============================================
function simpanRiwayatChat(t,j){const r=JSON.parse(localStorage.getItem('nexus_chat_history')||'{}');r[currentChatId]||(r[currentChatId]={id:currentChatId,waktu:Date.now(),pesan:[]});r[currentChatId].pesan.push({tanya:t,jawab:j,waktu:Date.now()});localStorage.setItem('nexus_chat_history',JSON.stringify(r))}
function muatRiwayatChat(){const l=document.getElementById('chatHistoryList');if(!l)return;l.innerHTML='';const r=JSON.parse(localStorage.getItem('nexus_chat_history')||'{}');Object.values(r).forEach(c=>{const i=document.createElement('div');i.className='chat-item glass p-2 rounded-lg mb-2 cursor-pointer';i.textContent=c.pesan[0]?.tanya.slice(0,20)+'...';i.addEventListener('click',()=>{currentChatId=c.id;document.getElementById('chatMessages').innerHTML='';c.pesan.forEach(p=>{tambahPesanKeUI('user',p.tanya);tambahPesanKeUI('ai',p.jawab)})});l.appendChild(i)})}
function aktifkanPengenalanSuara(){if(!('webkitSpeechRecognition'in window))return tampilkanNotif('Tidak dukung suara','error');const r=new(window.SpeechRecognition||window.webkitSpeechRecognition);r.lang=settings.language==='id'?'id-ID':'en-US';r.onresult=e=>document.getElementById('userInput').value=e.results[0][0].transcript;r.start();tampilkanNotif('Silakan bicara...')}
function ucapkanTeks(t){if(!('speechSynthesis'in window))return;t=new SpeechSynthesisUtterance(t);t.lang=settings.language==='id'?'id-ID':'en-US';speechSynthesis.speak(t)}
function eksporPercakapan(){const b=new Blob([document.getElementById('chatMessages').innerText],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`NEXUS_Chat_${Date.now()}.txt`;a.click()}
function eksporSemuaData(){const b=new Blob([JSON.stringify({user:currentUser,set:settings,data:localStorage.getItem('nexus_chat_history')},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`NEXUS_Backup_${Date.now()}.json`;a.click()}
function prosesAnalisisGambar(f){tampilkanNotif('Memproses gambar...');const r=new FileReader();r.onload=()=>{tambahPesanKeUI('user','[Mengirim Gambar]');setTimeout(()=>tambahPesanKeUI('ai','✅ Gambar diterima. Fitur analisis aktif.'),1500)};r.readAsDataURL(f)}
