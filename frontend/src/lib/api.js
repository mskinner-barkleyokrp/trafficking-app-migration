class ApiClient {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://trafficking.barkleydatacloud.com:5005/api'
    this.token = null
  }

  setToken(token) {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
    }
  }

  getToken() {
    if (this.token) return this.token
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token')
    }
    return null
  }

  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const token = this.getToken()

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body)
    }

    try {
      const response = await fetch(url, config)
      
      if (response.status === 401) {
        this.clearToken()
        // Consider a more robust way to handle global logout, e.g., event emitter or context update
        // window.location.href = '/login'; // This can be disruptive
      }

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
          if (response.status === 204) { // No Content
            data = undefined; // Or {} or null, depending on how you want to handle it
          } else {
            data = await response.json();
          }
      } else {
          if (response.status === 204) {
             data = undefined;
          } else {
            // If not JSON, treat as error or handle text response if expected
            const text = await response.text();
            data = { message: text || `Received non-JSON response with status ${response.status}` };
            if (!response.ok) throw new Error(data.message);
          }
      }
      
      if (!response.ok) {
        const errorMessage = data?.message || `API request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      return data
    } catch (error) {
      console.error(`API request error for ${url}:`, error.message) // Log only message for cleaner console
      throw error
    }
  }

  // Google OAuth methods
  async getGoogleAuthUrl() { return this.request('/auth/google') }
  async handleGoogleCallback(code) {
    const data = await this.request('/auth/google/callback', { method: 'POST', body: { code } })
    if (data.token) this.setToken(data.token)
    return data
  }

  // Regular auth
  async login(email, password) {
    const data = await this.request('/auth/login', { method: 'POST', body: { email, password }})
    if (data.token) this.setToken(data.token)
    return data
  }
  async logout() { this.clearToken() }

  // Client endpoints
  async getClients() { return this.request('/clients') }
  async createClient(clientData) { return this.request('/clients', { method: 'POST', body: clientData }) }
  async updateClient(clientId, clientData) { return this.request(`/clients/${clientId}`, { method: 'PUT', body: clientData }) }
  async deleteClient(clientId) { return this.request(`/clients/${clientId}`, { method: 'DELETE' }) }

  // Campaign endpoints
  async getCampaigns(clientId) {
    if (!clientId) return Promise.resolve([]);
    return this.request(`/campaigns?client_id=${clientId}`)
  }
  async createCampaign(campaignData) { return this.request('/campaigns', { method: 'POST', body: campaignData }) }
  async updateCampaign(campaignId, campaignData) { return this.request(`/campaigns/${campaignId}`, { method: 'PUT', body: campaignData }) }
  async deleteCampaign(campaignId) { return this.request(`/campaigns/${campaignId}`, { method: 'DELETE' }) }

  // Placement endpoints
  async getPlacements(filters = {}) {
    const params = new URLSearchParams(Object.entries(filters).filter(([_, value]) => value !== undefined && value !== ''))
    return this.request(`/placements?${params.toString()}`)
  }
  async createPlacements(placementsData) { // For bulk creation
    return this.request('/placements', { method: 'POST', body: placementsData })
  }
  async updatePlacement(placementId, placementData) { // For single placement update
    return this.request(`/placements/${placementId}`, { method: 'PUT', body: placementData });
  }
  async deletePlacement(placementId) { // For single placement delete
    return this.request(`/placements/${placementId}`, { method: 'DELETE' });
  }


  // UTM endpoints (Placeholder - assuming it would be similar if implemented)
  // async createUTMs(utmsData) { return this.request('/utms', { method: 'POST', body: utmsData }) }

  // Trafficking request endpoints
  async getTraffickingRequests() { return this.request('/trafficking-requests') }
  async createTraffickingRequest(requestData) { 
    // requestData should now be: { client_id, campaign_id, notes, dueDate, trafficData }
    return this.request('/trafficking-requests', { method: 'POST', body: requestData });
  }
  async updateTraffickingRequest(id, updates) { return this.request(`/trafficking-requests/${id}`, { method: 'PATCH', body: updates }) }

  // Template endpoints (wb_naming_templates)
  async getTemplates(clientId, type = null) {
    const params = new URLSearchParams();
    if (clientId) params.append('client_id', clientId);
    if (type) params.append('type', type);
    return this.request(`/templates?${params.toString()}`);
  }
  async createTemplate(templateData) { return this.request('/templates', { method: 'POST', body: templateData }); }
  async updateTemplate(templateId, templateData) { return this.request(`/templates/${templateId}`, { method: 'PUT', body: templateData }); }
  async deleteTemplate(templateId) { return this.request(`/templates/${templateId}`, { method: 'DELETE' }); }

  // Legend endpoints (wb_legend_fields)
  async getLegendFields(category) {
    let endpoint = '/legend-fields';
    if (category) endpoint += `?category=${encodeURIComponent(category)}`;
    return this.request(endpoint);
  }
  async createLegendField(data) {
    return this.request('/legend-fields', { method: 'POST', body: data });
  }
  async updateLegendField(id, data) {
    return this.request(`/legend-fields/${id}`, { method: 'PUT', body: data });
  }
  async deleteLegendField(id) {
    return this.request(`/legend-fields/${id}`, { method: 'DELETE' });
  }
  async bulkUploadLegendFields(payload) {
    // payload is expected to be { items: [...], mode: '...' }
    return this.request('/legend-fields/bulk-upload', { method: 'POST', body: payload });
  }

  async createUtms(utmsDataArray) {
    // The backend now expects the array directly in the body.
    return this.request('/utms', { method: 'POST', body: utmsDataArray });
  }
  async getUtms(filters = {}) {
    const params = new URLSearchParams(Object.entries(filters).filter(([_, value]) => value !== undefined && value !== ''));
    return this.request(`/utms?${params.toString()}`);
  }

  async updateUtm(utmId, utmData) {
    return this.request(`/utms/${utmId}`, { method: 'PUT', body: utmData });
  }

  async deleteUtm(utmId) {
    return this.request(`/utms/${utmId}`, { method: 'DELETE' });
  }
}
export const apiClient = new ApiClient()