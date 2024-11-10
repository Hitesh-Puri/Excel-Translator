const express = require("express");
const { getAzureTranslation } = require("./azureOpenAI");
const cors = require("cors");

const app = express();
const PORT = process.env.REACT_APP_PORT;

app.use(
  cors({
    origin: process.env.REACT_VITE_APP_URL,
  })
);

app.use(express.json());

app.post("/api/translate", async (req, res) => {
  const { text, targetLang } = req.body;
  try {
    const translatedText = await getAzureTranslation(text, targetLang);
    res.json({ translatedText });
  } catch (err) {
    res.status(500).json({ error: "Failed to translate text." });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
