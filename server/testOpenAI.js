// testAzureOpenAI.js
const { AzureOpenAI } = require("openai");
const { DefaultAzureCredential } = require("@azure/identity");
const dotenv = require("dotenv");

dotenv.config();

async function testAzureOpenAI() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_ID;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;

  try {
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
          content:
            "You are an AI assistant that helps people find information.",
        },
        {
          role: "user",
          content: "Translate the following text to English: 中村 勇気",
        },
      ],
      max_tokens: 15000,
      temperature: 0.7,
    });

    console.log("Translation result:", result.choices[0]?.message.content);
  } catch (err) {
    console.error("Azure OpenAI test failed:", err);
  }
}

testAzureOpenAI();
