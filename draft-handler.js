/* ==========================================
   MANEJO DE BORRADORES CON CLOUDINARY
   ========================================== */

// Objeto para almacenar adjuntos de cada borrador
const draftAttachments = {};

// ==============================
// HACER BORRADORES EXPANDIBLES
// ==============================
function makeExpandable(selector, bodySelector) {
  document.querySelectorAll(selector).forEach(row => {
    const body = row.querySelector(bodySelector);
    const icon = row.querySelector('.toggle-content');
    if (!body) return;
    
    body.classList.add('hide');
    
    // Remover listeners anteriores clonando el elemento
    const newRow = row.cloneNode(true);
    row.parentNode.replaceChild(newRow, row);
    
    const newBody = newRow.querySelector(bodySelector);
    const newIcon = newRow.querySelector('.toggle-content');
    
    newRow.addEventListener('click', e => {
      if (e.target.closest('button') || 
          e.target.closest('input') || 
          e.target.closest('textarea') ||
          e.target.closest('.btn-add-attachment') ||
          e.target.closest('.btn-remove-attachment')) {
        return;
      }
      
      document.querySelectorAll(bodySelector).forEach(b => { 
        if (b !== newBody) { 
          b.classList.add('hide'); 
          b.classList.remove('open'); 
        } 
      });
      
      document.querySelectorAll('.toggle-content').forEach(i => i.classList.remove('expanded'));
      
      const isOpen = newBody.classList.contains('open');
      if (isOpen) { 
        newBody.classList.add('hide'); 
        newBody.classList.remove('open'); 
        if (newIcon) newIcon.classList.remove('expanded'); 
      } else { 
        newBody.classList.remove('hide'); 
        void newBody.offsetWidth; 
        newBody.classList.add('open'); 
        if (newIcon) newIcon.classList.add('expanded'); 
      }
    });
  });
}

// ==============================
// CONFIGURAR UN BORRADOR
// ==============================
function setupDraftRow(draftRow) {
  const draftId = draftRow.getAttribute('data-draft-id');
  const toInput = draftRow.querySelector('.draft-to-input');
  const subjectInput = draftRow.querySelector('.draft-subject-input');
  const messageInput = draftRow.querySelector('.draft-message-input');
  const toPreview = draftRow.querySelector('.draft-to-preview');
  const subjectPreview = draftRow.querySelector('.draft-subject-preview');
  const body = draftRow.querySelector('.draftRow__body');
  const icon = draftRow.querySelector('.toggle-content');
  const attachmentList = draftRow.querySelector('.attachment-list');

  console.log('🔧 Configurando borrador:', draftId);
  console.log('   Para input:', toInput ? toInput.value : 'NO ENCONTRADO');
  console.log('   Asunto input:', subjectInput ? subjectInput.value : 'NO ENCONTRADO');
  console.log('   Mensaje input:', messageInput ? messageInput.value.substring(0, 50) : 'NO ENCONTRADO');

  // Inicializar array de adjuntos para este borrador
  if (!draftAttachments[draftId]) {
    draftAttachments[draftId] = [];
  }

  // Actualizar previews en tiempo real
  if (toInput && toPreview) {
    toInput.addEventListener('input', e => {
      toPreview.textContent = e.target.value || 'Sin destinatario';
    });
  }
  
  if (subjectInput && subjectPreview) {
    subjectInput.addEventListener('input', e => {
      subjectPreview.textContent = e.target.value || 'Sin asunto';
    });
  }

  // ==============================
  // GUARDAR BORRADOR CON ADJUNTOS
  // ==============================
  const btnSave = draftRow.querySelector('.btn-save-draft');
  if (btnSave) {
    btnSave.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('💾 Guardando borrador:', draftId);
      
      const userData = window.getUserData();
      if (!userData) {
        window.showNotification('Error de usuario', 'No se pudieron cargar tus datos.', 'error');
        return;
      }
      
      const attachment = draftAttachments[draftId] && draftAttachments[draftId].length > 0 
        ? draftAttachments[draftId][0] 
        : null;
      
      const draftData = {
        id: draftId,
        remitente: userData.email,
        destinatario: toInput?.value.trim() || '',
        asunto: subjectInput?.value.trim() || '',
        mensaje: messageInput?.value.trim() || '',
        fecha: new Date().toISOString(),
        adjuntoUrl: attachment ? attachment.url : null,
        adjuntoNombre: attachment ? attachment.fileName : null,
        adjuntoTipo: attachment ? attachment.fileType : null,
        adjuntoTamano: attachment ? attachment.fileSize : null
      };
      
      console.log('📤 Datos a guardar:', draftData);
      
      try {
        const response = await fetch(`${window.BACKEND_URL}/borrador`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draftData)
        });
        
        const responseText = await response.text();
        if (!response.ok) throw new Error(responseText || 'Error al guardar borrador');
        
        console.log('✅ Borrador guardado');
        window.showNotification('Guardado exitoso', 'Los cambios del borrador se han guardado correctamente.', 'success');
        
        body.classList.add('hide'); 
        body.classList.remove('open'); 
        if (icon) icon.classList.remove('expanded');
        
      } catch (error) {
        console.error('❌ Error al guardar borrador:', error);
        window.showNotification('Error', 'No se pudo guardar el borrador', 'error');
      }
    });
  }

  // ==============================
  // CANCELAR EDICIÓN
  // ==============================
  const btnCancel = draftRow.querySelector('.btn-cancel-draft');
  if (btnCancel) {
    btnCancel.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      body.classList.add('hide'); 
      body.classList.remove('open'); 
      if (icon) icon.classList.remove('expanded');
    });
  }

  // ==============================
  // ENVIAR BORRADOR CON ADJUNTOS
  // ==============================
  const btnSend = draftRow.querySelector('.btn-send-draft');
  if (btnSend) {
    btnSend.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const to = toInput?.value.trim() || '';
      const subject = subjectInput?.value.trim() || '';
      const message = messageInput?.value.trim() || '';
      
      if (!to || !subject) {
        window.showNotification('Campos incompletos', 'Por favor completa destinatario y asunto.', 'error');
        return;
      }
      
      const userData = window.getUserData();
      if (!userData) {
        window.showNotification('Error de usuario', 'No se pudieron cargar tus datos.', 'error');
        return;
      }
      
      const attachment = draftAttachments[draftId] && draftAttachments[draftId].length > 0 
        ? draftAttachments[draftId][0] 
        : null;
      
      const correoData = {
        remitente: userData.email,
        destinatario: to,
        asunto: subject,
        mensaje: message,
        fecha: new Date().toISOString(),
        adjuntoUrl: attachment ? attachment.url : null,
        adjuntoNombre: attachment ? attachment.fileName : null,
        adjuntoTipo: attachment ? attachment.fileType : null,
        adjuntoTamano: attachment ? attachment.fileSize : null
      };
      
      try {
        const response = await fetch(window.BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(correoData)
        });
        
        const responseText = await response.text();
        if (!response.ok) throw new Error(responseText || 'Error al enviar correo');
        
        window.showNotification('Correo enviado', `Tu correo ha sido enviado exitosamente a ${to}`, 'success');
        
        // Eliminar borrador del backend
        await fetch(`${window.BACKEND_URL}/${draftId}`, {
          method: 'DELETE'
        });
        
        // Limpiar adjuntos
        delete draftAttachments[draftId];
        
        setTimeout(() => draftRow.remove(), 500);
        
      } catch (error) {
        console.error('Error al enviar correo:', error);
        window.showNotification('Error', 'No se pudo enviar el correo', 'error');
      }
    });
  }

  // ==============================
  // ELIMINAR BORRADOR
  // ==============================
  const btnDelete = draftRow.querySelector('.btn-delete-draft');
  if (btnDelete) {
    btnDelete.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      
      window.showDeleteConfirmModal({
        title: '¿Eliminar borrador?',
        message: 'Esta acción no se puede deshacer.'
      }, async () => {
        try {
          await fetch(`${window.BACKEND_URL}/${draftId}`, {
            method: 'DELETE'
          });
          
          // Limpiar adjuntos
          delete draftAttachments[draftId];
          
          draftRow.remove();
          window.showNotification('Borrador eliminado', 'Borrador eliminado correctamente', 'info');
          
        } catch (error) {
          console.error('Error al eliminar borrador:', error);
          window.showNotification('Error', 'No se pudo eliminar el borrador', 'error');
        }
      });
    });
  }

  // ==============================
  // AGREGAR ARCHIVO A BORRADOR
  // ==============================
  const btnAddAttachment = draftRow.querySelector('.btn-add-attachment');
  if (btnAddAttachment) {
    btnAddAttachment.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = false;
      
      const userData = window.getUserData();
      if (!userData) {
        window.showNotification('Error', 'No se pudo obtener información del usuario', 'error');
        return;
      }
      
      input.onchange = async (ev) => {
        const files = Array.from(ev.target.files);
        
        for (const file of files) {
          // Validar archivo
          const validation = window.validateFile(file);
          if (!validation.valid) {
            window.showNotification('Archivo no válido', validation.error, 'error');
            continue;
          }
          
          // Obtener icono
          const fileIcon = window.getFileIcon(file.type);
          
          // Crear elemento visual
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
          attachmentList.appendChild(item);
          
          try {
            // Subir a Cloudinary
            const uploadedFile = await window.uploadToCloudinary(file, userData.email);
            
            // Como solo soportamos un adjunto, reemplazamos si ya existe
            draftAttachments[draftId] = [{
              url: uploadedFile.url,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type
            }];
            
            // Actualizar estado visual
            const statusSpan = item.querySelector('.attachment-status');
            statusSpan.textContent = '✓ Subido';
            statusSpan.style.color = '#0f9d58';
            
            // Habilitar botón de eliminar
            const removeBtn = item.querySelector('.btn-remove-attachment');
            removeBtn.disabled = false;
            removeBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              draftAttachments[draftId] = [];
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
  // ELIMINAR ARCHIVOS EXISTENTES
  // ==============================
  draftRow.querySelectorAll('.btn-remove-attachment').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const item = btn.closest('.attachment-item');
      
      // Limpiar del array
      draftAttachments[draftId] = [];
      
      if (item) item.remove();
    });
  });
  
  console.log('✅ Borrador configurado:', draftId);
}

// ==============================
// CARGAR BORRADORES DESDE EL BACKEND
// ==============================
async function loadUserDrafts(userEmail) {
  try {
    console.log('📝 Cargando borradores para:', userEmail);
    const response = await fetch(`${window.BACKEND_URL}/borradores?email=${encodeURIComponent(userEmail)}`);
    
    if (!response.ok) {
      throw new Error('Error al cargar borradores');
    }
    
    const borradores = await response.json();
    console.log('📝 Borradores recibidos del backend:', borradores);
    
    // Ordenar por fecha (más recientes primero)
    borradores.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    // Limpiar lista actual
    const draftList = document.querySelector('.draftList .emailList__list');
    
    if (!draftList) {
      console.error('❌ No se encontró el contenedor de borradores (.draftList .emailList__list)');
      return;
    }
    
    draftList.innerHTML = '';
    
    if (borradores.length === 0) {
      draftList.innerHTML = '<p style="padding: 20px; text-align: center; color: #5f6368;">No hay borradores guardados</p>';
      console.log('ℹ️ No hay borradores para mostrar');
    } else {
      // Renderizar cada borrador
      borradores.forEach((borrador, index) => {
        console.log(`📝 Renderizando borrador ${index + 1}/${borradores.length}:`, borrador.id);
        renderDraft(borrador);
      });
      
      // Hacer expandibles después de renderizar todos
      setTimeout(() => {
        makeExpandable('.draftRow', '.draftRow__body');
        console.log('✅ Borradores hechos expandibles');
      }, 100);
      
      console.log(`✅ ${borradores.length} borradores renderizados`);
    }
    
  } catch (error) {
    console.error('❌ Error al cargar borradores:', error);
    const draftList = document.querySelector('.draftList .emailList__list');
    if (draftList) {
      draftList.innerHTML = '<p style="padding: 20px; text-align: center; color: #d93025;">Error al cargar borradores</p>';
    }
  }
}

// ==============================
// RENDERIZAR BORRADOR
// ==============================
function renderDraft(borrador) {
  const draftList = document.querySelector('.draftList .emailList__list');
  
  if (!draftList) {
    console.error('❌ No se encontró el contenedor de borradores');
    return;
  }
  
  const draftRow = document.createElement('div');
  draftRow.className = 'draftRow';
  draftRow.setAttribute('data-draft-id', borrador.id);
  
  // Obtener valores con fallback
  const destinatario = borrador.destinatario || '';
  const asunto = borrador.asunto || '';
  const mensaje = borrador.mensaje || '';
  
  console.log(`📝 Renderizando borrador ${borrador.id}:`);
  console.log('   Destinatario:', destinatario);
  console.log('   Asunto:', asunto);
  console.log('   Mensaje:', mensaje.substring(0, 50) + '...');
  
  // Construir HTML de adjunto existente
  let adjuntosHTML = '';
  if (borrador.adjuntoUrl) {
    const fileName = borrador.adjuntoNombre || borrador.adjuntoUrl.split('/').pop();
    const fileSize = borrador.adjuntoTamano ? window.formatFileSize(borrador.adjuntoTamano) : '';
    const fileIcon = borrador.adjuntoTipo ? window.getFileIcon(borrador.adjuntoTipo) : 'attach_file';
    
    // Guardar adjunto en el objeto global
    draftAttachments[borrador.id] = [{
      url: borrador.adjuntoUrl,
      fileName: fileName,
      fileSize: borrador.adjuntoTamano || 0,
      fileType: borrador.adjuntoTipo || 'unknown'
    }];
    
    adjuntosHTML = `
      <div class="attachment-item">
        <div class="attachment-info">
          <span class="material-icons" style="font-size: 18px;">${fileIcon}</span>
          <span class="attachment-name">${fileName}</span>
          ${fileSize ? `<span style="margin-left: 8px; color: #5f6368; font-size: 12px;">(${fileSize})</span>` : ''}
        </div>
        <button type="button" class="btn-remove-attachment">Eliminar</button>
      </div>
    `;
  } else {
    // Inicializar array vacío si no hay adjunto
    draftAttachments[borrador.id] = [];
  }
  
  // Escapar HTML para prevenir problemas con comillas
  const escapedDestinatario = destinatario.replace(/"/g, '&quot;');
  const escapedAsunto = asunto.replace(/"/g, '&quot;');
  const escapedMensaje = mensaje.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  draftRow.innerHTML = `
    <div class="draftRow__summary">
      <div class="draftRow__info">
        <p class="draftRow__to"><strong>Para:</strong> <span class="draft-to-preview">${destinatario || 'Sin destinatario'}</span></p>
        <p class="draftRow__subject"><strong>Asunto:</strong> <span class="draft-subject-preview">${asunto || 'Sin asunto'}</span></p>
      </div>
      <span class="material-icons toggle-content">expand_more</span>
    </div>
    <div class="draftRow__body hide">
      <form class="draft-edit-form">
        <div class="draft-field">
          <label>Para:</label>
          <input type="email" class="draft-to-input" value="${escapedDestinatario}" placeholder="destinatario@ejemplo.com" />
        </div>
        <div class="draft-field">
          <label>Asunto:</label>
          <input type="text" class="draft-subject-input" value="${escapedAsunto}" placeholder="Asunto del correo" />
        </div>
        <div class="draft-field">
          <label>Mensaje:</label>
          <textarea class="draft-message-input" placeholder="Escribe tu mensaje...">${mensaje}</textarea>
        </div>

        <div class="draft-attachments">
          <div class="draft-attachments-title">Archivo adjunto:</div>
          <div class="attachment-list">
            ${adjuntosHTML}
          </div>
          <button type="button" class="btn-add-attachment">
            <span class="material-icons" style="font-size: 16px;">add</span>
            Agregar archivo
          </button>
        </div>

        <div class="draft-actions">
          <button type="button" class="btn-cancel-draft">Cancelar</button>
          <button type="button" class="btn-delete-draft">Eliminar borrador</button>
          <button type="button" class="btn-save-draft">Guardar cambios</button>
          <button type="button" class="btn-send-draft">Enviar ahora</button>
        </div>
      </form>
    </div>
  `;
  
  draftList.appendChild(draftRow);
  
  // Configurar el borrador INMEDIATAMENTE después de agregarlo al DOM
  setupDraftRow(draftRow);
  
  console.log('✅ Borrador agregado al DOM:', borrador.id);
}

// ==============================
// INICIALIZAR TODOS LOS BORRADORES
// ==============================
function initDraftHandlers() {
  console.log('🔧 Inicializando manejadores de borradores...');
  
  // Configurar cada borrador existente en el HTML estático
  document.querySelectorAll('.draftRow').forEach(draftRow => {
    setupDraftRow(draftRow);
  });
  
  console.log('✅ Manejadores de borradores inicializados');
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initDraftHandlers);

// Exportar funciones
window.setupDraftRow = setupDraftRow;
window.loadUserDrafts = loadUserDrafts;
window.renderDraft = renderDraft;