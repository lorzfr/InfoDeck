// Main Dashboard Application (Alpine.js component)
function dashboardApp() {
  return {
    config: {
      general: { dashboardTitle: 'Dashboard', viewMode: 'boxes', playlistSpeed: 10, clockFormat: '24h', dateFormat: 'DD:MM:YYYY' },
      modules: { weather: { enabled: true }, services: { enabled: true }, flightradar: { enabled: true }, llmSummary: { enabled: true } },
    },
    clockTime: '',
    clockDate: '',
    showSettings: false,
    settingsTab: 'general',
    form: {},
    playlistIndex: 0,
    playlistTotal: 0,
    playlistPaused: false,
    playlistTimer: null,
    pollIntervals: [],
    ollamaTestResult: '',
    ollamaTestOk: false,
    iconUploadIndex: -1,

    async init() {
      await this.loadConfig();
      this.startClock();
      this.startPolling();
      this.initPlaylist();
      this.initIconUpload();
    },

    async loadConfig() {
      try {
        const res = await fetch('/api/config');
        this.config = await res.json();
      } catch (err) {
        console.error('Failed to load config:', err);
      }
    },

    startClock() {
      const update = () => {
        const now = new Date();
        const fmt = this.config.general.clockFormat || '24h';
        const h = now.getHours();
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        if (fmt === '12h') {
          const ampm = h >= 12 ? 'PM' : 'AM';
          const h12 = h % 12 || 12;
          this.clockTime = `${h12}:${m}:${s} ${ampm}`;
        } else {
          this.clockTime = `${String(h).padStart(2, '0')}:${m}:${s}`;
        }

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const d = now.getDate();
        const mon = now.getMonth() + 1;
        const y = now.getFullYear();
        const dayName = days[now.getDay()];
        const df = this.config.general.dateFormat || 'DD:MM:YYYY';
        let dateStr;
        if (df === 'MM:DD:YYYY') {
          dateStr = `${String(mon).padStart(2, '0')}:${String(d).padStart(2, '0')}:${y}`;
        } else if (df === 'YYYY-MM-DD') {
          dateStr = `${y}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        } else {
          dateStr = `${String(d).padStart(2, '0')}:${String(mon).padStart(2, '0')}:${y}`;
        }
        this.clockDate = `${dayName}, ${dateStr}`;
      };
      update();
      setInterval(update, 1000);
    },

    startPolling() {
      // Weather: every 10 minutes
      updateWeather();
      this.pollIntervals.push(setInterval(updateWeather, 600000));
      // Services: every 60 seconds
      updateServices();
      this.pollIntervals.push(setInterval(updateServices, 60000));
      // Flightradar: every 5 minutes (iframe doesn't need frequent refresh)
      updateFlightradar();
      this.pollIntervals.push(setInterval(updateFlightradar, 300000));
      // LLM Summary: every 5 minutes
      updateLlmSummary();
      this.pollIntervals.push(setInterval(updateLlmSummary, 300000));
    },

    toggleViewMode() {
      this.config.general.viewMode = this.config.general.viewMode === 'boxes' ? 'playlist' : 'boxes';
      if (this.config.general.viewMode === 'playlist') {
        this.playlistIndex = 0;
        this.playlistPaused = false;
        this.startPlaylist();
      } else {
        this.stopPlaylist();
      }
      this.saveViewMode();
    },

    async saveViewMode() {
      try {
        await fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ general: { viewMode: this.config.general.viewMode } }),
        });
      } catch (err) {
        console.error('Failed to save view mode:', err);
      }
    },

    // Playlist
    initPlaylist() {
      this.playlistIndex = 0;
      this.updatePlaylistTotal();
      if (this.config.general.viewMode === 'playlist') {
        this.startPlaylist();
      }
    },

    updatePlaylistTotal() {
      let count = 0;
      if (this.config.modules.weather.enabled) count++;
      if (this.config.modules.services.enabled) count++;
      if (this.config.modules.flightradar.enabled) count++;
      if (this.config.modules.llmSummary.enabled) count++;
      this.playlistTotal = count;
    },

    startPlaylist() {
      this.stopPlaylist();
      this.showPlaylistSlide(this.playlistIndex);
      const speed = (this.config.general.playlistSpeed || 10) * 1000;
      this.playlistTimer = setInterval(() => {
        if (!this.playlistPaused) {
          this.playlistNext();
        }
      }, speed);
    },

    stopPlaylist() {
      if (this.playlistTimer) {
        clearInterval(this.playlistTimer);
        this.playlistTimer = null;
      }
    },

    showPlaylistSlide(index) {
      const slides = document.querySelectorAll('.playlist-slide');
      slides.forEach((el, i) => {
        el.classList.toggle('active', i === index);
      });
    },

    playlistNext() {
      const total = this.playlistTotal;
      if (total === 0) return;
      this.playlistIndex = (this.playlistIndex + 1) % total;
      this.showPlaylistSlide(this.playlistIndex);
    },

    playlistPrev() {
      const total = this.playlistTotal;
      if (total === 0) return;
      this.playlistIndex = (this.playlistIndex - 1 + total) % total;
      this.showPlaylistSlide(this.playlistIndex);
    },

    togglePlaylistPause() {
      this.playlistPaused = !this.playlistPaused;
    },

    // Settings
    openSettings() {
      this.form = JSON.parse(JSON.stringify(this.config));
      this.showSettings = true;
      this.settingsTab = 'general';
      this.ollamaTestResult = '';
    },

    closeSettings() {
      this.showSettings = false;
    },

    async saveSettings() {
      try {
        const res = await fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.form),
        });
        if (res.ok) {
          this.config = JSON.parse(JSON.stringify(this.form));
          this.updatePlaylistTotal();
          if (this.config.general.viewMode === 'playlist') {
            this.startPlaylist();
          }
          this.closeSettings();
        }
      } catch (err) {
        console.error('Failed to save settings:', err);
      }
    },

    async testOllamaConnection() {
      this.ollamaTestResult = 'Testing...';
      this.ollamaTestOk = false;
      try {
        const res = await fetch('/api/ollama/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiUrl: this.form.ollama.apiUrl }),
        });
        const data = await res.json();
        this.ollamaTestOk = data.success;
        this.ollamaTestResult = data.success ? 'Connection successful!' : 'Connection failed';
      } catch {
        this.ollamaTestResult = 'Connection failed';
      }
    },

    addServiceEntry() {
      if (!this.form.modules.services.entries) {
        this.form.modules.services.entries = [];
      }
      this.form.modules.services.entries.push({
        name: '',
        publicUrl: '',
        lanUrl: '',
        icon: '',
      });
    },

    removeServiceEntry(index) {
      this.form.modules.services.entries.splice(index, 1);
    },

    uploadServiceIcon(index) {
      this.iconUploadIndex = index;
      document.getElementById('iconUploadInput').click();
    },

    initIconUpload() {
      const input = document.getElementById('iconUploadInput');
      if (!input) return;
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('icon', file);

        try {
          const res = await fetch('/api/upload-icon', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (data.success && this.iconUploadIndex >= 0) {
            this.form.modules.services.entries[this.iconUploadIndex].icon = data.url;
          }
        } catch (err) {
          console.error('Icon upload failed:', err);
        }

        input.value = '';
      });
    },
  };
}

// Handle visibility change for polling
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Reduce polling when tab is hidden (handled automatically by browser)
  }
});
