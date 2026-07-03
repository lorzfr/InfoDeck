// Services Module
async function updateServices() {
  try {
    const res = await fetch('/api/modules/services');
    const data = await res.json();

    if (!data || data.length === 0) {
      const msg = '<div class="text-gray-500 text-center">No services configured</div>';
      document.getElementById('services-content').innerHTML = msg;
      document.getElementById('playlist-services-content').innerHTML = msg;
      return;
    }

    const cards = data.map(s => {
      const statusIcon = s.status === 'online' ? '✅' : s.status === 'degraded' ? '⚠️' : '❌';
      const statusClass = `service-${s.status}`;
      return `
        <div class="bg-gray-800/50 rounded-lg p-3 mb-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              ${s.icon ? `<img src="${s.icon}" class="w-6 h-6 rounded">` : ''}
              <span class="font-semibold">${s.name}</span>
            </div>
            <span class="${statusClass} text-lg">${statusIcon} ${s.status}</span>
          </div>
          <div class="mt-2 text-xs text-gray-400 grid grid-cols-2 gap-2">
            <div>
              <span class="text-gray-500">Public:</span>
              ${s.publicReachable ? `<span class="text-green-400">${s.publicHttpCode}</span> <span class="text-gray-500">${s.publicLatency}</span>` : '<span class="text-red-400">Down</span>'}
            </div>
            <div>
              <span class="text-gray-500">LAN:</span>
              ${s.lanReachable ? `<span class="text-green-400">${s.lanHttpCode}</span> <span class="text-gray-500">${s.lanLatency}</span>` : '<span class="text-red-400">Down</span>'}
            </div>
          </div>
        </div>
      `;
    }).join('');

    document.getElementById('services-content').innerHTML = cards;
    document.getElementById('playlist-services-content').innerHTML = cards;
  } catch (err) {
    console.error('Services update failed:', err);
  }
}
