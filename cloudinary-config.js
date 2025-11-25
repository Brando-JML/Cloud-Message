/* ==========================================
   CONFIGURACIÓN DE CLOUDINARY
   ========================================== */

// ✅ Configuración con tus credenciales reales de Cloudinary
const CLOUDINARY_CONFIG = {
  cloudName: 'dwp6dpqxh',              // Tu Cloud Name
  uploadPreset: 'email_attachments',   // Tu Upload Preset (cámbialo si usaste otro nombre)
  folder: 'email-attachments'          // Carpeta donde se organizarán los archivos
};

// URL del backend
const BACKEND_URL = 'http://localhost:8080/api/correos';

/* ==========================================
   FUNCIÓN PARA SUBIR ARCHIVOS VÍA BACKEND
   ========================================== */

/**
 * Sube un archivo a Cloudinary a través del backend
 * @param {File} file - Archivo a subir
 * @param {string} userEmail - Email del usuario para organizar archivos
 * @returns {Promise<Object>} Objeto con información del archivo subido
 */
async function uploadToCloudinary(file, userEmail) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('email', userEmail);
  
  try {
    const response = await fetch(`${BACKEND_URL}/subir-adjunto`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Error al subir archivo');
    }
    
    const data = await response.json();
    
    console.log('✅ Archivo subido a Cloudinary:', data.url);
    
    // Retornar en el formato que espera el frontend
    return {
      url: data.url,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    };
  } catch (error) {
    console.error('❌ Error al subir a Cloudinary:', error);
    throw error;
  }
}

/* ==========================================
   FUNCIÓN AUXILIAR: FORMATEAR TAMAÑO
   ========================================== */

/**
 * Formatea el tamaño de un archivo en bytes a formato legible
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} Tamaño formateado (ej: "2.5 MB")
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/* ==========================================
   VALIDACIÓN DE ARCHIVOS
   ========================================== */

/**
 * Valida un archivo antes de subirlo
 * @param {File} file - Archivo a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} { valid: boolean, error: string }
 */
function validateFile(file, options = {}) {
  const defaults = {
    maxSize: 10 * 1024 * 1024, // 10 MB por defecto
    allowedTypes: [
      // Imágenes
      'image/jpeg', 
      'image/jpg',
      'image/png', 
      'image/gif', 
      'image/webp',
      'image/svg+xml',
      
      // Documentos
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      
      // Hojas de cálculo
      'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      
      // Presentaciones
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      
      // Texto
      'text/plain',
      
      // Comprimidos
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/x-7z-compressed'
    ]
  };
  
  const config = { ...defaults, ...options };
  
  // Validar tamaño
  if (file.size > config.maxSize) {
    return {
      valid: false,
      error: `El archivo es demasiado grande. Máximo permitido: ${formatFileSize(config.maxSize)}`
    };
  }
  
  // Validar tipo
  if (!config.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido: ${file.type}. Solo se permiten: imágenes, PDF, documentos de Office, hojas de cálculo, presentaciones y archivos comprimidos.`
    };
  }
  
  return { valid: true, error: null };
}

/* ==========================================
   OBTENER ICONO SEGÚN TIPO DE ARCHIVO
   ========================================== */

/**
 * Retorna el icono Material Icons apropiado según el tipo de archivo
 * @param {string} fileType - Tipo MIME del archivo
 * @returns {string} Nombre del icono
 */
function getFileIcon(fileType) {
  if (fileType.startsWith('image/')) return 'image';
  if (fileType === 'application/pdf') return 'picture_as_pdf';
  if (fileType.includes('word') || fileType.includes('document')) return 'description';
  if (fileType.includes('sheet') || fileType.includes('excel')) return 'table_chart';
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'slideshow';
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return 'folder_zip';
  if (fileType === 'text/plain') return 'text_snippet';
  return 'attach_file';
}

/* ==========================================
   EXPORTAR FUNCIONES
   ========================================== */

// Hacer funciones disponibles globalmente
window.CLOUDINARY_CONFIG = CLOUDINARY_CONFIG;
window.BACKEND_URL = BACKEND_URL;
window.uploadToCloudinary = uploadToCloudinary;
window.formatFileSize = formatFileSize;
window.validateFile = validateFile;
window.getFileIcon = getFileIcon;

console.log('☁️ Cloudinary configurado');
console.log('   Cloud Name:', CLOUDINARY_CONFIG.cloudName);
console.log('   Upload Preset:', CLOUDINARY_CONFIG.uploadPreset);
console.log('   Backend URL:', BACKEND_URL);