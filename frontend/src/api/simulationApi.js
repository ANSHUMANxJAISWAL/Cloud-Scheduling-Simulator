import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const simulationApi = {
  simulate: async (config) => {
    const response = await api.post('/simulate', config);
    return response.data;
  },
  
  simulateBatch: async (configs) => {
    const response = await api.post('/simulate/batch', { configs });
    return response.data;
  },
  
  compare: async (processes, algorithms, timeQuantum, agingRate) => {
    const response = await api.post('/compare', {
      processes,
      algorithms,
      time_quantum: timeQuantum,
      aging_rate: agingRate,
    });
    return response.data;
  },
  
  generateWorkload: async (preset, numProcesses, seed) => {
    const response = await api.post('/workload/generate', {
      preset,
      num_processes: numProcesses,
      seed,
    });
    return response.data;
  },
  
  getPresets: async () => {
    const response = await api.get('/simulate/presets');
    return response.data;
  },
};
