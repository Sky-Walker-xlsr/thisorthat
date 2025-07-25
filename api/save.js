export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Nur POST erlaubt." });
  }

  const { quiz, user, answers, text, newQuestion, newQuestions, targetCategory, file, data } = req.body;
  const isNewFormat = file && data && typeof data === "object";

  if (!isNewFormat && (!quiz || (!answers && !text && !newQuestion))) {
    return res.status(400).json({ error: "Fehlende Felder." });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO = process.env.GITHUB_REPO;
  const GITHUB_OWNER = process.env.GITHUB_OWNER;
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

  const filename = isNewFormat ? file : `${quiz}.json`;
  const filePath = `data/${filename}`;
  const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

  let existingData = {};
  let sha = null;

  try {
    const response = await fetch(`${apiBase}?ref=${GITHUB_BRANCH}`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (response.ok) {
      const json = await response.json();
      const content = Buffer.from(json.content, 'base64').toString();
      existingData = JSON.parse(content);
      sha = json.sha;
    }
  } catch (err) {
    console.log("Datei existiert noch nicht oder konnte nicht gelesen werden.");
  }

  // === Neue Daten hinzufügen ===
  if (isNewFormat) {
    const newKey = Object.keys(data)[0];
    existingData[newKey] = data[newKey];
  } else {
    if (answers) {
      if (existingData[user]) {
        return res.status(409).json({ error: "Antwort wurde bereits gespeichert." });
      }
      existingData[user] = answers;
    }

    if (text) {
      if (!existingData._chat) existingData._chat = {};
      const timestamp = Date.now();
      existingData._chat[`msg_${timestamp}`] = { user, text };
    }

    if (newQuestion || newQuestions) {
      const category = targetCategory || "Fruits";
      if (!existingData[category]) existingData[category] = [];
      if (newQuestions) {
        existingData[category].push(...newQuestions);
      } else {
        existingData[category].push(newQuestion);
      }
    }
  }

  // === Speichern auf GitHub ===
  const updatedContent = Buffer.from(
    JSON.stringify(existingData, null, 2)
  ).toString("base64");

  const saveResponse = await fetch(apiBase, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({
      message: `Update ${filename}`,
      content: updatedContent,
      sha: sha || undefined,
      branch: GITHUB_BRANCH,
    }),
  });

  if (!saveResponse.ok) {
    const error = await saveResponse.json();
    return res.status(500).json({ error: "Fehler beim Speichern auf GitHub", details: error });
  }

  return res.status(200).json({ message: "✅ Erfolgreich gespeichert!" });
}
