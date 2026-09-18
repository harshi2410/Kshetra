import initialPlots from '../data/plots.json';
import initialCustomers from '../data/customers.json';
import initialBrokers from '../data/brokers.json';
import projectService from './projectService';

const PLOTS_KEY = 'landos_plots_data';
const CUSTOMERS_KEY = 'landos_customers_data';
const BROKERS_KEY = 'landos_brokers_data';

export function normalizePlot(raw, projectId = '') {
  let geoProps = {};
  if (raw.polygonGeojson) {
    try {
      const parsed = typeof raw.polygonGeojson === 'string' ? JSON.parse(raw.polygonGeojson) : raw.polygonGeojson;
      geoProps = parsed.properties || {};
    } catch (e) {}
  }

  const plotNo = raw.plotNumber || raw.plotNo || geoProps.plotNumber || raw.plotId || 'P-00';
  const areaSqft = Number(raw.calculatedAreaSqFt ?? geoProps.areaSqft ?? raw.areaSqft ?? raw.area ?? 0);
  const areaSqm = Number(geoProps.areaSqm ?? raw.areaSqm ?? (areaSqft > 0 ? (areaSqft * 0.092903).toFixed(1) : 0));
  const facing = (raw.facingDirection || geoProps.facing || raw.facing || 'NORTH').toUpperCase();

  // Dimensions
  let dimensions = geoProps.dimensions || raw.dimensionsDisplay || raw.dimensions || '';
  if (!dimensions && raw.notes) {
    const firstPart = raw.notes.split(',')[0].trim();
    if (firstPart.includes('FT') || firstPart.includes('×') || firstPart.includes('x')) {
      dimensions = firstPart;
    }
  }
  if (!dimensions && (raw.widthFt || raw.depthFt)) {
    dimensions = `${raw.widthFt || 30} × ${raw.depthFt || 40} FT`;
  }
  if (!dimensions) {
    dimensions = 'Standard 30×40 FT';
  }

  const isCorner = Boolean(geoProps.isCorner ?? raw.isCorner ?? false);

  // Road Name
  let roadName = geoProps.roadName || raw.roadName || '';
  if (!roadName && raw.notes && raw.notes.includes(',')) {
    roadName = raw.notes.split(',').slice(1).join(',').trim();
  }
  if (!roadName) {
    roadName = 'Main Avenue (9.0M ROW)';
  }

  const price = Number(raw.basePrice ?? raw.estimatedPrice ?? raw.price ?? (areaSqft > 0 ? areaSqft * 2500 : 0));

  const rawStatus = (raw.status || 'AVAILABLE').toUpperCase();
  const status = rawStatus === 'AVAILABLE' ? 'Available'
               : rawStatus === 'RESERVED' ? 'Reserved'
               : rawStatus === 'SOLD' ? 'Sold'
               : rawStatus === 'BLOCKED' ? 'Blocked'
               : 'Available';

  const customerName = raw.customerName || raw.activeBooking?.customerName || (raw.customerId ? (loadCustomers().find(c => c.id === raw.customerId)?.name || '') : '');
  const customerPhone = raw.customerPhone || raw.activeBooking?.customerPhone || (raw.customerId ? (loadCustomers().find(c => c.id === raw.customerId)?.phone || '') : '');
  const customerEmail = raw.customerEmail || raw.activeBooking?.customerEmail || (raw.customerId ? (loadCustomers().find(c => c.id === raw.customerId)?.email || '') : '');

  return {
    id: raw.id || raw.plotId || `plot-${plotNo}`,
    plotId: raw.plotId || raw.id,
    plotNo,
    plotNumber: plotNo,
    area: Math.round(areaSqft),
    areaSqft: Number(areaSqft.toFixed(1)),
    areaSqm: Number(areaSqm.toFixed(1)),
    facing,
    dimensions,
    isCorner,
    roadName,
    price: Math.round(price),
    basePrice: price,
    ratePerSqft: areaSqft > 0 ? Math.round(price / areaSqft) : 0,
    status,
    rawStatus,
    customerId: raw.customerId || null,
    customerName,
    customerPhone,
    customerEmail,
    brokerId: raw.brokerId || null,
    notes: raw.notes || '',
    projectId: raw.projectId || projectId,
    activeBooking: raw.activeBooking || null,
  };
}

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
    if (!projectId) return [];

    try {
      // 1. Try Backend DB project_plots
      const backendPlots = await projectService.getProjectPlots(projectId);
      if (backendPlots && Array.isArray(backendPlots) && backendPlots.length > 0) {
        return backendPlots.map(p => normalizePlot(p, projectId));
      }

      // 2. Check layout variants model if project_plots not yet populated
      const variants = await projectService.getProjectVariants(projectId);
      if (variants && variants.length > 0) {
        const activeVar = variants.find(v => v.isSelected) || variants[0];
        const model = await projectService.getVariantModel(projectId, activeVar.id);
        if (model && model.plots && model.plots.length > 0) {
          return model.plots.map(p => normalizePlot({ ...p, projectId }));
        }
      }
    } catch (err) {
      console.warn('Backend plot fetch warning:', err);
    }

    // 3. Fallback to localStorage / initialPlots
    return loadPlots().filter(p => p.projectId === projectId).map(p => normalizePlot(p, projectId));
  },

  /** GET single plot by id */
  async getPlotById(plotId) {
    const plots = loadPlots();
    const plot = plots.find(p => p.id === plotId);
    if (plot) return normalizePlot(plot);
    return null;
  },

  /** UPDATE a plot (status, price, customerId, brokerId, notes, customerName, customerPhone, customerEmail) */
  async updatePlot(plotId, updates, projectId = null) {
    // If customer details were provided, ensure customer is also saved in local customers list
    if (updates.customerName && updates.customerName.trim()) {
      let cust = this.getAllCustomers().find(c => c.name.toLowerCase() === updates.customerName.trim().toLowerCase());
      if (!cust) {
        cust = this.addCustomer({
          name: updates.customerName.trim(),
          phone: updates.customerPhone || '',
          email: updates.customerEmail || '',
        });
      }
      updates.customerId = cust.id;
    }

    if (projectId) {
      try {
        await projectService.updatePlotStatus(projectId, plotId, {
          status: updates.status ? updates.status.toUpperCase() : undefined,
          basePrice: updates.price !== undefined ? Number(updates.price) : undefined,
          customerId: updates.customerId || null,
          customerName: updates.customerName || null,
          customerPhone: updates.customerPhone || null,
          customerEmail: updates.customerEmail || null,
          notes: updates.notes,
        });
      } catch (err) {
        console.warn('Backend plot status update warning:', err);
      }
    }

    const plots = loadPlots();
    const idx = plots.findIndex(p => p.id === plotId || p.plotNo === plotId || p.plotNumber === plotId);
    if (idx !== -1) {
      plots[idx] = { ...plots[idx], ...updates };
      savePlots(plots);
      return normalizePlot(plots[idx], projectId);
    } else {
      const newEntry = {
        id: plotId,
        plotNo: updates.plotNo || updates.plotNumber || plotId,
        plotNumber: updates.plotNumber || updates.plotNo || plotId,
        projectId,
        ...updates
      };
      plots.push(newEntry);
      savePlots(plots);
      return normalizePlot(newEntry, projectId);
    }
  },

  /** GET plot count stats for a project */
  async getProjectStats(projectId) {
    const plots = await this.getPlotsByProject(projectId);
    const totalSqft = plots.reduce((s, p) => s + (p.areaSqft || p.area || 0), 0);
    const totalSqm = plots.reduce((s, p) => s + (p.areaSqm || 0), 0);
    const totalValue = plots.reduce((s, p) => s + (p.price || 0), 0);

    return {
      total:     plots.length,
      sold:      plots.filter(p => p.status === 'Sold').length,
      reserved:  plots.filter(p => p.status === 'Reserved').length,
      available: plots.filter(p => p.status === 'Available').length,
      blocked:   plots.filter(p => p.status === 'Blocked').length,
      revenue:   plots.filter(p => p.status === 'Sold').reduce((s, p) => s + (p.price || 0), 0),
      totalValue,
      totalSqft,
      totalSqm: totalSqm || Number((totalSqft * 0.092903).toFixed(1)),
      avgSqft: plots.length > 0 ? Math.round(totalSqft / plots.length) : 0,
      cornerPlots: plots.filter(p => p.isCorner).length,
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

