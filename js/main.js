// === main.js – Zentrale Logik für Login, Quiz, Ergebnisse & Chat ===

// 🟢 Benutzer-Login-Daten
const users = [
  { username: "User1", password: "56347812" },
  { username: "User2", password: "56347812" }
];

// 🟢 Nützliche URL- und User-Infos
const params = new URLSearchParams(location.search);
const quizName = params.get("quiz");
let user = localStorage.getItem("user");

// 🚫 Wenn kein User gespeichert ist und wir nicht auf login.html sind → zurück zum Login
if (!location.pathname.endsWith("login.html") && !user) {
  location.href = "login.html";
}

// === LOGIN-FUNKTION (nur auf login.html aktiv) ===
document.getElementById("loginForm")?.addEventListener("submit", function (e) {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const pw = document.getElementById("password").value;
  const valid = users.find(u => u.username === username && u.password === pw);

  if (valid) {
    localStorage.setItem("user", username);
    location.href = "dashboard.html";
  } else {
    document.getElementById("errorMsg").textContent = "Falsche Anmeldedaten.";
  }
});

// === QUIZDATEN LADEN und App starten ===
let quizzes = {};
fetch("/data/quizzes.json")
  .then(res => res.json())
  .then(data => {
    quizzes = data;
    initApp(); // App starten wenn Daten da
  })
  .catch(err => console.error("Quizdaten konnten nicht geladen werden:", err));

// === HAUPTFUNKTION: Alles Weitere passiert hier ===
function initApp() {

  // === QUIZ-SEITE ===
  if (location.pathname.endsWith("quiz.html") && quizName && user) {
    const quizData = quizzes[quizName];
    let index = 0;
    let answers = [];

    const questionEl = document.getElementById("question");
    const img1 = document.getElementById("img1");
    const img2 = document.getElementById("img2");

    function loadQuestion() {
      const q = quizData[index];
      questionEl.textContent = q.question;
      img1.src = q.img1;
      img2.src = q.img2;

      // Fortschrittszähler aktualisieren
      const progressText = `${index + 1} / ${quizData.length}`;
      const progressEl = document.getElementById("progress-counter");
      if (progressEl) progressEl.textContent = progressText;
    }


    function select(choice) {
      answers[index] = choice;
      index++;
      if (index < quizData.length) {
        loadQuestion();
      } else {
        // Wenn alle beantwortet → speichern und weiterleiten
        fetch("/api/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quiz: quizName, user, answers })
        }).then(() => {
          location.href = `results.html?quiz=${quizName}`;
        });
      }
    }

    img1?.addEventListener("click", () => select("left"));
    img2?.addEventListener("click", () => select("right"));
    loadQuestion();
  }

  // === RESULTS-SEITE mit zentrierten Namen & Frage ===
  if (location.pathname.includes("results.html") && quizName) {
    const resultDiv = document.getElementById("results");

    fetch(`/api/load?quiz=${quizName}`)
      .then(res => res.json())
      .then(data => {
        const quizData = quizzes[quizName];
        if (!quizData || data === null || Object.keys(data).length < 2) {
          resultDiv.innerHTML = "<p>Mindestens zwei Ergebnisse nötig für den Vergleich.</p>";
          return;
        }

        const [user1, user2] = Object.keys(data); // z. B. Yannick & Amélie
        const answers1 = data[user1];
        const answers2 = data[user2];

        let html = `
        <div class="result-compare-header">
          <div class="user-label">${user1}</div>
          <div class="user-label">${user2}</div>
        </div>
      `;

        // Übereinstimmung berechnen
        let matches = 0;
        for (let i = 0; i < quizData.length; i++) {
          if (answers1[i] === answers2[i]) matches++;
        }
        const total = quizData.length;
        const percent = Math.round((matches / total) * 100);

        const scoreEl = document.getElementById("matchScore");
        if (scoreEl) {
          scoreEl.innerText = `🟢 Übereinstimmung: ${percent}%`;
        }



        quizData.forEach((q, i) => {
          const choice1 = answers1[i] === "left" ? q.img1 : q.img2;
          const choice2 = answers2[i] === "left" ? q.img1 : q.img2;

          html += `
          <div class="result-question-center">${q.question}</div>
          <div class="result-row">
            <div class="result-answer">
              <img src="${choice1}" alt="Antwort von ${user1}">
            </div>
            <div class="result-answer">
              <img src="${choice2}" alt="Antwort von ${user2}">
            </div>
          </div>
        `;
        });

        resultDiv.innerHTML = html;
      })
      .catch(err => {
        resultDiv.innerHTML = "<p>Fehler beim Laden der Ergebnisse.</p>";
        console.error(err);
      });
  }


  // === DASHBOARD-SEITE ===
  if (location.pathname.endsWith("dashboard.html")) {
    // Benutzername einblenden
    document.getElementById("userName").textContent = user || "Gast";

    const quizListContainer = document.getElementById("quizList");
    const completedContainer = document.getElementById("completedQuizzes");
    const bgColors = ["#FF6B6B", "#4ECDC4", "#FFD93D", "#B39CD0", "#F7A072"];
    const quizNames = Object.keys(quizzes);

    quizNames.forEach((quizName, index) => {
      // Quiz-Startkarte
      const start = document.createElement("a");
      start.className = "quiz-card";
      start.href = `quiz.html?quiz=${quizName}`;
      start.textContent = `${quizName.charAt(0).toUpperCase() + quizName.slice(1)}`;
      start.style.backgroundColor = bgColors[index % bgColors.length];
      quizListContainer?.appendChild(start);

      // Prüfen ob schon abgeschlossen
      fetch(`/api/load?quiz=${quizName}`)
        .then(res => res.json())
        .then(data => {
          if (data[user]) {
            const done = document.createElement("a");
            done.className = "quiz-card";
            done.href = `results.html?quiz=${quizName}`;
            done.textContent = `${quizName.charAt(0).toUpperCase() + quizName.slice(1)}`;
            done.style.backgroundColor = bgColors[index % bgColors.length];
            completedContainer?.appendChild(done);
          }
        });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const testBtn = document.getElementById("test-save-button");
    if (testBtn) {
      testBtn.addEventListener("click", async () => {
        const res = await fetch("/api/save.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            action: "githubTestSave"
          })
        });

        const result = await res.json();
        alert(result.message || "Fertig.");
      });
    }
  });


  // === CHAT (nur auf results.html) ===
  const chatBox = document.getElementById("chatMessages");
  const chatInput = document.getElementById("chatInput");

  chatInput?.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  // 💡 Aktuell eingeloggter Benutzer
  const currentUser = sessionStorage.getItem("username") || "Yannick";

  // Funktion zum Senden einer Nachricht
  window.sendMessage = function () {
    const msg = chatInput.value.trim();
    if (!msg) return;

    fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quiz: quizName,
        user,
        text: msg
      })
    }).then(() => {
      renderMessage(msg, user);
      chatInput.value = "";
    });
  };



  // Funktion zur Darstellung einer Nachricht
  function renderMessage(text, fromUser) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `chat-message ${fromUser.toLowerCase()}`;
    msgDiv.textContent = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // Nachrichten laden beim Start
  if (chatBox) {
    fetch(`/api/load?quiz=${quizName}`)
      .then(res => res.json())
      .then(data => {
        const messages = data._chat || {};
        Object.values(messages).forEach(m => {
          renderMessage(m.text, m.user);
        });
      });
  }
}

// === LOGOUT-Button verfügbar machen
window.logout = function () {
  localStorage.removeItem("user");
  location.href = "login.html";
};
