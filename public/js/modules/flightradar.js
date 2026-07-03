// Map Module (using OpenStreetMap embed, with link to FlightRadar24)
let frZoom = 7;
let frLat = 52.52;
let frLon = 13.405;

function getOsmSrc(lat, lon, zoom) {
  return `/api/modules/flightradar/iframe?lat=${lat}&lon=${lon}&zoom=${zoom}`;
}

function getFrUrl(lat, lon, zoom) {
  return `https://www.flightradar24.com/simple_index.php?lat=${lat}&lon=${lon}&zoom=${zoom}`;
}

async function updateFlightradar() {
  try {
    const res = await fetch('/api/modules/flightradar');
    const data = await res.json();

    if (!data.enabled) return;

    frLat = data.centerLat;
    frLon = data.centerLon;
    frZoom = data.zoom;

    const osmSrc = getOsmSrc(frLat, frLon, frZoom);
    const frUrl = getFrUrl(frLat, frLon, frZoom);

    const html = `
      <div class="relative w-full h-full min-h-[300px] flex flex-col">
        <div class="flex-1 relative bg-gray-800 rounded-lg overflow-hidden">
          <iframe src="${osmSrc}" class="w-full h-full" frameborder="0" loading="lazy" style="min-height:250px"></iframe>
        </div>
        <div class="flex justify-center items-center gap-3 mt-2">
          <button onclick="frZoomIn()" class="touch-btn bg-gray-700 hover:bg-gray-600 rounded-lg px-4 py-2 text-lg font-bold">+</button>
          <button onclick="frZoomOut()" class="touch-btn bg-gray-700 hover:bg-gray-600 rounded-lg px-4 py-2 text-lg font-bold">-</button>
          <a href="${frUrl}" target="_blank" class="touch-btn bg-blue-700 hover:bg-blue-600 rounded-lg px-4 py-2 text-sm font-semibold">Open FR24</a>
        </div>
      </div>
    `;

    document.getElementById('flightradar-content').innerHTML = html;

    const playlistHtml = `
      <div class="relative w-full h-full min-h-[400px] flex flex-col">
        <div class="flex-1 relative bg-gray-800 rounded-lg overflow-hidden">
          <iframe src="${osmSrc}" class="w-full h-full" frameborder="0" loading="lazy" style="min-height:350px"></iframe>
        </div>
        <div class="flex justify-center items-center gap-3 mt-2">
          <button onclick="frZoomIn()" class="touch-btn bg-gray-700 hover:bg-gray-600 rounded-lg px-4 py-2 text-lg font-bold">+</button>
          <button onclick="frZoomOut()" class="touch-btn bg-gray-700 hover:bg-gray-600 rounded-lg px-4 py-2 text-lg font-bold">-</button>
          <a href="${frUrl}" target="_blank" class="touch-btn bg-blue-700 hover:bg-blue-600 rounded-lg px-4 py-2 text-sm font-semibold">Open FR24</a>
        </div>
      </div>
    `;
    document.getElementById('playlist-flightradar-content').innerHTML = playlistHtml;
  } catch (err) {
    console.error('Map update failed:', err);
  }
}

function updateOsmSrc() {
  const url = getOsmSrc(frLat, frLon, frZoom);
  document.querySelectorAll('#flightradar-content iframe, #playlist-flightradar-content iframe').forEach(iframe => { iframe.src = url; });
}

function frZoomIn() {
  frZoom = Math.min(12, frZoom + 1);
  updateOsmSrc();
}

function frZoomOut() {
  frZoom = Math.max(1, frZoom - 1);
  updateOsmSrc();
}
