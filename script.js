const video = document.getElementById('video');
const container = document.getElementById('container');
const statusDiv = document.getElementById('status');
const errorDiv = document.getElementById('error');

function showStatus(message, isError = false) {
  if (isError) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    statusDiv.style.display = 'none';
  } else {
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    errorDiv.style.display = 'none';
  }
}

// 👉 Cargamos los modelos directamente desde el CDN oficial
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

showStatus('Cargando modelos de IA...');

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
  faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
  faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
])
  .then(() => {
    showStatus('Modelos cargados. Iniciando cámara...');
    startVideo();
  })
  .catch(err => {
    console.error('Error al cargar los modelos:', err);
    showStatus('❌ Error al cargar los modelos de IA. Verifica tu conexión.', true);
  });

function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: { width: 720, height: 560 } })
    .then(stream => {
      video.srcObject = stream;
      showStatus('Cámara iniciada. Detectando rostros...', false);
      setTimeout(() => statusDiv.style.display = 'none', 2000);
    })
    .catch(err => {
      console.error('Error al acceder a la cámara:', err);
      showStatus('⚠️ No se pudo acceder a la cámara.', true);
    });
}

video.addEventListener('play', () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  container.append(canvas);

  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
    } catch (err) {
      console.error('Error en la detección:', err);
    }
  }, 100);
});
