// help.js
export function initHelpForum(db, user, fsTools) {
    const { collection, addDoc, query, orderBy, onSnapshot } = fsTools;

    // 📥 Konuları Canlı Dinle
    const q = query(collection(db, "forum_topics"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        const wrapper = document.getElementById('helpTopicsWrapper');
        if(!wrapper) return;
        wrapper.innerHTML = '';
        
        if(snapshot.empty) {
            wrapper.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding: 20px;">🙋 Henüz hiç teknik yardım konusu açılmamış. İlk soruyu sen sor!</div>`;
            return;
        }

        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            const div = document.createElement('div');
            div.className = 'modal';
            div.innerHTML = `
                <h4 style="margin-top:0; color:var(--accent-color); font-size:16px;">❓ ${d.title}</h4>
                <div style="font-size:11px; color:var(--text-muted);">Soran: <b>${d.author}</b> | Yetki: <span style="color:var(--accent-color);">${d.authorRole.toUpperCase()}</span></div>
                <hr style="border:0; border-top:1px solid rgba(255,255,255,0.05); margin:10px 0;">
                <p style="font-size:13px; color:var(--text-muted); margin:0;">💬 Bu tartışma konusu herkese açık olarak indekslenmiştir. Çözüm önerileri yakında eklenecektir.</p>
            `;
            wrapper.appendChild(div);
        });
    });

    // 📤 Yeni Başlık Açma
    window.createNewHelpTopic = async function() {
        const title = document.getElementById('helpTitleInput').value.trim();
        if(!title) return alert("Konu başlığı boş bırakılamaz!");

        try {
            await addDoc(collection(db, "forum_topics"), {
                title: title,
                author: user.nick,
                authorRole: user.role || "user",
                uid: user.uid,
                createdAt: Date.now()
            });
            document.getElementById('helpTitleInput').value = '';
            alert("Yardım konusu başarıyla foruma eklendi!");
        } catch(e) { alert("Forum hatası: " + e.message); }
    };
}
