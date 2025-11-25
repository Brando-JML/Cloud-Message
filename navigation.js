/* ==========================================
   NAVEGACIÓN ENTRE SECCIONES
   ========================================== */

// Variables de navegación
let isComposing = false;
let pendingSection = null;

const sections = {
  inbox: document.querySelector('.emailList'),
  sent: document.querySelector('.sentList'),
  drafts: document.querySelector('.draftList'),
  compose: document.querySelector('.composeSection')
};

const sidebarOptions = document.querySelectorAll('.sidebarOption');
const composeBtn = document.querySelector('.sidebar__compose');

// ==============================
// FUNCIONES DE NAVEGACIÓN
// ==============================
function navigateToSection(sectionKey) {
  Object.values(sections).forEach(sec => {
    sec.classList.add('hide');
    sec.classList.remove('active');
  });
  
  sidebarOptions.forEach(o => o.classList.remove('sidebarOption__active'));

  if (sectionKey === 'compose') {
    sections.compose.classList.remove('hide');
    sections.compose.classList.add('active');
    isComposing = true;
  } else {
    sections[sectionKey].classList.remove('hide');
    sections[sectionKey].classList.add('active');
    
    if (sectionKey === 'inbox') sidebarOptions[0].classList.add('sidebarOption__active');
    if (sectionKey === 'sent') {
      sidebarOptions[1].classList.add('sidebarOption__active');
      // Recargar correos enviados al entrar a esta sección
      const userData = window.getUserData();
      if (userData && window.loadSentEmails) {
        window.loadSentEmails(userData.email);
      }
    }
    if (sectionKey === 'drafts') {
      sidebarOptions[2].classList.add('sidebarOption__active');
      // Recargar borradores al entrar a esta sección
      const userData = window.getUserData();
      if (userData && window.loadUserDrafts) {
        window.loadUserDrafts(userData.email);
      }
    }
    
    isComposing = false;
  }
}

function attemptNavigate(sectionKey) {
  if (isComposing) {
    pendingSection = sectionKey;
    window.showConfirmModalCustom({
      title: '¿Deseas salir de la redacción?',
      message: 'Si sales, se perderá el mensaje que estás escribiendo.',
      confirmText: 'Salir',
      cancelText: 'Seguir escribiendo'
    }, () => {
      resetComposeForm();
      isComposing = false;
      navigateToSection(pendingSection);
      pendingSection = null;
    });
  } else {
    navigateToSection(sectionKey);
  }
}

function resetComposeForm() {
  const composeForm = document.querySelector('.compose-form');
  const composeAttachmentList = document.querySelector('.composeSection .attachment-list');
  
  if (composeForm) composeForm.reset();
  if (composeAttachmentList) composeAttachmentList.innerHTML = '';
}

// ==============================
// INICIALIZAR NAVEGACIÓN
// ==============================
function initNavigation() {
  sidebarOptions[0].addEventListener('click', () => attemptNavigate('inbox'));
  sidebarOptions[1].addEventListener('click', () => attemptNavigate('sent'));
  sidebarOptions[2].addEventListener('click', () => attemptNavigate('drafts'));
  composeBtn.addEventListener('click', () => attemptNavigate('compose'));

  // Botón cancelar en compose
  const cancelCompose = document.querySelector('.btn-cancel-compose');
  cancelCompose?.addEventListener('click', e => {
    e.preventDefault();
    window.showConfirmModalCustom({
      title: '¿Deseas salir de la redacción?',
      message: 'Si sales, se perderá el mensaje que estás escribiendo.',
      confirmText: 'Salir',
      cancelText: 'Seguir escribiendo'
    }, () => {
      resetComposeForm();
      isComposing = false;
      navigateToSection('inbox');
    });
  });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initNavigation);

// Exportar funciones
window.navigateToSection = navigateToSection;
window.resetComposeForm = resetComposeForm;
window.setIsComposing = (value) => { isComposing = value; };
window.getIsComposing = () => isComposing;