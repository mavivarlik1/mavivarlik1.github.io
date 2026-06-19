let db, currentUserNick, fsTools;

export function initHelpForum(database, user, firestoreTools) {
    db = database;
    currentUserNick = user.email.split('@')[0];
    fsTools = firestoreTools;
    
    listenHelpForum();
}

window.createNewHelpTopic = async () => {
    const title = document.getElementById('helpTitleInput').value.trim(); 
    if(!title) return; 
    
    await fsTools.addDoc(fsTools.collection(db, "forum_topics"), { 
        title: title, 
        creator: currentUserNick, 
        timestamp: Date.now(), 
        solved: false 
    });
    
    document.getElementById('helpTitleInput').value = '';
};

function listenHelpForum() {
    const q = fsTools.query(fsTools.collection(db, "forum_topics"), fsTools.orderBy("timestamp", "desc"));
    fsTools.onSnapshot(q, (snapshot) => {
        const wrapper = document.getElementById('helpTopicsWrapper'); 
        wrapper.innerHTML = '';
        
        snapshot.forEach(docSnap => {
            let topic = docSnap.data(); 
            let div = document.createElement('div');
            div.style = `background: var(--glass-bg); padding: 15px; border-radius: 12px; margin-bottom: 15px; border-left:4px solid var(--accent-color);`;
            div.innerHTML = `
                <h4 style="margin:0;">🚨 ${topic.title}</h4>
                <p style="font-size:13px; color:var(--text-muted); margin:5px 0 0 0;">Açan: <b>${topic.creator}</b></p>
            `;
            wrapper.appendChild(div);
        });
    });
}
