// app.js
// Mode module

// ===== Auth basique (à sécuriser avec un backend) =====

const loginForm = document.getElementById('login-form');
const adminPanel = document.getElementById('admin-panel');
const createAccountBtn = document.getElementById('create-account-btn');

// Exemple de stockage local chiffré (démo) – à remplacer par un vrai backen
// stocke un hash simulé (ici juste pour la démo).
const ADMIN_USERNAME = 'yasscode';
const ADMIN_HASH_KEY = 'admin_hash_v1';

// TODO: côté serveur, générer un vrai hash (bcrypt/argon2) et le vérifier.
// Ici, on simule un hash avec Web Crypto.
async function hashPassword(password) {
  const enc = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

// Initialisation : si aucun admin, tu pourras le créer via un flux sécurisé plus tard.
if (!localStorage.getItem(ADMIN_HASH_KEY)) {
  console.log('Admin hash non initialisé – à gérer côté backend.');
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  const storedHash = localStorage.getItem(ADMIN_HASH_KEY);

  if (username === ADMIN_USERNAME && storedHash) {
    const inputHash = await hashPassword(password);
    if (inputHash === storedHash) {
      adminPanel.hidden = false;
      alert('Bienvenue dans le hub admin Yasscode.');
    } else {
      alert('Mot de passe incorrect.');
    }
  } else {
    alert('Compte inconnu ou non initialisé.');
  }
});

createAccountBtn.addEventListener('click', () => {
  alert('La création de compte doit être gérée côté serveur (API sécurisée).');
});

// ===== WebNN + ONNX Runtime Web =====

const loadModelBtn = document.getElementById('load-model-btn');
const runInferenceBtn = document.getElementById('run-inference-btn');
const inferenceOutput = document.getElementById('inference-output');

let session = null;

async function initWebNN() {
  try {
    // Vérifier la présence de navigator.ml (flags Edge/Chrome activés)
    if (!('ml' in navigator)) {
      inferenceOutput.textContent =
        'WebNN non disponible. Active les flags #experimental-web-machine-learning-neural-network et #web-machine-learning-neural-network dans Edge.';
      return;
    }

    // ONNX Runtime Web avec EP WebNN
    session = await ort.InferenceSession.create('./models/model.onnx', {
      executionProviders: [
        {
          name: 'webnn',
          deviceType: 'gpu',
          powerPreference: 'high-performance',
        },
      ],
    });

    inferenceOutput.textContent = 'Modèle chargé avec WebNN (ONNX Runtime Web).';
    runInferenceBtn.disabled = false;
  } catch (err) {
    console.error(err);
    inferenceOutput.textContent = 'Erreur de chargement du modèle : ' + err.message;
  }
}

loadModelBtn.addEventListener('click', () => {
  initWebNN();
});

async function runCameraInference() {
  if (!session) {
    inferenceOutput.textContent = 'Session WebNN non initialisée.';
    return;
  }

  // Exemple minimal : on récupère un frame vidéo, on le convertit en tensor.
  // À adapter selon ton modèle ONNX (shape, préprocessing).
  const video = document.getElementById('local-video');
  if (!video.videoWidth) {
    inferenceOutput.textContent = 'Caméra non prête.';
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 224;
  canvas.height = 224;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const floatData = new Float32Array(canvas.width * canvas.height * 3);

  for (let i = 0; i < canvas.width * canvas.height; i++) {
    floatData[i * 3 + 0] = imgData.data[i * 4 + 0] / 255.0;
    floatData[i * 3 + 1] = imgData.data[i * 4 + 1] / 255.0;
    floatData[i * 3 + 2] = imgData.data[i * 4 + 2] / 255.0;
  }

  const inputTensor = new ort.Tensor('float32', floatData, [1, 3, 224, 224]);

  const results = await session.run({ input: inputTensor });
  const output = results[Object.keys(results)[0]];

  inferenceOutput.textContent = 'Inference OK. Première valeur: ' + output.data[0];
}

runInferenceBtn.addEventListener('click', () => {
  runCameraInference();
});

// ===== WebRTC (Visio) =====

const startCallBtn = document.getElementById('start-call-btn');
const hangupBtn = document.getElementById('hangup-btn');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');

let pc = null;

async function startCall() {
  // PeerConnection avec ICE relay-only pour limiter l’exposition IP (nécessite un vrai TURN).
  pc = new RTCPeerConnection({
    iceTransportPolicy: 'relay', // nécessite des serveurs TURN configurés
    iceServers: [
      // À configurer côté backend, ne mets pas les credentials en dur ici.
      // { urls: 'turns:example.com:3478', username: '...', credential: '...' }
    ],
  });

  pc.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = stream;
  stream.getTracks().forEach((t) => pc.addTrack(t, stream));

  // La signalisation (offer/answer) doit passer par ton serveur (WebSocket/SignalR/etc.).
  alert('WebRTC initialisé. Ajoute une couche de signalisation serveur pour connecter deux clients.');
}

function hangup() {
  if (pc) {
    pc.close();
    pc = null;
  }
}

startCallBtn.addEventListener('click', startCall);
hangupBtn.addEventListener('click', hangup);

// ===== PWA =====

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(console.error);
}
