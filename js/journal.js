// js/journal.js – Memories (pro User in localStorage)
(function () {
  const user = localStorage.getItem("user");
  if (!user) { location.href = "login.html"; return; }

  const STORAGE_KEY = `memories_${user}`;
  const listEl = document.getElementById("memoryList");
  const form = document.getElementById("memoryForm");
  const titleEl = document.getElementById("memTitle");
  const imageEl = document.getElementById("memImage");
  const placeEl = document.getElementById("memPlace");
  const descEl = document.getElementById("memDesc");

  // Storage
  const load = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  };
  const save = (arr) => localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));

  // Utils
  const uid = () =>
    (crypto.randomUUID && crypto.randomUUID()) ||
    (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));

  const escapeHtml = (s) =>
    s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // Render
  function render() {
    const data = load().sort((a,b) => b.createdAt - a.createdAt);
    listEl.innerHTML = "";
    if (!data.length) {
      listEl.innerHTML = '<p class="muted">Noch keine Memories.</p>';
      return;
    }

    for (const m of data) {
      const card = document.createElement("article");
      card.className = "memory-card";
      card.innerHTML = `
        <div class="memory-inner">
          ${m.image ? `
            <div class="memory-media">
              <img src="${escapeHtml(m.image)}" alt="">
            </div>` : ``}
          <div class="memory-body">
            <div class="memory-head">
              <div>
                <h3 class="memory-title">${escapeHtml(m.title)}</h3>
                <div class="memory-meta">
                  ${m.place ? escapeHtml(m.place) + " • " : ""}${new Date(m.createdAt).toLocaleDateString("de-CH")}
                </div>
              </div>
              <button class="nav-button memory-delete" data-id="${m.id}">Löschen</button>
            </div>
            <p class="memory-desc">${escapeHtml(m.description)}</p>

            <details class="memory-comments">
              <summary>Kommentare ${(m.comments?.length||0) ? "(" + m.comments.length + ")" : ""}</summary>
              <div class="comment-list">
                ${(m.comments||[]).map(c => `
                  <div class="comment-item">
                    <div class="comment-meta">${new Date(c.ts).toLocaleString("de-CH")}</div>
                    <div class="comment-text">${escapeHtml(c.text)}</div>
                  </div>
                `).join("")}
              </div>
            </details>

            <form class="commentForm" data-id="${m.id}">
              <input type="text" name="comment" placeholder="Kommentar hinzufügen..." required />
              <button type="submit" class="nav-button">Speichern</button>
            </form>
          </div>
        </div>
        ${m.comments?.length ? `
          <div class="comment-badge" title="Letzter Kommentar">
            ${escapeHtml(m.comments[m.comments.length-1].text.slice(0,32))}${m.comments[m.comments.length-1].text.length>32 ? "…" : ""}
          </div>` : ``}
      `;

      // Delete
      card.querySelector(".memory-delete").addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        const arr = load().filter(x => x.id !== id);
        save(arr); render();
      });

      // Comment submit
      card.querySelector("form.commentForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const id = e.currentTarget.getAttribute("data-id");
        const text = e.currentTarget.elements["comment"].value.trim();
        if (!text) return;
        const arr = load();
        const idx = arr.findIndex(x => x.id === id);
        if (idx >= 0) {
          if (!Array.isArray(arr[idx].comments)) arr[idx].comments = [];
          arr[idx].comments.push({ text, ts: Date.now() });
          save(arr); render();
        }
      });

      listEl.appendChild(card);
    }
  }

  // Add memory
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = titleEl.value.trim();
    const image = imageEl.value.trim();
    const place = placeEl.value.trim();
    const description = descEl.value.trim();
    if (!title || !description) return;

    const arr = load();
    arr.push({
      id: uid(),
      title, image, place, description,
      comments: [],
      createdAt: Date.now()
    });
    save(arr);

    form.reset();
    render();
  });

  render();
})();
