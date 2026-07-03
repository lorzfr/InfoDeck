// FlightRadar24 Module
let frZoom = 7;
let frLat = 52.52;
let frLon = 13.405;

function getIframeSrc(lat, lon, zoom) {
  return `/api/modules/flightradar/iframe?lat=${lat}&lon=${lon}&zoom=${zoom}`;
}

async function updateFlightradar() {
  try {
    const res = await fetch('/api/modules/flightradar');
    const data = await res.json();

    if (!data.enabled) return;

    frLat = data.centerLat;
    frLon = data.centerLon;
    frZoom = data.zoom;

    const iframeSrc = getIframeSrc(frLat, frLon, frZoom);
    const html = `
      <div class="relative w-full h-full min-h-[300px] flex flex-col">
        <div class="flex-1 relative">
          <iframe src="${iframeSrc}" class="w-full h-full rounded-lg" frameborder="0" allowfullscreen loading="lazy"></iframe>
        </div>
        <div class="flex justify-center gap-3 mt-2">
          <button onclick="frZoomIn()" class="touch-btn bg-gray-700 hover:bg-gray-600 rounded-lg px-4 py-2 text-lg font-bold">+</button>
          <button onclick="frZoomOut()" class="touch-btn bg-gray-700 hover:bg-gray-600 rounded-lg px-4 py-2 text-lg font-bold">-</button>
        </div>
      </div>
    `;

    document.getElementById('flightradar-content').innerHTML = html;

    const playlistHtml = `
      <div class="relative w-full h-full min-h-[400px] flex flex-col">
        <div class="flex-1 relative">
          <iframe src="${iframeSrc}" class="w-full h-full rounded-lg" frameborder="0" allowfullscreen loading="lazy"></iframe>
        </div>
        <div class="flex justify-center gap-3 mt-2">
          <button onclick="frZoomIn()" class="touch-btn bg-gray-700 hover:bg-gray-600 rounded-lg px-4 py-2 text-lg font-bold">+</button>
          <button onclick="frZoomOut()" class="touch-btn bg-gray-700 hover:bg-gray-600 rounded-lg px-4 py-2 text-lg font-bold">-</button>
        </div>
      </div>
    `;
    document.getElementById('playlist-flightradar-content').innerHTML = playlistHtml;
  } catch (err) {
    console.error('Flightradar update failed:', err);
  }
}

function updateIframeSrc() {
  const url = getIframeSrc(frLat, frLon, frZoom);
  const iframes = document.querySelectorAll('#flightradar-content iframe, #playlist-flightradar-content iframe');
  iframes.forEach(iframe => { iframe.src = url; });
}

function frZoomIn() {
  frZoom = Math.min(12, frZoom + 1);
  updateIframeSrc();
}

function frZoomOut() {
  frZoom = Math.max(1, frZoom - 1);
  updateIframeSrc();
}
