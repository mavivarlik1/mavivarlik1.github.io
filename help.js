let db, user, fsTools;

export function initHelpForum(database, currentUser, firestoreTools) {
    db = database; user = currentUser; fsTools = firestoreTools;
    listenHelpForum();
}

window.createNewHelpTopic = async () => {
    if(user.isGuest) return;
    const title = document.getElementById('helpTitleInput').value.trim(); if(!title) return; 
    await fsTools.addDoc(fsTools.collection(db, "forum_topics"), { 
        title: title, creator: user.nick || user.email.split('@')[0], creatorUid: user.uid, timestamp: Date.now(), solved: false 
    });
    document.getElementById('helpTitleInput').value = '';
};

window.solveHelpTopic = async (docId, creatorUid) => {
    if(user.isGuest) return;
    try {
        await fsTools.updateDoc(fsTools.doc(db, "forum_topics", docId), { solved: true });
        const userSnap = await fsTools.getDoc(fsTools.doc(db, "users", user.uid));
        if(userSnap.exists()) {
            await fsTools.updateDoc(fsTools.doc(db, "users", user.uid), { points: (userSnap.data().points || 0) + 20 });
            alert("Sorun başarıyla kapatıldı! Hesabınıza +20 Rütbe Puanı eklendi.");
            setTimeout(() => window.location.reload(), 1000);
        }
    } catch(e) { alert(e.message); }
};

function listenHelpForum() {
    fsTools.onSnapshot(fsTools.query(fsTools.collection(db, "forum_topics"), fsTools.orderBy("timestamp", "desc")), (snapshot) => {
        const wrapper = document.getElementById('helpTopicsWrapper'); wrapper.innerHTML = '';
        snapshot.forEach(docSnap => {
            let topic = docSnap.data(); let div = document.createElement('div');
            div.style = `background: var(--glass-bg); padding: 15px; border-radius: 12px; margin-bottom: 15px; border-left:4px solid ${topic.solved ? 'var(--success-color)' : 'var(--danger-color)'};`;
            let solveButton = (!topic.solved && !user.isGuest) ? `<button onclick="solveHelpTopic('${docSnap.id}', '${topic.creatorUid}')" style="background:var(--success-color); color:#064e3b; font-size:12px; padding:4px 10px; margin:0;">Sorunu Çözdüm (+20 Puan)</button>` : '';
            div.innerHTML = `<div style="display:flex; justify-content:between; align-items:center;"><div><h4 style="margin:0;">🚨 ${topic.title}</h4><p style="font-size:12px; color:var(--text-muted); margin:4px 0 0 0;">Açan: <b>${topic.creator}</b> | Durum: ${topic.solved ? '✅ Çözüldü' : '⏳ Çözüm Bekliyor'}</p></div><div style="margin-left:auto;">${solveButton}</div></div>`;
            wrapper.appendChild(div);
        });
    });
}
