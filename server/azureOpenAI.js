// backend/azureOpenAI.js
const { AzureOpenAI } = require("openai");
const { DefaultAzureCredential } = require("@azure/identity");
const dotenv = require("dotenv");

dotenv.config();

// Azure OpenAI Client Setup
async function getAzureTranslation(text, targetLang) {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_ID;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;

  const credential = new DefaultAzureCredential();
  const client = new AzureOpenAI({
    endpoint,
    credential,
    apiVersion,
    deployment,
    apiKey,
  });

  const result = await client.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are an AI assistant that helps people translate text.",
      },
      {
        role: "user",
        content: `Translate the given text to ${targetLang} without providing any addtional information: "${text}"`,
      },
    ],
    max_tokens: 18000,
    temperature: 0.7,
  });

  return result.choices[0]?.message?.content || "";
}

module.exports = { getAzureTranslation };