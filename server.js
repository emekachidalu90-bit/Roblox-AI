const express = require("express");
const app = express();
app.use(express.json());

// The random NPCs that roam your map — edit names/personalities however you like!
const RANDOM_NPCS = [
  { name: "Zara", personality: "You are Zara, a mysterious and quiet NPC who speaks in short cryptic sentences and loves riddles." },
  { name: "Benny", personality: "You are Benny, a super hyper and funny NPC who cracks jokes and laughs at everything." },
  { name: "Luna", personality: "You are Luna, a chill and dreamy NPC who talks about stars, vibes, and random deep thoughts." },
  { name: "Rex",  personality: "You are Rex, a tough-talking NPC who acts super cool and uses a lot of slang." },
  { name: "Pip",  personality: "You are Pip, a tiny nervous NPC who is easily scared and very wholesome and sweet." },
  { name: "Chad", personality: "You are Chad, a playful NPC who sometimes harshly teases and roasts players in a fun friendly way. Think harmless playground banter — sometimes mean, sometimes offensive, always ends with a laugh. Keep it light and funny." },
];

// Conversation memory per player per NPC
const conversations = {};

// Helper to call the AI
async function askAI(systemPrompt, history) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.1-8b-instruct:free",
      messages: [
        { role: "system", content: systemPrompt + " Keep replies short (1-3 sentences). Never use asterisks or markdown." },
        ...history
      ]
    })
  });
  const data = await response.json();
  return data.choices[0].message.content;
}

// Chat with a random map NPC
// Roblox sends: { userId, npcName, message }
app.post("/chat/random", async (req, res) => {
  const { userId, npcName, message } = req.body;

  const npc = RANDOM_NPCS.find(n => n.name === npcName);
  if (!npc) return res.status(400).json({ error: "Unknown NPC" });

  const key = `${userId}_${npcName}`;
  if (!conversations[key]) conversations[key] = [];
  conversations[key].push({ role: "user", content: message });
  if (conversations[key].length > 10) conversations[key] = conversations[key].slice(-10);

  const reply = await askAI(npc.personality, conversations[key]);
  conversations[key].push({ role: "assistant", content: reply });

  res.json({ reply, npcName: npc.name });
});

// Chat with a custom (gamepass) NPC
// Roblox sends: { userId, npcName, npcPersonality, message }
app.post("/chat/custom", async (req, res) => {
  const { userId, npcName, npcPersonality, message } = req.body;

  const systemPrompt = `You are ${npcName}. ${npcPersonality}`;
  const key = `custom_${userId}_${npcName}`;
  if (!conversations[key]) conversations[key] = [];
  conversations[key].push({ role: "user", content: message });
  if (conversations[key].length > 10) conversations[key] = conversations[key].slice(-10);

  const reply = await askAI(systemPrompt, conversations[key]);
  conversations[key].push({ role: "assistant", content: reply });

  res.json({ reply, npcName });
});

// Clear memory when a player leaves
// Roblox sends: { userId }
app.post("/clear", (req, res) => {
  const { userId } = req.body;
  for (const key of Object.keys(conversations)) {
    if (key.startsWith(userId)) delete conversations[key];
  }
  res.json({ ok: true });
});

// Get the list of random NPC names (so Roblox knows which ones exist)
app.get("/npcs", (req, res) => {
  res.json({ npcs: RANDOM_NPCS.map(n => n.name) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
