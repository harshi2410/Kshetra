import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, Button } from '../../components/ui';

export default function ProjectForm({
  isOpen,
  onClose,
  onSubmit,
  project = null, // null for create, object for edit
  loading = false
}) {
  const isEditing = Boolean(project);

  const [formData, setFormData] = useState({
    name: '',
    developer: '',
    location: '',
    type: 'Residential',
    status: 'Active',
    totalPlots: '',
    soldPlots: '0',
    revenue: '',
    totalArea: '',
    priceRange: '',
    startDate: '',
    expectedCompletion: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        developer: project.developer || '',
        location: project.location || '',
        type: project.type || 'Residential',
        status: project.status || 'Active',
        totalPlots: project.totalPlots !== undefined ? String(project.totalPlots) : '',
        soldPlots: project.soldPlots !== undefined ? String(project.soldPlots) : '0',
        revenue: project.revenue !== undefined ? String(project.revenue) : '',
        totalArea: project.totalArea || '',
        priceRange: project.priceRange || '',
        startDate: project.startDate ? project.startDate.split('T')[0] : '',
        expectedCompletion: project.expectedCompletion ? project.expectedCompletion.split('T')[0] : ''
      });
    } else {
      setFormData({
        name: '',
        developer: 'LandOS Developers',
        location: '',
        type: 'Residential',
        status: 'Active',
        totalPlots: '',
        soldPlots: '0',
        revenue: '',
        totalArea: '',
        priceRange: '',
        startDate: new Date().toISOString().split('T')[0],
        expectedCompletion: ''
      });
    }
    setErrors({});
  }, [project, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Project name is required';
    if (!formData.developer.trim()) newErrors.developer = 'Developer name is required';
    if (!formData.location.trim()) newErrors.location = 'Location/City is required';
    if (!formData.totalPlots || isNaN(formData.totalPlots) || Number(formData.totalPlots) <= 0) {
      newErrors.totalPlots = 'Valid total plots count is required';
    }
    if (formData.soldPlots && (isNaN(formData.soldPlots) || Number(formData.soldPlots) < 0)) {
      newErrors.soldPlots = 'Sold plots cannot be negative';
    }
    if (formData.soldPlots && Number(formData.soldPlots) > Number(formData.totalPlots)) {
      newErrors.soldPlots = 'Sold plots cannot exceed total plots';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  const typeOptions = [
    { value: 'Residential', label: 'Residential' },
    { value: 'Commercial', label: 'Commercial' },
    { value: 'Mixed Use', label: 'Mixed Use' }
  ];

  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Upcoming', label: 'Upcoming / Planning' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <Modal.Header onClose={onClose}>
        <Modal.Title>{isEditing ? 'Edit Project' : 'Create New Project'}</Modal.Title>
      </Modal.Header>

      <form onSubmit={handleSubmit}>
        <Modal.Content className="space-y-4">
          {/* Row 1: Name & Developer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Project Name *"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Sunrise Valley Phase 2"
              error={errors.name}
            />
            <Input
              label="Developer *"
              name="developer"
              value={formData.developer}
              onChange={handleChange}
              placeholder="e.g. Sunrise Infra Ltd"
              error={errors.developer}
            />
          </div>

          {/* Row 2: Location, Type & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Location / City *"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Pune, Maharashtra"
              error={errors.location}
            />

            <div>
              <label className="block text-xs font-medium text-[var(--df-text)] mb-1">
                Project Type
              </label>
              <Select
                name="type"
                value={formData.type}
                onChange={handleChange}
                options={typeOptions}
                size="md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--df-text)] mb-1">
                Status
              </label>
              <Select
                name="status"
                value={formData.status}
                onChange={handleChange}
                options={statusOptions}
                size="md"
              />
            </div>
          </div>

          {/* Row 3: Total Plots, Sold Plots, Revenue */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Total Plots *"
              name="totalPlots"
              type="number"
              value={formData.totalPlots}
              onChange={handleChange}
              placeholder="100"
              error={errors.totalPlots}
            />
            <Input
              label="Sold Plots"
              name="soldPlots"
              type="number"
              value={formData.soldPlots}
              onChange={handleChange}
              placeholder="0"
              error={errors.soldPlots}
            />
            <Input
              label="Project Revenue (in ₹)"
              name="revenue"
              type="number"
              value={formData.revenue}
              onChange={handleChange}
              placeholder="e.g. 45000000"
            />
          </div>

          {/* Row 4: Total Area, Price Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Total Area"
              name="totalArea"
              value={formData.totalArea}
              onChange={handleChange}
              placeholder="e.g. 45 Acres"
            />
            <Input
              label="Price Range"
              name="priceRange"
              value={formData.priceRange}
              onChange={handleChange}
              placeholder="e.g. ₹25L – ₹80L"
            />
          </div>

          {/* Row 5: Start Date & Completion Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleChange}
            />
            <Input
              label="Expected Completion"
              name="expectedCompletion"
              type="date"
              value={formData.expectedCompletion}
              onChange={handleChange}
            />
          </div>
        </Modal.Content>

        <Modal.Footer>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {isEditing ? 'Save Changes' : 'Create Project'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
