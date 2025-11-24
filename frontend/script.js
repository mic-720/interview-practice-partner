const chatBox = document.getElementById("chat");
const roleSelect = document.getElementById("role");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const voiceBtn = document.getElementById("voiceBtn");
const endBtn = document.getElementById("endBtn");
const feedbackOverlay = document.getElementById("feedbackOverlay");
const feedbackContent = document.getElementById("feedbackContent");
const closeFeedbackBtn = document.getElementById("closeFeedbackBtn");

let history = [];
let recognition = null;
let recognizing = false;
let expectingFeedback = false;

// 💬 Utility to add message to chat
function addMessage(sender, text) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.classList.add(sender === "You" ? "user" : "ai");

  const span = document.createElement("span");
  span.textContent = text;
  div.appendChild(span);

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// 🔊 Text-to-Speech for AI replies
// 🔊 Text-to-Speech for AI replies
// function speak(text) {
//   if (!("speechSynthesis" in window)) return;
//   window.speechSynthesis.cancel();
//   const utter = new SpeechSynthesisUtterance(text);
//   utter.lang = "en-IN"; // voice language
//   utter.rate = 1.7; // 🔥 faster speaking speed (default=1.0)
//   utter.pitch = 1; // optional improve clarity
//   window.speechSynthesis.speak(utter);
// }


function speak(text) {
  if (!("speechSynthesis" in window)) return;
  
  window.speechSynthesis.cancel();
  
  const utter = new SpeechSynthesisUtterance(text);
  
  // 🎙 Better Indian English Male/Female voice selection
  const voices = window.speechSynthesis.getVoices();
  const indianVoice = voices.find(v =>
    v.lang.toLowerCase() === "en-in" ||  // Indian English voice
    v.name.toLowerCase().includes("india") ||
    v.name.toLowerCase().includes("hindi")
  );
  
  if (indianVoice) {
    utter.voice = indianVoice;
  } else {
    utter.lang = "en-IN"; // fallback Indian accent
  }

  // ⚡ Faster speaking speed
  utter.rate = 1.6;

  // Slight pitch adjustment makes voice less robotic
  utter.pitch = 1.1;

  window.speechSynthesis.speak(utter);
}


// 🚀 Send message to backend (chat or from voice)
async function sendMessage(messageOverride = null) {
  const role = roleSelect.value;
  const message = messageOverride ?? messageInput.value.trim();

  if (!message) return;

  // Show user message
  if (message !== "END_INTERVIEW") {
    addMessage("You", message);
  }
  history.push({ role: "user", content: message });
  messageInput.value = "";

  try {
    const res = await fetch("http://localhost:5000/api/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, message, history })
    });

    const data = await res.json();

    if (data.error) {
      addMessage("AI", "There was an error processing your request.");
      console.error(data.error);
      return;
    }

    const reply = data.reply || "(No response)";
    addMessage("AI", reply);
    history.push({ role: "assistant", content: reply });

    // speak AI response
    speak(reply);

    // If we are expecting feedback, show modal too
    if (expectingFeedback || /Communication:/i.test(reply) || /Technical Knowledge:/i.test(reply)) {
      expectingFeedback = false;
      showFeedback(reply);
    }
  } catch (err) {
    console.error(err);
    addMessage("AI", "Unable to reach the server. Is it running?");
  }
}

// Show feedback in popup
function showFeedback(text) {
  feedbackContent.textContent = text;
  feedbackOverlay.classList.remove("hidden");
}

// Click handlers
sendBtn.addEventListener("click", () => sendMessage());
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

// 🎤 Setup Speech Recognition (STT)
function setupSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn("SpeechRecognition not supported in this browser.");
    voiceBtn.disabled = true;
    voiceBtn.textContent = "No Voice Support";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    recognizing = true;
    voiceBtn.classList.add("recording");
    voiceBtn.textContent = "🎤 Stop Voice";
  };

  recognition.onend = () => {
    recognizing = false;
    voiceBtn.classList.remove("recording");
    voiceBtn.textContent = "🎤 Start Voice";
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    recognizing = false;
    voiceBtn.classList.remove("recording");
    voiceBtn.textContent = "🎤 Start Voice";
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    messageInput.value = transcript;
    sendMessage(transcript);
  };
}

// 🎤 Voice button
voiceBtn.addEventListener("click", () => {
  if (!recognition) return;

  if (!recognizing) {
    recognition.start();
  } else {
    recognition.stop();
  }
});

// 🧾 End interview & ask for feedback
endBtn.addEventListener("click", () => {
  expectingFeedback = true;
  sendMessage("END_INTERVIEW");
});

// Close feedback modal
closeFeedbackBtn.addEventListener("click", () => {
  feedbackOverlay.classList.add("hidden");
});

// Init on load
setupSpeechRecognition();

// Initial greeting from AI
addMessage(
  "AI",
  "Hi! Select a role and introduce yourself to begin the mock interview."
);
