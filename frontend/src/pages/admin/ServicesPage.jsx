import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, Plus, Pencil, Trash2, X, Search, Clock, Wallet, Tag,
  AlertCircle, CheckCircle2, Briefcase, Eye, EyeOff, FolderKanban
} from 'lucide-react';
import api from '../../services/api';
import { useDocumentTitle, useDebounced } from '../../hooks/useUtility';
import {
  PageIntro, Panel, SearchInput, SelectInput, Tabs, Pagination,
  StateBlock, ConfirmDialog, StatCard, BusyOverlay
} from '../../components/ui/DashboardBits';
import { EmptyState, StatusBadge } from '../../components/ui/Primitives';
import { Spinner } from '../../components/ui/LoadingScreen';
import { formatMoney } from '../../utilities/format';
import toast from 'react-hot-toast';

const EMPTY_SERVICE = {
  name: '', category_id: '', description: '', duration_min: 60,
  price: 0, image_url: '', is_active: 1
};
const EMPTY_CATEGORY = { name: '', description: '', image_url: '', sort_order: 0 };

export default function AdminServicesPage() {
  useDocumentTitle('Catalogue management');

  const [tab, setTab] = useState('services');

  /* ---------------- services state ---------------- */
  const [services, setServices] = useState([]);
  const [svcPagination, setSvcPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search, 400);

  /* ---------------- categories state ---------------- */
  const [categories, setCategories] = useState([]);

  /* ---------------- editors ---------------- */
  const [svcEditor, setSvcEditor] = useState(null);   // null | 'new' | row
  const [svcForm, setSvcForm] = useState(EMPTY_SERVICE);
  const [svcErrors, setSvcErrors] = useState({});
  const [savingSvc, setSavingSvc] = useState(false);

  const [catEditor, setCatEditor] = useState(null);   // null | 'new' | row
  const [catForm, setCatForm] = useState(EMPTY_CATEGORY);
  const [catErrors, setCatErrors] = useState({});
  const [savingCat, setSavingCat] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null); // { kind, row }
  const [busy, setBusy] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/categories');
      setCategories(res.data?.data?.categories || []);
    } catch { /* non-fatal */ }
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (q) params.set('search', q);
      if (category) params.set('category', category);
      if (status) params.set('status', status);
      const res = await api.get(`/api/admin/services?${params.toString()}`);
      setServices(res.data?.data?.services || []);
      setSvcPagination(res.data?.data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message || 'Could not load services');
    } finally {
      setLoading(false);
    }
  }, [q, category, status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { setPage(1); }, [q, category, status]);

  /* ---------------- service CRUD ---------------- */
  const openSvc = (row) => {
    if (row === 'new') {
      setSvcEditor('new');
      setSvcForm({ ...EMPTY_SERVICE, category_id: categories[0]?.id || '' });
    } else {
      setSvcEditor(row);
      setSvcForm({
        name: row.name,
        category_id: row.category_id,
        description: row.description || '',
        duration_min: row.duration_min,
        price: row.price,
        image_url: row.image_url || '',
        is_active: Number(row.is_active)
      });
    }
    setSvcErrors({});
  };

  const validateSvc = () => {
    const n = {};
    if (svcForm.name.trim().length < 2) n.name = 'Service name is required';
    if (!svcForm.category_id) n.category_id = 'Choose a category';
    if (!Number(svcForm.duration_min) || Number(svcForm.duration_min) < 5) n.duration_min = 'Minimum 5 minutes';
    if (Number(svcForm.duration_min) > 600) n.duration_min = 'Maximum 600 minutes';
    if (svcForm.price === '' || Number(svcForm.price) < 0) n.price = 'Enter a valid price';
    setSvcErrors(n);
    return Object.keys(n).length === 0;
  };

  const saveSvc = async (e) => {
    e.preventDefault();
    if (!validateSvc()) return;
    const payload = {
      name: svcForm.name.trim(),
      category_id: Number(svcForm.category_id),
      description: svcForm.description.trim(),
      duration_min: Number(svcForm.duration_min),
      price: Number(svcForm.price),
      image_url: svcForm.image_url.trim(),
      is_active: Number(svcForm.is_active)
    };
    try {
      setSavingSvc(true);
      if (svcEditor === 'new') {
        await api.post('/api/admin/services', payload);
        toast.success('Service created');
      } else {
        await api.put(`/api/admin/services/${svcEditor.id}`, payload);
        toast.success('Service updated');
      }
      setSvcEditor(null);
      load();
      loadCategories();
    } catch (err) {
      const details = err.details;
      if (Array.isArray(details) && details.length) {
        setSvcErrors(Object.fromEntries(details.map((d) => [d.field, d.message])));
      }
      toast.error(err.message || 'Could not save the service');
    } finally {
      setSavingSvc(false);
    }
  };

  /* ---------------- category CRUD ---------------- */
  const openCat = (row) => {
    if (row === 'new') {
      setCatEditor('new');
      setCatForm({ ...EMPTY_CATEGORY, sort_order: categories.length });
    } else {
      setCatEditor(row);
      setCatForm({
        name: row.name,
        description: row.description || '',
        image_url: row.image_url || '',
        sort_order: Number(row.sort_order) || 0
      });
    }
    setCatErrors({});
  };

  const saveCat = async (e) => {
    e.preventDefault();
    const n = {};
    if (catForm.name.trim().length < 2) n.name = 'Category name is required';
    setCatErrors(n);
    if (Object.keys(n).length) return;
    const payload = {
      name: catForm.name.trim(),
      description: catForm.description.trim(),
      image_url: catForm.image_url.trim(),
      sort_order: Number(catForm.sort_order) || 0
    };
    try {
      setSavingCat(true);
      if (catEditor === 'new') {
        await api.post('/api/admin/categories', payload);
        toast.success('Category created');
      } else {
        await api.put(`/api/admin/categories/${catEditor.id}`, payload);
        toast.success('Category updated');
      }
      setCatEditor(null);
      loadCategories();
    } catch (err) {
      const details = err.details;
      if (Array.isArray(details) && details.length) {
        setCatErrors(Object.fromEntries(details.map((d) => [d.field, d.message])));
      } else {
        setCatErrors({ name: err.message });
      }
      toast.error(err.message || 'Could not save the category');
    } finally {
      setSavingCat(false);
    }
  };

  /* ---------------- delete ---------------- */
  const remove = async () => {
    if (!deleteTarget) return;
    try {
      setBusy(true);
      if (deleteTarget.kind === 'service') {
        await api.delete(`/api/admin/services/${deleteTarget.row.id}`);
        toast.success('Service deleted');
      } else {
        await api.delete(`/api/admin/categories/${deleteTarget.row.id}`);
        toast.success('Category deleted');
      }
      setDeleteTarget(null);
      load();
      loadCategories();
    } catch (err) {
      toast.error(err.message || 'Could not delete — it may still be in use');
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  };

  const activeCount = services.filter((s) => Number(s.is_active)).length;

  const svcColumns = useMemo(() => [
    {
      key: 'name',
      header: 'Service',
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-burgundy-50 text-burgundy">
            <Briefcase className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-charcoal">{r.name}</p>
            <p className="truncate text-xs text-muted">{r.category_name}</p>
          </div>
        </div>
      )
    },
    {
      key: 'provider_name',
      header: 'Provider',
      render: (r) => r.provider_name
        ? (
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-charcoal">{r.provider_name}</p>
            <span className={`badge border ${
              r.approval_status === 'approved'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            } !text-[10px]`}>{r.approval_status || 'platform'}</span>
          </div>
        )
        : <span className="badge border border-edge bg-ivory text-muted">Platform-wide</span>
    },
    {
      key: 'duration_min',
      header: 'Duration',
      render: (r) => (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          <Clock className="h-3.5 w-3.5 text-rosewood" /> {r.duration_min} min
        </span>
      )
    },
    {
      key: 'price',
      header: 'Price',
      className: 'font-bold text-burgundy-800',
      render: (r) => formatMoney(r.price)
    },
    { key: 'bookings', header: 'Bookings', className: 'font-semibold', render: (r) => Number(r.bookings) || 0 },
    {
      key: 'is_active',
      header: 'Status',
      render: (r) => (Number(r.is_active)
        ? <span className="badge border border-emerald-200 bg-emerald-50 text-emerald-700"><Eye className="h-3 w-3" /> Live</span>
        : <span className="badge border border-edge bg-cream text-muted"><EyeOff className="h-3 w-3" /> Hidden</span>)
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <button onClick={(e) => { e.stopPropagation(); openSvc(r); }} aria-label={`Edit ${r.name}`}
            className="grid h-9 w-9 place-items-center rounded-lg border border-edge bg-white text-burgundy transition hover:border-burgundy">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ kind: 'service', row: r }); }}
            aria-label={`Delete ${r.name}`}
            className="grid h-9 w-9 place-items-center rounded-lg border border-edge bg-white text-muted transition hover:border-burgundy-200 hover:text-burgundy">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const svcSet = (key) => (e) => {
    const v = e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0) : e.target.value;
    setSvcForm((f) => ({ ...f, [key]: v }));
    setSvcErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  return (
    <div>
      <PageIntro
        eyebrow="Admin console"
        title="Catalogue"
        description="Manage every service customers can book and the categories that organise them."
        actions={
          tab === 'services'
            ? (
              <button onClick={() => openSvc('new')} className="btn-primary !py-2.5 text-sm">
                <Plus className="h-4 w-4" /> New service
              </button>
            )
            : (
              <button onClick={() => openCat('new')} className="btn-primary !py-2.5 text-sm">
                <Plus className="h-4 w-4" /> New category
              </button>
            )
        }
      />

      <Tabs
        tabs={[
          { value: 'services', label: 'Services', count: svcPagination.total },
          { value: 'categories', label: 'Categories', count: categories.length }
        ]}
        value={tab}
        onChange={setTab}
        className="mb-6 max-w-md"
      />

      {tab === 'services' ? (
        <StateBlock loading={loading} error={error} onRetry={load} rows={6}>
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard icon={Layers} label="Services shown" value={svcPagination.total}
                sub={q || category || status ? 'Matching your filters' : 'Total in catalogue'} />
              <StatCard icon={CheckCircle2} label="Live on page" value={activeCount}
                sub="Bookable right now" tone="emerald" delay={0.06} />
              <StatCard icon={FolderKanban} label="Categories" value={categories.length}
                sub="Organising the catalogue" tone="gold" delay={0.12} />
            </div>

            <div className="mt-6 mb-5 flex flex-col gap-3 xl:flex-row xl:items-center">
              <SearchInput value={search} onChange={setSearch}
                placeholder="Search name or description…" className="min-w-[240px] flex-1"
                label="Search services" />
              <div className="flex flex-wrap gap-2.5">
                <SelectInput value={category} onChange={setCategory} label="All categories"
                  ariaLabel="Filter by category"
                  options={categories.map((c) => ({ value: c.slug, label: c.name }))} />
                <SelectInput value={status} onChange={setStatus} label="Any status"
                  ariaLabel="Filter by status"
                  options={[
                    { value: '1', label: 'Live' },
                    { value: '0', label: 'Hidden' }
                  ]} />
                {(q || category || status) && (
                  <button onClick={() => { setSearch(''); setCategory(''); setStatus(''); }}
                    className="btn-ghost !py-2.5 text-xs">
                    <X className="h-3.5 w-3.5" /> Clear
                  </button>
                )}
              </div>
            </div>

            <Panel flush>
              <StateBlock
                loading={false}
                empty={services.length === 0}
                emptyIcon={Layers}
                emptyTitle="No services match"
                emptyDescription="Adjust your filters or create a new service."
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-edge bg-ivory/70">
                        {svcColumns.map((c) => (
                          <th key={c.key} scope="col"
                            className={`whitespace-nowrap px-5 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted ${c.className || ''}`}>
                            {c.header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((r, i) => (
                        <motion.tr
                          key={r.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.2) }}
                          className="border-b border-edge/60 transition-colors last:border-0 hover:bg-ivory/60"
                        >
                          {svcColumns.map((c) => (
                            <td key={c.key} className={`px-5 py-4 align-middle text-[13.5px] text-charcoal ${c.className || ''}`}>
                              {c.render ? c.render(r) : r[c.key]}
                            </td>
                          ))}
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </StateBlock>
            </Panel>

            <Pagination page={svcPagination.page} totalPages={svcPagination.totalPages}
              total={svcPagination.total} onChange={setPage} noun="services" />
          </>
        </StateBlock>
      ) : (
        /* ============================ categories ============================ */
        <StateBlock loading={loading} error={error} onRetry={loadCategories} rows={4}>
          <>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <SearchInput value={search} onChange={setSearch}
                placeholder="Search categories…" className="min-w-[240px] flex-1"
                label="Search categories" />
              <button onClick={() => openCat('new')} className="btn-primary !py-2.5 text-sm">
                <Plus className="h-4 w-4" /> New category
              </button>
            </div>

            <Panel flush>
              <StateBlock
                loading={false}
                empty={categories.length === 0}
                emptyIcon={Tag}
                emptyTitle="No categories yet"
                emptyDescription="Categories group services so customers can browse by need."
              >
                <ul className="divide-y divide-edge/70">
                  {categories
                    .filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()))
                    .map((c, i) => (
                      <motion.li
                        key={c.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.25) }}
                        className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-ivory/50 sm:px-6"
                      >
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-burgundy-gradient text-ivory">
                          <Tag className="h-4.5 w-4.5 h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-display text-base text-burgundy-800">{c.name}</p>
                            <span className="badge border border-edge bg-ivory text-muted">
                              {c.service_count} service{Number(c.service_count) === 1 ? '' : 's'}
                            </span>
                          </div>
                          {c.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted">{c.description}</p>}
                          <p className="mt-0.5 font-mono text-[11px] text-muted/80">/{c.slug} · sort {c.sort_order ?? 0}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openCat(c)} aria-label={`Edit ${c.name}`}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-edge bg-white text-burgundy transition hover:border-burgundy">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ kind: 'category', row: c })}
                            disabled={Number(c.service_count) > 0}
                            title={Number(c.service_count) > 0 ? 'Move its services first' : 'Delete category'}
                            aria-label={`Delete ${c.name}`}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-edge bg-white text-muted transition hover:border-burgundy-200 hover:text-burgundy disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.li>
                    ))}
                </ul>
              </StateBlock>
            </Panel>

            <p className="mt-4 text-center text-[11.5px] text-muted">
              Categories with services attached can't be deleted — reassign those services first.
            </p>
          </>
        </StateBlock>
      )}

      {tab === 'services' && services.length === 0 && !loading && !error && !q && !category && !status && (
        <div className="mt-6">
          <EmptyState icon={Layers} title="Catalogue is empty"
            description="Create services so customers have something to book."
            action={<button onClick={() => openSvc('new')} className="btn-primary btn-sm"><Plus className="h-4 w-4" /> New service</button>} />
        </div>
      )}

      {/* ============================ service editor ============================ */}
      <AnimatePresence>
        {svcEditor && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-burgundy-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !savingSvc) setSvcEditor(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-lg overflow-hidden rounded-3xl border border-edge bg-white shadow-lift"
              role="dialog" aria-modal="true" aria-labelledby="svc-editor-title"
            >
              <header className="relative bg-burgundy-gradient px-6 py-5 text-ivory">
                <div className="noise absolute inset-0" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-softrose">
                      {svcEditor === 'new' ? 'New service' : 'Edit service'}
                    </p>
                    <h3 id="svc-editor-title" className="mt-1 font-display text-xl">
                      {svcEditor === 'new' ? 'Add to the catalogue' : svcForm.name}
                    </h3>
                  </div>
                  <button onClick={() => !savingSvc && setSvcEditor(null)} aria-label="Close"
                    className="grid h-8 w-8 place-items-center rounded-lg text-ivory/70 transition hover:bg-white/10 hover:text-ivory">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <form onSubmit={saveSvc} className="relative px-6 py-5" noValidate>
                <BusyOverlay show={savingSvc} label="Saving…" />

                <div className="space-y-4">
                  <div>
                    <label htmlFor="asvc-name" className="field-label">Service name *</label>
                    <input id="asvc-name" value={svcForm.name} onChange={svcSet('name')}
                      placeholder="Deep tissue massage" className="field" aria-invalid={!!svcErrors.name} />
                    {svcErrors.name && <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {svcErrors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="asvc-cat" className="field-label">Category *</label>
                    <select id="asvc-cat" value={svcForm.category_id} onChange={svcSet('category_id')}
                      className="field" aria-invalid={!!svcErrors.category_id}>
                      <option value="">Choose a category…</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {svcErrors.category_id && <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {svcErrors.category_id}</p>}
                  </div>

                  <div>
                    <label htmlFor="asvc-desc" className="field-label">Description</label>
                    <textarea id="asvc-desc" rows={3} maxLength={2000} value={svcForm.description}
                      onChange={svcSet('description')} placeholder="What's included, who it's for…"
                      className="field resize-y" />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="asvc-dur" className="field-label">Duration (min) *</label>
                      <input id="asvc-dur" type="number" min={5} max={600} step={5} value={svcForm.duration_min}
                        onChange={svcSet('duration_min')} className="field" aria-invalid={!!svcErrors.duration_min} />
                      {svcErrors.duration_min && <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {svcErrors.duration_min}</p>}
                    </div>
                    <div>
                      <label htmlFor="asvc-price" className="field-label">Price (USD) *</label>
                      <input id="asvc-price" type="number" min={0} step="0.01" value={svcForm.price}
                        onChange={svcSet('price')} className="field" aria-invalid={!!svcErrors.price} />
                      {svcErrors.price && <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {svcErrors.price}</p>}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="asvc-img" className="field-label">Image URL <span className="font-normal text-muted">(optional)</span></label>
                    <input id="asvc-img" value={svcForm.image_url} onChange={svcSet('image_url')}
                      placeholder="https://…" className="field" />
                  </div>

                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-edge bg-ivory/60 px-4 py-3">
                    <input type="checkbox" checked={Number(svcForm.is_active) === 1} onChange={svcSet('is_active')}
                      className="h-4 w-4 accent-[#641E32]" />
                    <span className="text-sm font-semibold text-charcoal">Live (bookable by customers)</span>
                  </label>

                  <p className="flex items-start gap-2 rounded-xl border border-gold/40 bg-gold-100/60 px-4 py-3 text-xs leading-relaxed text-charcoal">
                    <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-700" />
                    Platform-wide services (no provider) are bookable by every approved professional offering them.
                  </p>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setSvcEditor(null)} disabled={savingSvc} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={savingSvc} className="btn-primary px-6 py-3 text-sm">
                    {savingSvc ? <Spinner className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    {svcEditor === 'new' ? 'Create service' : 'Save changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================ category editor ============================ */}
      <AnimatePresence>
        {catEditor && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-burgundy-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !savingCat) setCatEditor(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-edge bg-white shadow-lift"
              role="dialog" aria-modal="true" aria-labelledby="cat-editor-title"
            >
              <header className="relative bg-burgundy-gradient px-6 py-5 text-ivory">
                <div className="noise absolute inset-0" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-softrose">
                      {catEditor === 'new' ? 'New category' : 'Edit category'}
                    </p>
                    <h3 id="cat-editor-title" className="mt-1 font-display text-xl">
                      {catEditor === 'new' ? 'Organise the catalogue' : catForm.name}
                    </h3>
                  </div>
                  <button onClick={() => !savingCat && setCatEditor(null)} aria-label="Close"
                    className="grid h-8 w-8 place-items-center rounded-lg text-ivory/70 transition hover:bg-white/10 hover:text-ivory">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <form onSubmit={saveCat} className="relative px-6 py-5" noValidate>
                <BusyOverlay show={savingCat} label="Saving…" />

                <div className="space-y-4">
                  <div>
                    <label htmlFor="cat-name" className="field-label">Category name *</label>
                    <input id="cat-name" value={catForm.name} onChange={(e) => { setCatForm((f) => ({ ...f, name: e.target.value })); setCatErrors({}); }}
                      placeholder="Wellness" className="field" aria-invalid={!!catErrors.name} />
                    {catErrors.name && <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {catErrors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="cat-desc" className="field-label">Description</label>
                    <textarea id="cat-desc" rows={3} maxLength={500} value={catForm.description}
                      onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Short blurb shown under the category…" className="field resize-y" />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                    <div>
                      <label htmlFor="cat-img" className="field-label">Image URL <span className="font-normal text-muted">(optional)</span></label>
                      <input id="cat-img" value={catForm.image_url}
                        onChange={(e) => setCatForm((f) => ({ ...f, image_url: e.target.value }))}
                        placeholder="https://…" className="field" />
                    </div>
                    <div>
                      <label htmlFor="cat-sort" className="field-label">Sort order</label>
                      <input id="cat-sort" type="number" min={0} value={catForm.sort_order}
                        onChange={(e) => setCatForm((f) => ({ ...f, sort_order: e.target.value }))}
                        className="field" />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setCatEditor(null)} disabled={savingCat} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={savingCat} className="btn-primary px-6 py-3 text-sm">
                    {savingCat ? <Spinner className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    {catEditor === 'new' ? 'Create category' : 'Save changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!deleteTarget}
        title={deleteTarget?.kind === 'category' ? 'Delete this category?' : 'Delete this service?'}
        message={
          deleteTarget
            ? deleteTarget.kind === 'category'
              ? `"${deleteTarget.row.name}" will be removed. Categories with services attached can't be deleted.`
              : `"${deleteTarget.row.name}" will be permanently removed. If it has upcoming appointments the API will block the delete — deactivate it instead.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Keep it"
        loading={busy}
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
