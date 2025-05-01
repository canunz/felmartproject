// public/js/main.js
/**
 * Script principal para la plataforma Felmart
 */
document.addEventListener('DOMContentLoaded', function() {
  // Menú móvil
  initMobileMenu();
  
  // Notificaciones
  initNotifications();
  
  // Mensajes flash
  initFlashMessages();
  
  // Inicializar modales
  initModals();
  
  // Inicializar tooltips
  initTooltips();
});

/**
* Inicializa el menú móvil
*/
function initMobileMenu() {
  const menuButton = document.getElementById('menuButton');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (menuButton && mobileMenu) {
      menuButton.addEventListener('click', function() {
          mobileMenu.classList.toggle('hidden');
      });
  }
}

/**
* Inicializa el sistema de notificaciones
*/
function initNotifications() {
  const notificationsButton = document.getElementById('notificationsButton');
  
  if (notificationsButton) {
      // Cargar notificaciones del usuario
      loadNotifications();
      
      // Evento para mostrar/ocultar panel de notificaciones
      notificationsButton.addEventListener('click', function(e) {
          e.preventDefault();
          toggleNotificationsPanel();
      });
  }
}

/**
* Carga las notificaciones del usuario mediante AJAX
*/
function loadNotifications() {
  fetch('/api/notificaciones')
      .then(response => response.json())
      .then(data => {
          // Actualizar contador si hay notificaciones no leídas
          const notificationsButton = document.getElementById('notificationsButton');
          const notificationBadge = notificationsButton.querySelector('span');
          
          if (data.noLeidas > 0) {
              notificationBadge.classList.remove('hidden');
          } else {
              notificationBadge.classList.add('hidden');
          }
          
          // Si el panel de notificaciones está visible, actualizarlo
          const notificationsPanel = document.getElementById('notificationsPanel');
          if (notificationsPanel && !notificationsPanel.classList.contains('hidden')) {
              renderNotifications(data.notificaciones);
          }
      })
      .catch(error => console.error('Error al cargar notificaciones:', error));
}

/**
* Muestra u oculta el panel de notificaciones
*/
function toggleNotificationsPanel() {
  let notificationsPanel = document.getElementById('notificationsPanel');
  
  if (!notificationsPanel) {
      // Crear panel si no existe
      notificationsPanel = createNotificationsPanel();
      document.body.appendChild(notificationsPanel);
      
      // Cargar notificaciones en el panel
      fetch('/api/notificaciones')
          .then(response => response.json())
          .then(data => {
              renderNotifications(data.notificaciones);
          })
          .catch(error => console.error('Error al cargar notificaciones:', error));
  } else {
      notificationsPanel.classList.toggle('hidden');
      
      // Marcar como leídas si el panel está visible
      if (!notificationsPanel.classList.contains('hidden')) {
          fetch('/api/notificaciones/marcar-leidas', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
              }
          })
          .then(() => {
              // Actualizar badge
              const notificationBadge = document.querySelector('#notificationsButton span');
              notificationBadge.classList.add('hidden');
          })
          .catch(error => console.error('Error al marcar notificaciones:', error));
      }
  }
}

/**
* Crea el panel de notificaciones
*/
function createNotificationsPanel() {
  const panel = document.createElement('div');
  panel.id = 'notificationsPanel';
  panel.className = 'absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-20 border border-gray-200';
  panel.style.top = '60px';
  panel.style.right = '1rem';
  
  panel.innerHTML = `
      <div class="px-4 py-2 bg-gray-50 border-b">
          <h3 class="text-sm font-medium">Notificaciones</h3>
      </div>
      <div id="notificationsContent" class="max-h-96 overflow-y-auto">
          <div class="flex justify-center items-center py-4">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          </div>
      </div>
      <div class="p-2 bg-gray-50 border-t text-center">
          <a href="/notificaciones" class="text-sm text-teal-600 hover:text-teal-800">Ver todas</a>
      </div>
  `;
  
  // Cerrar panel al hacer clic fuera de él
  document.addEventListener('click', function(e) {
      if (panel && !panel.contains(e.target) && e.target.id !== 'notificationsButton' && !e.target.closest('#notificationsButton')) {
          panel.classList.add('hidden');
      }
  });
  
  return panel;
}

/**
* Renderiza las notificaciones en el panel
*/
function renderNotifications(notificaciones) {
  const content = document.getElementById('notificationsContent');
  
  if (!content) return;
  
  if (notificaciones.length === 0) {
      content.innerHTML = '<div class="p-4 text-center text-gray-500">No tienes notificaciones</div>';
      return;
  }
  
  let html = '';
  
  notificaciones.forEach(notificacion => {
      const leida = notificacion.leida ? '' : 'bg-blue-50';
      
      html += `
          <a href="${notificacion.enlace}" class="block px-4 py-3 hover:bg-gray-50 ${leida} border-b">
              <div class="flex items-start">
                  <div class="flex-shrink-0">
                      <div class="h-8 w-8 rounded-full bg-${notificacion.color || 'teal'}-100 flex items-center justify-center">
                          <i class="lucide-${notificacion.icono || 'bell'} text-${notificacion.color || 'teal'}-600"></i>
                      </div>
                  </div>
                  <div class="ml-3 w-0 flex-1">
                      <p class="text-sm font-medium text-gray-900">${notificacion.titulo}</p>
                      <p class="text-sm text-gray-500">${notificacion.mensaje}</p>
                      <p class="text-xs text-gray-400 mt-1">${notificacion.tiempo}</p>
                  </div>
              </div>
          </a>
      `;
  });
  
  content.innerHTML = html;
}

/**
* Inicializa los mensajes flash
*/
function initFlashMessages() {
  const flashMessages = document.querySelectorAll('.flash-message');
  
  flashMessages.forEach(flash => {
      // Auto cerrar después de 5 segundos
      setTimeout(() => {
          fadeOut(flash);
      }, 5000);
      
      // Botón de cerrar
      const closeBtn = flash.querySelector('.close-flash');
      if (closeBtn) {
          closeBtn.addEventListener('click', () => {
              fadeOut(flash);
          });
      }
  });
}

/**
* Desvanece un elemento
*/
function fadeOut(element) {
  element.style.opacity = '1';
  
  (function fade() {
      if ((element.style.opacity -= 0.1) < 0) {
          element.style.display = 'none';
      } else {
          requestAnimationFrame(fade);
      }
  })();
}

/**
* Inicializa los modales
*/
function initModals() {
  // Abrir modal
  document.querySelectorAll('[data-modal-target]').forEach(button => {
      button.addEventListener('click', () => {
          const modal = document.getElementById(button.dataset.modalTarget);
          if (modal) {
              modal.classList.remove('hidden');
          }
      });
  });
  
  // Cerrar modal
  document.querySelectorAll('[data-modal-close]').forEach(button => {
      button.addEventListener('click', () => {
          const modal = button.closest('.modal');
          if (modal) {
              modal.classList.add('hidden');
          }
      });
  });
  
  // Cerrar modal al hacer clic fuera
  document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
          if (e.target === modal) {
              modal.classList.add('hidden');
          }
      });
  });
}

/**
* Inicializa los tooltips
*/
function initTooltips() {
  document.querySelectorAll('[data-tooltip]').forEach(el => {
      el.addEventListener('mouseenter', () => {
          const tooltipText = el.getAttribute('data-tooltip');
          
          const tooltip = document.createElement('div');
          tooltip.className = 'tooltip absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg';
          tooltip.textContent = tooltipText;
          
          document.body.appendChild(tooltip);
          
          const rect = el.getBoundingClientRect();
          tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5 + window.scrollY}px`;
          tooltip.style.left = `${rect.left + (el.offsetWidth / 2) - (tooltip.offsetWidth / 2) + window.scrollX}px`;
      });
      
      el.addEventListener('mouseleave', () => {
          document.querySelectorAll('.tooltip').forEach(t => t.remove());
      });
  });
}

/**
* Formatea una fecha a formato legible
*/
function formatDate(dateString) {
  const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('es-ES', options);
}

/**
* Formatea un número como moneda (CLP)
*/
function formatCurrency(value) {
  return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
  }).format(value);
}

/**
* Realiza una solicitud AJAX con CSRF protection
*/
function ajax(url, method = 'GET', data = null) {
  const options = {
      method,
      headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
      }
  };
  
  if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
  }
  
  return fetch(url, options).then(response => {
      if (!response.ok) {
          throw new Error('Error en la solicitud');
      }
      return response.json();
  });
}