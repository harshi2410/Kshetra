import initialPlots from '../data/plots.json';
import initialCustomers from '../data/customers.json';
import initialBrokers from '../data/brokers.json';

const PLOTS_KEY = 'landos_plots_data';
const CUSTOMERS_KEY = 'landos_customers_data';
const BROKERS_KEY = 'landos_brokers_data';

function loadPlots() {
  try {
    const saved = localStorage.getItem(PLOTS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return initialPlots;
}

function savePlots(plots) {
  try {
    localStorage.setItem(PLOTS_KEY, JSON.stringify(plots));
  } catch (e) {}
}

function loadCustomers() {
  try {
    const saved = localStorage.getItem(CUSTOMERS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return initialCustomers;
}

function saveCustomers(customers) {
  try {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
  } catch (e) {}
}

function loadBrokers() {
  try {
    const saved = localStorage.getItem(BROKERS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return initialBrokers;
}

function saveBrokers(brokers) {
  try {
    localStorage.setItem(BROKERS_KEY, JSON.stringify(brokers));
  } catch (e) {}
}

export const plotService = {
  /** GET all plots for a project */
  async getPlotsByProject(projectId) {
    await new Promise(r => setTimeout(r, 100));
    return loadPlots().filter(p => p.projectId === projectId);
  },

  /** GET single plot by id */
  async getPlotById(plotId) {
    await new Promise(r => setTimeout(r, 80));
    const plot = loadPlots().find(p => p.id === plotId);
    if (!plot) throw new Error(`Plot ${plotId} not found`);
    return plot;
  },

  /** UPDATE a plot (status, price, customerId, brokerId, notes) */
  async updatePlot(plotId, updates) {
    await new Promise(r => setTimeout(r, 150));
    const plots = loadPlots();
    const idx = plots.findIndex(p => p.id === plotId);
    if (idx === -1) throw new Error(`Plot ${plotId} not found`);
    plots[idx] = { ...plots[idx], ...updates };
    savePlots(plots);
    return plots[idx];
  },

  /** GET plot count stats for a project */
  async getProjectStats(projectId) {
    await new Promise(r => setTimeout(r, 80));
    const plots = loadPlots().filter(p => p.projectId === projectId);
    return {
      total:     plots.length,
      sold:      plots.filter(p => p.status === 'Sold').length,
      reserved:  plots.filter(p => p.status === 'Reserved').length,
      available: plots.filter(p => p.status === 'Available').length,
      blocked:   plots.filter(p => p.status === 'Blocked').length,
      revenue:   plots.filter(p => p.status === 'Sold').reduce((s, p) => s + p.price, 0),
    };
  },

  /** Lookup helpers */
  getCustomerName(customerId) {
    if (!customerId) return null;
    return loadCustomers().find(c => c.id === customerId)?.name || customerId;
  },

  getBrokerName(brokerId) {
    if (!brokerId) return null;
    return loadBrokers().find(b => b.id === brokerId)?.name || brokerId;
  },

  getAllCustomers() {
    return loadCustomers();
  },

  getAllBrokers() {
    return loadBrokers();
  },

  /** ADD a new customer on the fly */
  addCustomer(customerData) {
    const customers = loadCustomers();
    const newCustomer = {
      id: `cust_${Date.now()}`,
      name: customerData.name.trim(),
      phone: customerData.phone?.trim() || '',
      email: customerData.email?.trim() || '',
      city: customerData.city?.trim() || '',
      createdAt: new Date().toISOString()
    };
    const updated = [newCustomer, ...customers];
    saveCustomers(updated);
    return newCustomer;
  },

  /** ADD a new broker on the fly */
  addBroker(brokerData) {
    const brokers = loadBrokers();
    const newBroker = {
      id: `brok_${Date.now()}`,
      name: brokerData.name.trim(),
      phone: brokerData.phone?.trim() || '',
      agency: brokerData.agency?.trim() || 'Independent',
      commission: Number(brokerData.commission) || 2,
      createdAt: new Date().toISOString()
    };
    const updated = [newBroker, ...brokers];
    saveBrokers(updated);
    return newBroker;
  },

  /** Reset to initial mock data */
  reset() {
    localStorage.removeItem(PLOTS_KEY);
    localStorage.removeItem(CUSTOMERS_KEY);
    localStorage.removeItem(BROKERS_KEY);
  }
};

export default plotService;

