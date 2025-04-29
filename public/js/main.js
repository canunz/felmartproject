// public/js/main.js
document.addEventListener('DOMContentLoaded', function() {
    // Toggle sidebar en dispositivos móviles
    const toggleBtn = document.querySelector('.toggle-sidebar');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function() {
        document.querySelector('.sidebar').classList.toggle('active');
        document.querySelector('.content').classList.toggle('active');
      });
    }
    
    // Inicializar tooltips de Bootstrap
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    
    // Cargar notificaciones no leídas
    cargarNotificaciones();
    
    // Actualizar notificaciones cada 1 minuto
    setInterval(cargarNotificaciones, 60000);
  });
  
  // Función para cargar notificaciones no leídas
  function cargarNotificaciones() {
    fetch('/notificaciones/no-leidas')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          actualizarIconoNotificaciones(data.totalNoLeidas);
          actualizarListaNotificaciones(data.notificaciones);
        }
      })
      .catch(error => console.error('Error al cargar notificaciones:', error));
  }
  
  // Actualizar contador de notificaciones
  function actualizarIconoNotificaciones(total) {
    const contador = document.getElementById('notification-counter');
    if (contador) {
      contador.textContent = total;
      
      if (total > 0) {
        contador.classList.remove('d-none');
      } else {
        contador.classList.add('d-none');
      }
    }
  }
  
// public/js/main.js (continuación)
// Actualizar lista de notificaciones en el dropdown
function actualizarListaNotificaciones(notificaciones) {
    const contenedor = document.getElementById('notification-list');
    if (!contenedor) return;
    
    // Limpiar contenedor
    contenedor.innerHTML = '';
    
    // Si no hay notificaciones
    if (notificaciones.length === 0) {
      contenedor.innerHTML = '<div class="dropdown-item text-center py-3">No tienes notificaciones nuevas</div>';
      return;
    }
    
    // Agregar notificaciones a la lista
    notificaciones.forEach(notificacion => {
      const item = document.createElement('a');
      item.href = obtenerEnlaceNotificacion(notificacion);
      item.className = 'dropdown-item notification-item py-2';
      if (!notificacion.leida) {
        item.classList.add('unread');
      }
      
      // Obtener icono según tipo
      let icono = 'fa-bell';
      switch (notificacion.tipo) {
        case 'solicitud':
          icono = 'fa-file-alt';
          break;
        case 'cotizacion':
          icono = 'fa-file-invoice-dollar';
          break;
        case 'visita':
          icono = 'fa-calendar-check';
          break;
        case 'certificado':
          icono = 'fa-certificate';
          break;
        case 'sistema':
          icono = 'fa-cog';
          break;
      }
      
      // Fecha formateada
      const fecha = new Date(notificacion.createdAt);
      const fechaFormateada = fecha.toLocaleDateString('es-ES') + ' ' + 
                              fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      
      // Contenido de la notificación
      item.innerHTML = `
        <div class="d-flex">
          <div class="flex-shrink-0 me-3">
            <i class="fas ${icono} fa-lg text-primary"></i>
          </div>
          <div class="flex-grow-1">
            <h6 class="mb-1">${notificacion.titulo}</h6>
            <p class="mb-0 text-muted">${notificacion.mensaje}</p>
            <small class="text-muted">${fechaFormateada}</small>
          </div>
        </div>
      `;
      
      // Evento para marcar como leída al hacer clic
      item.addEventListener('click', function(e) {
        e.preventDefault();
        marcarNotificacionLeida(notificacion.id, obtenerEnlaceNotificacion(notificacion));
      });
      
      contenedor.appendChild(item);
    });
    
    // Agregar botón de ver todas
    const verTodas = document.createElement('div');
    verTodas.className = 'dropdown-item text-center py-2 border-top mt-2';
    verTodas.innerHTML = '<a href="/notificaciones" class="text-primary">Ver todas</a>';
    contenedor.appendChild(verTodas);
  }
  
  // Obtener enlace según tipo de notificación
  function obtenerEnlaceNotificacion(notificacion) {
    switch (notificacion.tipo) {
      case 'solicitud':
        return `/solicitudes/detalles/${notificacion.referenciaId}`;
      case 'cotizacion':
        return `/cotizaciones/detalles/${notificacion.referenciaId}`;
      case 'visita':
        return `/visitas/detalles/${notificacion.referenciaId}`;
      case 'certificado':
        return `/certificados/detalles/${notificacion.referenciaId}`;
      default:
        return '/notificaciones';
    }
  }
  
  // Marcar notificación como leída
  function marcarNotificacionLeida(id, redirectUrl) {
    fetch(`/notificaciones/marcar-leida/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        window.location.href = redirectUrl;
      }
    })
    .catch(error => console.error('Error al marcar notificación:', error));
  }
  
  // Marcar todas las notificaciones como leídas
  function marcarTodasLeidas() {
    fetch('/notificaciones/marcar-todas-leidas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        cargarNotificaciones();
      }
    })
    .catch(error => console.error('Error al marcar notificaciones:', error));
  }