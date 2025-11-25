/* ==========================================
   MANEJO DE CORREOS: EXPANDIR Y ENVIAR CON CLOUDINARY
   ========================================== */

// Array para almacenar los archivos adjuntos con sus URLs de Cloudinary
let composeAttachments = [];

// ==============================
// DESCARGAR ARCHIVO DESDE CLOUDINARY
// ==============================
async function downloadFile(url, fileName) {
  try {
    // Mostrar indicador de descarga
    window.showNotification('Descargando', `Descargando ${fileName}...`, 'info');
    
    const response = await fetch(url);
    const blob = await response.blob();
    
    // Crear link temporal para descargar
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Liberar memoria
    window.URL.revokeObjectURL(link.href);
    
    window.showNotification('Descarga completa', `${fileName} se ha descargado correctamente`, 'success');
  } catch (error) {
    console.error('Error al descargar archivo:', error);
    window.showNotification('Error de descarga', 'No se pudo descargar el archivo', 'error');
  }
}

// ==============================
// HACER FILAS EXPANDIBLES
// ==============================
function makeExpandable(selector, bodySelector, headerSelector = null) {
  const headerCandidates = [
    headerSelector,
    '.draftRow__summary',
    '.emailRow__summary',
    '.mailRow__summary',
    '.row-summary',
    '.summary',
    '.item-header',
    '.draftRow__info'
  ].filter(Boolean); // elimina nulls

  document.querySelectorAll(selector).forEach(row => {
    const body = row.querySelector(bodySelector);
    if (!body) return;

    // Buscar un header válido entre candidatos; si no hay, usar la fila completa
    let header = null;
    for (const cand of headerCandidates) {
      if (!cand) continue;
      const found = row.querySelector(cand);
      if (found) { header = found; break; }
    }
    if (!header) header = row; // fallback: escuchar en la fila entera

    // Asegurar estado inicial
    body.classList.add('hide');

    // Añadir listener al header (o a la fila si no hay header)
    header.addEventListener('click', e => {
      // Si el click viene de un botón/ enlace/ input/ textarea dentro del header, no togglear
      if (e.target.closest('button') ||
          e.target.closest('a') ||
          e.target.closest('input') ||
          e.target.closest('textarea') ||
          e.target.closest('.btn-add-attachment') ||
          e.target.closest('.btn-remove-attachment')) {
        return;
      }

      // Cerrar otras bodies
      document.querySelectorAll(bodySelector).forEach(b => {
        if (b !== body) {
          b.classList.add('hide');
          b.classList.remove('open');
        }
      });

      document.querySelectorAll('.toggle-content').forEach(i => i.classList.remove('expanded'));

      const isOpen = body.classList.contains('open');
      const icon = row.querySelector('.toggle-content');

      if (isOpen) {
        body.classList.add('hide');
        body.classList.remove('open');
        if (icon) icon.classList.remove('expanded');
      } else {
        body.classList.remove('hide');
        void body.offsetWidth; // forzar reflow para transiciones
        body.classList.add('open');
        if (icon) icon.classList.add('expanded');
      }
    });
  });
}

// ==============================
// ADJUNTAR ARCHIVOS EN COMPOSE CON CLOUDINARY
// ==============================
function initComposeAttachments() {
  const composeSection = document.querySelector('.composeSection');
  const composeAttachmentList = composeSection.querySelector('.attachment-list');
  
  composeSection.querySelector('.btn-add-attachment')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    
    input.onchange = async (ev) => {
      const files = Array.from(ev.target.files);
      const userData = window.getUserData();
      
      if (!userData) {
        window.showNotification('Error', 'No se pudo obtener información del usuario', 'error');
        return;
      }
      
      for (const file of files) {
        // Validar archivo
        const validation = window.validateFile(file);
        if (!validation.valid) {
          window.showNotification('Archivo no válido', validation.error, 'error');
          continue;
        }
        
        // Obtener icono según tipo de archivo
        const fileIcon = window.getFileIcon(file.type);
        
        // Crear elemento visual del archivo con estado "subiendo"
        const item = document.createElement('div');
        item.className = 'attachment-item';
        item.innerHTML = `
          <div class="attachment-info">
            <span class="material-icons" style="font-size: 18px;">${fileIcon}</span>
            <span class="attachment-name">${file.name}</span>
            <span class="attachment-size" style="margin-left: 8px; color: #5f6368; font-size: 12px;">(${window.formatFileSize(file.size)})</span>
            <span class="attachment-status" style="margin-left: 10px; color: #1a73e8;">Subiendo...</span>
          </div>
          <button type="button" class="btn-remove-attachment" disabled>Eliminar</button>
        `;
        composeAttachmentList.appendChild(item);
        
        try {
          // Subir a Cloudinary vía backend
          const uploadedFile = await window.uploadToCloudinary(file, userData.email);
          
          // Guardar en el array de adjuntos con el nombre original
          composeAttachments.push({
            url: uploadedFile.url,
            fileName: file.name, // Mantener nombre original
            fileSize: file.size,
            fileType: file.type
          });
          
          // Actualizar el estado visual
          const statusSpan = item.querySelector('.attachment-status');
          statusSpan.textContent = '✓ Subido';
          statusSpan.style.color = '#0f9d58';
          
          // Habilitar botón de eliminar
          const removeBtn = item.querySelector('.btn-remove-attachment');
          removeBtn.disabled = false;
          removeBtn.addEventListener('click', () => {
            const index = composeAttachments.findIndex(a => a.url === uploadedFile.url);
            if (index > -1) {
              composeAttachments.splice(index, 1);
            }
            item.remove();
          });
          
        } catch (error) {
          console.error('Error al subir archivo:', error);
          
          const statusSpan = item.querySelector('.attachment-status');
          statusSpan.textContent = '✗ Error';
          statusSpan.style.color = '#d93025';
          
          const removeBtn = item.querySelector('.btn-remove-attachment');
          removeBtn.disabled = false;
          removeBtn.addEventListener('click', () => item.remove());
          
          window.showNotification('Error al subir archivo', `No se pudo subir ${file.name}`, 'error');
        }
      }
    };
    input.click();
  });
}

// ==============================
// ENVIAR CORREO VÍA SPRING BOOT CON ADJUNTOS
// ==============================
async function sendEmail() {
  const inputTo = document.getElementById('composeTo');
  const inputSubject = document.getElementById('composeSubject');
  const inputMessage = document.getElementById('composeMessage');
  const btnSend = document.getElementById('btnSendCompose');
  
  const para = inputTo.value.trim();
  const asunto = inputSubject.value.trim();
  const mensaje = inputMessage.value.trim();

  if (!para || !asunto) {
    window.showNotification('Campos incompletos', 'Debes rellenar "Para" y "Asunto".', 'error');
    return;
  }

  const currentUser = window.getCurrentUser();
  const userData = window.getUserData();

  if (!currentUser || !userData) {
    window.showNotification('Error de usuario', 'No se pudieron cargar tus datos. Intenta recargar.', 'error');
    return;
  }
  
  // Construir el objeto del correo con información del adjunto
  const correoData = {
    remitente: userData.email,
    destinatario: para,
    asunto: asunto,
    mensaje: mensaje,
    fecha: new Date().toISOString(),
    adjuntoUrl: composeAttachments.length > 0 ? composeAttachments[0].url : null,
    adjuntoNombre: composeAttachments.length > 0 ? composeAttachments[0].fileName : null,
    adjuntoTipo: composeAttachments.length > 0 ? composeAttachments[0].fileType : null,
    adjuntoTamano: composeAttachments.length > 0 ? composeAttachments[0].fileSize : null
  };
  
  btnSend.disabled = true;
  btnSend.textContent = 'Enviando...';

  try {
    const response = await fetch(window.BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(correoData) 
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(responseText || 'Error del servidor');
    }
    
    console.log('✅ Respuesta del backend:', responseText);
    
    const attachmentMsg = composeAttachments.length > 0 
      ? ` con 1 archivo adjunto` 
      : '';
    window.showNotification('Correo Enviado', `Tu mensaje para ${para} ha sido enviado${attachmentMsg}.`, 'success');

    // Limpiar adjuntos
    composeAttachments = [];
    window.resetComposeForm();
    window.setIsComposing(false);
    window.navigateToSection('inbox');
    
    // Recargar correos
    await window.loadUserEmails(userData.email);

  } catch (error) {
    console.error('❌ Error al enviar al backend:', error);
    window.showNotification('Error de conexión', 'No se pudo conectar con el servidor. ¿Está el backend corriendo?', 'error');
  } finally {
    btnSend.disabled = false;
    btnSend.textContent = 'Enviar';
  }
}

// ==============================
// GUARDAR BORRADOR VÍA SPRING BOOT CON ADJUNTOS
// ==============================
async function saveDraft() {
  const inputTo = document.getElementById('composeTo');
  const inputSubject = document.getElementById('composeSubject');
  const inputMessage = document.getElementById('composeMessage');
  const btnSaveDraft = document.getElementById('modalBorrador');
  
  const para = inputTo.value.trim();
  const asunto = inputSubject.value.trim();
  const mensaje = inputMessage.value.trim();

  if (!para && !asunto && !mensaje && composeAttachments.length === 0) {
    window.showNotification('Borrador vacío', 'No hay nada que guardar.', 'info');
    return;
  }

  const currentUser = window.getCurrentUser();
  const userData = window.getUserData();

  if (!currentUser || !userData) {
    window.showNotification('Error de usuario', 'No se pudieron cargar tus datos.', 'error');
    return;
  }
  
  const draftData = {
    remitente: userData.email,
    destinatario: para,
    asunto: asunto,
    mensaje: mensaje,
    fecha: new Date().toISOString(),
    adjuntoUrl: composeAttachments.length > 0 ? composeAttachments[0].url : null,
    adjuntoNombre: composeAttachments.length > 0 ? composeAttachments[0].fileName : null,
    adjuntoTipo: composeAttachments.length > 0 ? composeAttachments[0].fileType : null,
    adjuntoTamano: composeAttachments.length > 0 ? composeAttachments[0].fileSize : null
  };
  
  btnSaveDraft.disabled = true;
  btnSaveDraft.textContent = 'Guardando...';

  try {
    const response = await fetch(`${window.BACKEND_URL}/borrador`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draftData) 
    });

    const responseText = await response.text();
    if (!response.ok) throw new Error(responseText || 'Error del servidor');
    
    console.log('✅ Respuesta del backend:', responseText);
    window.showNotification('Borrador Guardado', 'Tu borrador se ha guardado con sus adjuntos.', 'success');

    // Limpiar adjuntos
    composeAttachments = [];
    window.resetComposeForm();
    
    // Recargar borradores
    await window.loadUserDrafts(userData.email);

  } catch (error) {
    console.error('❌ Error al guardar borrador:', error);
    window.showNotification('Error de conexión', 'No se pudo guardar el borrador.', 'error');
  } finally {
    btnSaveDraft.disabled = false;
    btnSaveDraft.textContent = 'Borrador';
  }
}

// ==============================
// RENDERIZAR CORREOS RECIBIDOS CON ADJUNTOS
// ==============================
function renderReceivedEmail(correo) {
  const emailList = document.querySelector('.emailList__list');
  
  const emailRow = document.createElement('div');
  emailRow.className = 'emailRow';
  
  // Construir HTML de adjuntos si existe
  let adjuntosHTML = '';
  if (correo.adjuntoUrl) {
    const fileName = correo.adjuntoNombre || correo.adjuntoUrl.split('/').pop();
    const fileSize = correo.adjuntoTamano ? window.formatFileSize(correo.adjuntoTamano) : '';
    const fileIcon = correo.adjuntoTipo ? window.getFileIcon(correo.adjuntoTipo) : 'attach_file';
    
    adjuntosHTML = `
      <div class="email-attachments" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
        <div style="font-weight: 500; margin-bottom: 10px;">
          <span class="material-icons" style="font-size: 16px; vertical-align: middle;">attach_file</span>
          Archivo adjunto
        </div>
        <div class="attachment-list">
          <div class="attachment-item" style="margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; padding: 8px; background: #f8f9fa; border-radius: 4px;">
            <div class="attachment-info" style="display: flex; align-items: center; gap: 8px;">
              <span class="material-icons" style="font-size: 24px; color: #5f6368;">${fileIcon}</span>
              <div>
                <div class="attachment-name" style="font-weight: 500; color: #202124;">${fileName}</div>
                ${fileSize ? `<div style="font-size: 12px; color: #5f6368;">${fileSize}</div>` : ''}
              </div>
            </div>
            <button class="attachment-download-btn" onclick="window.downloadFile('${correo.adjuntoUrl}', '${fileName}')" style="background: #1a73e8; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 14px;">
              <span class="material-icons" style="font-size: 18px;">download</span>
              Descargar
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  emailRow.innerHTML = `
    <div class="emailRow__summary">
      <p class="emailRow__from"><strong>De:</strong> ${correo.remitente}</p>
      <p class="emailRow__subject"><strong>Asunto:</strong> ${correo.asunto}</p>
      <span class="material-icons toggle-content">expand_more</span>
    </div>
    <div class="emailRow__body hide">
      <p>${correo.mensaje || 'Sin mensaje'}</p>
      ${adjuntosHTML}
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #5f6368; font-size: 12px;">${new Date(correo.fecha).toLocaleString('es-ES')}</span>
        <button class="btn-delete-email" data-email-id="${correo.id}" style="background: #d93025; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 13px;">
          <span class="material-icons" style="font-size: 16px;">delete</span>
          Eliminar
        </button>
      </div>
    </div>
  `;
  
  emailList.appendChild(emailRow);
  
  // Agregar evento de eliminar
  const deleteBtn = emailRow.querySelector('.btn-delete-email');
  deleteBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    
    window.showDeleteConfirmModal({
      title: '¿Eliminar correo?',
      message: 'Esta acción no se puede deshacer. El correo será eliminado permanentemente.'
    }, async () => {
      try {
        const response = await fetch(`${window.BACKEND_URL}/eliminar/${correo.id}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Error al eliminar correo');
        
        emailRow.remove();
        window.showNotification('Correo eliminado', 'El correo se ha eliminado correctamente', 'success');
        
      } catch (error) {
        console.error('Error al eliminar correo:', error);
        window.showNotification('Error', 'No se pudo eliminar el correo', 'error');
      }
    });
  });
}

// ==============================
// CARGAR CORREOS DEL USUARIO DESDE EL BACKEND
// ==============================
async function loadUserEmails(userEmail) {
  try {
    const response = await fetch(`${window.BACKEND_URL}/recibidos?email=${encodeURIComponent(userEmail)}`);
    
    if (!response.ok) {
      throw new Error('Error al cargar correos');
    }
    
    const correos = await response.json();
    
    // Ordenar por fecha (más recientes primero)
    correos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    // Limpiar lista actual
    const emailList = document.querySelector('.emailList__list');
    emailList.innerHTML = '';
    
    if (correos.length === 0) {
      emailList.innerHTML = '<p style="padding: 20px; text-align: center; color: #5f6368;">No hay correos recibidos</p>';
    } else {
      // Renderizar cada correo
      correos.forEach(correo => {
        renderReceivedEmail(correo);
      });
      
      // Hacer expandibles
      makeExpandable('.emailRow', '.emailRow__body');
    }
    
    console.log(`✅ ${correos.length} correos recibidos cargados`);
    
  } catch (error) {
    console.error('❌ Error al cargar correos:', error);
    window.showNotification('Error', 'No se pudieron cargar los correos', 'error');
  }
}

// ==============================
// CARGAR CORREOS ENVIADOS
// ==============================
async function loadSentEmails(userEmail) {
  try {
    const response = await fetch(`${window.BACKEND_URL}/enviados?email=${encodeURIComponent(userEmail)}`);
    
    if (!response.ok) {
      throw new Error('Error al cargar correos enviados');
    }
    
    const correos = await response.json();
    
    // Ordenar por fecha (más recientes primero)
    correos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    // Limpiar lista actual
    const sentList = document.querySelector('.sentList .emailList__list');
    sentList.innerHTML = '';
    
    if (correos.length === 0) {
      sentList.innerHTML = '<p style="padding: 20px; text-align: center; color: #5f6368;">No hay correos enviados</p>';
    } else {
      // Renderizar cada correo
      correos.forEach(correo => {
      const sentRow = document.createElement('div');
      sentRow.className = 'sentRow';
      
      let adjuntosHTML = '';
      if (correo.adjuntoUrl) {
        const fileName = correo.adjuntoNombre || correo.adjuntoUrl.split('/').pop();
        const fileSize = correo.adjuntoTamano ? window.formatFileSize(correo.adjuntoTamano) : '';
        const fileIcon = correo.adjuntoTipo ? window.getFileIcon(correo.adjuntoTipo) : 'attach_file';
        
        adjuntosHTML = `
          <div class="email-attachments" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
            <div style="font-weight: 500; margin-bottom: 10px;">
              <span class="material-icons" style="font-size: 16px; vertical-align: middle;">attach_file</span>
              Archivo adjunto
            </div>
            <div class="attachment-list">
              <div class="attachment-item" style="margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; padding: 8px; background: #f8f9fa; border-radius: 4px;">
                <div class="attachment-info" style="display: flex; align-items: center; gap: 8px;">
                  <span class="material-icons" style="font-size: 24px; color: #5f6368;">${fileIcon}</span>
                  <div>
                    <div class="attachment-name" style="font-weight: 500; color: #202124;">${fileName}</div>
                    ${fileSize ? `<div style="font-size: 12px; color: #5f6368;">${fileSize}</div>` : ''}
                  </div>
                </div>
                <button class="attachment-download-btn" onclick="window.downloadFile('${correo.adjuntoUrl}', '${fileName}')" style="background: #1a73e8; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 14px;">
                  <span class="material-icons" style="font-size: 18px;">download</span>
                  Descargar
                </button>
              </div>
            </div>
          </div>
        `;
      }
      
      sentRow.innerHTML = `
        <div class="sentRow__summary">
          <p class="sentRow__to"><strong>Para:</strong> ${correo.destinatario}</p>
          <p class="sentRow__subject"><strong>Asunto:</strong> ${correo.asunto}</p>
          <span class="material-icons toggle-content">expand_more</span>
        </div>
        <div class="sentRow__body hide">
          <p>${correo.mensaje || 'Sin mensaje'}</p>
          ${adjuntosHTML}
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #5f6368; font-size: 12px;">${new Date(correo.fecha).toLocaleString('es-ES')}</span>
            <button class="btn-delete-sent" data-email-id="${correo.id}" style="background: #d93025; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 13px;">
              <span class="material-icons" style="font-size: 16px;">delete</span>
              Eliminar
            </button>
          </div>
        </div>
      `;
      
      sentList.appendChild(sentRow);
      
      // Agregar evento de eliminar
      const deleteBtn = sentRow.querySelector('.btn-delete-sent');
      deleteBtn?.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        window.showDeleteConfirmModal({
          title: '¿Eliminar correo enviado?',
          message: 'Esta acción no se puede deshacer. El correo será eliminado permanentemente.'
        }, async () => {
          try {
            const response = await fetch(`${window.BACKEND_URL}/eliminar/${correo.id}`, {
              method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Error al eliminar correo');
            
            sentRow.remove();
            window.showNotification('Correo eliminado', 'El correo enviado se ha eliminado correctamente', 'success');
            
          } catch (error) {
            console.error('Error al eliminar correo:', error);
            window.showNotification('Error', 'No se pudo eliminar el correo', 'error');
          }
        });
      });
    });
    
    // Hacer expandibles
    makeExpandable('.sentRow', '.sentRow__body');
    
    console.log(`✅ ${correos.length} correos enviados cargados`);
    }
    
  } catch (error) {
    console.error('❌ Error al cargar correos enviados:', error);
  }
}

// ==============================
// INICIALIZAR TODO
// ==============================
function initEmailHandlers() {
  // Hacer expandibles
  makeExpandable('.emailRow', '.emailRow__body');
  makeExpandable('.sentRow', '.sentRow__body');
  
  // Inicializar adjuntos en compose
  initComposeAttachments();
  
  // Eventos de envío
  const composeForm = document.querySelector('.compose-form');
  composeForm?.addEventListener('submit', e => {
    e.preventDefault();
    sendEmail();
  });
  
  const btnSendCompose = document.getElementById('btnSendCompose');
  btnSendCompose?.addEventListener('click', e => {
    e.preventDefault();
    sendEmail();
  });
  
  // Evento de guardar borrador
  const btnSaveDraft = document.getElementById('modalBorrador');
  btnSaveDraft?.addEventListener('click', e => {
    e.preventDefault();
    saveDraft();
  });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initEmailHandlers);

// Exportar funciones
window.loadUserEmails = loadUserEmails;
window.loadSentEmails = loadSentEmails;
window.renderReceivedEmail = renderReceivedEmail;
window.downloadFile = downloadFile;