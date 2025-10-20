// === DRAW A DATE-SEITE ===
  if (location.pathname.endsWith("draw_a_date.html")) {
    const categories = ["ganzer_tag", "halber_tag", "abend"];
    const categoryLabels = {
      ganzer_tag: "Ganzer Tag",
      halber_tag: "Halber Tag",
      abend: "Abend"
    };

    const dateForm = document.getElementById("dateIdeaForm");
    const ideaInput = document.getElementById("dateIdeaInput");
    const categorySelect = document.getElementById("dateCategorySelect");
    const messageEl = document.getElementById("dateSaveMessage");
    const drawBtn = document.getElementById("drawDateButton");
    const drawResult = document.getElementById("drawResult");
    const drawCategorySelect = document.getElementById("drawCategorySelect");

    let dateData = {
      ganzer_tag: [],
      halber_tag: [],
      abend: []
    };

    function resetMessage() {
      if (!messageEl) return;
      messageEl.textContent = "";
      messageEl.classList.remove("success", "error");
    }

    function setMessage(text, type = "success") {
      if (!messageEl) return;
      messageEl.textContent = text;
      messageEl.classList.remove("success", "error");
      if (type) {
        messageEl.classList.add(type);
      }
    }

    function ensureDataStructure(data) {
      const structure = {
        ganzer_tag: [],
        halber_tag: [],
        abend: []
      };
      categories.forEach(cat => {
        structure[cat] = Array.isArray(data?.[cat]) ? data[cat] : [];
      });
      return structure;
    }

    function renderDateIdeas() {
      categories.forEach(cat => {
        const listEl = document.getElementById(`dateList-${cat}`);
        if (!listEl) return;
        listEl.innerHTML = "";

        if (!dateData[cat] || dateData[cat].length === 0) {
          const emptyEl = document.createElement("li");
          emptyEl.textContent = "Noch keine Ideen gespeichert.";
          listEl.appendChild(emptyEl);
          return;
        }

        dateData[cat]
          .slice()
          .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
          .forEach(idea => {
            const item = document.createElement("li");
            const textEl = document.createElement("div");
            textEl.textContent = idea.text || "(Ohne Beschreibung)";
            item.appendChild(textEl);

            const meta = document.createElement("span");
            const ideaUser = idea.user || "Unbekannt";
            const date = idea.timestamp ? new Date(idea.timestamp) : null;
            const dateText = date ? date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
            meta.textContent = dateText ? `Von ${ideaUser} am ${dateText}` : `Von ${ideaUser}`;
            item.appendChild(meta);

            listEl.appendChild(item);
          });
      });
    }

    async function loadDateIdeas() {
      try {
        const res = await fetch("/api/load?quiz=draw_a_date");
        if (!res.ok) {
          throw new Error(`Serverantwort ${res.status}`);
        }
        const data = await res.json();
        dateData = ensureDataStructure(data);
        renderDateIdeas();
      } catch (err) {
        console.error("Date-Ideen konnten nicht geladen werden:", err);
        setMessage("Ideen konnten nicht geladen werden.", "error");
      }
    }

    function getIdeasForDraw(category) {
      if (category === "all") {
        return categories.flatMap(cat => (dateData[cat] || []).map(idea => ({ ...idea, category: cat })));
      }
      return (dateData[category] || []).map(idea => ({ ...idea, category }));
    }

    function renderDrawResult(idea) {
      if (!drawResult) return;
      drawResult.innerHTML = "";
      if (!idea) {
        drawResult.textContent = "Noch keine Ideen in dieser Kategorie gespeichert.";
        return;
      }

      const textEl = document.createElement("div");
      textEl.textContent = idea.text;
      drawResult.appendChild(textEl);

      const meta = document.createElement("span");
      const label = categoryLabels[idea.category] || idea.category;
      const userName = idea.user || "Unbekannt";
      meta.textContent = `${label} • Eingereicht von ${userName}`;
      drawResult.appendChild(meta);
    }

    dateForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      resetMessage();

      if (!user) {
        setMessage("Bitte zuerst einloggen.", "error");
        return;
      }

      const ideaText = ideaInput.value.trim();
      const selectedCategory = categorySelect.value;

      if (!ideaText) {
        setMessage("Bitte gib eine Date-Idee ein.", "error");
        return;
      }

      const newIdea = {
        text: ideaText,
        user,
        timestamp: new Date().toISOString()
      };

      try {
        const response = await fetch("/api/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quiz: "draw_a_date",
            newQuestions: [newIdea],
            targetCategory: selectedCategory
          })
        });

        if (!response.ok) {
          throw new Error(`Serverantwort ${response.status}`);
        }

        const result = await response.json();
        if (result?.error) {
          throw new Error(result.error);
        }

        dateData[selectedCategory] = [...(dateData[selectedCategory] || []), newIdea];
        renderDateIdeas();
        ideaInput.value = "";
        setMessage("Idee wurde gespeichert!", "success");
      } catch (err) {
        console.error("Fehler beim Speichern der Idee:", err);
        setMessage("Idee konnte nicht gespeichert werden.", "error");
      }
    });

    drawBtn?.addEventListener("click", () => {
      const category = drawCategorySelect?.value || "all";
      const ideas = getIdeasForDraw(category);
      if (!ideas.length) {
        renderDrawResult(null);
        return;
      }

      const randomIdea = ideas[Math.floor(Math.random() * ideas.length)];
      renderDrawResult(randomIdea);
    });

    loadDateIdeas();
  }