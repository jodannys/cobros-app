// ══════════════════════════════════════════════════════════════
// UBICACIÓN — GPS del celular + abrir en Google Maps
// Sin API key, sin tarjeta, 100% gratuito
// Guarda lat/lng en Firestore, abre Google Maps con esas coords
// ══════════════════════════════════════════════════════════════

let _coordsSeleccionadas = null; // { lat, lng }

// ── HTML del selector de ubicación (en modal crear/editar) ────

function renderMapaSelector(latExistente, lngExistente) {
  const tieneUbicacion = latExistente && lngExistente;
  _coordsSeleccionadas = tieneUbicacion ? { lat: latExistente, lng: lngExistente } : null;

  return `
  <div class="form-group">
    <label>📍 Ubicación</label>
    <div style="background:var(--bg);border-radius:12px;padding:14px;text-align:center">

      ${tieneUbicacion ? `
      <!-- Ya tiene ubicación guardada -->
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
}

function obtenerUbicacionGPS() {
  const btn    = document.getElementById('btn-obtener-gps');
  const status = document.getElementById('gps-status');

  if (!navigator.geolocation) {
    status.textContent = '❌ Tu dispositivo no soporta GPS';
    status.style.color = 'var(--danger)';
    return;
  }

  btn.textContent = '⏳ Obteniendo GPS...';
  btn.disabled    = true;
  status.textContent = 'Buscando señal GPS...';
  status.style.color = 'var(--muted)';

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const acc = Math.round(pos.coords.accuracy);
      _coordsSeleccionadas = { lat, lng };

      btn.textContent = '✅ Ubicación obtenida';
      btn.style.background = 'var(--success)';
      btn.disabled = false;

      status.innerHTML = `
        <span style="color:var(--success);font-weight:700">
          📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}
        </span>
        <br><span style="color:var(--muted)">Precisión: ~${acc}m</span>
        <br><a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank"
          style="color:var(--primary);font-weight:600;text-decoration:none">
          🗺️ Verificar en Google Maps
        </a>`;
    },
    err => {
      btn.textContent = '📍 Obtener mi ubicación GPS';
      btn.disabled = false;
      const msgs = {
        1: 'Permiso de ubicación denegado. Actívalo en la configuración del navegador.',
        2: 'No se pudo obtener la ubicación. Intenta de nuevo.',
        3: 'Tiempo agotado. Intenta de nuevo.'
      };
      status.textContent = '❌ ' + (msgs[err.code] || 'Error desconocido');
      status.style.color = 'var(--danger)';
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

// ── Mapa en ficha del cliente (solo lectura, abre Google Maps) ─

function renderMapaCliente(lat, lng, nombre) {
  if (!lat || !lng) return '';
  const urlMaps     = `https://www.google.com/maps?q=${lat},${lng}`;
  const urlStaticImg = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=16&size=400x180&markers=${lat},${lng},red`;

  return `
  <div style="margin-bottom:12px">
    <!-- Mini mapa estático de OpenStreetMap (sin API key) -->
    <div style="position:relative;border-radius:12px;overflow:hidden;border:2px solid var(--border)">
      <img src="${urlStaticImg}"
        style="width:100%;height:180px;object-fit:cover;display:block"
        onerror="this.parentElement.innerHTML='<div style=\'height:60px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px\'>📍 Ubicación guardada</div>'"
        alt="Ubicación de ${nombre}">
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">📍</div>
    </div>
    <a href="${urlMaps}" target="_blank"
      style="display:flex;align-items:center;gap:6px;color:var(--primary);
      font-size:13px;font-weight:600;text-decoration:none;margin-top:8px">
      🗺️ Abrir ubicación en Google Maps
    </a>
  </div>`;
}

// Esta función ya no necesita hacer nada para el mapa estático
function iniciarMapaCliente(lat, lng, nombre) {
  // El mapa estático se carga automáticamente con la img
  // No se necesita inicializar nada
}