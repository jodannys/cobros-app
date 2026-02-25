
// ============================================================
// MAPA_PATCH.JS — GPS y mapa estático (sin API key)
// ============================================================

// Variable global para coordenadas seleccionadas en el modal
window._coordsSeleccionadas = null;

window.renderMapaSelector = function renderMapaSelector(latExistente, lngExistente) {
  const tieneUbicacion = latExistente && lngExistente;
  window._coordsSeleccionadas = tieneUbicacion ? { lat: latExistente, lng: lngExistente } : null;

  return `
  <div class="form-group">
    <label>📍 Ubicación</label>
    <div style="background:var(--bg);border-radius:12px;padding:14px;text-align:center">

      ${tieneUbicacion ? `
      <div style="margin-bottom:12px">
        <div style="font-size:13px;color:var(--success);font-weight:700;margin-bottom:8px">
          ✅ Ubicación guardada
        </div>
        <a href="https://www.google.com/maps?q=${latExistente},${lngExistente}"
          target="_blank"
          style="display:inline-flex;align-items:center;gap:6px;background:#eff6ff;
          color:var(--primary);padding:8px 14px;border-radius:8px;font-size:13px;
          font-weight:600;text-decoration:none;margin-bottom:10px">
          🗺️ Ver en Google Maps
        </a>
        <div style="font-size:11px;color:var(--muted)">${latExistente.toFixed(6)}, ${lngExistente.toFixed(6)}</div>
      </div>` : ''}

      <button type="button" id="btn-obtener-gps"
        onclick="obtenerUbicacionGPS()"
        class="btn btn-sm"
        style="background:var(--primary);color:white;width:auto;padding:10px 20px;font-size:14px">
        📍 ${tieneUbicacion ? 'Actualizar ubicación' : 'Obtener mi ubicación GPS'}
      </button>

      <div id="gps-status" style="font-size:12px;color:var(--muted);margin-top:8px;min-height:16px">
        ${tieneUbicacion ? '' : 'Toca el botón para guardar la ubicación exacta del cliente'}
      </div>
    </div>
  </div>`;
};

window.obtenerUbicacionGPS = function obtenerUbicacionGPS() {
  const btn    = document.getElementById('btn-obtener-gps');
  const status = document.getElementById('gps-status');

  if (!navigator.geolocation) {
    if (status) { status.textContent = '❌ Tu dispositivo no soporta GPS'; status.style.color = 'var(--danger)'; }
    return;
  }

  if (btn)    { btn.textContent = '⏳ Obteniendo GPS...'; btn.disabled = true; }
  if (status) { status.textContent = 'Buscando señal GPS...'; status.style.color = 'var(--muted)'; }

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const acc = Math.round(pos.coords.accuracy);
      window._coordsSeleccionadas = { lat, lng };

      if (btn) { btn.textContent = '✅ Ubicación obtenida'; btn.style.background = 'var(--success)'; btn.disabled = false; }
      if (status) {
        status.innerHTML = `
          <span style="color:var(--success);font-weight:700">
            📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}
          </span>
          <br><span style="color:var(--muted)">Precisión: ~${acc}m</span>
          <br><a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank"
            style="color:var(--primary);font-weight:600;text-decoration:none">
            🗺️ Verificar en Google Maps
          </a>`;
      }
    },
    err => {
      if (btn) { btn.textContent = '📍 Obtener mi ubicación GPS'; btn.disabled = false; }
      const msgs = {
        1: 'Permiso de ubicación denegado. Actívalo en la configuración del navegador.',
        2: 'No se pudo obtener la ubicación. Intenta de nuevo.',
        3: 'Tiempo agotado. Intenta de nuevo.'
      };
      if (status) { status.textContent = '❌ ' + (msgs[err.code] || 'Error desconocido'); status.style.color = 'var(--danger)'; }
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
};

window.renderMapaCliente = function renderMapaCliente(lat, lng) {
  if (!lat || !lng) return '';
  return `
  <div style="margin-bottom:12px">
    <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank"
      style="display:inline-flex;align-items:center;gap:8px;background:#eff6ff;
      color:var(--primary);padding:10px 16px;border-radius:10px;font-size:14px;
      font-weight:600;text-decoration:none">
      🗺️ Abrir ubicación en Google Maps
    </a>
  </div>`;
};

window.iniciarMapaCliente = function iniciarMapaCliente(lat, lng, nombre) {
  // Mapa estático: no necesita inicialización
};