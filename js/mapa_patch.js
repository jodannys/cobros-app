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

// ============================================================
// NUEVO — Haversine: distancia entre dos puntos en metros
// ============================================================
window.calcularDistancia = function(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const R = 6371e3;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const dPhi = (lat2 - lat1) * Math.PI / 180;
  const dLam = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dPhi/2)**2 + Math.cos(phi1)*Math.cos(phi2)*Math.sin(dLam/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// ============================================================
// NUEVO — GPS continuo para Mi Cuadre (filtro 18 metros)
// ============================================================
window.iniciarGPSCuadre = function() {
  if (!navigator.geolocation) return;
  if (state._gpsWatchId != null) return; // ya está corriendo

  const UMBRAL_METROS = 18;

  state._gpsWatchId = navigator.geolocation.watchPosition(
    pos => {
      const nueva = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      state.miUbicacion = nueva;

      const ultima = state._ultimaUbicacionRuta;
      const distMovida = ultima
        ? calcularDistancia(ultima.lat, ultima.lng, nueva.lat, nueva.lng)
        : 999;

      if (distMovida >= UMBRAL_METROS) {
        state._ultimaUbicacionRuta = nueva;
        render();
      }
    },
    err => { console.warn('GPS Cuadre error:', err.code); },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
  );
};

window.detenerGPSCuadre = function() {
  if (state._gpsWatchId != null) {
    navigator.geolocation.clearWatch(state._gpsWatchId);
    state._gpsWatchId = null;
  }
};

// ── Helper interno: formatea metros para mostrar en pantalla ──
window._fmtDistancia = function(metros) {
  if (metros >= 999990) return null;
  if (metros < 1000) return `${Math.round(metros)}m`;
  return `${(metros / 1000).toFixed(1)}km`;
};

// ============================================================
// NUEVO — Mapa de ruta con Leaflet (sin API key)
// ============================================================
window.abrirMapaRuta = function() {
  // Elimina modal anterior si existía
  const anterior = document.getElementById('modal-mapa-ruta');
  if (anterior) anterior.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-mapa-ruta';
  modal.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.7);
    z-index:9999; display:flex; flex-direction:column;
    align-items:stretch; justify-content:flex-end;
  `;
  modal.innerHTML = `
    <div style="background:white; border-radius:20px 20px 0 0;
                height:85vh; display:flex; flex-direction:column; overflow:hidden">
      <div style="padding:14px 16px; border-bottom:1px solid #e5e7eb;
                  display:flex; justify-content:space-between; align-items:center; flex-shrink:0">
        <div style="font-weight:800; font-size:15px">🗺️ Mapa de Ruta</div>
        <div style="display:flex; gap:8px; align-items:center">
          <button id="btn-gps-mapa"
            style="border:none; background:#f0fdf4; border-radius:8px;
                   padding:6px 14px; font-weight:700; cursor:pointer;
                   font-size:13px; color:#16a34a">
            ▶️ Mi posición
          </button>
          <button id="btn-cerrar-mapa"
            style="border:none; background:#f1f5f9; border-radius:8px;
                   padding:6px 14px; font-weight:700; cursor:pointer; font-size:13px">
            ✕ Cerrar
          </button>
        </div>
      </div>
      <div id="mapa-leaflet" style="flex:1; width:100%"></div>
    </div>`;
  document.body.appendChild(modal);

  setTimeout(() => {
    const centro = state.miUbicacion
      ? [state.miUbicacion.lat, state.miUbicacion.lng]
      : [-12.046374, -77.042793];

    const mapa = L.map('mapa-leaflet').setView(centro, 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(mapa);

    // Clientes pendientes (puntos rojos)
    const pendientes = (window._metaDetalle || []).filter(d => !d.completo);
    pendientes.forEach((d, i) => {
      if (!d.cliente?.lat || !d.cliente?.lng) return;
      const dist = state.miUbicacion
        ? _fmtDistancia(calcularDistancia(
            state.miUbicacion.lat, state.miUbicacion.lng,
            d.cliente.lat, d.cliente.lng))
        : null;
      L.circleMarker([d.cliente.lat, d.cliente.lng], {
        radius: 9, fillColor: '#e11d48', color: 'white',
        weight: 2, opacity: 1, fillOpacity: 0.9
      }).addTo(mapa)
        .bindPopup(`<b>${i + 1}. ${d.cliente.nombre}</b><br>${dist ? '📍 ' + dist + '<br>' : ''}💰 ${formatMoney(d.cuota)}`);
    });

    // Ajustar zoom si hay clientes
    if (pendientes.filter(d => d.cliente?.lat).length > 0) {
      const bounds = L.latLngBounds(
        pendientes.filter(d => d.cliente?.lat && d.cliente?.lng)
                  .map(d => [d.cliente.lat, d.cliente.lng])
      );
      mapa.fitBounds(bounds, { padding: [40, 40] });
    }

    // Play/Pausa GPS
    let watchIdMapa = null;
    let marcadorYo = null;
    let gpsActivo = false;

    const actualizarPosicion = (lat, lng) => {
      if (marcadorYo) {
        marcadorYo.setLatLng([lat, lng]);
      } else {
        marcadorYo = L.circleMarker([lat, lng], {
          radius: 10, fillColor: '#2563eb', color: 'white',
          weight: 3, opacity: 1, fillOpacity: 1
        }).addTo(mapa).bindPopup('📍 Tú estás aquí');
      }
    };

    // Si cobrador ya tenía ruta activa, mostrar posición de inmediato
    if (state.miUbicacion) {
      actualizarPosicion(state.miUbicacion.lat, state.miUbicacion.lng);
      gpsActivo = true;
      const btn = document.getElementById('btn-gps-mapa');
      if (btn) { btn.textContent = '⏸️ Pausar GPS'; btn.style.background = '#fff1f2'; btn.style.color = '#9f1239'; }
      watchIdMapa = navigator.geolocation.watchPosition(
        pos => {
          state.miUbicacion = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          actualizarPosicion(state.miUbicacion.lat, state.miUbicacion.lng);
        },
        err => console.warn('GPS mapa:', err.code),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
      );
    }

    document.getElementById('btn-gps-mapa').onclick = () => {
      const btn = document.getElementById('btn-gps-mapa');
      if (gpsActivo) {
        if (watchIdMapa != null) { navigator.geolocation.clearWatch(watchIdMapa); watchIdMapa = null; }
        if (marcadorYo) { marcadorYo.remove(); marcadorYo = null; }
        gpsActivo = false;
        btn.textContent = '▶️ Mi posición';
        btn.style.background = '#f0fdf4';
        btn.style.color = '#16a34a';
      } else {
        if (!navigator.geolocation) { alert('Tu dispositivo no soporta GPS'); return; }
        gpsActivo = true;
        btn.textContent = '⏸️ Pausar GPS';
        btn.style.background = '#fff1f2';
        btn.style.color = '#9f1239';
        watchIdMapa = navigator.geolocation.watchPosition(
          pos => {
            state.miUbicacion = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            actualizarPosicion(state.miUbicacion.lat, state.miUbicacion.lng);
          },
          err => console.warn('GPS mapa:', err.code),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
        );
      }
    };

    document.getElementById('btn-cerrar-mapa').onclick = () => {
      if (watchIdMapa != null) navigator.geolocation.clearWatch(watchIdMapa);
      document.getElementById('modal-mapa-ruta').remove();
    };

  }, 150);
};