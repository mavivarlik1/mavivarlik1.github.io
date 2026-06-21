// chat.js
export function initChatModule(db, user, fsTools) {
    const { collection, addDoc, query, orderBy, onSnapshot, limit } = fsTools;
    const globalChatMsgs = document.getElementById('globalChatMsgs');
    const urlChatMsgs = document.getElementById('urlChatMsgs');
    if (!globalChatMsgs) return;

    // 🌎 1. GENEL CHAT ANLIK AKIŞ DİNLEYİCİSİ
    const globalQ = query(collection(db, "global_chat"), orderBy("createdAt", "desc"), limit(50));
    onSnapshot(globalQ, (snapshot) => {
        globalChatMsgs.innerHTML = ''; 
        let msgs = [];
        snapshot.forEach(docSnap => msgs.push(docSnap.data()));
        
        msgs.reverse().forEach(msg => {
            let msgRole = msg.role || 'user'; 
            let msgEmail = msg.email || '';
            
            // 🔒 KESİN KURUCU RÜTBE KİLİDİ KORUMASI
            if (msg.author === 'supralanderxbox' || msgEmail === 'supralanderxbox@gmail.com' || msgRole === 'kurucu') { 
                msgRole = 'kurucu'; 
                msgEmail = 'supralanderxbox@gmail.com'; 
            }

            let rank = { name: "Çaylaklatıcı", class: "badge-user" };
            if (window.calculateRank) { 
                rank = window.calculateRank(msg.points || 0, msgEmail, msgRole); 
            }
            
            let nameStyle = "color: var(--accent-color); font-weight:600; cursor:default;";
            if (msgRole === 'kurucu') { 
                nameStyle = "color:#ef4444; font-weight:700; text-shadow:0 0 8px rgba(239,68,68,0.4);"; 
            } else if (msgRole === 'mod') { 
                nameStyle = "color:#10b981; font-weight:600;"; 
            } else if (msgRole === 'maker') { 
                nameStyle = "color:var(--gold-color); font-weight:700; text-shadow:0 0 8px rgba(251,191,36,0.4);"; 
            } else if (msgRole === 'vip') { 
                nameStyle = "color:var(--gold-color); font-weight:600;"; 
            }

            globalChatMsgs.innerHTML += `
                <div class="msg" style="border-left:3px solid ${msgRole === 'kurucu' ? '#ef4444' : (msgRole === 'maker' || msgRole === 'vip' ? 'var(--gold-color)' : 'var(--accent-color)')}">
                    <span style="${nameStyle}">${msg.author}</span><span class="badge ${rank.class}">${rank.name}</span><span style="color:var(--text-color); font-size:13px; margin-left:4px;">: ${msg.text}</span>
                </div>
            `;
        });
        globalChatMsgs.scrollTop = globalChatMsgs.scrollHeight;
    });

    // 📤 2. MESAJ GÖNDERME TETİKLEYİCİ MOTORU
    window.sendChatMessage = async function(type) {
        let inputId = type === 'global' ? 'globalMsgInput' : 'urlMsgInput';
        const input = document.getElementById(inputId);
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;

        if (type === 'global') {
            try {
                await addDoc(collection(db, "global_chat"), {
                    author: user.nick,
                    uid: user.uid,
                    email: user.email || 'guest',
                    role: user.role || 'user',
                    points: user.points || 0,
                    text: text,
                    createdAt: Date.now()
                });
                input.value = '';
            } catch(e) { alert("Mesaj iletilemedi: " + e.message); }
        } else {
            const urlTarget = document.getElementById('urlChatTarget').value.trim();
            if (!urlTarget) return alert("Lütfen önce tartışılacak geçerli bir web adresi girin.");
            let safeUrl = btoa(urlTarget).replace(/=/g, '');
            try {
                await addDoc(collection(db, `url_chats/${safeUrl}/messages`), {
                    author: user.nick,
                    uid: user.uid,
                    email: user.email || 'guest',
                    role: user.role || 'user',
                    points: user.points || 0,
                    text: text,
                    createdAt: Date.now()
                });
                input.value = '';
            } catch(e) { alert("Mesaj iletilemedi: " + e.message); }
        }
    };

    // 🔗 3. URL SOHBET ODASI AKIŞ MOTORU
    let currentUrlUnsub = null;
    window.loadUrlChat = function() {
        const urlTarget = document.getElementById('urlChatTarget').value.trim();
        if (!urlTarget) { urlChatMsgs.innerHTML = ''; return; }
        if (currentUrlUnsub) currentUrlUnsub();
        
        let safeUrl = btoa(urlTarget).replace(/=/g, '');
        const urlQ = query(collection(db, `url_chats/${safeUrl}/messages`), orderBy("createdAt", "desc"), limit(50));
        
        currentUrlUnsub = onSnapshot(urlQ, (snapshot) => {
            urlChatMsgs.innerHTML = ''; 
            let msgs = [];
            snapshot.forEach(docSnap => msgs.push(docSnap.data()));
            
            msgs.reverse().forEach(msg => {
                let msgRole = msg.role || 'user'; 
                let msgEmail = msg.email || '';
                if (msg.author === 'supralanderxbox' || msgEmail === 'supralanderxbox@gmail.com' || msgRole === 'kurucu') {
                    msgRole = 'kurucu'; msgEmail = 'supralanderxbox@gmail.com';
                }

                let rank = { name: "Çaylaklatıcı", class: "badge-user" };
                if (window.calculateRank) { rank = window.calculateRank(msg.points || 0, msgEmail, msgRole); }
                
                let nameStyle = "color: var(--accent-color); font-weight:600;";
                if (msgRole === 'kurucu') nameStyle = "color: #ef4444; font-weight:700;";
                else if (msgRole === 'mod') nameStyle = "color: #10b981; font-weight:600;";
                else if (msgRole === 'maker') nameStyle = "color: var(--gold-color); font-weight:700;";
                else if (msgRole === 'vip') nameStyle = "color: var(--gold-color); font-weight:600;";

                urlChatMsgs.innerHTML += `
                    <div class="msg">
                        <span style="${nameStyle}">${msg.author}</span><span class="badge ${rank.class}">${rank.name}</span><span style="color: var(--text-color); font-size:13px; margin-left:4px;">: ${msg.text}</span>
                    </div>
                `;
            });
            urlChatMsgs.scrollTop = urlChatMsgs.scrollHeight;
        });
    };
}
