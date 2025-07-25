export default async function handler(req, res) {
  const quiz = req.query.quiz;

  if (!quiz) {
    console.warn("❌ Kein Quizname angegeben.");
    return res.status(400).json({ error: "Fehlender Quizname." });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO = process.env.GITHUB_REPO;
  const GITHUB_OWNER = process.env.GITHUB_OWNER;
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

  const filePath = `data/${quiz}.json`;
  const apiURL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`;

  try {
    const response = await fetch(apiURL, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      console.warn(`⚠️ Datei nicht gefunden (${response.status}) für ${filePath}`);
      return res.status(200).json({});
    }

    const json = await response.json();
    const content = Buffer.from(json.content, "base64").toString("utf-8");

    let data;
    try {
      data = JSON.parse(content);
    } catch (parseError) {
      console.error("❌ Fehler beim Parsen von JSON:", parseError);
      console.log("📦 Originaler Inhalt:", content);
      return res.status(500).json({ error: "Ungültiges JSON-Format." });
    }

    // Optional: Sicherstellen, dass _chat immer existiert, falls du es brauchst
    if (!data._chat) {
      data._chat = [];
    }

    console.log("✅ Geladene Daten:", data);
    return res.status(200).json(data);
  } catch (err) {
    console.error("❌ Fehler beim Laden von", filePath, err);
    return res.status(200).json({});
  }
}
