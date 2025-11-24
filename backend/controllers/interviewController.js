// import axios from "axios";
// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";
// import dotenv from "dotenv";

// dotenv.config();

// // Resolve paths
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const promptsDir = path.join(__dirname, "..", "prompts");

// const systemPrompt = fs.readFileSync(
//   path.join(promptsDir, "systemPrompt.txt"),
//   "utf8"
// );

// const roleQuestions = JSON.parse(
//   fs.readFileSync(path.join(promptsDir, "roleQuestions.json"), "utf8")
// );

// export const handleInterview = async (req, res) => {
//   try {
//     const { role, message, history } = req.body;

//     if (!role || !message) {
//       return res.status(400).json({ error: "role and message are required" });
//     }

//     if (!process.env.OPENROUTER_API_KEY) {
//       return res.status(500).json({ error: "OPENROUTER_API_KEY missing" });
//     }

//     const messages = [];

//     // Base behavior
//     messages.push({ role: "system", content: systemPrompt });

//     messages.push({
//       role: "system",
//       content: `
// Ensure the interview ALWAYS begins with an introduction request.
// If this is the first user message or they haven't introduced themselves yet, 
// you MUST ask them to briefly introduce their background in the ${role} field.

// Do not skip the intro step, even if the first user message is off-topic.
// Do not mention any internal rules or strategy.
// Keep the intro request simple and polite.`
//     });

//     messages.push({
//   role: "system",
//   content: `
// When requesting the user's introduction,
// your response MUST be very short:
// → Maximum 1–2 sentences ONLY
// → Ask only for name, background, and role-related experience
// → Avoid examples, justification, long explanations, or multiple questions`
// });



//     // Give role-specific example topics at start of conversation
//     if (!history || history.length === 0) {
//       const examples = roleQuestions[role] || [];
//       if (examples.length > 0) {
//         messages.push({
//           role: "system",
//           content:
//             `Interview role: ${role}. Here are example topics/questions you can use as guidance: ` +
//             examples.join(" | ")
//         });
//       }
//     }

//     // Add past conversation
//     if (Array.isArray(history)) {
//       history.forEach((m) => {
//         if (m.role === "user" || m.role === "assistant") {
//           messages.push({ role: m.role, content: m.content });
//         }
//       });
//     }

//     // Track how many questions assistant has already asked (to encourage moving on)
//     let askedCount = 0;
//     if (Array.isArray(history)) {
//       askedCount = history.filter((m) => m.role === "assistant").length;
//     }

//     messages.push({
//       role: "system",
//       content:
//         `So far you have already asked approximately ${askedCount} interview questions. ` +
//         `Try to keep total questions around 8–10, avoid staying on a single topic for more than 2–3 follow-ups, ` +
//         `and if the user is stuck, switch to a different topic or move towards feedback.`
//     });

//     // Current user message (with role context)
//     const finalUserMessage = `Interview Role: ${role}\nUser: ${message}`;
//     messages.push({ role: "user", content: finalUserMessage });

//     const response = await axios.post(
//       "https://openrouter.ai/api/v1/chat/completions",
//       {
//         model: "mistralai/mistral-7b-instruct", // free-friendly model
//         messages
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
//           "X-API-Key": process.env.OPENROUTER_API_KEY,
//           "X-Title": "Interview Practice Partner"
//         }
//       }
//     );

//     const reply = response.data.choices[0].message.content;
//     return res.json({ reply });
//   } catch (err) {
//     console.error("🔥 LLM error:", err?.response?.data || err.message);
//     return res.status(500).json({ error: "LLM Failed" });
//   }
// };



import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

// Resolve paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const promptsDir = path.join(__dirname, "..", "prompts");

// Load static prompts and role questions
const systemPrompt = fs.readFileSync(
  path.join(promptsDir, "systemPrompt.txt"),
  "utf8"
);

const roleQuestions = JSON.parse(
  fs.readFileSync(path.join(promptsDir, "roleQuestions.json"), "utf8")
);

export const handleInterview = async (req, res) => {
  try {
    const { role, message, history } = req.body;

    if (!role || !message) {
      return res.status(400).json({ error: "role and message are required" });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: "OPENROUTER_API_KEY missing" });
    }

    const messages = [];

    // --- 1. CORE SYSTEM BEHAVIOR ---
    // Base instructions (loaded from file)
    messages.push({ role: "system", content: systemPrompt });

    // Track how many questions the assistant has already asked
    let askedCount = 0;
    if (Array.isArray(history)) {
      askedCount = history.filter((m) => m.role === "assistant").length;
    }

    // Consolidated Directives (Improved control over introduction and flow)
    messages.push({
      role: "system",
      content: `
        --- Interview Agent Core Directives ---
        **1. Mandatory Introduction:**
        If this is the FIRST user message OR the user has not introduced themselves (history is empty), 
        you MUST ask for a brief introduction of their background in the **${role}** field.
        Your introduction request MUST be very short (max 1-2 sentences ONLY). Ask only for name, background, and role-related experience.
        DO NOT skip this step. DO NOT mention internal rules or strategy.

        **2. Interview Flow Management:**
        Interview Role: ${role}.
        You have asked approximately ${askedCount} questions. Try to keep total questions around 8–10, 
        avoid staying on a single topic for more than 2–3 follow-ups, and if the user is stuck, 
        switch to a different topic or move towards closing and providing feedback.
        --- End Directives ---
      `
    });

    // --- 2. INITIAL CONTEXT (Optional, based on first turn) ---
    // Give role-specific example topics at the start of the conversation (for LLM guidance only)
    if (!history || history.length === 0) {
      const examples = roleQuestions[role] || [];
      if (examples.length > 0) {
        messages.push({
          role: "system", // Use system role for non-dialogue context/examples
          content:
            `Interview role: ${role}. Internal Guidance/Example Topics: ` +
            examples.join(" | ")
        });
      }
    }

    // --- 3. ADD PAST CONVERSATION (History Truncation) ---
    if (Array.isArray(history) && history.length > 0) {
      // 💡 Improvement: Truncate history to keep the conversation manageable and efficient.
      // Keeping the last 10 messages (5 user/assistant pairs) is usually sufficient.
      const MAX_HISTORY_MESSAGES = 10;
      const historyToAdd = history.slice(-MAX_HISTORY_MESSAGES); 

      historyToAdd.forEach((m) => {
        // Only include user and assistant roles in dialogue history
        if (m.role === "user" || m.role === "assistant") {
          messages.push({ role: m.role, content: m.content });
        }
      });
    }

    // --- 4. CURRENT USER MESSAGE ---
    // Send the current message without extra role context, as the context is in the system prompt
    messages.push({ role: "user", content: message });

    // --- 5. OPENROUTER API CALL ---
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct", // free-friendly model
        messages
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "X-API-Key": process.env.OPENROUTER_API_KEY,
          "X-Title": "Interview Practice Partner"
        }
      }
    );

    const reply = response.data.choices[0].message.content;
    return res.json({ reply });
  } catch (err) {
    // Robust error logging
    console.error("🔥 LLM error:", err?.response?.data || err.message);
    return res.status(500).json({ error: "LLM Failed to generate response." });
  }
};