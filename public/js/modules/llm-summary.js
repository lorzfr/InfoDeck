// LLM Summary Module
async function updateLlmSummary() {
  try {
    const res = await fetch('/api/modules/llm-summary');
    const data = await res.json();

    if (!data.summary) {
      const msg = '<div class="text-gray-500 text-center">No summary available. <button onclick="generateLlmSummary()" class="text-blue-400 hover:text-blue-300 underline touch-btn">Generate now</button></div>';
      document.getElementById('llm-summary-content').innerHTML = msg;
      document.getElementById('playlist-llm-summary-content').innerHTML = msg;
      return;
    }

    const color = data.color || '#eab308';
    const score = data.score || 5;

    const html = `
      <div class="text-center">
        <div class="text-lg leading-relaxed mb-4">${data.summary}</div>
        <div class="flex items-center justify-center gap-3">
          <span class="text-sm text-gray-400">Health Score:</span>
          <span class="text-2xl font-bold" style="color: ${color}">${score}/10</span>
        </div>
      </div>
    `;

    document.getElementById('llm-summary-content').innerHTML = html;
    document.getElementById('playlist-llm-summary-content').innerHTML = html;

    const card = document.getElementById('llm-summary-card');
    if (card) {
      card.style.borderColor = color;
    }
  } catch (err) {
    console.error('LLM summary update failed:', err);
  }
}

async function generateLlmSummary() {
  try {
    document.getElementById('llm-summary-content').innerHTML = '<div class="flex items-center justify-center h-full"><svg class="animate-spin h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></div>';
    await fetch('/api/modules/llm-summary/generate', { method: 'POST' });
    await updateLlmSummary();
  } catch (err) {
    console.error('Generate LLM summary failed:', err);
  }
}
