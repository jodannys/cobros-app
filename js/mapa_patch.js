// ============================================================
// MAPA_PATCH.JS — GPS, distancias y mapa de ruta
// Fixes aplicados:
//   1. Indicador visual para clientes sin coordenadas
//   2. Centro del mapa basado en clientes, no en Lima hardcodeado
//   3. watchPosition del mapa se limpia si se cierra con tap fuera
//   4. (orderamiento en tiempo real ya funcionaba — sin cambio)
//   5. _metaDetalle se recalcula al abrir el mapa (clientes ya cobrados no aparecen)
// ============================================================

window.guardarUbicacionCliente = function () {
  const lat = document.getElementById('latInput')?.value;
  const lng = document.getElementById('lngInput')?.value;
  if (!lat || !lng) {
    const status = document.getElementById('ubicacion-status');
    if (status) { status.textContent = '⚠️ No se ha seleccionado ubicación'; status.style.color = 'var(--danger)'; }
    return;
  }
  _coordsSeleccionadas = { lat: parseFloat(lat), lng: parseFloat(lng) };
  const status = document.getElementById('ubicacion-status');
  if (status) { status.textContent = '✅ Ubicación guardada'; status.style.color = 'var(--success)'; }
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
// Haversine: distancia entre dos puntos en metros
// ============================================================
window.calcularDistancia = function (lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const R = 6371e3;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const dPhi = (lat2 - lat1) * Math.PI / 180;
  const dLam = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ── Helper: formatea metros para mostrar en pantalla ──
window._fmtDistancia = function (metros) {
  if (metros >= 999990) return null;
  if (metros < 1000) return `${Math.round(metros)}m`;
  return `${(metros / 1000).toFixed(1)}km`;
};

// ============================================================
// GPS continuo para Mi Cuadre (umbral 18 metros)
// ============================================================
window.iniciarGPSCuadre = function () {
  if (!navigator.geolocation) return;
  if (state._gpsWatchId != null) return;

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

window.detenerGPSCuadre = function () {
  if (state._gpsWatchId != null) {
    navigator.geolocation.clearWatch(state._gpsWatchId);
    state._gpsWatchId = null;
  }
};

// ============================================================
// Mapa de ruta con Leaflet
// ============================================================
window.abrirMapaRuta = function () {
  const anterior = document.getElementById('modal-mapa-ruta');
  if (anterior) anterior.remove();

  // ── FIX 5: recalcular _metaDetalle al abrir para que refleje
  // los pagos más recientes y no muestre clientes ya cobrados ──
  if (typeof calcularMetaReal === 'function' && state.currentUser) {
    const meta = calcularMetaReal(state.currentUser.id, today());
    window._metaDetalle = meta.detalle;
  }

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

  // ── FIX 3: cerrar el modal si el usuario toca el overlay oscuro ──
  // (el overlay es el propio #modal-mapa-ruta, el contenido está en el div hijo)
  modal.addEventListener('click', e => {
    if (e.target === modal) _cerrarMapaRuta(null);
  });

  // ── FIX 3: cerrar con botón atrás del navegador ──
  window._mapaRutaPopState = () => _cerrarMapaRuta(null);
  window.history.pushState({ mapaRuta: true }, '');
  window.addEventListener('popstate', window._mapaRutaPopState, { once: true });

  setTimeout(() => {
    const pendientes = (window._metaDetalle || []).filter(d => !d.completo);

    // ── FIX 2: calcular centro a partir de los clientes con coordenadas ──
    // Si hay GPS activo úsalo, si no usa el centroide de los clientes,
    // si tampoco hay clientes con coords, cae en Lima como último recurso.
    let centro;
    if (state.miUbicacion) {
      centro = [state.miUbicacion.lat, state.miUbicacion.lng];
    } else {
      const conCoords = pendientes.filter(d => d.cliente?.lat && d.cliente?.lng);
      if (conCoords.length > 0) {
        const avgLat = conCoords.reduce((s, d) => s + d.cliente.lat, 0) / conCoords.length;
        const avgLng = conCoords.reduce((s, d) => s + d.cliente.lng, 0) / conCoords.length;
        centro = [avgLat, avgLng];
      } else {
        centro = [-12.046374, -77.042793]; // Lima — último recurso
      }
    }

    const mapa = L.map('mapa-leaflet').setView(centro, 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(mapa);

    // ── FIX 1: separar clientes con y sin coordenadas ──
    const conCoords = pendientes.filter(d => d.cliente?.lat && d.cliente?.lng);
    const sinCoords = pendientes.filter(d => !d.cliente?.lat || !d.cliente?.lng);

    // Clientes con coords → puntos rojos en el mapa
    conCoords.forEach((d, i) => {
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

    // ── FIX 1: mostrar panel de clientes sin ubicación debajo del mapa ──
    if (sinCoords.length > 0) {
      const contenedor = document.createElement('div');
      contenedor.style.cssText = `
        padding:8px 14px; background:#fffbeb; border-top:1px solid #fde68a;
        flex-shrink:0; max-height:90px; overflow-y:auto;
      `;
      contenedor.innerHTML = `
        <div style="font-size:10px; font-weight:700; color:#92400e;
                    text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">
          ⚠️ Sin ubicación guardada (${sinCoords.length})
        </div>
        ${sinCoords.map(d => `
          <span style="font-size:11.5px; color:#78350f; font-weight:600;
                       margin-right:10px">• ${d.cliente?.nombre || '—'}</span>
        `).join('')}
      `;
      // Insertar antes del div del mapa
      const mapaDiv = document.getElementById('mapa-leaflet');
      mapaDiv.parentNode.insertBefore(contenedor, mapaDiv);
      // Ajustar altura del mapa para dejar espacio al panel
      mapaDiv.style.flex = '1';
    }

    // Ajustar zoom para abarcar todos los clientes con coords
    if (conCoords.length > 0) {
      const bounds = L.latLngBounds(conCoords.map(d => [d.cliente.lat, d.cliente.lng]));
      mapa.fitBounds(bounds, { padding: [40, 40] });
    }

    // ── GPS dentro del mapa ──
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

    const _iniciarGPSMapa = () => {
      if (!navigator.geolocation) { alert('Tu dispositivo no soporta GPS'); return; }
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
    };

    // Si el cobrador ya tenía ruta activa, activar GPS inmediatamente
    if (state.miUbicacion) {
      actualizarPosicion(state.miUbicacion.lat, state.miUbicacion.lng);
      _iniciarGPSMapa();
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
        _iniciarGPSMapa();
      }
    };

    // ── FIX 3: función única de cierre que limpia TODO ──
    window._cerrarMapaRuta = (watchId) => {
      const w = watchId ?? watchIdMapa;
      if (w != null) navigator.geolocation.clearWatch(w);
      watchIdMapa = null;
      // Limpiar listener de popstate si aún no se disparó
      if (window._mapaRutaPopState) {
        window.removeEventListener('popstate', window._mapaRutaPopState);
        window._mapaRutaPopState = null;
      }
      const m = document.getElementById('modal-mapa-ruta');
      if (m) m.remove();
    };

    document.getElementById('btn-cerrar-mapa').onclick = () => {
      window._cerrarMapaRuta(watchIdMapa);
    };

  }, 150);
};

// ============================================================
// Obtener ubicación para ficha de cliente (selector de mapa)
// ============================================================
window.obtenerUbicacion = function () {
  const status = document.getElementById('ubicacion-status');
  if (status) { status.textContent = '⏳ Obteniendo ubicación...'; status.style.color = 'var(--muted)'; }

  if (!navigator.geolocation) {
    if (status) { status.textContent = '❌ GPS no disponible'; status.style.color = 'var(--danger)'; }
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      _coordsSeleccionadas = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const latInput = document.getElementById('latInput');
      const lngInput = document.getElementById('lngInput');
      if (latInput) latInput.value = pos.coords.latitude;
      if (lngInput) lngInput.value = pos.coords.longitude;
      if (status) { status.textContent = '✅ Ubicación capturada'; status.style.color = 'var(--success)'; }
    },
    err => {
      const msgs = {
        1: 'Permiso denegado. Actívalo en la configuración del navegador.',
        2: 'No se pudo obtener la ubicación. Intenta de nuevo.',
        3: 'Tiempo agotado. Intenta de nuevo.'
      };
      if (status) { status.textContent = '❌ ' + (msgs[err.code] || 'Error desconocido'); status.style.color = 'var(--danger)'; }
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
};