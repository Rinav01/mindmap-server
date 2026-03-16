const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Calls the Groq API and returns a structured mindmap tree object.
 * @param {string} topic - The topic string to generate a mindmap for.
 * @returns {Promise<{ title: string, children: Array }>}
 */
async function generateMindmap(topic) {
  const systemPrompt = `You are an expert mind map generator. When given a topic, you must respond with ONLY a valid JSON object and nothing else — no markdown, no explanation, no code fences.

The JSON must follow this exact structure:
{
  "title": "Root Topic",
  "children": [
    {
      "title": "Subtopic 1",
      "children": [
        { "title": "Detail 1.1", "children": [] },
        { "title": "Detail 1.2", "children": [] }
      ]
    },
    {
      "title": "Subtopic 2",
      "children": [
        { "title": "Detail 2.1", "children": [] }
      ]
    }
  ]
}

Rules:
- Maximum 3 levels of depth (root → subtopics → details)
- 4 to 6 subtopics at the top level
- 2 to 4 children per subtopic
- Titles must be concise (2-6 words)
- Respond ONLY with the JSON object`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate a comprehensive mind map for the topic: "${topic}"` },
    ],
    temperature: 0.7,
    max_tokens: 2048,
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("Empty response from Groq API");

  // Strip potential markdown code fences if model doesn't listen
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse Groq response as JSON: ${cleaned.slice(0, 200)}`);
  }
}

/**
 * Calls the Groq API to brainstorm child topics for a specific node.
 * @param {string} topic - The parent topic string to expand.
 * @param {number} limit - The target number of child node suggestions (default 5).
 * @returns {Promise<Array<string>>} - Array of child topic strings.
 */
async function expandNode(topic, limit = 5) {
  const systemPrompt = `You are an expert brainstorming assistant. Given a parent topic from a mind map, generate exactly ${limit} concise, logically related child topics that expand upon it.
You MUST respond with ONLY a valid JSON object and nothing else — no markdown, no explanation.

The JSON must follow this exact structure:
{
  "children": [
    "Child topic 1",
    "Child topic 2",
    "Child topic 3",
    "Child topic 4",
    "Child topic 5"
  ]
}

Rules:
- Titles must be very concise (1-5 words max)
- They should represent distinct sub-categories or logical next steps
- Respond ONLY with the JSON object`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Expand this topic into its immediate subtopics: "${topic}"` },
    ],
    temperature: 0.8,
    max_tokens: 512,
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("Empty response from Groq API");

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    const data = JSON.parse(cleaned);
    if (!Array.isArray(data.children)) {
      throw new Error("Parsed JSON must have a 'children' array");
    }
    return data.children;
  } catch (err) {
    throw new Error(`Failed to parse Groq expansion response: ${err.message}. Raw: ${cleaned.slice(0, 100)}`);
  }
}

module.exports = { generateMindmap, expandNode };
