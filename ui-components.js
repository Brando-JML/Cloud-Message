/* ==========================================
   COMPONENTES DE UI: NOTIFICACIONES Y MODALES
   ========================================== */

// ==============================
// NOTIFICACIONES
// ==============================
function showNotification(title, message, type = 'info') {
  const container = document.getElementById('notificationContainer');
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  let icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
  
  notification.innerHTML = `
    <span class="material-icons notification-icon">${icon}</span>
    <div class="notification-content">
      <div class="notification-title">${title}</div>
      <div class="notification-message">${message}</div>
    </div>`;
  
  container.appendChild(notification);
  setTimeout(() => notification.classList.add('show'), 10);
  setTimeout(() => { 
    notification.classList.remove('show'); 
    setTimeout(() => notification.remove(), 400); 
  }, 3500);
}

// ==============================
// MODAL DE CONFIRMACIÓN GENERAL
// ==============================
function showConfirmModalCustom({ title, message, confirmText = 'Aceptar', cancelText = 'Cancelar' }, onConfirm) {
  const modalOverlay = document.getElementById('modalOverlay');
  const modalTitle = modalOverlay.querySelector('.modal-title');
  const modalBody = modalOverlay.querySelector('.modal-body');
  const btnConfirm = modalOverlay.querySelector('#modalConfirm');
  const btnCancel = modalOverlay.querySelector('#modalCancel');

  modalTitle.textContent = title;
  modalBody.textContent = message;
  btnConfirm.textContent = confirmText;
  btnCancel.textContent = cancelText;

  modalOverlay.classList.add('show');

  const cleanUp = () => modalOverlay.classList.remove('show');

  btnCancel.onclick = () => cleanUp();
  btnConfirm.onclick = () => { cleanUp(); onConfirm(); };
  modalOverlay.onclick = (e) => { if (e.target === modalOverlay) cleanUp(); };
}

// ==============================
// MODAL DE CONFIRMACIÓN PARA ELIMINAR
// ==============================
function showDeleteConfirmModal({ title, message }, onConfirm) {
  const modalOverlay = document.getElementById('modalDeleteOverlay');
  const modalTitle = modalOverlay.querySelector('#modalDeleteTitle');
  const modalBody = modalOverlay.querySelector('#modalDeleteBody');
  const btnConfirm = modalOverlay.querySelector('#modalDeleteConfirm');
  const btnCancel = modalOverlay.querySelector('#modalDeleteCancel');

  modalTitle.textContent = title;
  modalBody.textContent = message;

  modalOverlay.classList.add('show');

  const cleanUp = () => {
    modalOverlay.classList.remove('show');
    btnConfirm.replaceWith(btnConfirm.cloneNode(true));
    btnCancel.replaceWith(btnCancel.cloneNode(true));
    modalOverlay.replaceWith(modalOverlay.cloneNode(true));
  };
  
  document.getElementById('modalDeleteCancel').onclick = () => cleanUp();
  document.getElementById('modalDeleteConfirm').onclick = () => { 
    cleanUp(); 
    onConfirm(); 
  };
  document.getElementById('modalDeleteOverlay').onclick = (e) => { 
    if (e.target === document.getElementById('modalDeleteOverlay')) cleanUp(); 
  };
}

// ==============================
// MENÚ DE USUARIO
// ==============================
function initUserMenu() {
  const accountBtn = document.getElementById('accountBtn');
  const userMenu = document.getElementById('userMenu');
  const logoutBtn = document.getElementById('logoutBtn');

  accountBtn.addEventListener('click', e => { 
    e.stopPropagation(); 
    userMenu.classList.toggle('show'); 
  });
  
  document.addEventListener('click', e => { 
    if (!userMenu.contains(e.target) && e.target !== accountBtn) {
      userMenu.classList.remove('show'); 
    }
  });
  
  logoutBtn.addEventListener('click', async () => {
    await window.auth.signOut();
    showNotification('Sesión cerrada', 'Has cerrado sesión exitosamente', 'success');
    setTimeout(() => window.location.href = 'login.html', 1000);
  });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initUserMenu);

// Exportar funciones para uso global
window.showNotification = showNotification;
window.showConfirmModalCustom = showConfirmModalCustom;
window.showDeleteConfirmModal = showDeleteConfirmModal;