import React, { useState } from 'react';
import {
  Button,
  Input,
  Select,
  SearchInput,
  Card,
  Badge,
  Avatar,
  Table,
  Modal,
  Drawer,
  Dropdown,
  Tooltip,
  Tabs,
  EmptyState,
  Loader,
  Pagination,
  Toast
} from '../components/ui';
import {
  Plus,
  Trash2,
  CheckCircle,
  Download,
  Filter,
  MoreVertical,
  Layers,
  Sparkles,
  Search,
  User,
  Shield,
  FileText,
  Building,
  Mail,
  ExternalLink,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function ComponentsShowcase() {
  const { theme, toggleTheme } = useTheme();

  // State for interactive components
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerRightOpen, setDrawerRightOpen] = useState(false);
  const [drawerLeftOpen, setDrawerLeftOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const [tableSort, setTableSort] = useState({ column: 'name', direction: 'asc' });

  // Toast state
  const [toasts, setToasts] = useState([
    { id: 1, variant: 'success', title: 'Payment Confirmed', message: 'Transaction #TXN-9021 verified successfully.' }
  ]);

  const addToast = (variant, title, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, variant, title, message }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSort = (col) => {
    setTableSort((prev) => ({
      column: col,
      direction: prev.column === col && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sampleTableData = [
    { id: 'PLT-101', name: 'Sunrise Valley Plot 12', size: '1,200 sq ft', price: '₹45,00,000', status: 'Available' },
    { id: 'PLT-102', name: 'Green Meadows Plot 45', size: '1,800 sq ft', price: '₹68,50,000', status: 'Booked' },
    { id: 'PLT-103', name: 'Royal Heights Villa 08', size: '2,400 sq ft', price: '₹1,20,00,000', status: 'Sold' }
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg-app)] text-[var(--color-text-primary)] transition-colors duration-200">
      {/* Toast Overlay Container */}
      <Toast.Container position="bottom-right">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            id={t.id}
            variant={t.variant}
            title={t.title}
            message={t.message}
            onClose={removeToast}
          />
        ))}
      </Toast.Container>

      {/* Top Header */}
      <header className="sticky top-0 z-[var(--z-header)] bg-[var(--color-bg-app)]/90 backdrop-blur-md border-b border-[var(--color-border-subtle)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-primary)] flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] leading-none">
              LandOS Design System
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              Phase 2.2 — Reusable UI Components Library
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="primary" size="md">
            17 Components
          </Badge>
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleTheme}
            leftIcon={theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          >
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </div>
      </header>

      {/* Main Content Showcase */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-12">
        {/* Component 1: Button */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">1. Button Component</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Variants, sizes, icons, loading, and disabled states.</p>
            </div>
          </div>

          <Card>
            <Card.Content className="flex flex-col gap-6">
              <div>
                <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-3">Variants</span>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary">Primary Button</Button>
                  <Button variant="secondary">Secondary Button</Button>
                  <Button variant="ghost">Ghost Button</Button>
                  <Button variant="danger">Danger Button</Button>
                  <Button variant="success">Success Button</Button>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-3">Sizes</span>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small (sm)</Button>
                  <Button size="md">Medium (md)</Button>
                  <Button size="lg">Large (lg)</Button>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-3">States & Icons</span>
                <div className="flex flex-wrap items-center gap-3">
                  <Button leftIcon={<Plus className="w-4 h-4" />}>Add Project</Button>
                  <Button variant="secondary" rightIcon={<ChevronRight className="w-4 h-4" />}>Next Step</Button>
                  <Button loading>Processing</Button>
                  <Button disabled>Disabled Action</Button>
                </div>
              </div>
            </Card.Content>
          </Card>
        </section>

        {/* Component 2: Input */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">2. Input Component</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Text, Password, Textarea, Icons, Helper Text & Errors.</p>
            </div>
          </div>

          <Card>
            <Card.Content className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Input
                label="Standard Input"
                placeholder="Enter customer name..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                helperText="First and last name as per Aadhaar"
              />

              <Input
                label="Password Input"
                type="password"
                placeholder="Enter secure password..."
                helperText="Minimum 8 characters with numbers"
              />

              <Input
                label="Input with Prefix Icon"
                prefixIcon={<Mail className="w-4 h-4 text-[var(--color-text-muted)]" />}
                placeholder="user@example.com"
              />

              <Input
                label="Error State Input"
                value="Invalid Format"
                error="Please enter a valid phone number"
              />

              <Input
                label="Disabled Input"
                value="READ_ONLY_LICENSE_KEY"
                disabled
              />

              <Input
                label="Textarea Input"
                isTextarea
                rows={2}
                placeholder="Enter plot description notes..."
              />
            </Card.Content>
          </Card>
        </section>

        {/* Component 3: Select */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">3. Select Component</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Form dropdown selection with custom icons, states, and validation.</p>
            </div>
          </div>

          <Card>
            <Card.Content className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Select
                label="Project Status"
                placeholder="Choose status..."
                value={selectValue}
                onChange={(e) => setSelectValue(e.target.value)}
                options={[
                  { value: 'active', label: 'Active Phase' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'planning', label: 'Under Planning' }
                ]}
              />

              <Select
                label="Select with Error"
                placeholder="Choose broker..."
                error="Broker selection is required"
                options={['Rajesh Sharma', 'Priya Verma', 'Amit Kumar']}
              />

              <Select
                label="Disabled Select"
                value="disabled_val"
                disabled
                options={[{ value: 'disabled_val', label: 'Locked Option' }]}
              />
            </Card.Content>
          </Card>
        </section>

        {/* Component 4: SearchInput */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">4. SearchInput Component</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Search bar with clear trigger and keyboard shortcut badge.</p>
            </div>
          </div>

          <Card>
            <Card.Content className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SearchInput
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search plots, buyers, or documents..."
              />
              <SearchInput
                placeholder="Global search across LandOS..."
                shortcut="Ctrl+K"
              />
            </Card.Content>
          </Card>
        </section>

        {/* Component 5: Card */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">5. Card Component</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Compound Card structure with Header, Title, Content, and Footer.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <Card.Header>
                <div>
                  <Card.Title>Sunrise Valley Phase 1</Card.Title>
                  <Card.Description>Nagpur West Layout • RERA Approved</Card.Description>
                </div>
                <Card.Actions>
                  <Badge variant="success" dot>Active</Badge>
                </Card.Actions>
              </Card.Header>
              <Card.Content>
                Total Plots: 120 Units | Sold: 84 Units | Revenue: ₹14.2 Cr
              </Card.Content>
              <Card.Footer>
                <span>Updated 2 hours ago</span>
                <Button size="sm" variant="ghost" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>View Details</Button>
              </Card.Footer>
            </Card>

            <Card hoverable>
              <Card.Header>
                <div>
                  <Card.Title>Hoverable Interactive Card</Card.Title>
                  <Card.Description>Hover over this card to view subtle elevation shadow</Card.Description>
                </div>
              </Card.Header>
              <Card.Content>
                Clickable or focusable layout card with smooth shadow elevation.
              </Card.Content>
            </Card>
          </div>
        </section>

        {/* Component 6: Badge */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">6. Badge Component</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Status pill tags with primary, success, warning, danger, info & outline variants.</p>
            </div>
          </div>

          <Card>
            <Card.Content className="flex flex-wrap items-center gap-4">
              <Badge variant="primary">Primary</Badge>
              <Badge variant="success" dot>Success Dot</Badge>
              <Badge variant="warning" icon={<Shield className="w-3 h-3" />}>Warning Shield</Badge>
              <Badge variant="danger">Danger</Badge>
              <Badge variant="info">Info Badge</Badge>
              <Badge variant="outline">Outline Neutral</Badge>
            </Card.Content>
          </Card>
        </section>

        {/* Component 7: Avatar */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">7. Avatar Component</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Profile image, name fallback initials, status dots, and sizes.</p>
            </div>
          </div>

          <Card>
            <Card.Content className="flex flex-wrap items-center gap-8">
              <div className="flex items-center gap-3">
                <Avatar size="xs" name="Amit Kumar" status="online" />
                <Avatar size="sm" name="Priya Verma" status="away" />
                <Avatar size="md" name="Shivam Patle" status="online" />
                <Avatar size="lg" name="Rajesh Sharma" status="busy" />
                <Avatar size="xl" name="Vikram Singh" status="offline" />
              </div>
            </Card.Content>
          </Card>
        </section>

        {/* Component 8: Table */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">8. Table Component</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Sticky headers, column sorting indicators, hover rows, and pagination slot.</p>
            </div>
          </div>

          <Table
            pagination={
              <Pagination
                currentPage={currentPage}
                totalPages={5}
                pageSize={10}
                totalItems={50}
                onPageChange={(p) => setCurrentPage(p)}
              />
            }
          >
            <Table.Header>
              <Table.Row>
                <Table.Head sortable sortDirection={tableSort.column === 'id' ? tableSort.direction : null} onSort={() => handleSort('id')}>
                  Plot ID
                </Table.Head>
                <Table.Head sortable sortDirection={tableSort.column === 'name' ? tableSort.direction : null} onSort={() => handleSort('name')}>
                  Plot / Project Name
                </Table.Head>
                <Table.Head>Size</Table.Head>
                <Table.Head>Price</Table.Head>
                <Table.Head>Status</Table.Head>
                <Table.Head className="text-right">Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sampleTableData.map((row) => (
                <Table.Row key={row.id}>
                  <Table.Cell className="font-mono font-medium">{row.id}</Table.Cell>
                  <Table.Cell className="font-semibold">{row.name}</Table.Cell>
                  <Table.Cell>{row.size}</Table.Cell>
                  <Table.Cell>{row.price}</Table.Cell>
                  <Table.Cell>
                    <Badge variant={row.status === 'Available' ? 'success' : row.status === 'Booked' ? 'warning' : 'primary'} dot>
                      {row.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    <Button size="sm" variant="ghost">Edit</Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </section>

        {/* Component 9 & 10: Modal & Drawer */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">9 & 10. Modal & Drawer Components</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Overlays with ESC key dismiss, backdrop blur, and smooth transitions.</p>
            </div>
          </div>

          <Card>
            <Card.Content className="flex flex-wrap items-center gap-4">
              <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
              <Button variant="secondary" onClick={() => setDrawerRightOpen(true)}>Open Right Drawer</Button>
              <Button variant="secondary" onClick={() => setDrawerLeftOpen(true)}>Open Left Drawer</Button>
            </Card.Content>
          </Card>

          {/* Modal Instance */}
          <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
            <Modal.Header onClose={() => setModalOpen(false)}>
              <Modal.Title>Create New Plot Record</Modal.Title>
            </Modal.Header>
            <Modal.Content className="flex flex-col gap-4">
              <Input label="Plot Number" placeholder="e.g. Plot #402" />
              <Select label="Plot Category" options={['Residential', 'Commercial', 'Agricultural']} />
            </Modal.Content>
            <Modal.Footer>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setModalOpen(false)}>Save Plot</Button>
            </Modal.Footer>
          </Modal>

          {/* Drawer Right Instance */}
          <Drawer isOpen={drawerRightOpen} onClose={() => setDrawerRightOpen(false)} placement="right">
            <Drawer.Header onClose={() => setDrawerRightOpen(false)}>
              <Drawer.Title>Filter Projects Drawer</Drawer.Title>
            </Drawer.Header>
            <Drawer.Content className="flex flex-col gap-4">
              <p className="text-xs text-[var(--color-text-secondary)]">Filter properties by price range, RERA status, and city location.</p>
              <Input label="Min Price" placeholder="₹0" />
              <Input label="Max Price" placeholder="₹5,00,00,000" />
            </Drawer.Content>
            <Drawer.Footer>
              <Button variant="primary" onClick={() => setDrawerRightOpen(false)}>Apply Filters</Button>
            </Drawer.Footer>
          </Drawer>

          {/* Drawer Left Instance */}
          <Drawer isOpen={drawerLeftOpen} onClose={() => setDrawerLeftOpen(false)} placement="left">
            <Drawer.Header onClose={() => setDrawerLeftOpen(false)}>
              <Drawer.Title>Navigation Drawer</Drawer.Title>
            </Drawer.Header>
            <Drawer.Content>
              <p className="text-xs text-[var(--color-text-secondary)]">Left side menu slide-over navigation panel.</p>
            </Drawer.Content>
          </Drawer>
        </section>

        {/* Component 11: Dropdown */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">11. Dropdown Component</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Action popovers with headers, icons, dividers, and danger actions.</p>
            </div>
          </div>

          <Card>
            <Card.Content className="flex items-center gap-6">
              <Dropdown>
                <Dropdown.Trigger>
                  <Button variant="secondary" rightIcon={<MoreVertical className="w-4 h-4" />}>
                    Project Options
                  </Button>
                </Dropdown.Trigger>
                <Dropdown.Menu align="left">
                  <Dropdown.Header>Manage</Dropdown.Header>
                  <Dropdown.Item icon={<FileText className="w-4 h-4" />}>View Document</Dropdown.Item>
                  <Dropdown.Item icon={<Download className="w-4 h-4" />}>Export PDF</Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item danger icon={<Trash2 className="w-4 h-4" />}>Delete Project</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Card.Content>
          </Card>
        </section>

        {/* Component 12: Tooltip */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">12. Tooltip Component</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Hover & focus popover tooltips in top, bottom, left, and right directions.</p>
            </div>
          </div>

          <Card>
            <Card.Content className="flex flex-wrap items-center gap-6 py-8 justify-center">
              <Tooltip content="Tooltip on Top" position="top">
                <Button variant="secondary">Top Tooltip</Button>
              </Tooltip>
              <Tooltip content="Tooltip on Bottom" position="bottom">
                <Button variant="secondary">Bottom Tooltip</Button>
              </Tooltip>
              <Tooltip content="Tooltip on Left" position="left">
                <Button variant="secondary">Left Tooltip</Button>
              </Tooltip>
              <Tooltip content="Tooltip on Right" position="right">
                <Button variant="secondary">Right Tooltip</Button>
              </Tooltip>
            </Card.Content>
          </Card>
        </section>

        {/* Component 13: Tabs */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">13. Tabs Component</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Modern underline tabs with keyboard navigation and badges.</p>
            </div>
          </div>

          <Card>
            <Card.Content className="flex flex-col gap-4">
              <Tabs
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key)}
                items={[
                  { key: 'overview', label: 'Project Overview', icon: <Building className="w-4 h-4" /> },
                  { key: 'plots', label: 'Plot Inventory', icon: <Layers className="w-4 h-4" />, badge: '120' },
                  { key: 'customers', label: 'Customers', icon: <User className="w-4 h-4" />, badge: '84' },
                  { key: 'documents', label: 'Legal Docs', icon: <FileText className="w-4 h-4" />, disabled: true }
                ]}
              />

              <div className="p-4 bg-[var(--color-bg-surface)] rounded-[var(--radius-md)] text-xs text-[var(--color-text-secondary)]">
                Selected Active Tab: <span className="font-semibold text-[var(--color-text-primary)]">{activeTab}</span>
              </div>
            </Card.Content>
          </Card>
        </section>

        {/* Component 14: EmptyState */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">14. EmptyState Component</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Empty state indicator with custom icon, title, description, and action button.</p>
            </div>
          </div>

          <EmptyState
            title="No Documents Uploaded"
            description="You haven't uploaded any agreement or RERA certificate documents for this project yet."
            action={
              <Button leftIcon={<Plus className="w-4 h-4" />}>
                Upload First Document
              </Button>
            }
          />
        </section>

        {/* Component 15: Loader & Skeletons */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">15. Loader Component</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Spinners (sm, md, lg, xl) and continuous shimmer skeleton loaders.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <Card.Header>
                <Card.Title>Spinners</Card.Title>
              </Card.Header>
              <Card.Content className="flex items-center justify-around py-8">
                <Loader size="sm" />
                <Loader size="md" text="Loading..." />
                <Loader size="lg" />
                <Loader size="xl" />
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title>Skeleton Card Shimmer</Card.Title>
              </Card.Header>
              <Card.Content>
                <Loader.SkeletonCard />
              </Card.Content>
            </Card>
          </div>
        </section>

        {/* Component 16: Toast Trigger */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">16. Toast Component</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Trigger floating toast notifications with auto-dismiss timers.</p>
            </div>
          </div>

          <Card>
            <Card.Content className="flex flex-wrap items-center gap-4">
              <Button
                variant="success"
                onClick={() => addToast('success', 'Plot Booked', 'Plot #102 booked for Rajesh Sharma.')}
              >
                Trigger Success Toast
              </Button>

              <Button
                variant="danger"
                onClick={() => addToast('error', 'Payment Failed', 'Transaction declined by bank server.')}
              >
                Trigger Error Toast
              </Button>

              <Button
                variant="secondary"
                onClick={() => addToast('warning', 'Agreement Pending', 'Customer signoff required within 3 days.')}
              >
                Trigger Warning Toast
              </Button>

              <Button
                variant="ghost"
                onClick={() => addToast('info', 'System Update', 'LandOS v2.2 design tokens loaded.')}
              >
                Trigger Info Toast
              </Button>
            </Card.Content>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border-subtle)] py-6 text-center text-xs text-[var(--color-text-muted)]">
        LandOS Phase 2.2 Reusable UI Design System • Built with Burgundy Tokens & Pure CSS
      </footer>
    </div>
  );
}
