// draw_a_date.js – eigenständige Logik für die Draw-a-Date-Seite
(function () {
  const categories = ["ganzer_tag", "halber_tag", "abend"];
  const categoryLabels = {
    ganzer_tag: "Ganzer Tag",
    halber_tag: "Halber Tag",
    abend: "Abend",
  };

  const user = localStorage.getItem("user");
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  if (typeof window.logout !== "function") {
    window.logout = function () {
      localStorage.removeItem("user");
      window.location.href = "login.html";
    };
  }

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
    abend: [],
  };

  const resetMessage = () => {
    if (!messageEl) return;
    messageEl.textContent = "";
    messageEl.classList.remove("success", "error");
  };

  const setMessage = (text, type = "success") => {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.classList.remove("success", "error");
    if (type) {
      messageEl.classList.add(type);
    }
  };

  const ensureDataShape = (data) => {
    const result = {};
    categories.forEach((category) => {
      result[category] = Array.isArray(data?.[category]) ? data[category] : [];
    });
    return result;
  };

  const renderDateIdeas = () => {
    categories.forEach((category) => {
      const listEl = document.getElementById(`dateList-${category}`);
      if (!listEl) return;

      listEl.innerHTML = "";
      const ideas = dateData[category] || [];

      if (!ideas.length) {
        const emptyEl = document.createElement("li");
        emptyEl.textContent = "Noch keine Ideen gespeichert.";
        listEl.appendChild(emptyEl);
        return;
      }

      ideas
        .slice()
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
        .forEach((idea) => {
          const item = document.createElement("li");

          const textEl = document.createElement("div");
          textEl.textContent = idea.text || "(Ohne Beschreibung)";
          item.appendChild(textEl);

          const meta = document.createElement("span");
          const date = idea.timestamp ? new Date(idea.timestamp) : null;
          const formatted = date
            ? date.toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : "";
          meta.textContent = formatted
            ? `Von ${idea.user || "Unbekannt"} am ${formatted}`
            : `Von ${idea.user || "Unbekannt"}`;
          item.appendChild(meta);

          listEl.appendChild(item);
        });
    });
  };

  const renderDrawResult = (idea) => {
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
    meta.textContent = `${label} • Eingereicht von ${idea.user || "Unbekannt"}`;
    drawResult.appendChild(meta);
  };

  const getIdeasForDraw = (category) => {
    if (category === "all") {
      return categories.flatMap((cat) =>
        (dateData[cat] || []).map((idea) => ({ ...idea, category: cat }))
      );
    }
    return (dateData[category] || []).map((idea) => ({ ...idea, category }));
  };

  const loadDateIdeas = async () => {
    try {
      const res = await fetch("/api/load?quiz=draw_a_date");
      if (!res.ok) {
        throw new Error(`Serverantwort ${res.status}`);
      }

      const data = await res.json();
      dateData = ensureDataShape(data);
      renderDateIdeas();
    } catch (error) {
      console.error("Date-Ideen konnten nicht geladen werden:", error);
      setMessage("Ideen konnten nicht geladen werden.", "error");
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    resetMessage();

    const ideaText = ideaInput.value.trim();
    const selectedCategory = categorySelect.value;

    if (!ideaText) {
      setMessage("Bitte gib eine Date-Idee ein.", "error");
      return;
    }

    const newIdea = {
      text: ideaText,
      user,
      category: selectedCategory,
      timestamp: new Date().toISOString(),
    };

    const updatedIdeas = [...(dateData[selectedCategory] || []), newIdea];

    try {
      const response = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: "draw_a_date.json",
          data: {
            [selectedCategory]: updatedIdeas,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Serverantwort ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      if (result?.error) {
        throw new Error(result.error);
      }

      dateData[selectedCategory] = updatedIdeas;
      renderDateIdeas();
      ideaInput.value = "";
      setMessage("Idee wurde gespeichert!", "success");
    } catch (error) {
      console.error("Fehler beim Speichern der Idee:", error);
      setMessage("Idee konnte nicht gespeichert werden.", "error");
    }
  };

  const handleDraw = () => {
    const category = drawCategorySelect?.value || "all";
    const ideas = getIdeasForDraw(category);
    if (!ideas.length) {
      renderDrawResult(null);
      return;
    }

    const randomIdea = ideas[Math.floor(Math.random() * ideas.length)];
    renderDrawResult(randomIdea);
  };

  dateForm?.addEventListener("submit", handleSave);
  drawBtn?.addEventListener("click", handleDraw);

  loadDateIdeas();
})();