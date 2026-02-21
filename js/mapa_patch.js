// ══════════════════════════════════════════════════════════════
// MAPA INTERACTIVO — Google Maps JavaScript API
// En index.html reemplazar el script de Leaflet por:
// <script src="https://maps.googleapis.com/maps/api/js?key=TU_API_KEY&libraries=places&callback=initGoogleMaps" async defer></script>
// ══════════════════════════════════════════════════════════════

let _mapaInstancia    = null;
let _markerInstancia  = null;
let _coordsSeleccionadas = null; // { lat, lng }
let _googleMapsListo  = false;
let _pendienteIniciar = null;

// Google Maps llama a este callback cuando carga
window.initGoogleMaps = function() {
  _googleMapsListo = true;
  if (_pendienteIniciar) {
    const { lat, lng } = _pendienteIniciar;
    _pendienteIniciar = null;
    iniciarMapaSelector(lat, lng);
  }
};

// ── Selector de ubicación (en modal crear/editar cliente) ─────

function iniciarMapaSelector(latInicial, lngInicial) {
  if (!_googleMapsListo) {
    _pendienteIniciar = { lat: latInicial, lng: lngInicial };
    return;
  }

  if (_mapaInstancia) {
    _mapaInstancia = null;
    _markerInstancia = null;
  }

  // Lima, Perú por defecto
  const lat = latInicial || -12.0464;
  const lng = lngInicial || -77.0428;
  const zoom = latInicial ? 17 : 13;

  setTimeout(() => {
    const contenedor = document.getElementById('mapa-selector');
    if (!contenedor) return;

    _mapaInstancia = new google.maps.Map(contenedor, {
      center: { lat, lng },
      zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_CENTER
      }
    });

    // Si ya hay coords guardadas, poner marker
    if (latInicial) {
      _markerInstancia = new google.maps.Marker({
        position: { lat, lng },
        map: _mapaInstancia,
        draggable: true
      });
      _coordsSeleccionadas = { lat, lng };
      _markerInstancia.addListener('dragend', e => {
        _coordsSeleccionadas = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        _actualizarDisplayCoords();
      });
    }

    // Click en el mapa = mover/crear marker
    _mapaInstancia.addListener('click', e => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      _coordsSeleccionadas = { lat, lng };

      if (_markerInstancia) {
        _markerInstancia.setPosition({ lat, lng });
      } else {
        _markerInstancia = new google.maps.Marker({
          position: { lat, lng },
          map: _mapaInstancia,
          draggable: true,
          animation: google.maps.Animation.DROP
        });
        _markerInstancia.addListener('dragend', e => {
          _coordsSeleccionadas = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          _actualizarDisplayCoords();
        });
      }
      _actualizarDisplayCoords();
    });

    // Botón mi ubicación
    const btnGeo = document.getElementById('btn-mi-ubicacion');
    if (btnGeo) {
      btnGeo.onclick = () => {
        if (!navigator.geolocation) { alert('Tu dispositivo no soporta geolocalización'); return; }
        btnGeo.textContent = '⏳ Buscando...';
        btnGeo.disabled = true;
        navigator.geolocation.getCurrentPosition(
          pos => {
            const { latitude: lat, longitude: lng } = pos.coords;
            _mapaInstancia.setCenter({ lat, lng });
            _mapaInstancia.setZoom(17);
            _coordsSeleccionadas = { lat, lng };
            if (_markerInstancia) {
              _markerInstancia.setPosition({ lat, lng });
            } else {
              _markerInstancia = new google.maps.Marker({
                position: { lat, lng }, map: _mapaInstancia, draggable: true,
                animation: google.maps.Animation.DROP
              });
              _markerInstancia.addListener('dragend', e => {
                _coordsSeleccionadas = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                _actualizarDisplayCoords();
              });
            }
            _actualizarDisplayCoords();
            btnGeo.textContent = '📍 Mi ubicación';
            btnGeo.disabled = false;
          },
          () => {
            alert('No se pudo obtener tu ubicación');
            btnGeo.textContent = '📍 Mi ubicación';
            btnGeo.disabled = false;
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      };
    }
  }, 150);
}

function _actualizarDisplayCoords() {
  const el = document.getElementById('coords-display');
  if (el && _coordsSeleccionadas) {
    el.textContent = `📍 ${_coordsSeleccionadas.lat.toFixed(6)}, ${_coordsSeleccionadas.lng.toFixed(6)}`;
    el.style.color = 'var(--success)';
  }
}

// ── HTML del selector de mapa ─────────────────────────────────

function renderMapaSelector(latExistente, lngExistente) {
  const tieneUbicacion = latExistente && lngExistente;
  return `
  <div class="form-group" style="margin-bottom:8px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <label style="font-weight:600;font-size:14px">📍 Ubicación</label>
      <button id="btn-mi-ubicacion" type="button" class="btn btn-sm"
        style="background:#eff6ff;color:var(--primary);border:1px solid #bfdbfe;font-size:12px">
        📍 Mi ubicación
      </button>
    </div>
    <div id="mapa-selector"
      style="width:100%;height:230px;border-radius:12px;border:2px solid #e2e8f0;overflow:hidden;background:#f1f5f9">
    </div>
    <div id="coords-display"
      style="font-size:12px;color:${tieneUbicacion ? 'var(--success)' : 'var(--muted)'};margin-top:6px;text-align:center">
      ${tieneUbicacion
        ? `📍 ${latExistente.toFixed(6)}, ${lngExistente.toFixed(6)}`
        : 'Toca el mapa para marcar la ubicación exacta'}
    </div>
  </div>`;
}

// ── Mapa solo lectura en ficha del cliente ────────────────────

function renderMapaCliente(lat, lng, nombre) {
  if (!lat || !lng) return '';
  const urlMaps = `https://www.google.com/maps?q=${lat},${lng}`;
  return `
  <div style="margin-bottom:12px">
    <div id="mapa-cliente-view"
      style="width:100%;height:190px;border-radius:12px;border:2px solid #e2e8f0;overflow:hidden;background:#f1f5f9">
    </div>
    <a href="${urlMaps}" target="_blank"
      style="display:flex;align-items:center;gap:6px;color:var(--primary);
      font-size:13px;font-weight:600;text-decoration:none;margin-top:8px">
      🗺️ Abrir en Google Maps
    </a>
  </div>`;
}

function iniciarMapaCliente(lat, lng, nombre) {
  if (!_googleMapsListo) return;
  setTimeout(() => {
    const el = document.getElementById('mapa-cliente-view');
    if (!el || el._init) return;
    el._init = true;
    const mapa = new google.maps.Map(el, {
      center: { lat, lng }, zoom: 17,
      mapTypeControl: false, streetViewControl: true,
      fullscreenControl: false, zoomControl: true
    });
    new google.maps.Marker({
      position: { lat, lng }, map: mapa,
      title: nombre || 'Cliente'
    });
  }, 200);
}