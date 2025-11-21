/**
 * -----------------------------------------------------------------------
 * mailService.js
 * -----------------------------------------------------------------------
 * Este archivo se encarga de:
 * 1. Llamar a la API de Spring Boot para OBTENER correos.
 * 2. "Pintar" (renderizar) esos correos en el HTML.
 * -----------------------------------------------------------------------
 */

/**
 * Función principal para cargar TODOS los correos de un usuario
 */
async function cargarCorreosDelUsuario(email) {
    if (!email) return;
    console.log(`🚀 Cargando datos para ${email}`);
    
    try {
        // 1. Recibidos                             se cambiara al subir a la nube
        const resRecibidos = await fetch(`http://localhost:8080/api/correos/recibidos?email=${email}`);
        const correosRecibidos = await resRecibidos.json();
        renderCorreosRecibidos(correosRecibidos);

        // 2. Enviados
        const resEnviados = await fetch(`http://localhost:8080/api/correos/enviados?email=${email}`);
        const correosEnviados = await resEnviados.json();
        renderCorreosEnviados(correosEnviados);

        // 3. Borradores
        const resBorradores = await fetch(`http://localhost:8080/api/correos/borradores?email=${email}`);
        if (!resBorradores.ok) throw new Error("Error cargando borradores");
        const listaBorradores = await resBorradores.json();
        renderBorradores(listaBorradores);

    } catch (apiError) {
        console.error("❌ Error API:", apiError);
        if (typeof showNotification === 'function') {
            showNotification('Error', 'No se pudo cargar la información.', 'error');
        }
    }
}

/**
 * Dibuja la lista de correos recibidos en el HTML.
 */
function renderCorreosRecibidos(correos) {
    const listaHTML = document.querySelector('.emailList .emailList__list');
    if (!listaHTML) return;

    listaHTML.innerHTML = ''; 

    if (!correos || correos.length === 0) {
        listaHTML.innerHTML = '<p class="emailRow__empty">No tienes correos recibidos.</p>';
        return;
    }

    correos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    correos.forEach(correo => {
        const row = document.createElement('div');
        row.className = 'emailRow';
        
        row.innerHTML = `
            <div class="emailRow__summary">
                <p class="emailRow__from"><strong>De:</strong> ${correo.remitente}</p>
                <p class="emailRow__subject"><strong>Asunto:</strong> ${correo.asunto}</p>
                <div class="emailRow__actions" style="margin-left: auto; display: flex; align-items: center; gap: 10px;">
                    <span class="material-icons btn-delete-email" style="cursor: pointer; color: #d93025;" title="Eliminar">delete</span>
                    <span class="material-icons toggle-content">expand_more</span>
                </div>
            </div>
            <div class="emailRow__body hide">
                <p>${correo.mensaje}</p>
            </div>
        `;
        
        const btnDelete = row.querySelector('.btn-delete-email');
        btnDelete.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita que se expanda el correo al dar click en borrar
        
            showDeleteConfirmModal({
                title: 'Eliminar correo recibido',
                message: '¿Estás seguro de eliminar este correo? Esta acción no se puede deshacer.'
            }, async () => {
                // Esto solo se ejecuta si el usuario presiona "Eliminar"

                try {                   //se cambiara al subir a la nube
                    await fetch(`http://localhost:8080/api/correos/eliminar/${correo.id}`, {
                        method: 'DELETE'
                    });
                    row.remove(); 
                    if(typeof showNotification === 'function') showNotification('Eliminado', 'Correo eliminado.', 'success');
                } catch (error) {
                    console.error(error);
                    if(typeof showNotification === 'function') showNotification('Error', 'No se pudo eliminar.', 'error');
                }
            });
        });

        listaHTML.appendChild(row);
    });

    if (typeof makeExpandable === 'function') makeExpandable('.emailRow', '.emailRow__body');
}

/**
 * Dibuja la lista de correos enviados en el HTML.
 */
function renderCorreosEnviados(correos) {
    const listaHTML = document.querySelector('.sentList .emailList__list');
    if (!listaHTML) return;

    listaHTML.innerHTML = '';

    if (!correos || correos.length === 0) {
        listaHTML.innerHTML = '<p class="emailRow__empty">No tienes correos enviados.</p>';
        return;
    }

    correos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    correos.forEach(correo => {
        const row = document.createElement('div');
        row.className = 'sentRow';
        
        row.innerHTML = `
            <div class="sentRow__summary">
                <p class="sentRow__to"><strong>Para:</strong> ${correo.destinatario}</p>
                <p class="sentRow__subject"><strong>Asunto:</strong> ${correo.asunto}</p>
                <div class="sentRow__actions" style="margin-left: auto; display: flex; align-items: center; gap: 10px;">
                    <span class="material-icons btn-delete-sent" style="cursor: pointer; color: #d93025;" title="Eliminar">delete</span>
                    <span class="material-icons toggle-content">expand_more</span>
                </div>
            </div>
            <div class="sentRow__body hide">
                <p>${correo.mensaje}</p>
            </div>
        `;

        const btnDelete = row.querySelector('.btn-delete-sent');
        btnDelete.addEventListener('click', (e) => {
            e.stopPropagation();
            
            showDeleteConfirmModal({
                title: 'Eliminar correo enviado',
                message: '¿Estás seguro de eliminar este correo? Esta acción no se puede deshacer.'
            }, async () => {
               
                try {                   //se cambiara al subir a la nube
                    await fetch(`http://localhost:8080/api/correos/eliminar/${correo.id}`, {
                        method: 'DELETE'
                    });
                    row.remove();
                    if(typeof showNotification === 'function') showNotification('Eliminado', 'Correo eliminado.', 'success');
                } catch (error) {
                    console.error(error);
                    if(typeof showNotification === 'function') showNotification('Error', 'No se pudo eliminar.', 'error');
                }
            });
        });
       
        
        listaHTML.appendChild(row);
    }); 

    if (typeof makeExpandable === 'function') makeExpandable('.sentRow', '.sentRow__body');

} 

    
/**
 * Dibuja la lista de BORRADORES y activa sus botones.
 */
function renderBorradores(correos) {
    const listaHTML = document.querySelector('.draftList .emailList__list');
    if (!listaHTML) return;

    listaHTML.innerHTML = ''; 

    if (!correos || correos.length === 0) {
        listaHTML.innerHTML = '<p class="emailRow__empty">No tienes borradores guardados.</p>';
        return;
    }

    // Ordenar por fecha
    correos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    correos.forEach(correo => {
        
        const row = document.createElement('div');
        row.className = 'draftRow';
        row.dataset.draftId = correo.id; // Guardamos el ID oculto

        // 2. Llenar el HTML interno
        row.innerHTML = `
            <div class="draftRow__summary">
                <div class="draftRow__info">
                    <p class="draftRow__to"><strong>Para:</strong> <span class="draft-to-preview">${correo.destinatario || 'Sin destinatario'}</span></p>
                    <p class="draftRow__subject"><strong>Asunto:</strong> <span class="draft-subject-preview">${correo.asunto || 'Sin asunto'}</span></p>
                </div>
                <span class="material-icons toggle-content">expand_more</span>
            </div>
            <div class="draftRow__body hide">
                <form class="draft-edit-form">
                    <div class="draft-field">
                        <label>Para:</label>
                        <input type="email" class="draft-to-input" value="${correo.destinatario || ''}" />
                    </div>
                    <div class="draft-field">
                        <label>Asunto:</label>
                        <input type="text" class="draft-subject-input" value="${correo.asunto || ''}" />
                    </div>
                    <div class="draft-field">
                        <label>Mensaje:</label>
                        <textarea class="draft-message-input">${correo.mensaje || ''}</textarea>
                    </div>

                    <div class="draft-actions">
                        <button type="button" class="btn-save-draft">Guardar cambios</button>
                        <button type="button" class="btn-send-draft">Enviar ahora</button>
                        <button type="button" class="btn-delete-draft">Eliminar</button>
                    </div>
                </form>
            </div>
        `;

        // 3. ACTIVAR LA LÓGICA DE LOS BOTONES 
        activarBotonesBorrador(row, correo);

       
        listaHTML.appendChild(row);
    });

    
    if (typeof makeExpandable === 'function') {
        makeExpandable('.draftRow', '.draftRow__body');
    }
}

/**
 * Función auxiliar para dar vida a los botones de un borrador
 */
function activarBotonesBorrador(rowElement, datosOriginales) {
    const idBorrador = datosOriginales.id; // El ID de Firebase
    
    const btnSave = rowElement.querySelector('.btn-save-draft');
    const btnSend = rowElement.querySelector('.btn-send-draft');
    const btnDelete = rowElement.querySelector('.btn-delete-draft');

    const inputTo = rowElement.querySelector('.draft-to-input');
    const inputSubject = rowElement.querySelector('.draft-subject-input');
    const inputMessage = rowElement.querySelector('.draft-message-input');

    // --- A. BOTÓN GUARDAR CAMBIOS (Actualizar Borrador) ---
    btnSave.addEventListener('click', async (e) => {
        e.preventDefault();
        btnSave.textContent = 'Guardando...';

        const datosActualizados = {
            id: idBorrador,
            remitente: datosOriginales.remitente,
            destinatario: inputTo.value,
            asunto: inputSubject.value,
            mensaje: inputMessage.value,
            fecha: new Date().toISOString()
        };

        try {
            // Reusamos el endpoint de guardar borrador (sobrescribe si el ID existe)
            await fetch('http://localhost:8080/api/correos/borrador', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosActualizados)
            });
            
            // Actualizamos la vista previa
            rowElement.querySelector('.draft-to-preview').textContent = inputTo.value;
            rowElement.querySelector('.draft-subject-preview').textContent = inputSubject.value;
            showNotification('Guardado', 'Borrador actualizado correctamente.', 'success');

        } catch (error) {
            console.error(error);
            showNotification('Error', 'No se pudo actualizar.', 'error');
        } finally {
            btnSave.textContent = 'Guardar cambios';
        }
    });

    // --- B. BOTÓN ENVIAR AHORA (Mover a Enviados) ---
    btnSend.addEventListener('click', async (e) => {
        e.preventDefault();
        
        if (!inputTo.value || !inputSubject.value) {
            showNotification('Incompleto', 'Falta destinatario o asunto.', 'error');
            return;
        }

        btnSend.textContent = 'Enviando...';
        const correoFinal = {
            remitente: datosOriginales.remitente,
            destinatario: inputTo.value,
            asunto: inputSubject.value,
            mensaje: inputMessage.value,
            fecha: new Date().toISOString()
        };

        try {
            // 1. Enviar como correo real
            const res = await fetch('http://localhost:8080/api/correos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(correoFinal)
            });
            if (!res.ok) throw new Error('Fallo al enviar');

            // 2. Eliminar de borradores (porque ya se envió)
            await fetch(`http://localhost:8080/api/correos/${idBorrador}`, {
                method: 'DELETE'
            });

            showNotification('Enviado', 'El correo ha sido enviado.', 'success');
            
            // Eliminar de la lista visualmente
            rowElement.remove();

        } catch (error) {
            console.error(error);
            showNotification('Error', 'No se pudo enviar el correo.', 'error');
            btnSend.textContent = 'Enviar ahora';
        }
    });

    // --- C. BOTÓN ELIMINAR ---
    btnDelete.addEventListener('click', (e) => {
        e.preventDefault();
        
        
        const confirmAction = async () => {
            try {
                await fetch(`http://localhost:8080/api/correos/${idBorrador}`, {
                    method: 'DELETE'
                });
                showNotification('Eliminado', 'Borrador eliminado.', 'info');
                rowElement.remove();
            } catch (error) {
                showNotification('Error', 'No se pudo eliminar.', 'error');
            }
        };

        if (typeof showDeleteConfirmModal === 'function') {
            showDeleteConfirmModal({
                title: '¿Eliminar borrador?',
                message: 'Esta acción no se puede deshacer.',
                confirmText: 'Eliminar',
                cancelText: 'Cancelar'
            }, confirmAction);
        } else {
            
            if(confirm("¿Eliminar borrador?")) confirmAction();
        }
    });
}