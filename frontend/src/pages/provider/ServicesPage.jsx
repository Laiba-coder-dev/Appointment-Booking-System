import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Plus, Pencil, Trash2, X, Search, Clock, Wallet,
  AlertCircle, CheckCircle2, Layers, Power, Eye, EyeOff
} from 'lucide-react';
import api from '../../services/api';
import { useDocumentTitle, useDebounced } from '../../hooks/useUtility';
import {
  PageIntro, Panel, SearchInput, StateBlock, ConfirmDialog, StatCard, BusyOverlay, Tabs
} from '../../components/ui/DashboardBits';
import { StatusBadge, EmptyState } from '../../components/ui/Primitives';
import { Spinner } from '../../components/ui/LoadingScreen';
import { formatMoney } from '../../utilities/format';
import toast from 'react-hot-toast';

const EMPTY = {
  name: '', category_id: '', description: '', duration_min: 60,
  price: 0, image_url: '', is_active: 1
};

export default function ProviderServicesPage() {
  useDocumentTitle('My services');

  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const q = useDebounced(search, 300);

  const [editor, setEditor] = useState(null);   // null | 'new' | row
  const [form, setForm] = useState(EMPTY);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [mine, cats] = await Promise.all([
        api.get('/api/services/mine'),
        api.get('/api/services/categories')
      ]);
      setRows(mine.data?.data?.services || []);
      setCategories(cats.data?.data?.categories || []);
    } catch (err) {
      setError(err.message || 'Could not load your services');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => {
    const matchesQ = !q || r.name.toLowerCase().includes(q.toLowerCase()) ||
      (r.category_name || '').toLowerCase().includes(q.toLowerCase());
    const matchesTab = tab === 'all' || (tab === 'active' ? r.link_active : !r.link_active);
    return matchesQ && matchesTab;
  });

  const openEditor = (row) => {
    if (row === 'new') {
      setEditor('new');
      setForm({ ...EMPTY, category_id: categories[0]?.id || '' });
    } else {
      setEditor(row);
      setForm({
        name: row.name,
        category_id: row.category_id,
        description: row.description || '',
        duration_min: row.effective_duration ?? row.duration_min,
        price: row.effective_price ?? row.price,
        image_url: row.image_url || '',
        is_active: row.link_active ?? 1
      });
    }
    setFormErrors({});
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Service name is required';
    if (!form.category_id) next.category_id = 'Choose a category';
    if (!Number(form.duration_min) || Number(form.duration_min) < 5) next.duration_min = 'Minimum 5 minutes';
    if (Number(form.duration_min) > 600) next.duration_min = 'Maximum 600 minutes';
    if (form.price === '' || Number(form.price) < 0) next.price = 'Enter a valid price';
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      name: form.name.trim(),
      category_id: Number(form.category_id),
      description: form.description.trim(),
      duration_min: Number(form.duration_min),
      price: Number(form.price),
      image_url: form.image_url.trim() || undefined,
      is_active: Number(form.is_active)
    };
    try {
      setSaving(true);
      if (editor === 'new') {
        await api.post('/api/services/mine', payload);
        toast.success('Service added to your catalogue');
      } else {
        await api.put(`/api/services/mine/${editor.id}`, payload);
        toast.success('Service updated');
      }
      setEditor(null);
      load();
    } catch (err) {
      const details = err.details;
      if (Array.isArray(details) && details.length) {
        setFormErrors(Object.fromEntries(details.map((d) => [d.field, d.message])));
      }
      toast.error(err.message || 'Could not save the service');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row) => {
    try {
      setBusyId(row.id);
      await api.put(`/api/services/mine/${row.id}`, {
        name: row.name,
        category_id: row.category_id,
        description: row.description || '',
        duration_min: row.effective_duration ?? row.duration_min,
        price: row.effective_price ?? row.price,
        image_url: row.image_url || undefined,
        is_active: row.link_active ? 0 : 1
      });
      toast.success(row.link_active ? 'Service hidden from booking' : 'Service is bookable again');
      load();
    } catch (err) {
      toast.error(err.message || 'Could not update visibility');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      setBusyId(deleting.id);
      await api.delete(`/api/services/mine/${deleting.id}`);
      toast.success('Service deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not delete this service');
      setDeleting(null);
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = rows.filter((r) => r.link_active).length;
  const avgPrice = rows.length
    ? rows.reduce((s, r) => s + Number(r.effective_price ?? r.price ?? 0), 0) / rows.length
    : 0;

  const set = (key) => (e) => {
    const v = e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0) : e.target.value;
    setForm((f) => ({ ...f, [key]: v }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  return (
    <div>
      <PageIntro
        eyebrow="Provider hub"
        title="My services"
        description="Add, price and publish the services customers can book with you."
        actions={
          <button onClick={() => openEditor('new')} className="btn-primary !py-2.5 text-sm">
            <Plus className="h-4 w-4" /> Add service
          </button>
        }
      />

      <StateBlock loading={loading} error={error} onRetry={load} rows={4}>
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={Briefcase} label="Total services" value={rows.length}
              sub={`${activeCount} bookable right now`} />
            <StatCard icon={CheckCircle2} label="Active" value={activeCount}
              sub={`${rows.length - activeCount} hidden`} tone="emerald" delay={0.06} />
            <StatCard icon={Wallet} label="Average price" value={formatMoney(avgPrice)}
              sub="Across your catalogue" tone="gold" delay={0.12} />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Tabs
              tabs={[
                { value: 'all', label: 'All', count: rows.length },
                { value: 'active', label: 'Bookable', count: activeCount },
                { value: 'hidden', label: 'Hidden', count: rows.length - activeCount }
              ]}
              value={tab}
              onChange={setTab}
            />
            <SearchInput value={search} onChange={setSearch}
              placeholder="Search your services…" className="sm:ml-auto sm:w-72"
              label="Search services" />
          </div>

          <Panel flush className="mt-5">
            <StateBlock
              loading={false}
              empty={filtered.length === 0}
              emptyIcon={Layers}
              emptyTitle={rows.length === 0 ? 'No services yet' : 'Nothing matches'}
              emptyDescription={rows.length === 0
                ? 'Add your first service so customers can start booking it.'
                : 'Try a different search or switch tabs.'}
            >
              <ul className="divide-y divide-edge/70">
                {filtered.map((r, i) => (
                  <motion.li
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.25) }}
                    className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-ivory/50 sm:px-6"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-burgundy-50 text-burgundy">
                      <Briefcase className="h-5 w-5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-display text-base text-burgundy-800">{r.name}</p>
                        <span className="badge border border-edge bg-ivory text-muted">{r.category_name}</span>
                        {r.link_active
                          ? <span className="badge border border-emerald-200 bg-emerald-50 text-emerald-700"><Eye className="h-3 w-3" /> Bookable</span>
                          : <span className="badge border border-edge bg-cream text-muted"><EyeOff className="h-3 w-3" /> Hidden</span>}
                      </div>
                      {r.description && (
                        <p className="mt-1 line-clamp-1 text-xs text-muted">{r.description}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted">
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-rosewood" />
                          {r.effective_duration ?? r.duration_min} min</span>
                        <span className="flex items-center gap-1 text-burgundy"><Wallet className="h-3.5 w-3.5" />
                          {formatMoney(r.effective_price ?? r.price)}</span>
                        {Number(r.price) !== Number(r.effective_price) && (
                          <span className="text-muted/70">base {formatMoney(r.price)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleActive(r)}
                        disabled={busyId === r.id}
                        title={r.link_active ? 'Hide from booking' : 'Make bookable'}
                        aria-label={r.link_active ? `Hide ${r.name}` : `Publish ${r.name}`}
                        className="grid h-9 w-9 place-items-center rounded-lg border border-edge bg-white text-burgundy transition hover:border-burgundy"
                      >
                        {busyId === r.id ? <Spinner className="h-3.5 w-3.5" /> : <Power className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => openEditor(r)}
                        aria-label={`Edit ${r.name}`}
                        className="grid h-9 w-9 place-items-center rounded-lg border border-edge bg-white text-burgundy transition hover:border-burgundy"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(r)}
                        aria-label={`Delete ${r.name}`}
                        className="grid h-9 w-9 place-items-center rounded-lg border border-edge bg-white text-muted transition hover:border-burgundy-200 hover:text-burgundy"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </StateBlock>
          </Panel>
        </>
      </StateBlock>

      {rows.length === 0 && !loading && !error && (
        <div className="mt-6">
          <EmptyState
            icon={Briefcase}
            title="Build your catalogue"
            description="Services define pricing, duration and what customers actually book."
            action={<button onClick={() => openEditor('new')} className="btn-primary btn-sm"><Plus className="h-4 w-4" /> Add your first service</button>}
          />
        </div>
      )}

      {/* ============================ editor ============================ */}
      <AnimatePresence>
        {editor && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-burgundy-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setEditor(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-lg overflow-hidden rounded-3xl border border-edge bg-white shadow-lift"
              role="dialog" aria-modal="true" aria-labelledby="svc-editor-title"
            >
              <header className="relative bg-burgundy-gradient px-6 py-5 text-ivory">
                <div className="noise absolute inset-0" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-softrose">
                      {editor === 'new' ? 'New service' : 'Edit service'}
                    </p>
                    <h3 id="svc-editor-title" className="mt-1 font-display text-xl">
                      {editor === 'new' ? 'Add to your catalogue' : form.name}
                    </h3>
                  </div>
                  <button onClick={() => !saving && setEditor(null)} aria-label="Close"
                    className="grid h-8 w-8 place-items-center rounded-lg text-ivory/70 transition hover:bg-white/10 hover:text-ivory">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <form onSubmit={save} className="relative px-6 py-5" noValidate>
                <BusyOverlay show={saving} label="Saving…" />

                <div className="space-y-4">
                  <div>
                    <label htmlFor="svc-name" className="field-label">Service name *</label>
                    <input id="svc-name" value={form.name} onChange={set('name')}
                      placeholder="Signature facial" className="field"
                      aria-invalid={!!formErrors.name} />
                    {formErrors.name && <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {formErrors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="svc-cat" className="field-label">Category *</label>
                    <select id="svc-cat" value={form.category_id} onChange={set('category_id')} className="field"
                      aria-invalid={!!formErrors.category_id}>
                      <option value="">Choose a category…</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {formErrors.category_id && <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {formErrors.category_id}</p>}
                  </div>

                  <div>
                    <label htmlFor="svc-desc" className="field-label">Description</label>
                    <textarea id="svc-desc" rows={3} maxLength={2000} value={form.description}
                      onChange={set('description')} placeholder="What's included, who it's for…"
                      className="field resize-y" />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="svc-dur" className="field-label">Duration (min) *</label>
                      <input id="svc-dur" type="number" min={5} max={600} step={5} value={form.duration_min}
                        onChange={set('duration_min')} className="field"
                        aria-invalid={!!formErrors.duration_min} />
                      {formErrors.duration_min && <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {formErrors.duration_min}</p>}
                    </div>
                    <div>
                      <label htmlFor="svc-price" className="field-label">Price (USD) *</label>
                      <input id="svc-price" type="number" min={0} step="0.01" value={form.price}
                        onChange={set('price')} className="field"
                        aria-invalid={!!formErrors.price} />
                      {formErrors.price && <p className="field-error"><AlertCircle className="h-3.5 w-3.5" /> {formErrors.price}</p>}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="svc-img" className="field-label">Image URL <span className="font-normal text-muted">(optional)</span></label>
                    <input id="svc-img" value={form.image_url} onChange={set('image_url')}
                      placeholder="https://…" className="field" />
                  </div>

                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-edge bg-ivory/60 px-4 py-3">
                    <input type="checkbox" checked={Number(form.is_active) === 1} onChange={set('is_active')}
                      className="h-4 w-4 accent-[#641E32]" />
                    <span className="text-sm font-semibold text-charcoal">Bookable by customers</span>
                    <span className="ml-auto text-xs text-muted">Uncheck to hide temporarily</span>
                  </label>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setEditor(null)} disabled={saving} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn-primary px-6 py-3 text-sm">
                    {saving ? <Spinner className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    {editor === 'new' ? 'Add service' : 'Save changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!deleting}
        title="Delete this service?"
        message={deleting
          ? `${deleting.name} will be permanently removed. Customers with upcoming bookings keep theirs — but if there are future appointments you'll need to deactivate instead.`
          : ''}
        confirmLabel="Delete service"
        cancelLabel="Keep it"
        loading={busyId === deleting?.id}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
