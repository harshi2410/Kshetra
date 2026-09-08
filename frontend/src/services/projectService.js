import initialProjects from '../data/projects.json';

const BASE_PATHS = [
  'http://localhost:8000/api/v1/projects',
  'http://127.0.0.1:8000/api/v1/projects'
];

async function apiFetch(path = '', options = {}) {
  let lastErr = null;
  let lastRes = null;
  for (const basePath of BASE_PATHS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${basePath}${path}`, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        return res;
      }
      if (!lastRes) lastRes = res;
    } catch (err) {
      lastErr = err;
    }
  }
  if (lastRes) return lastRes;
  throw lastErr || new Error('Backend API unreachable');
}

const STORAGE_KEY = 'landos_projects_data';

// Internal helper to get persisted state or initialize from projects.json
function loadProjectsFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Invalidate old legacy mock data (proj_001 etc.) so real backend data overrides it
      const hasLegacyMock = Array.isArray(parsed) && parsed.some(p => p.id && String(p.id).startsWith('proj_00'));
      if (!hasLegacyMock) {
        return parsed;
      }
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.error('Error loading projects from localStorage:', err);
  }
  return initialProjects;
}

// Internal helper to save state to localStorage
function saveProjectsToStorage(projects) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (err) {
    console.error('Error saving projects to localStorage:', err);
  }
}

/**
 * Service layer for Projects module.
 * Executes HTTP requests to FastAPI backend (POST /api/v1/projects, GET /api/v1/projects),
 * falling back gracefully to localStorage if backend is unreachable.
 */
export const projectService = {
  /**
   * Fetch all projects
   * API Endpoint: GET /api/v1/projects
   */
  async getProjects() {
    try {
      const res = await apiFetch('', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        saveProjectsToStorage(data);
        return data;
      }
    } catch (err) {
      console.warn('FastAPI backend unreachable, using localStorage fallback:', err.message);
    }
    return loadProjectsFromStorage();
  },

  /**
   * Fetch single project by ID
   * API Endpoint: GET /api/v1/projects/:id
   */
  async getProjectById(id) {
    try {
      const res = await apiFetch(`/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (err) {
      console.warn(`FastAPI backend unreachable for GET ${id}, using localStorage:`, err.message);
    }

    const projects = loadProjectsFromStorage();
    const project = projects.find((p) => p.id === id);
    if (!project) {
      throw new Error(`Project with ID ${id} not found.`);
    }
    return project;
  },

  /**
   * Fetch all layout sources for a project
   * API Endpoint: GET /api/v1/projects/:projectId/layouts
   */
  async getProjectLayoutSources(projectId) {
    try {
      const res = await apiFetch(`/${projectId}/layouts`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn(`Failed to fetch layout sources for project ${projectId}:`, err);
    }
    return [];
  },

  /**
   * Upload a binary layout blueprint file (multipart form)
   * API Endpoint: POST /api/v1/projects/:projectId/layouts
   */
  async uploadLayoutFile(projectId, file, scaleRatio = 'Not specified') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('scale_ratio', scaleRatio);
    try {
      const res = await apiFetch(`/${projectId}/layouts`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Failed to upload layout file:', err);
    }
    return null;
  },


  /**
   * Create a new project
   * API Endpoint: POST /api/v1/projects
   */
  async createProject(projectData) {
    // Construct clean payload matching Pydantic ProjectCreate schema
    const payload = {
      name: projectData.name,
      developer: projectData.developer || 'LandOS Developers',
      type: projectData.type || 'Residential',
      landClassification: projectData.landClassification || 'N.A. Residential',
      description: projectData.description || '',

      state: projectData.state || 'Maharashtra',
      district: projectData.district || 'Pune',
      taluka: projectData.taluka || 'Haveli',
      cityVillage: projectData.cityVillage || 'Wagholi',
      pincode: projectData.pincode || '412207',
      surveyNumbers: Array.isArray(projectData.surveyNumbers) && projectData.surveyNumbers.length > 0
        ? projectData.surveyNumbers
        : ['Gut No. 142/1'],
      latitude: projectData.latitude ? Number(projectData.latitude) : null,
      longitude: projectData.longitude ? Number(projectData.longitude) : null,
      approvingAuthority: projectData.approvingAuthority || '',
      reraNo: projectData.reraNo || '',

      grossArea: Number(projectData.grossArea) || 45.0,
      areaUnit: projectData.areaUnit || 'Acres',
      baseRatePerSqFt: projectData.baseRatePerSqFt ? Number(projectData.baseRatePerSqFt) : null,
      priceMin: projectData.priceMin ? Number(projectData.priceMin) : null,
      priceMax: projectData.priceMax ? Number(projectData.priceMax) : null,
      startDate: projectData.startDate || new Date().toISOString().split('T')[0],
      expectedCompletion: projectData.expectedCompletion || '',

      knownScale: projectData.knownScale || 'Not specified',
      scaleRatio: projectData.scaleRatio || '',
      status: projectData.status || (projectData.layoutFile || projectData.layoutUploaded ? 'LAYOUT_PENDING' : 'DRAFT'),
      layoutUploaded: Boolean(projectData.layoutFile || projectData.layoutUploaded),
      layoutFile: projectData.layoutFile ? {
        name: projectData.layoutFile.name,
        size: projectData.layoutFile.size,
        type: projectData.layoutFile.type
      } : null
    };

    try {
      const res = await apiFetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const createdProject = await res.json();
        // Also sync local storage so offline reloads retain data
        const localList = loadProjectsFromStorage();
        saveProjectsToStorage([createdProject, ...localList]);
        return createdProject;
      } else {
        const errJson = await res.json();
        console.error('FastAPI validation error:', errJson);
        throw new Error(errJson.detail || 'Failed to create project on FastAPI server');
      }
    } catch (err) {
      console.warn('FastAPI backend unreachable during POST, falling back to local creation:', err.message);

      // Fallback local creation
      const locationString = `${payload.cityVillage}, ${payload.district}, ${payload.state}`;
      const priceRange = payload.priceMin && payload.priceMax
        ? `₹${Number(payload.priceMin).toLocaleString('en-IN')} – ₹${Number(payload.priceMax).toLocaleString('en-IN')}`
        : 'Price on request';

      const fallbackProject = {
        id: `proj_${Date.now()}`,
        ...payload,
        location: locationString,
        totalPlots: 0, soldPlots: 0, availablePlots: 0, reservedPlots: 0, blockedPlots: 0, revenue: 0,
        locationDetails: {
          state: payload.state, district: payload.district, taluka: payload.taluka,
          cityVillage: payload.cityVillage, pincode: payload.pincode, surveyNumbers: payload.surveyNumbers,
          latitude: payload.latitude, longitude: payload.longitude, approvingAuthority: payload.approvingAuthority, reraNo: payload.reraNo
        },
        landDetails: {
          grossArea: payload.grossArea, areaUnit: payload.areaUnit, baseRatePerSqFt: payload.baseRatePerSqFt,
          priceMin: payload.priceMin, priceMax: payload.priceMax
        },
        totalArea: `${payload.grossArea} ${payload.areaUnit}`,
        priceRange,
        layoutSource: payload.layoutFile ? {
          fileName: payload.layoutFile.name, fileSize: payload.layoutFile.size, fileType: payload.layoutFile.type,
          scaleRatio: payload.scaleRatio || 'Not specified', uploadedAt: new Date().toISOString()
        } : null,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };

      const projects = loadProjectsFromStorage();
      saveProjectsToStorage([fallbackProject, ...projects]);
      return fallbackProject;
    }
  },

  /**
   * Update an existing project
   */
  async updateProject(id, projectData) {
    const projects = loadProjectsFromStorage();
    const index = projects.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Project with ID ${id} not found.`);
    }

    const existing = projects[index];
    const updatedProject = {
      ...existing,
      ...projectData,
      updatedAt: new Date().toISOString()
    };

    projects[index] = updatedProject;
    saveProjectsToStorage(projects);
    return updatedProject;
  },

  /**
   * Delete a project by ID
   * API Endpoint: DELETE /api/v1/projects/:id
   */
  async deleteProject(id) {
    try {
      await apiFetch(`/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.warn(`FastAPI backend delete failed for project ${id}:`, err.message);
    }
    const projects = loadProjectsFromStorage();
    const filtered = projects.filter((p) => p.id !== id);
    saveProjectsToStorage(filtered);
    return { success: true, id };
  },

  /**
   * Update plot inventory status (AVAILABLE, RESERVED, SOLD, BLOCKED)
   * API Endpoint: PATCH /api/v1/projects/:projectId/plots/:plotId
   */
  async updatePlotStatus(projectId, plotId, updatePayload) {
    try {
      const res = await apiFetch(`/${projectId}/plots/${plotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      if (res.ok) {
        return await res.json();
      }
      const errJson = await res.json();
      throw new Error(errJson.detail || 'Failed to update plot status');
    } catch (err) {
      console.warn(`FastAPI backend updatePlotStatus failed:`, err.message);
      throw err;
    }
  },

  /**
   * Trigger single-trigger automated processing pipeline (14 stages)
   * API Endpoint: POST /api/v1/projects/:projectId/layouts/:layoutId/process
   */
  async processLayoutSource(projectId, layoutId) {
    try {
      const res = await apiFetch(`/${projectId}/layouts/${layoutId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Failed to trigger layout processing pipeline:', err);
    }
    return null;
  },

  /**
   * Fetch reconstituted vector LAYOUT_SVG artifact
   * API Endpoint: GET /api/v1/projects/:projectId/layouts/:layoutId/layout-svg
   */
  async getLayoutSvg(projectId, layoutId) {
    try {
      const res = await apiFetch(`/${projectId}/layouts/${layoutId}/layout-svg`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Failed to fetch layout SVG from backend:', err);
    }
    return null;
  },

  /**
   * Fetch synthesized UNIVERSAL_LAYOUT_MODEL artifact
   * API Endpoint: GET /api/v1/projects/:projectId/layouts/:layoutId/layout-model
   */
  async getLayoutModel(projectId, layoutId) {
    try {
      const res = await apiFetch(`/${projectId}/layouts/${layoutId}/layout-model`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Failed to fetch layout model from backend:', err);
    }
    return null;
  },

  async getLayoutReview(projectId, layoutId) {
    try {
      const res = await apiFetch(`/${projectId}/layouts/${layoutId}/review`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('Failed to fetch layout review report:', err);
    }
    return null;
  },

  async approveLayout(projectId, layoutId, approvedBy = 'Chief Architect') {
    try {
      const res = await apiFetch(`/${projectId}/layouts/${layoutId}/approve?approved_by=${encodeURIComponent(approvedBy)}`, {
        method: 'POST'
      });
      if (res.ok) return await res.json();
      const errData = await res.json();
      throw new Error(errData.detail || 'Failed to approve layout');
    } catch (err) {
      console.error('approveLayout error:', err);
      throw err;
    }
  },

  async patchPlotGeometry(projectId, layoutId, plotId, patchPayload) {
    try {
      const res = await apiFetch(`/${projectId}/layouts/${layoutId}/plots/${plotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload)
      });
      if (res.ok) return await res.json();
      const errData = await res.json();
      throw new Error(errData.detail || 'Failed to patch plot');
    } catch (err) {
      console.error('patchPlotGeometry error:', err);
      throw err;
    }
  },

  async patchRoadGeometry(projectId, layoutId, roadId, patchPayload) {
    try {
      const res = await apiFetch(`/${projectId}/layouts/${layoutId}/roads/${roadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload)
      });
      if (res.ok) return await res.json();
      const errData = await res.json();
      throw new Error(errData.detail || 'Failed to patch road');
    } catch (err) {
      console.error('patchRoadGeometry error:', err);
      throw err;
    }
  },

  async saveLayoutModel(projectId, layoutId, layoutModel, changeSummary = 'Saved geometry edit') {
    try {
      const res = await apiFetch(`/${projectId}/layouts/${layoutId}/model`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layoutModel, changeSummary })
      });
      if (res.ok) return await res.json();
      const errData = await res.json();
      throw new Error(errData.detail || 'Failed to save layout model');
    } catch (err) {
      console.error('saveLayoutModel error:', err);
      throw err;
    }
  },

  async createLayoutRevision(projectId, layoutId) {
    try {
      const res = await apiFetch(`/${projectId}/layouts/${layoutId}/revisions`, { method: 'POST' });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error('createLayoutRevision error:', err);
    }
    return null;
  },

  async rollbackLayoutVersion(projectId, layoutId, targetVersion) {
    try {
      const res = await apiFetch(`/${projectId}/layouts/${layoutId}/rollback?target_version=${targetVersion}`, { method: 'POST' });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error('rollbackLayoutVersion error:', err);
    }
    return null;
  },

  /**
   * Trigger an asynchronous AI Land Understanding & Layout Generation Run
   * API Endpoint: POST /api/v1/projects/:projectId/ai-runs
   */
  async triggerAIRun(projectId, constraints = {}) {
    try {
      const res = await apiFetch(`/${projectId}/ai-runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planningConstraints: constraints })
      });
      if (res.ok) return await res.json();
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Failed to trigger AI run');
    } catch (err) {
      console.error('triggerAIRun error:', err);
      throw err;
    }
  },

  /**
   * Poll asynchronous AI run status
   * API Endpoint: GET /api/v1/projects/:projectId/ai-runs/:runId
   */
  async getAIRunStatus(projectId, runId) {
    try {
      const res = await apiFetch(`/${projectId}/ai-runs/${runId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error('getAIRunStatus error:', err);
    }
    return null;
  },

  /**
   * Fetch full structured intermediate and final AI representations
   * API Endpoint: GET /api/v1/projects/:projectId/ai-runs/:runId/result
   */
  async getAIRunResult(projectId, runId) {
    try {
      const res = await apiFetch(`/${projectId}/ai-runs/${runId}/result`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error('getAIRunResult error:', err);
    }
    return null;
  },

  /**
   * List all generated layout variants for a project
   * API Endpoint: GET /api/v1/projects/:projectId/variants
   */
  async getProjectVariants(projectId) {
    try {
      const res = await apiFetch(`/${projectId}/variants`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('getProjectVariants fallback to local generation:', err.message);
    }

    // Check local storage cached variants
    const cacheKey = `landos_variants_${projectId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }

    // Generate standard 4 multi-alternative layout designs
    const mockVariants = [
      {
        id: `var-grid-${projectId}`,
        variantNumber: 1,
        strategyName: 'Orthogonal Grid Layout',
        totalPlots: 48,
        averagePlotAreaSqft: 1200,
        totalRoadAreaSqft: 18000,
        utilizationPercent: 68.5,
        compositeScore: 88,
        isSelected: true,
        evaluation: { compositeScore: 88, utilizationScore: 92, accessibilityScore: 95, greenComplianceScore: 85 }
      },
      {
        id: `var-spine-${projectId}`,
        variantNumber: 2,
        strategyName: 'Arterial Spine Layout',
        totalPlots: 44,
        averagePlotAreaSqft: 1350,
        totalRoadAreaSqft: 22000,
        utilizationPercent: 64.2,
        compositeScore: 84,
        isSelected: false,
        evaluation: { compositeScore: 84, utilizationScore: 86, accessibilityScore: 96, greenComplianceScore: 88 }
      },
      {
        id: `var-loop-${projectId}`,
        variantNumber: 3,
        strategyName: 'Perimeter Loop Layout',
        totalPlots: 40,
        averagePlotAreaSqft: 1450,
        totalRoadAreaSqft: 25000,
        utilizationPercent: 61.0,
        compositeScore: 79,
        isSelected: false,
        evaluation: { compositeScore: 79, utilizationScore: 82, accessibilityScore: 90, greenComplianceScore: 92 }
      },
      {
        id: `var-cluster-${projectId}`,
        variantNumber: 4,
        strategyName: 'Cluster Courtyard Layout',
        totalPlots: 36,
        averagePlotAreaSqft: 1600,
        totalRoadAreaSqft: 20000,
        utilizationPercent: 58.4,
        compositeScore: 74,
        isSelected: false,
        evaluation: { compositeScore: 74, utilizationScore: 78, accessibilityScore: 88, greenComplianceScore: 95 }
      }
    ];

    try {
      localStorage.setItem(cacheKey, JSON.stringify(mockVariants));
    } catch (e) {}

    return mockVariants;
  },

  /**
   * Get SVG rendering for a specific layout variant
   * API Endpoint: GET /api/v1/projects/:projectId/variants/:variantId/svg
   */
  async getVariantSvg(projectId, variantId) {
    try {
      const res = await apiFetch(`/${projectId}/variants/${variantId}/svg`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('getVariantSvg fallback:', err.message);
    }

    // Return rich parametric SVG representation
    const plotsCount = variantId?.includes('spine') ? 44 : variantId?.includes('loop') ? 40 : variantId?.includes('cluster') ? 36 : 48;
    const plots = [];
    const cols = 6;
    const rows = Math.ceil(plotsCount / cols);
    const pw = 45;
    const ph = 30;
    const startX = 50;
    const startY = 60;
    const roadW = 20;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c + 1;
        if (idx > plotsCount) break;
        const x = startX + c * (pw + 4);
        const y = startY + r * (ph + (r % 2 === 1 ? roadW : 4));
        const isCorner = c === 0 || c === cols - 1;
        const fill = isCorner ? 'rgba(245, 158, 11, 0.18)' : 'rgba(16, 185, 129, 0.15)';
        const stroke = isCorner ? '#f59e0b' : '#10b981';
        plots.push(`
          <g class="landos-plot-group" data-plot-id="plot-${idx}">
            <polygon points="${x},${y} ${x + pw},${y} ${x + pw},${y + ph} ${x},${y + ph}" fill="${fill}" stroke="${stroke}" stroke-width="1.2" class="landos-plot" id="plot-poly-${idx}"/>
            <text x="${x + pw / 2}" y="${y + ph / 2 - 2}" fill="#f8fafc" font-size="8" text-anchor="middle" font-weight="bold">P-${idx.toString().padStart(3, '0')}</text>
            <text x="${x + pw / 2}" y="${y + ph / 2 + 8}" fill="#94a3b8" font-size="6.5" text-anchor="middle">1200 SQFT</text>
          </g>
        `);
      }
    }

    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 320" width="100%" height="100%" style="background: #090e17; font-family: Inter, system-ui, sans-serif;">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        <!-- Outer Boundary -->
        <polygon points="30,30 380,30 380,280 30,280" fill="rgba(30, 41, 59, 0.4)" stroke="#3b82f6" stroke-width="2" stroke-dasharray="6,4"/>
        
        <!-- Central Green Park -->
        <polygon points="140,240 270,240 270,270 140,270" fill="rgba(16, 185, 129, 0.25)" stroke="#10b981" stroke-width="1.5"/>
        <text x="205" y="258" fill="#10b981" font-size="9" text-anchor="middle" font-weight="700">Central Eco Park</text>

        <!-- Internal Roads -->
        <rect x="40" y="125" width="330" height="16" fill="rgba(51, 65, 85, 0.75)" stroke="#64748b" stroke-width="1"/>
        <text x="205" y="136" fill="#cbd5e1" font-size="7.5" text-anchor="middle" font-weight="600" letter-spacing="1">MAIN AVENUE (30 FT)</text>

        <!-- Plots Layer -->
        ${plots.join('\n')}
      </svg>
    `;

    return { svgContent: svgString };
  },

  /**
   * Get complete model JSON for a layout variant
   * API Endpoint: GET /api/v1/projects/:projectId/variants/:variantId/model
   */
  async getVariantModel(projectId, variantId) {
    try {
      const res = await apiFetch(`/${projectId}/variants/${variantId}/model`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('getVariantModel fallback:', err.message);
    }

    const plotsCount = variantId?.includes('spine') ? 44 : variantId?.includes('loop') ? 40 : variantId?.includes('cluster') ? 36 : 48;
    const plotsList = Array.from({ length: plotsCount }, (_, i) => ({
      plotId: `plot-${i + 1}`,
      plotNumber: `P-${(i + 1).toString().padStart(3, '0')}`,
      areaSqft: 1200,
      widthFt: 30,
      depthFt: 40,
      dimensions: '30 × 40 FT',
      facing: i % 2 === 0 ? 'NORTH' : 'SOUTH',
      roadName: 'Main Avenue',
      isCorner: i % 6 === 0 || i % 6 === 5,
      status: 'AVAILABLE',
      estimatedPrice: 3600000
    }));

    return {
      variantId,
      strategyName: variantId?.includes('spine') ? 'Arterial Spine Layout' : 'Orthogonal Grid Layout',
      statistics: {
        totalPlots: plotsCount,
        utilizationPercent: 68.5,
        totalLandAreaSqft: 100000,
        totalPlotAreaSqft: plotsCount * 1200
      },
      plots: plotsList
    };
  },

  /**
   * Select a variant as the primary project layout
   * API Endpoint: POST /api/v1/projects/:projectId/variants/:variantId/select
   */
  async selectVariant(projectId, variantId) {
    try {
      const res = await apiFetch(`/${projectId}/variants/${variantId}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('selectVariant fallback:', err.message);
    }

    const cacheKey = `landos_variants_${projectId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const list = JSON.parse(cached);
        const updated = list.map(v => ({ ...v, isSelected: v.id === variantId }));
        localStorage.setItem(cacheKey, JSON.stringify(updated));
      } catch (e) {}
    }
    return { success: true, selectedVariantId: variantId };
  },

  /**
   * Trigger generative multi-alternative layout generation
   * API Endpoint: POST /api/v1/projects/:projectId/generate-layouts
   */
  async generateLayouts(projectId, params) {
    try {
      const res = await apiFetch(`/${projectId}/generate-layouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('generateLayouts fallback:', err.message);
    }

    const variants = await this.getProjectVariants(projectId);
    return { projectId, message: 'Layouts generated', variants };
  },

  /**
   * Trigger async 12-stage AI Land Understanding & Layout Generation Pipeline
   * API Endpoint: POST /api/v1/projects/:projectId/ai-runs
   */
  async triggerAiRun(projectId, constraints = null, layoutSourceId = null) {
    try {
      const res = await apiFetch(`/${projectId}/ai-runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layoutSourceId,
          planningConstraints: constraints
        })
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('triggerAiRun error:', err.message);
    }
    return null;
  },

  /**
   * List all AI runs for a project
   * API Endpoint: GET /api/v1/projects/:projectId/ai-runs
   */
  async getProjectAiRuns(projectId) {
    try {
      const res = await apiFetch(`/${projectId}/ai-runs`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('getProjectAiRuns error:', err.message);
    }
    return [];
  },

  /**
   * Get single AI run status
   * API Endpoint: GET /api/v1/projects/:projectId/ai-runs/:runId
   */
  async getAiRunStatus(projectId, runId) {
    try {
      const res = await apiFetch(`/${projectId}/ai-runs/${runId}`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('getAiRunStatus error:', err.message);
    }
    return null;
  },

  /**
   * Get full structured result and intermediate artifacts of an AI run
   * API Endpoint: GET /api/v1/projects/:projectId/ai-runs/:runId/result
   */
  async getAiRunResult(projectId, runId) {
    try {
      const res = await apiFetch(`/${projectId}/ai-runs/${runId}/result`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('getAiRunResult error:', err.message);
    }
    return null;
  },

  /**
   * Get intermediate pipeline stage artifacts
   * API Endpoint: GET /api/v1/projects/:projectId/layouts/:layoutId/artifacts
   */
  async getLayoutArtifacts(projectId, layoutId) {
    try {
      const res = await apiFetch(`/${projectId}/layouts/${layoutId}/artifacts`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('getLayoutArtifacts error:', err.message);
    }
    return [];
  }
};

export default projectService;



