import { useState } from 'react';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { usePizzariaCategories } from '../../hooks/usePizzariaCategories';

interface CategoryForm { name: string; description: string; active: boolean; }
const emptyForm: CategoryForm = { name: '', description: '', active: true };

export function BoutiqueCategories() {
  const { categories, addCategory, updateCategory, deleteCategory, toggleActive } = usePizzariaCategories();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (cat: any) => { setEditing(cat); setForm({ name: cat.name, description: cat.description || '', active: cat.active }); setShowModal(true); };
  const close = () => { setShowModal(false); setEditing(null); setForm(emptyForm); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editing) await updateCategory(editing.id, form);
      else await addCategory(form);
      close();
    } catch (err: any) {
      alert('Erro: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cat: any) => {
    if (!confirm(`Eliminar a categoria "${cat.name}"?`)) return;
    try { await deleteCategory(cat.id); } catch (err: any) { alert('Erro: ' + err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary-800">Categorias</h1>
          <p className="text-primary-600">Organize o seu catálogo por categorias</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-accent-500 text-white px-4 py-2 rounded-md hover:bg-accent-600 transition">
          <Plus className="h-5 w-5" /> Adicionar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-accent-600">{categories.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-500">Ativas</p>
          <p className="text-2xl font-bold text-green-600">{categories.filter(c => c.active).length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-500">Inativas</p>
          <p className="text-2xl font-bold text-red-600">{categories.filter(c => !c.active).length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-primary-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-primary-800">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-primary-800">Descrição</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-primary-800">Estado</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-primary-800">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-100">
            {categories.map(cat => (
              <tr key={cat.id} className="hover:bg-primary-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Tag className="h-5 w-5 text-accent-500 flex-shrink-0" />
                    <span className="font-medium text-sm text-primary-800">{cat.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-primary-600">{cat.description || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cat.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {cat.active ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive(cat.id)}
                      className={`text-xs px-3 py-1 rounded-md transition ${cat.active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                      {cat.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onClick={() => openEdit(cat)} className="text-accent-600 hover:text-accent-800 p-1"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(cat)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {categories.length === 0 && (
          <div className="text-center py-12 text-primary-500">
            <Tag className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nenhuma categoria criada.</p>
            <button onClick={openAdd} className="mt-3 text-accent-600 font-medium hover:text-accent-700">Criar a primeira categoria</button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-primary-800">{editing ? 'Editar categoria' : 'Nova categoria'}</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                  placeholder="Ex: Sofás, Mesas, Cadeiras…"
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-accent-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-accent-500 focus:outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="cat-active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                  className="rounded border-gray-300 text-accent-500" />
                <label htmlFor="cat-active" className="text-sm text-gray-700">Categoria ativa (visível no catálogo)</label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={close} disabled={isSaving} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-accent-500 text-white rounded-md hover:bg-accent-600 disabled:opacity-50">
                  {isSaving ? 'A guardar…' : (editing ? 'Guardar' : 'Adicionar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
