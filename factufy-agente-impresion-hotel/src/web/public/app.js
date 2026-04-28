// Estado de la aplicación
const state = {
  status: null,
  estadisticas: {},
  historial: [],
  logs: [],
  config: {},
  impresoras: [],
  autoRefreshLogs: true
};

// Intervalos de actualización
let statsInterval = null;
let historialInterval = null;
let logsInterval = null;

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initForm();
  initNewButtons();
  loadInitialData();
  startAutoRefresh();
});

// ========== TABS ==========
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  // Actualizar botones
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // Actualizar contenido
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`tab${capitalize(tabName)}`).classList.add('active');

  // Cargar datos específicos del tab
  if (tabName === 'logs') {
    loadLogs();
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ========== FORM ==========
function initForm() {
  const form = document.getElementById('configForm');
  const btnReload = document.getElementById('btnReloadConfig');
  const btnRefreshLogs = document.getElementById('btnRefreshLogs');
  const chkAutoRefresh = document.getElementById('chkAutoRefresh');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveConfig();
  });

  btnReload.addEventListener('click', () => {
    loadConfig();
  });

  btnRefreshLogs.addEventListener('click', () => {
    loadLogs();
  });

  chkAutoRefresh.addEventListener('change', (e) => {
    state.autoRefreshLogs = e.target.checked;
    if (state.autoRefreshLogs) {
      startLogsAutoRefresh();
    } else {
      stopLogsAutoRefresh();
    }
  });
}

// ========== NUEVOS BOTONES ==========
function initNewButtons() {
  // Botón probar conexión
  const btnProbarConexion = document.getElementById('btnProbarConexion');
  if (btnProbarConexion) {
    btnProbarConexion.addEventListener('click', probarConexion);
  }

  // Botón refrescar impresoras
  const btnRefreshImpresoras = document.getElementById('btnRefreshImpresoras');
  if (btnRefreshImpresoras) {
    btnRefreshImpresoras.addEventListener('click', loadImpresoras);
  }

  // Botón probar impresión
  const btnProbarImpresion = document.getElementById('btnProbarImpresion');
  if (btnProbarImpresion) {
    btnProbarImpresion.addEventListener('click', probarImpresion);
  }
}

// ========== CARGAR DATOS INICIALES ==========
async function loadInitialData() {
  await loadStatus();
  await loadEstadisticas();
  await loadHistorial();
  await loadConfig();
  await loadImpresoras();
}

function startAutoRefresh() {
  // Estadísticas cada 5 segundos
  statsInterval = setInterval(() => {
    loadStatus();
    loadEstadisticas();
  }, 5000);

  // Historial cada 10 segundos
  historialInterval = setInterval(() => {
    loadHistorial();
  }, 10000);
}

function startLogsAutoRefresh() {
  if (!logsInterval) {
    logsInterval = setInterval(() => {
      if (state.autoRefreshLogs) {
        loadLogs();
      }
    }, 5000);
  }
}

function stopLogsAutoRefresh() {
  if (logsInterval) {
    clearInterval(logsInterval);
    logsInterval = null;
  }
}

// ========== API CALLS ==========
async function loadStatus() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();

    if (data.success) {
      state.status = data.status;
      updateStatusUI();
    }
  } catch (error) {
    console.error('Error cargando estado:', error);
    showAlert('Error cargando estado del agente', 'error');
  }
}

async function loadEstadisticas() {
  try {
    const response = await fetch('/api/estadisticas');
    const data = await response.json();

    if (data.success) {
      state.estadisticas = data.estadisticas;
      updateEstadisticasUI();
    } else if (data.error) {
      // Servidor no configurado, mostrar vacío
      state.estadisticas = {};
      updateEstadisticasUI();
    }
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
  }
}

async function loadHistorial() {
  try {
    const response = await fetch('/api/historial');
    const data = await response.json();

    if (data.success) {
      state.historial = data.historial;
      updateHistorialUI();
    } else if (data.error) {
      state.historial = [];
      updateHistorialUI();
    }
  } catch (error) {
    console.error('Error cargando historial:', error);
  }
}

async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    const data = await response.json();

    if (data.success) {
      state.config = data.config;
      updateConfigUI();
    }
  } catch (error) {
    console.error('Error cargando configuración:', error);
    showAlert('Error cargando configuración', 'error');
  }
}

async function saveConfig() {
  try {
    const formData = new FormData(document.getElementById('configForm'));
    const config = {
      serverUrl: formData.get('serverUrl'),
      pollingInterval: parseInt(formData.get('pollingInterval')),
      panelPort: parseInt(formData.get('panelPort'))
    };

    const response = await fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });

    const data = await response.json();

    if (data.success) {
      showAlert(data.message, 'success');
      await loadConfig();
      await loadStatus();
    } else {
      showAlert(data.error || 'Error guardando configuración', 'error');
    }
  } catch (error) {
    console.error('Error guardando configuración:', error);
    showAlert('Error guardando configuración', 'error');
  }
}

async function loadLogs() {
  try {
    const response = await fetch('/api/logs');
    const data = await response.json();

    if (data.success) {
      state.logs = data.logs;
      updateLogsUI();
    }
  } catch (error) {
    console.error('Error cargando logs:', error);
  }
}

// ========== IMPRESORAS ==========
async function loadImpresoras() {
  try {
    const select = document.getElementById('selectImpresora');
    if (!select) return;

    select.innerHTML = '<option value="">Cargando impresoras...</option>';

    const response = await fetch('/api/impresoras');
    const data = await response.json();

    if (data.success && data.impresoras) {
      state.impresoras = data.impresoras;
      updateImpresorasUI();
    } else {
      select.innerHTML = '<option value="">Error cargando impresoras</option>';
    }
  } catch (error) {
    console.error('Error cargando impresoras:', error);
    const select = document.getElementById('selectImpresora');
    if (select) {
      select.innerHTML = '<option value="">Error: ' + error.message + '</option>';
    }
  }
}

function updateImpresorasUI() {
  const select = document.getElementById('selectImpresora');
  if (!select) return;

  if (state.impresoras.length === 0) {
    select.innerHTML = '<option value="">No se encontraron impresoras</option>';
    return;
  }

  select.innerHTML = state.impresoras.map(imp => {
    const defaultTag = imp.default ? ' (Predeterminada)' : '';
    const statusTag = imp.status !== 'Normal' ? ` [${imp.status}]` : '';
    return `<option value="${escapeHtml(imp.name)}" ${imp.default ? 'selected' : ''}>${escapeHtml(imp.name)}${defaultTag}${statusTag}</option>`;
  }).join('');
}

// ========== PROBAR CONEXIÓN ==========
async function probarConexion() {
  const btn = document.getElementById('btnProbarConexion');
  const statusDiv = document.getElementById('conexionStatus');
  const serverUrl = document.getElementById('serverUrl').value.trim();

  if (!serverUrl) {
    showConnectionStatus(statusDiv, 'error', 'Ingrese una URL primero');
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Probando...';
  statusDiv.classList.remove('hidden');
  statusDiv.innerHTML = '<span class="loading">Probando conexión...</span>';

  try {
    const response = await fetch('/api/probar-conexion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverUrl })
    });

    const data = await response.json();

    if (data.success) {
      showConnectionStatus(statusDiv, 'success', `✅ Conexión exitosa (${data.responseTime}ms)`);
    } else {
      showConnectionStatus(statusDiv, 'error', `❌ ${data.error}`);
    }
  } catch (error) {
    showConnectionStatus(statusDiv, 'error', `❌ Error: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '🔌 Probar';
  }
}

function showConnectionStatus(div, type, message) {
  div.classList.remove('hidden', 'success', 'error');
  div.classList.add(type);
  div.textContent = message;
}

// ========== PROBAR IMPRESIÓN ==========
async function probarImpresion() {
  const btn = document.getElementById('btnProbarImpresion');
  const statusDiv = document.getElementById('impresionStatus');
  const select = document.getElementById('selectImpresora');
  const impresora = select ? select.value : null;

  btn.disabled = true;
  btn.textContent = '⏳ Imprimiendo...';
  statusDiv.classList.remove('hidden');
  statusDiv.innerHTML = '<span class="loading">Enviando ticket de prueba...</span>';

  try {
    const response = await fetch('/api/probar-impresion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ impresora })
    });

    const data = await response.json();

    if (data.success) {
      showPrintStatus(statusDiv, 'success', `✅ ${data.message || 'Ticket enviado correctamente'}`);
    } else {
      showPrintStatus(statusDiv, 'error', `❌ ${data.error || 'Error al imprimir'}`);
    }
  } catch (error) {
    showPrintStatus(statusDiv, 'error', `❌ Error: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '🖨️ Imprimir Ticket de Prueba';
  }
}

function showPrintStatus(div, type, message) {
  div.classList.remove('hidden', 'success', 'error');
  div.classList.add(type);
  div.textContent = message;
}

// ========== ACTUALIZAR UI ==========
function updateStatusUI() {
  const statusBadge = document.getElementById('statusBadge');
  const agenteId = document.getElementById('agenteId');

  if (state.status) {
    if (state.status.connected) {
      statusBadge.textContent = 'Conectado';
      statusBadge.className = 'status-badge connected';
    } else {
      statusBadge.textContent = 'No Configurado';
      statusBadge.className = 'status-badge disconnected';
    }

    agenteId.textContent = state.status.agenteId;
  }
}

function updateEstadisticasUI() {
  const stats = state.estadisticas;

  document.getElementById('statPendientes').textContent = stats.pendientes || 0;
  document.getElementById('statProcesando').textContent = stats.procesando || 0;
  document.getElementById('statImpresos').textContent = stats.impresos || 0;
  document.getElementById('statErrores').textContent = stats.errores || 0;

  const now = new Date();
  document.getElementById('lastUpdate').textContent = now.toLocaleTimeString('es-CO');
}

function updateHistorialUI() {
  const tbody = document.getElementById('historialBody');

  if (state.historial.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay trabajos en el historial</td></tr>';
    return;
  }

  tbody.innerHTML = state.historial.map(trabajo => {
    const fecha = new Date(trabajo.created_at);
    const estadoBadge = getEstadoBadge(trabajo.estado);
    const impresora = trabajo.impresora_destino || 'Predeterminada';

    return `
      <tr>
        <td>${trabajo.id}</td>
        <td>${trabajo.tipo}</td>
        <td>#${trabajo.documento_id}</td>
        <td>${estadoBadge}</td>
        <td>${impresora}</td>
        <td>${fecha.toLocaleString('es-CO')}</td>
      </tr>
    `;
  }).join('');
}

function updateConfigUI() {
  const config = state.config;

  document.getElementById('serverUrl').value = config.serverUrl || '';
  document.getElementById('pollingInterval').value = config.pollingInterval || 3000;
  document.getElementById('panelPort').value = config.panelPort || 3050;
  document.getElementById('configAgenteId').value = config.agenteId || '';
  document.getElementById('configFile').value = config.configFile || '';
}

function updateLogsUI() {
  const logsContent = document.getElementById('logsContent');

  if (state.logs.length === 0) {
    logsContent.textContent = 'No hay logs disponibles';
    return;
  }

  logsContent.innerHTML = state.logs.map(log => {
    const level = log.level || 'info';
    const timestamp = log.timestamp || '';
    const message = log.message || '';

    return `<div class="log-entry ${level}"><span class="log-timestamp">${timestamp}</span> <span class="log-level ${level}">[${level.toUpperCase()}]</span> ${escapeHtml(message)}</div>`;
  }).join('');

  // Auto-scroll al final
  logsContent.scrollTop = logsContent.scrollHeight;
}

// ========== HELPERS ==========
function getEstadoBadge(estado) {
  const badges = {
    'pendiente': '<span class="badge badge-pendiente">Pendiente</span>',
    'procesando': '<span class="badge badge-procesando">Procesando</span>',
    'impreso': '<span class="badge badge-impreso">Impreso</span>',
    'error': '<span class="badge badge-error">Error</span>'
  };

  return badges[estado] || estado;
}

function showAlert(message, type = 'info') {
  const banner = document.getElementById('alertBanner');
  banner.textContent = message;
  banner.className = `alert-banner ${type}`;

  // Auto-ocultar después de 5 segundos
  setTimeout(() => {
    banner.classList.add('hidden');
  }, 5000);
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// ========== CLEANUP ==========
window.addEventListener('beforeunload', () => {
  if (statsInterval) clearInterval(statsInterval);
  if (historialInterval) clearInterval(historialInterval);
  if (logsInterval) clearInterval(logsInterval);
});
