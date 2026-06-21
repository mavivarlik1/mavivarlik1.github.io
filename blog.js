// blog.js
export function initBlogModule(db, user, fsTools) {
    const { collection, addDoc, query, orderBy, onSnapshot } = fsTools;
    
    const blogWritePanel = document.getElementById('blogWritePanel');
    const blogPostsWrapper = document.getElementById('blogPostsWrapper');
    
    if (!blogPostsWrapper) return;
    if (blogWritePanel) blogWritePanel.classList.remove('hidden'); // Herkese açık panel

    // 📥 Canlı Blog Akışı Dinleyicisi
    const q = query(collection(db, "blogs"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        blogPostsWrapper.innerHTML = '';
        if (snapshot.empty) {
            blogPostsWrapper.innerHTML = `<div class="modal" style="text-align:center; color:var(--text-muted);">📰 Henüz blog yazısı yayınlanmadı. Yakında efsane içerikler burada olacak!</div>`;
            return;
        }
        snapshot.forEach((doc) => {
            const data = doc.data();
            const dateObj = data.createdAt ? data.createdAt.toDate() : new Date();
            const formattedDate = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            const card = document.createElement('div');
            card.className = 'blog-card';
            card.innerHTML = `
                <h2 style="margin-top:0; color: var(--accent-color); font-size:20px;">${data.title}</h2>
                <div class="blog-meta">
                    <span>👤 Yazar: <b>${data.author}</b></span>
                    <span>📅 ${formattedDate}</span>
                </div>
                <div class="blog-content">${data.content}</div>
            `;
            blogPostsWrapper.appendChild(card);
        });
    });

    // 📤 Blog Gönderme Tetikleyicisi
    window.createNewBlogPost = async function() {
        const titleInput = document.getElementById('blogTitleInput');
        const contentInput = document.getElementById('blogContentInput');
        if (!titleInput || !contentInput) return;
        
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        
        if (!title || !content) {
            alert("Mavi varlık, AdSense botları boş yazıyı sevmez! Başlık ve içerik alanını doldur.");
            return;
        }

        try {
            await addDoc(collection(db, "blogs"), {
                title: title,
                content: content,
                author: user.nick,
                uid: user.uid,
                createdAt: new Date()
            });
            titleInput.value = '';
            contentInput.value = '';
            alert("Blog yazısı başarıyla tüm dünya için yayına alındı! 🚀");
        } catch (error) { alert("Blog yayınlama hatası: " + error.message); }
    };
}
