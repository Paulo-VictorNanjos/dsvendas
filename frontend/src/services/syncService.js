import api from './api';

export const syncService = {
  // Obtém o status atual da sincronização
  getSyncStatus: async () => {
    try {
      const response = await api.get('/sync/status');
      return response.data;
    } catch (error) {
      console.error('Erro ao obter status da sincronização:', error);
      throw error;
    }
  },

  // Sincroniza dados do ERP para o sistema web
  syncFromERP: async () => {
    try {
      const response = await api.post('/sync/from-erp');
      return response.data;
    } catch (error) {
      console.error('Erro ao sincronizar dados do ERP:', error);
      throw error;
    }
  },

  // Sincroniza dados do sistema web para o ERP
  syncToERP: async () => {
    try {
      const response = await api.post('/sync/to-erp');
      return response.data;
    } catch (error) {
      console.error('Erro ao sincronizar dados para o ERP:', error);
      throw error;
    }
  },

  // Converter orçamento em pedido de venda no ERP
  convertToSalesOrder: async (quotationId) => {
    try {
      const response = await api.post(`/sync/convert-to-order/${quotationId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao converter orçamento em pedido:', error);
      throw error;
    }
  },

  // Forçar sincronização manual
  forceSyncAll: async () => {
    try {
      const response = await api.post('/sync/force');
      return response.data;
    } catch (error) {
      console.error('Erro ao forçar sincronização:', error);
      throw error;
    }
  },
  
  // Obter logs de sincronização
  getSyncLogs: async (limit = 10) => {
    try {
      const response = await api.get(`/sync/logs?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao obter logs de sincronização:', error);
      throw error;
    }
  },

  // Sincronizar todos os dados com o ERP
  async syncAll() {
    const response = await api.post('/sync/all');
    return response.data;
  },

  // Sincronizar apenas formas e condições de pagamento
  async syncPaymentMethods() {
    const response = await api.post('/sync/payment-methods');
    return response.data;
  },

  // Sincronizar dados fiscais (regras ICMS, classificações, etc.)
  async syncFiscalData() {
    try {
      const response = await api.post('/sync/fiscal-data');
      return response.data;
    } catch (error) {
      console.error('Erro ao sincronizar dados fiscais:', error);
      throw error;
    }
  },

  // Verificar status da sincronização
  async getStatus() {
    const response = await api.get('/sync/status');
    return response.data;
  },

  // Obter logs de sincronização de métodos de pagamento
  getPaymentMethodsLogs: async (limit = 10) => {
    try {
      const response = await api.get(`/sync/logs/payment-methods?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao obter logs de métodos de pagamento:', error);
      throw error;
    }
  }
}; 