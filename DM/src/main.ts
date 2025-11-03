import "./style.css";
import {
  setupButton
} from "./dm.ts";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="main-container">
    <h1>The Psychologist Dog</h1>

    <div class="card">
      <div class="bot-status">
        <img id="bot-image" src="" alt="FurHat Bot Status" class="bot-image" style="display: none;">
        <div class="status-text" id="bot-status-text">Loading...</div>
      </div>
      <button id="counter" type="button">Start</button>
    </div>

    <div class="status">
      <p id="mic-status">🎙️ Microphone: <span class="mic-state">checking...</span></p>
    </div>
  </div>
`;

// ===============================
// 🔸 BOT STATUS MANAGEMENT
// ===============================
function updateBotStatus(state: string, message?: string) {
  const botImage = document.getElementById('bot-image') as HTMLImageElement;
  const statusText = document.getElementById('bot-status-text') as HTMLDivElement;
  
  if (!botImage || !statusText) {
    console.error('Bot status elements not found');
    return;
  }
  
  // Make sure image is visible
  botImage.style.display = 'block';
  
  let imagePath = '';
  
  switch(state) {
    case 'speaking':
      imagePath = 'speaking_dog.gif';
      statusText.textContent = message || 'Psychologist is speaking...';
      statusText.style.color = '#4CAF50';
      break;
    case 'listening':
      imagePath = 'listening_dog.png';
      statusText.textContent = message || 'Listening to you...';
      statusText.style.color = '#FF9800';
      break;
    case 'processing':
      imagePath = 'listening_dog.png';
      statusText.textContent = message || 'Processing your response...';
      statusText.style.color = '#9C27B0';
      break;
    case 'start':
    default:
      imagePath = 'listening_dog.png';
      statusText.textContent = message || 'Start';
      statusText.style.color = '#666';
      break;
  }
  
  // Set the image source and handle loading/errors
  botImage.onload = () => {
    console.log(`✅ Image loaded: ${imagePath}`);
  };
  
  botImage.onerror = () => {
    console.error(`❌ Failed to load image: ${imagePath}`);
    // Fallback to a placeholder or emoji
    botImage.style.display = 'none';
    statusText.innerHTML = `🖼️ Image not found: ${imagePath}<br>${statusText.textContent}`;
  };
  
  botImage.src = imagePath;
  console.log(`🔄 Setting image to: ${imagePath}`);
}

// ===============================
// 🔸 IMAGE PRELOADING
// ===============================
function preloadImages() {
  const images = ['speaking_dog.gif', 'listening_dog.png'];
  
  images.forEach(src => {
    const img = new Image();
    img.src = src;
    img.onload = () => console.log(`✅ Preloaded: ${src}`);
    img.onerror = () => console.error(`❌ Failed to preload: ${src}`);
  });
}

// ===============================
// 🔸 MICROPHONE PERMISSION LOGIC
// ===============================
async function checkMicPermission() {
  const micStateEl = document.querySelector(".mic-state")!;
  
  try {
    const status = await navigator.permissions.query({ name: "microphone" as PermissionName });

    if (status.state === "granted") {
      micStateEl.textContent = "✅ allowed";
      micStateEl.style.color = "limegreen";
      return true;
    } else if (status.state === "prompt") {
      micStateEl.textContent = "⚠️ waiting for permission...";
      micStateEl.style.color = "gold";
      await requestMicAccess();
      return true;
    } else {
      micStateEl.textContent = "❌ blocked";
      micStateEl.style.color = "red";
      alert("🎤 Please allow microphone access in your browser settings and reload.");
      return false;
    }
  } catch (err) {
    console.warn("Could not query microphone permission:", err);
    micStateEl.textContent = "🤔 unknown (try clicking Start Chat)";
    micStateEl.style.color = "orange";
    return true;
  }
}

async function requestMicAccess() {
  try {
    console.log("🔊 Requesting microphone permission...");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    console.log("🎙️ Microphone access granted!");
  } catch (err) {
    console.error("🚫 Microphone access denied:", err);
  }
}

// ===============================
// 🔸 ENHANCED BUTTON SETUP
// ===============================
function initializeApp() {
  const button = document.querySelector<HTMLButtonElement>("#counter")!;
  setupButton(button);

  // Add click handler for visual feedback
  button.addEventListener("click", () => {
    updateBotStatus('speaking', 'Starting conversation...'); // CHANGED: from 'processing' to 'speaking'
  });
}

// ===============================
// 🔸 GLOBAL ACCESS FOR DM.TS
// ===============================
// Make the updateBotStatus function globally available so dm.ts can call it
(window as any).updateBotStatus = updateBotStatus;

// ===============================
// 🔸 INITIALIZATION
// ===============================
// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing app...');
  
  // Preload images first
  preloadImages();
  
  // Initialize the app
  initializeApp();
  
  // Set initial bot status
  setTimeout(() => {
    updateBotStatus('start', 'Start');
  }, 100);
  
  // Check mic permission
  checkMicPermission();
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}