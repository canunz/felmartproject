// Función para cargar notificaciones no leídas
async function cargarNotificaciones() {
    try {
        const response = await fetch('/notificaciones/no-leidas');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const notificaciones = await response.json();
        actualizarIconoNotificaciones(notificaciones.length);
        mostrarNotificaciones(notificaciones);
    } catch (error) {
        console.error('Error al cargar notificaciones:', error);
    }
}

// Función para actualizar el contador de notificaciones
function actualizarIconoNotificaciones(cantidad) {
    const contador = document.getElementById('notificaciones-contador');
    if (contador) {
        contador.textContent = cantidad;
        contador.style.display = cantidad > 0 ? 'block' : 'none';
    }
}

// Función para mostrar notificaciones en el dropdown
function mostrarNotificaciones(notificaciones) {
    const contenedor = document.getElementById('notificaciones-lista');
    if (!contenedor) return;

    if (notificaciones.length === 0) {
        contenedor.innerHTML = '<div class="dropdown-item text-muted">No hay notificaciones nuevas</div>';
        return;
    }

    contenedor.innerHTML = notificaciones.map(notif => `
        <a href="#" class="dropdown-item notification-item" data-id="${notif.id}">
            <div class="d-flex align-items-center">
                <div class="notification-icon ${notif.tipo}">
                    <i class="fas ${getIconoTipo(notif.tipo)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notif.titulo}</div>
                    <div class="notification-text">${notif.mensaje}</div>
                    <div class="notification-time">${formatearFecha(notif.fechaCreacion)}</div>
                </div>
            </div>
        </a>
    `).join('');

    // Agregar eventos a las notificaciones
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            const id = item.dataset.id;
            await marcarComoLeida(id);
            item.classList.add('leida');
        });
    });
}

// Función para marcar una notificación como leída
async function marcarComoLeida(id) {
    try {
        const response = await fetch(`/notificaciones/marcar-leida/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        await cargarNotificaciones(); // Recargar notificaciones
    } catch (error) {
        console.error('Error al marcar notificación como leída:', error);
    }
}

// Función para marcar todas las notificaciones como leídas
async function marcarTodasComoLeidas() {
    try {
        const response = await fetch('/notificaciones/marcar-todas-leidas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        await cargarNotificaciones(); // Recargar notificaciones
    } catch (error) {
        console.error('Error al marcar todas las notificaciones como leídas:', error);
    }
}

// Función auxiliar para obtener el icono según el tipo de notificación
function getIconoTipo(tipo) {
    const iconos = {
        'info': 'fa-info-circle',
        'warning': 'fa-exclamation-triangle',
        'success': 'fa-check-circle',
        'error': 'fa-times-circle'
    };
    return iconos[tipo] || 'fa-bell';
}

// Función auxiliar para formatear fechas
function formatearFecha(fecha) {
    return new Date(fecha).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Cargar notificaciones al iniciar y cada 5 minutos
document.addEventListener('DOMContentLoaded', () => {
    cargarNotificaciones();
    setInterval(cargarNotificaciones, 300000); // 5 minutos
});

// Exportar funciones para uso en otros scripts
window.notificaciones = {
    cargar: cargarNotificaciones,
    marcarLeida: marcarComoLeida,
    marcarTodasLeidas: marcarTodasComoLeidas
}; 