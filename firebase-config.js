/* ==========================================
   CONFIGURACIÓN DE FIREBASE Y AUTENTICACIÓN
   ========================================== */

const firebaseConfig = {
  apiKey: "AIzaSyBVEltBir1JP3-Fkp28VchL8-r0VMi-LYo",
  authDomain: "cloudmessage-73de0.firebaseapp.com",
  projectId: "cloudmessage-73de0",
  storageBucket: "cloudmessage-73de0.firebasestorage.app",
  messagingSenderId: "40058388963",
  appId: "1:40058388963:web:821cda7114279a336e20d6",
  measurementId: "G-W0BMTSZWXC"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

console.log('🔥 Firebase inicializado');

// Variables globales
let currentUser = null;
let userData = null;

/* ==========================================
   PROTECCIÓN DE RUTA Y CARGA DE USUARIO
   ========================================== */
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    console.log('⚠️ Usuario no autenticado, redirigiendo al login...');
    window.location.href = 'login.html';
    return;
  }

  currentUser = user;
  console.log('✅ Usuario autenticado:', user.uid);

  try {
    const userDoc = await db.collection('users').doc(user.uid).get();
    
    if (userDoc.exists) {
      userData = userDoc.data();
      console.log('✅ Datos del usuario cargados:', userData);
      
      document.getElementById('userName').textContent = `${userData.nombre} ${userData.apellidos}`;
      document.getElementById('userEmail').textContent = userData.email;

      // Cargar correos, enviados y borradores del usuario desde el backend
      console.log('📧 Cargando correos del usuario:', userData.email);
      await window.loadUserEmails(userData.email);
      await window.loadSentEmails(userData.email);
      await window.loadUserDrafts(userData.email);
      console.log('✅ Todos los correos cargados');
    } else {
      console.warn('⚠️ No se encontraron datos del usuario en Firestore');
      document.getElementById('userName').textContent = user.email;
      document.getElementById('userEmail').textContent = user.email;
    }
  } catch (error) {
    console.error('❌ Error al cargar datos del usuario:', error);
  }
});

// Exportar variables para uso en otros archivos
window.auth = auth;
window.db = db;
window.getCurrentUser = () => currentUser;
window.getUserData = () => userData;