import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000/api";

const simulationService = {
  async start() {
    const response = await axios.post(
      `${API_BASE_URL}/simulation/start`
    );
    return response.data;
  },

  async step() {
    const response = await axios.post(
      `${API_BASE_URL}/simulation/step`
    );
    return response.data;
  },

  async pause() {
    const response = await axios.post(
      `${API_BASE_URL}/simulation/pause`
    );
    return response.data;
  },

  async reset() {
    const response = await axios.post(
      `${API_BASE_URL}/simulation/reset`
    );
    return response.data;
  },

  async setScheduler(scheduler) {
    const response = await axios.post(
      `${API_BASE_URL}/simulation/scheduler`,
      { scheduler }
    );
    return response.data;
  },

  async randomizeScenario() {
    const response = await axios.post(
      `${API_BASE_URL}/simulation/scenario`
    );
    return response.data;
  },

  async getState() {
    const response = await axios.get(
      `${API_BASE_URL}/simulation/state`
    );
    return response.data;
  },
};

export default simulationService;