const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_FILE = path.join(process.env.APPDATA || process.env.HOME || '.', 'Factufy-Hotel', 'config.json');

class Settings {
  constructor() {
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf8');
        const config = JSON.parse(data);

        this.serverUrl = config.serverUrl || '';
        this.panelPort = config.panelPort || 3051;
        this.pollingInterval = config.pollingInterval || 3000;
        this.agenteId = config.agenteId || this.generateAgenteId();

        // Guardar agenteId si es nuevo
        if (!config.agenteId) {
          this.save();
        }
      } else {
        this.setDefaults();
        this.save();
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
      this.setDefaults();
    }
  }

  setDefaults() {
    this.serverUrl = '';
    this.panelPort = 3051;
    this.pollingInterval = 3000;
    this.agenteId = this.generateAgenteId();
  }

  save() {
    try {
      const dir = path.dirname(CONFIG_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const config = {
        serverUrl: this.serverUrl,
        panelPort: this.panelPort,
        pollingInterval: this.pollingInterval,
        agenteId: this.agenteId
      };

      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
      console.log('Configuración guardada en:', CONFIG_FILE);
    } catch (error) {
      console.error('Error guardando configuración:', error);
      throw error;
    }
  }

  generateAgenteId() {
    const hostname = os.hostname();
    const timestamp = Date.now();
    return `agente-${hostname}-${timestamp}`;
  }

  getConfigFile() {
    return CONFIG_FILE;
  }
}

module.exports = new Settings();
