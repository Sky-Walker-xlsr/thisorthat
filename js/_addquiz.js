document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("quizForm");
  const statusEl = document.getElementById("status");
  const questionsContainer = document.getElementById("questionsContainer");
  const addQuestionBtn = document.getElementById("add-question-btn");

  function createQuestionBlock() {
    const div = document.createElement("div");
    div.className = "question-block";
    div.innerHTML = `
      <button type="button" class="remove-question-btn">❌</button>
      <label>Frage:</label>
      <input type="text" class="question" placeholder="Bsp. Apfel oder Orange?" required />

      <label>Bild 1 Suche:</label>
      <input type="text" class="img1search" placeholder="apple (bitte in englisch und ohne Umlaute)" required />

      <label>Bild 2 Suche:</label>
      <input type="text" class="img2search" placeholder="orange (bitte in englisch und ohne Umlaute)" required />
    `;
    return div;
  }

  function setupRemoveButtons() {
    const allRemoveButtons = document.querySelectorAll(".remove-question-btn");
    allRemoveButtons.forEach((btn) => {
      btn.onclick = () => {
        const block = btn.closest(".question-block");
        if (document.querySelectorAll(".question-block").length > 1) {
          block.remove();
        } else {
          alert("Mindestens eine Frage muss vorhanden sein.");
        }
      };
    });
  }

  // Ersten Fragenblock einfügen
  if (questionsContainer) {
    questionsContainer.appendChild(createQuestionBlock());
    setupRemoveButtons();
  }

  // Neue Frage hinzufügen
  addQuestionBtn?.addEventListener("click", () => {
    const newBlock = createQuestionBlock();
    questionsContainer.appendChild(newBlock);
    setupRemoveButtons();
  });

  async function fetchPixabayImage(query) {
    const apiKey = '51478566-b3d3000cd1ad295edfef73647';
    try {
      const res = await fetch(`https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=photo&per_page=3`);
      const data = await res.json();
      return data.hits?.[0]?.webformatURL || 'https://via.placeholder.com/600x900?text=Kein+Bild';
    } catch (err) {
      console.error("❌ Pixabay-Fehler:", err);
      return 'https://via.placeholder.com/600x900?text=Fehler';
    }
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const quizName = document.getElementById("quizname").value.trim();
    if (!quizName) {
      statusEl.textContent = "⚠️ Bitte Quiznamen eingeben.";
      return;
    }

    const questionBlocks = document.querySelectorAll(".question-block");
    const questions = [];

    for (const block of questionBlocks) {
      const qInput = block.querySelector("input.question");
      const i1Input = block.querySelector("input.img1search");
      const i2Input = block.querySelector("input.img2search");

      if (!qInput || !i1Input || !i2Input) {
        statusEl.textContent = "⚠️ Fehler: Felder konnten nicht gelesen werden.";
        return;
      }

      const question = qInput.value.trim();
      const search1 = i1Input.value.trim();
      const search2 = i2Input.value.trim();

      if (!question || !search1 || !search2) {
        statusEl.textContent = "⚠️ Bitte alle Felder ausfüllen.";
        return;
      }

      const img1 = await fetchPixabayImage(search1);
      const img2 = await fetchPixabayImage(search2);

      questions.push({ question, img1, img2 });
    }

    const payload = {
      file: "quizzes.json",
      data: {
        [quizName]: questions
      }
    };

    try {
      const response = await fetch("/api/save.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (response.ok) {
        statusEl.innerHTML = `<span style="color: #00cc66;">✅ Erfolgreich gespeichert!</span>`;
        form.reset();
        questionsContainer.innerHTML = "";
        questionsContainer.appendChild(createQuestionBlock());
        setupRemoveButtons();
      } else {
        statusEl.innerHTML = `<span style="color: red;">❌ Fehler: ${result.error || "Unbekannt"}</span>`;
      }
    } catch (err) {
      console.error("❌ Netzwerkfehler:", err);
      statusEl.innerHTML = `<span style="color: red;">❌ Netzwerkfehler!</span>`;
    }
  });
});
