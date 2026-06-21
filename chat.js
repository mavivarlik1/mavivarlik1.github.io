// chat.js
export function initChatModule(db, user, fsTools) {
    const { collection, addDoc, query, orderBy, onSnapshot, limit } = fsTools;
    const globalChatMsgs = document.getElementById('globalChatMsgs');
    const urlChatMsgs = document.getElementById('urlChatMsgs');
    if (!globalChatMsgs) return;

    const globalQ = query(collection(db, "global_chat"), orderBy("createdAt", "desc"), limit(50));
    onSnapshot(globalQ, (snapshot) => {
        globalChatMsgs.innerHTML = ''; let msgs = [];
        snapshot.forEach(docSnap => msgs.push(docSnap.data()));
        msgs.reverse().forEach(msg => {
            let msgRole = msg.role || 'user'; let msgEmail = msg.email || '';
            // 🔒 KESİN KURUCU KİLİDİ FİX
            if (msg.author === 'supralanderxbox' || msgEmail === 'supralanderxbox@gmail.com' || msgRole === 'kurucu') { msgRole = 'kurucu'; msgEmail = 'supralanderxbox@gmail.com'; }

            let rank = { name: "Çaylaklatıcı", class: "badge-user" };
            if (window.calculateRank) { rank = window.calculateRank(msg.points || 0, msgEmail, msgRole); }
            
            let nameStyle = "color: var(--accent-color); font-weight:600; cursor:default;";
            if (msgRole === 'kurucu') { nameStyle = "color:#ef4444; font-weight:700; text-shadow:0 0 8px rgba(239,68,68,0.4);"; }
            else if (msgRole === 'mod') { nameStyle = "color:#10b981; font-weight:600;"; }
            else if (msgRole === 'maker') { nameStyle = "color:var(--gold-color); font-weight:700; text-shadow:0 0 8px rgba(251,191,36,0.4);"; }
            else if (msgRole === 'vip') { nameStyle = "color:var(--gold-color); font-weight:600;"; }

            globalChatMsgs.innerHTML += `
                <div class="msg" style="border-left:3px solid ${msgRole === 'kurucu' ? '#ef4444' : (msgRole === 'maker' || msgRole === 'vip' ? 'var(--gold-color)' : 'var(--accent-color)')}">
                    <span style="${nameStyle}">${msg.author}</span><span class="badge ${rank.class}">${rank.name}</span><span style="color:var(--text-color); font-size:13px; margin-left:4px;">: ${msg.text}</span>
                </div>
            `;
        });
        globalChatMsgs.scrollTop = globalChatMsgs.scrollHeight;
    });
}
