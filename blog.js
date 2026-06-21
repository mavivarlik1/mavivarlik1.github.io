// blog.js
export function initBlogModule(db, user, fsTools) {
    const { collection, addDoc, query, orderBy, onSnapshot } = fsTools;
    
    const blogWritePanel = document.getElementById('blogWritePanel');
    const blogPostsWrapper = document.getElementById('blogPostsWrapper');
    
    if (!blogPostsWrapper) return;
    if (blogWritePanel) blogWritePanel.classList.remove('hidden');

    let localBlogCache = [];
    window.activeCommentUnsubs = window.activeCommentUnsubs || [];
    let isInitialLoad = true;

    function parseMarkdownBold(text) {
        if (!text) return "";
        return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }

    if (!document.getElementById('notificationToggleArea')) {
        const toggleArea = document.createElement('div');
        toggleArea.id = 'notificationToggleArea';
        toggleArea.className = 'modal';
        toggleArea.style.padding = '15px';
        toggleArea.style.marginBottom = '15px';
        toggleArea.style.display = 'flex';
        toggleArea.style.justifyContent = 'space-between';
        toggleArea.style.alignItems = 'center';
        toggleArea.style.flexWrap = 'wrap';
        toggleArea.style.gap = '10px';
        
        const isFollowed = localStorage.getItem('corebase_notifications') === 'true';
        toggleArea.innerHTML = `
            <span style="font-size:14px; font-weight:600; color:var(--text-color);">🔔 Blog Bildirimleri (Takip Sistemi)</span>
            <button id="btnToggleNotifications" style="padding:8px 16px; font-size:12px; border-radius:6px; background:${isFollowed ? 'var(--danger-color)' : 'var(--success-color)'}; color:${isFollowed ? 'white' : '#0f172a'}">
                ${isFollowed ? 'Takibi Bırak' : 'Siteyi Takip Et (Bildirimleri Aç)'}
            </button>
        `;
        blogPostsWrapper.parentNode.insertBefore(toggleArea, blogPostsWrapper);
        
        document.getElementById('btnToggleNotifications').onclick = async function() {
            const currentStatus = localStorage.getItem('corebase_notifications') === 'true';
            if (!currentStatus) {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    localStorage.setItem('corebase_notifications', 'true');
                    this.innerText = 'Takibi Bırak';
                    this.style.background = 'var(--danger-color)';
                    this.style.color = 'white';
                    alert('Harika mavi varlık! Artık yeni blog yayınlandığında anında push bildirim alacaksın.');
                } else {
                    alert('Bildirim izni reddedildi! Tarayıcı ayarlarından izin vermen gerekiyor.');
                }
            } else {
                localStorage.setItem('corebase_notifications', 'false');
                this.innerText = 'Siteyi Takip Et (Bildirimleri Aç)';
                this.style.background = 'var(--success-color)';
                this.style.color = '#0f172a';
                alert('Takip bırakıldı, bildirimler kapatıldı.');
            }
        };
    }

    const q = query(collection(db, "blogs"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        localBlogCache = [];
        
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            
            let dateObj = new Date();
            if (data.createdAt) {
                if (typeof data.createdAt.toDate === 'function') dateObj = data.createdAt.toDate();
                else dateObj = new Date(data.createdAt);
            }
            const formattedDate = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            // 🔐 SABİT KİMLİK MOTORU FİX: Sayfa yenilenince şifreleme değişmesin diye döküman ID'sini matematiksel koda çevirir
            let customId = data.customId;
            if (!customId) {
                let numericHash = "";
                for (let i = 0; i < docSnap.id.length; i++) {
                    numericHash += docSnap.id.charCodeAt(i).toString();
                }
                customId = numericHash.substring(0, 12);
            }

            localBlogCache.push({
                id: docSnap.id,
                customId: customId,
                title: data.title,
                content: data.content,
                author: data.author,
                formattedDate: formattedDate
            });
        });

        if (!isInitialLoad) {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added" && localStorage.getItem('corebase_notifications') === 'true') {
                    if (Notification.permission === "granted") {
                        new Notification("CoreBase Ekosistemi", {
                            body: `📰 Yeni Blog Yayında: ${change.doc.data().title}`,
                            icon: 'site_profile.png'
                        });
                    }
                }
            });
        }
        isInitialLoad = false;

        window.refreshBlogRender();
    });

    window.refreshBlogRender = function() {
        window.activeCommentUnsubs.forEach(unsub => unsub());
        window.activeCommentUnsubs = [];
        blogPostsWrapper.innerHTML = '';

        const subHash = window.currentBlogSubHash; 

        if (localBlogCache.length === 0) {
            blogPostsWrapper.innerHTML = `<div class="modal" style="text-align:center; color:var(--text-muted);">📰 Henüz blog yazısı yayınlanmadı.</div>`;
            return;
        }

        if (subHash) {
            const post = localBlogCache.find(b => b.customId === subHash);
            if (post) {
                const card = document.createElement('div');
                card.className = 'blog-card';
                card.innerHTML = `
                    <div style="margin-bottom:15px;"><a href="#blog" style="color:var(--accent-color); text-decoration:none; font-size:13px; font-weight:600;">← Tüm Blog Listesine Geri Dön</a></div>
                    <h2 style="margin-top:0; color: var(--accent-color); font-size:22px;">${post.title}</h2>
                    <div class="blog-meta">
                        <span>👤 Yazar: <b>${post.author}</b></span>
                        <span>📅 ${post.formattedDate}</span>
                    </div>
                    <div class="blog-content">${parseMarkdownBold(post.content)}</div>
                    
                    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.05); margin:20px 0;">
                    <h4 style="margin:0 0 10px 0; font-size:15px; color:var(--accent-color);">Yorumlar</h4>
                    
                    <div id="comments-list-${post.id}" style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px; max-height:220px; overflow-y:auto; padding-right:5px;">
                        <span style="font-size:12px; color:var(--text-muted); font-style:italic;">Yorumlar yükleniyor...</span>
                    </div>
                    
                    <div style="display:flex; gap:8px;">
                        <input type="text" id="comment-input-${post.id}" placeholder="Fikrini buraya yaz..." style="margin:0; padding:10px 12px; font-size:13px; height:38px;">
                        <button onclick="window.addBlogComment('${post.id}')" style="padding:0 16px; font-size:13px; margin:0; white-space:nowrap; height:38px; display:flex; align-items:center; justify-content:center;">Gönder</button>
                    </div>
                `;
                blogPostsWrapper.appendChild(card);

                const commentsQ = query(collection(db, `blogs/${post.id}/comments`), orderBy("createdAt", "asc"));
                const unsubComments = onSnapshot(commentsQ, (commentSnap) => {
                    const listEl = document.getElementById(`comments-list-${post.id}`);
                    if (!listEl) return;
                    listEl.innerHTML = '';
                    if (commentSnap.empty) {
                        listEl.innerHTML = `<div style="font-size:12px; color:var(--text-muted); font-style:italic;">Henüz yorum yapılmamış. İlk yorumu sen patlat!</div>`;
                        return;
                    }
                    commentSnap.forEach(cDoc => {
                        const cData = cDoc.data();
                        listEl.innerHTML += `
                            <div style="background:rgba(255,255,255,0.02); padding:8px 12px; border-radius:8px; border-left:2px solid var(--accent-color); font-size:13px; word-break:break-word;">
                                <b style="color:var(--accent-color);">${cData.author}:</b> ${cData.text}
                            </div>
                        `;
                    });
                    listEl.scrollTop = listEl.scrollHeight;
                });
                window.activeCommentUnsubs.push(unsubComments);

            } else {
                blogPostsWrapper.innerHTML = `<div class="modal" style="text-align:center; color:var(--danger-color);">⚠️ Aranan blog yazısı bulunamadı! <a href="#blog" style="color:var(--accent-color);">Listeye Dön</a></div>`;
            }
        } else {
            localBlogCache.forEach(post => {
                const card = document.createElement('div');
                card.className = 'blog-card';
                card.innerHTML = `
                    <h2 style="margin-top:0; color: var(--accent-color); font-size:18px; cursor:pointer; line-height:1.4;" onclick="window.location.hash='#blog#${post.customId}'">${post.title}</h2>
                    <div class="blog-meta" style="margin-bottom:0;">
                        <span>👤 Yazar: <b>${post.author}</b></span>
                        <span>📅 ${post.formattedDate}</span>
                        <span style="color:var(--accent-color); cursor:pointer; font-weight:600; font-size:12px; text-decoration:underline;" onclick="window.location.hash='#blog#${post.customId}'">Devamını Oku & Yorumlar →</span>
                    </div>
                `;
                blogPostsWrapper.appendChild(card);
            });
        }
    };

    window.addBlogComment = async function(blogId) {
        const input = document.getElementById(`comment-input-${blogId}`);
        if (!input) return;
        const text = input.value.trim();
        if (!text) return alert("Boş yorum gönderemezsin mavi varlık!");

        try {
            await addDoc(collection(db, `blogs/${blogId}/comments`), {
                author: user.nick,
                text: text,
                createdAt: Date.now(),
                uid: user.uid
            });
            input.value = '';
        } catch(e) { alert("Yorum gönderilemedi: " + e.message); }
    };

    window.createNewBlogPost = async function() {
        const titleInput = document.getElementById('blogTitleInput');
        const contentInput = document.getElementById('blogContentInput');
        if (!titleInput || !contentInput) return;
        
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        
        if (!title || !content) return alert("Başlık ve içerik doldur mavi varlık!");

        const customId = Math.floor(100000000000 + Math.random() * 900000000000).toString();

        try {
            await addDoc(collection(db, "blogs"), {
                title: title,
                content: content,
                customId: customId,
                author: user.nick,
                uid: user.uid,
                createdAt: new Date()
            });
            titleInput.value = '';
            contentInput.value = '';
            alert("Blog başarıyla 12 haneli özel koduyla yayına alındı! 🚀");
        } catch (error) { alert("Yayınlama hatası: " + error.message); }
    };
}
