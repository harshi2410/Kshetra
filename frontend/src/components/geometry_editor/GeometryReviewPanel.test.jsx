/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { GeometryReviewPanel } from './GeometryReviewPanel';

afterEach(cleanup);

describe('GeometryReviewPanel', () => {
  const mockModel = {
    plots: [{ id: 'p1', plotNumber: '1', reviewMetadata: { plotNumber: { reviewStatus: 'CORRECTED' } } }],
    roads: [{ id: 'r1' }],
    ocrAssignments: []
  };

  it('renders correctly and prevents approval initially', () => {
    const handleApprove = vi.fn();
    const handleClose = vi.fn();
    
    render(
      <GeometryReviewPanel
        model={mockModel}
        validationResult={{ isValid: true, errors: [] }}
        onApprove={handleApprove}
        onClose={handleClose}
      />
    );

    // Initial state: not all checked
    const approveBtn = screen.getByRole('button', { name: /Approve Layout/i });
    expect(approveBtn.disabled).toBe(true);
    
    expect(screen.getByText('OCR Corrections')).toBeTruthy();
  });

  it('enables approval after checking all items and validation passes', () => {
    const handleApprove = vi.fn();
    
    render(
      <GeometryReviewPanel
        model={mockModel}
        validationResult={{ isValid: true, errors: [] }}
        onApprove={handleApprove}
      />
    );

    const approveBtn = screen.getByRole('button', { name: /Approve Layout/i });
    expect(approveBtn.disabled).toBe(true);

    // Click all checkboxes
    const checkboxes = [
      'Project boundary verified', 'All plots verified', 'Roads verified', 'Plot/road overlaps checked',
      'Plot numbers verified', 'Road names verified', 'OCR corrections reviewed',
      'Plot areas verified', 'Dimensions verified', 'Facing verified', 'Road access verified',
      'Project location verified', 'North orientation & map alignment verified'
    ];

    for (const labelText of checkboxes) {
      fireEvent.click(screen.getByText(labelText));
    }

    expect(approveBtn.disabled).toBe(false);
    fireEvent.click(approveBtn);
    expect(handleApprove).toHaveBeenCalled();
  });

  it('keeps approval disabled if validation fails even if all checked', () => {
    render(
      <GeometryReviewPanel
        model={mockModel}
        validationResult={{ isValid: false, errors: ['Overlapping plots'] }}
        onApprove={vi.fn()}
      />
    );

    const approveBtn = screen.getByRole('button', { name: /Approve Layout/i });
    
    const checkboxes = [
      'Project boundary verified', 'All plots verified', 'Roads verified', 'Plot/road overlaps checked',
      'Plot numbers verified', 'Road names verified', 'OCR corrections reviewed',
      'Plot areas verified', 'Dimensions verified', 'Facing verified', 'Road access verified',
      'Project location verified', 'North orientation & map alignment verified'
    ];

    for (const labelText of checkboxes) {
      fireEvent.click(screen.getByText(labelText));
    }

    // Still disabled because validation failed
    expect(approveBtn.disabled).toBe(true);
    expect(screen.getByText('Validation Failed')).toBeTruthy();
    expect(screen.getByText('Overlapping plots')).toBeTruthy();
  });
});
