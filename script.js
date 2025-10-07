const video = document.getElementById('video');
const container = document.getElementById('container');
const statusDiv = document.getElementById('status');
const errorDiv = document.getElementById('error');

// Función para mostrar mensajes de estado
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

// Cargar los modelos desde la carpeta local "models"
showStatus('Cargando modelos de IA...');

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
  faceapi.nets.faceExpressionNet.loadFromUri('./models'),
  faceapi.nets.ageGenderNet.loadFromUri('./models') // opcional
])
  .then(() => {
    showStatus('Modelos cargados. Iniciando cámara...');
    startVideo();
  })
  .catch(err => {
    console.error('Error al cargar los modelos:', err);
    showStatus('Error al cargar los modelos de IA. Verifica tu conexión a internet o los archivos en /models.', true);
  });

function startVideo() {
  navigator.mediaDevices.getUserMedia({ 
    video: { 
      width: 720, 
      height: 560 
    } 
  })
    .then(stream => {
      video.srcObject = stream;
      showStatus('Cámara iniciada. Detectando rostros...', false);
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 2000);
    })
    .catch(err => {
      console.error('Error al acceder a la cámara:', err);
      showStatus('Error: No se pudo acceder a la cámara. Asegúrate de dar permisos.', true);
    });
}

video.addEventListener('play', () => {
  // Crear el canvas y posicionarlo sobre el video
  const canvas = faceapi.createCanvasFromMedia(video);
  container.append(canvas);
  
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);
  
  // Detección continua de rostros
  setInterval(async () => {
    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();
      
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      
      // Limpiar el canvas antes de dibujar
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      
      // Dibujar las detecciones
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
    } catch (err) {
      console.error('Error en la detección:', err);
    }
  }, 100);

});
