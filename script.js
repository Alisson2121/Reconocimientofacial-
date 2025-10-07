const video = document.getElementById('video');
const container = document.getElementById('container');
const statusDiv = document.getElementById('status');
const errorDiv = document.getElementById('error');
const registerBtn = document.getElementById('registerBtn');
const personNameInput = document.getElementById('personName');

// URL de tu Google Apps Script (REEMPLAZA CON LA TUYA)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/TU_URL_AQUI/exec';

// Intervalo de registro automático (en milisegundos)
const AUTO_REGISTER_INTERVAL = 300000; // 5 minutos
let lastDetection = null;

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

// Función para enviar datos a Google Sheets
async function registrarAsistencia(detectionData, nombrePersona) {
  try {
    showStatus('Registrando asistencia...', false);
    
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // Importante para Apps Script
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nombre: nombrePersona,
        expresion: detectionData.expression || 'neutral',
        confianza: detectionData.confidence || 0,
        landmarks: detectionData.landmarks || 'N/A',
        timestamp: new Date().toISOString()
      })
    });
    
    showStatus('✅ Asistencia registrada correctamente', false);
    setTimeout(() => statusDiv.style.display = 'none', 3000);
    
  } catch (error) {
    console.error('Error al registrar:', error);
    showStatus('❌ Error al registrar asistencia', true);
  }
}

// Cargar modelos
showStatus('Cargando modelos de IA...');

// Cargar los modelos desde la carpeta local "models"
showStatus('Cargando modelos de IA...');

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
  faceapi.nets.faceExpressionNet.loadFromUri('./models'),
  faceapi.nets.ageGenderNet.loadFromUri('./models') // opcional si tienes este modelo
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
    video: { width: 720, height: 560 } 
  })
    .then(stream => {
      video.srcObject = stream;
      showStatus('Cámara iniciada. Detectando rostros...', false);
      setTimeout(() => statusDiv.style.display = 'none', 2000);
    })
    .catch(err => {
      console.error('Error al acceder a la cámara:', err);
      showStatus('Error: No se pudo acceder a la cámara.', true);
    });
}

// Registro automático cada X minutos
setInterval(() => {
  if (lastDetection && lastDetection.detection) {
    const nombre = personNameInput.value || 'Usuario Anónimo';
    registrarAsistencia(lastDetection, nombre);
  }
}, AUTO_REGISTER_INTERVAL);

// Botón de registro manual
registerBtn.addEventListener('click', () => {
  if (lastDetection && lastDetection.detection) {
    const nombre = personNameInput.value || 'Usuario Anónimo';
    registrarAsistencia(lastDetection, nombre);
  } else {
    showStatus('No se detectó ningún rostro', true);
  }
});

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
      
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
      
      // Guardar última detección
      if (detections.length > 0) {
        const expressions = detections[0].expressions;
        const maxExpression = Object.keys(expressions).reduce((a, b) => 
          expressions[a] > expressions[b] ? a : b
        );
        
        lastDetection = {
          detection: true,
          expression: maxExpression,
          confidence: expressions[maxExpression],
          landmarks: detections[0].landmarks.positions.length
        };
      }
      
    } catch (err) {
      console.error('Error en la detección:', err);
    }
  }, 100);

});
