// HTML page that runs inside a WebView: front camera -> MediaPipe Face Landmarker -> laugh score.
// Posts JSON messages to React Native via window.ReactNativeWebView.postMessage:
//   { type: 'status', text }               loading / ready / errors
//   { type: 'score', s, smile, eye, jaw, t }  one per processed frame (t = Date.now())
// Listens for messages from RN: { type: 'start' } / { type: 'stop' } to toggle the camera.

export const LAUGH_THRESHOLD = 0.45;

export const detectorHtml = `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;background:#000;overflow:hidden}video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}</style>
</head><body>
<video id="v" playsinline muted autoplay></video>
<script type="module">
import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
const post = (m) => window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(m));
const v = document.getElementById('v');
let lm = null, stream = null, running = false, last = -1;

const g = (cats, n) => (cats.find(c => c.categoryName === n) || { score: 0 }).score;

async function load() {
  try {
    post({ type: 'status', text: 'loading model' });
    const fs = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
    lm = await FaceLandmarker.createFromOptions(fs, {
      baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task", delegate: "GPU" },
      outputFaceBlendshapes: true, runningMode: "VIDEO", numFaces: 1,
    });
    post({ type: 'status', text: 'model ready' });
  } catch (e) { post({ type: 'status', text: 'model error: ' + e.message }); }
}

async function start() {
  if (running) return;
  try {
    if (!stream) {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480, height: 640 }, audio: false });
      v.srcObject = stream;
    }
    await v.play();
    running = true;
    post({ type: 'status', text: 'camera on' });
    loop();
  } catch (e) { post({ type: 'status', text: 'camera error: ' + e.message }); }
}

function stop() {
  running = false;
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  post({ type: 'status', text: 'camera off' });
}

function loop() {
  if (!running) return;
  if (lm && v.readyState >= 2 && v.currentTime !== last) {
    last = v.currentTime;
    const r = lm.detectForVideo(v, performance.now());
    const cats = r.faceBlendshapes && r.faceBlendshapes[0] && r.faceBlendshapes[0].categories;
    if (cats) {
      const smile = (g(cats, 'mouthSmileLeft') + g(cats, 'mouthSmileRight')) / 2;
      const eye = Math.max((g(cats, 'eyeSquintLeft') + g(cats, 'eyeSquintRight')) / 2, (g(cats, 'cheekSquintLeft') + g(cats, 'cheekSquintRight')) / 2);
      const jaw = g(cats, 'jawOpen');
      const s = Math.min(1, smile * 0.55 + eye * 0.35 + jaw * 0.15);
      post({ type: 'score', s, smile, eye, jaw, t: Date.now() });
    } else {
      post({ type: 'score', s: 0, smile: 0, eye: 0, jaw: 0, t: Date.now(), noFace: true });
    }
  }
  requestAnimationFrame(loop);
}

function onMsg(ev) {
  try { const m = JSON.parse(ev.data); if (m.type === 'start') start(); if (m.type === 'stop') stop(); } catch (e) {}
}
window.addEventListener('message', onMsg);
document.addEventListener('message', onMsg);
load();
</script></body></html>`;
