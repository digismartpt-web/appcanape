import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Package, ChevronUp, ChevronDown, X, AlertTriangle } from 'lucide-react';
import { productsService, productImagesService } from '../../services/supabaseService';
import { usePizzasStore } from '../../stores/pizzasStore';
import { usePizzariaCategories } from '../../hooks/usePizzariaCategories';
import type { Product, ProductImage } from '../../types';

interface SizeRow { code: string; label: string; price: number; }

interface ProductFormData {
  name: string;
  description: string;
  image_url: string;
  sizes: SizeRow[];
  features: string[];
  has_options: boolean;
  options: string[];
  category_id: string;
  available: boolean;
  track_stock: boolean;
  stock: number;
  stock_alert_threshold: number;
  width_cm: string;
  depth_cm: string;
  height_cm: string;
  weight_kg: string;
}

const emptyForm: ProductFormData = {
  name: '',
  description: '',
  image_url: '',
  sizes: [{ code: 'unique', label: 'Único', price: 0 }],
  features: [],
  has_options: false,
  options: [],
  category_id: '',
  available: true,
  track_stock: false,
  stock: 0,
  stock_alert_threshold: 2,
  width_cm: '',
  depth_cm: '',
  height_cm: '',
  weight_kg: '',
};

export function BoutiqueMenu() {
  const { allPizzas: products, loading } = usePizzasStore();
  const { activeCategories } = usePizzariaCategories();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const [newFeature, setNewFeature] = useState('');
  const [newOption, setNewOption] = useState('');

  const [galleryImages, setGalleryImages] = useState<ProductImage[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isAddingImg, setIsAddingImg] = useState(false);

  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [stockInputVal, setStockInputVal] = useState(0);

  useEffect(() => { setCurrentPage(1); }, [selectedCategory]);

  const availableCategories = activeCategories.length > 0
    ? activeCategories.map(c => ({ id: c.id, name: c.name }))
    : [...new Set(products.map(p => p.category_id).filter(Boolean))].map(id => ({ id: id!, name: id! }));

  const filtered = [...products]
    .filter(p => selectedCategory === 'all' || p.category_id === selectedCategory)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const totalPages = Math.ceil(filtered.length / perPage);
  const current = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const openAdd = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setGalleryImages([]);
    setShowModal(true);
  };

  const openEdit = async (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name || '',
      description: product.description || '',
      image_url: product.image_url || '',
      sizes: product.sizes.length > 0
        ? product.sizes.map(s => ({ code: s.code, label: s.label, price: s.price }))
        : [{ code: 'unique', label: 'Único', price: 0 }],
      features: [...(product.features || [])],
      has_options: product.has_options || false,
      options: [...(product.options || [])],
      category_id: product.category_id || '',
      available: product.available !== false,
      track_stock: product.track_stock || false,
      stock: product.stock ?? 0,
      stock_alert_threshold: product.stock_alert_threshold ?? 2,
      width_cm: product.width_cm?.toString() || '',
      depth_cm: product.depth_cm?.toString() || '',
      height_cm: product.height_cm?.toString() || '',
      weight_kg: product.weight_kg?.toString() || '',
    });
    try {
      const imgs = await productImagesService.getProductImages(product.id);
      setGalleryImages(imgs);
    } catch {
      setGalleryImages([]);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setForm(emptyForm);
    setGalleryImages([]);
    setNewImageUrl('');
  };

  const addSize = () => setForm(f => ({ ...f, sizes: [...f.sizes, { code: `s_${Date.now()}`, label: '', price: 0 }] }));
  const updateSize = (index: number, field: keyof SizeRow, value: string | number) =>
    setForm(f => ({ ...f, sizes: f.sizes.map((s, i) => i === index ? { ...s, [field]: value } : s) }));
  const removeSize = (index: number) => setForm(f => ({ ...f, sizes: f.sizes.filter((_, i) => i !== index) }));

  const addFeature = () => {
    const val = newFeature.trim();
    if (!val || form.features.includes(val)) return;
    setForm(f => ({ ...f, features: [...f.features, val] }));
    setNewFeature('');
  };
  const removeFeature = (index: number) => setForm(f => ({ ...f, features: f.features.filter((_, i) => i !== index) }));

  const addOption = () => {
    const val = newOption.trim();
    if (!val || form.options.includes(val)) return;
    setForm(f => ({ ...f, options: [...f.options, val] }));
    setNewOption('');
  };
  const removeOption = (index: number) => setForm(f => ({ ...f, options: f.options.filter((_, i) => i !== index) }));

  const handleAddImageByUrl = async () => {
    if (!editingProduct) return;
    const url = newImageUrl.trim();
    if (!url) return;
    if (galleryImages.length >= 10) { alert('Máximo 10 fotos por produto.'); return; }
    setIsAddingImg(true);
    try {
      const nextPos = galleryImages.length > 0 ? Math.max(...galleryImages.map(i => i.position)) + 1 : 0;
      await productImagesService.addProductImage(editingProduct.id, url, nextPos);
      const imgs = await productImagesService.getProductImages(editingProduct.id);
      setGalleryImages(imgs);
      setNewImageUrl('');
    } catch (err: any) {
      alert('Erro ao adicionar foto: ' + err.message);
    } finally {
      setIsAddingImg(false);
    }
  };

  const deleteGalleryImage = async (imageId: string) => {
    if (!confirm('Eliminar esta foto?')) return;
    try {
      await productImagesService.deleteProductImage(imageId);
      setGalleryImages(imgs => imgs.filter(i => i.id !== imageId));
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  const moveImage = async (index: number, direction: -1 | 1) => {
    const newImgs = [...galleryImages];
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= newImgs.length) return;
    [newImgs[index], newImgs[swapIdx]] = [newImgs[swapIdx], newImgs[index]];
    const reordered = newImgs.map((img, i) => ({ ...img, position: i }));
    setGalleryImages(reordered);
    try {
      await productImagesService.reorderImages(editingProduct!.id, reordered.map(i => i.id));
    } catch (err: any) {
      alert('Erro ao reordenar: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { alert('O nome é obrigatório.'); return; }
    const validSizes = form.sizes.filter(s => s.label.trim() && s.price > 0);
    if (validSizes.length === 0) { alert('Adicione pelo menos um tamanho com preço válido.'); return; }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        image_url: form.image_url.trim() || undefined,
        sizes: validSizes.map(s => ({ code: s.code || s.label.toLowerCase().replace(/\s+/g, '_'), label: s.label, price: Number(s.price) })),
        features: form.features,
        has_options: form.has_options,
        options: form.has_options ? form.options : [],
        category_id: form.category_id || undefined,
        available: form.available,
        track_stock: form.track_stock,
        stock: form.track_stock ? Number(form.stock) : 0,
        stock_alert_threshold: Number(form.stock_alert_threshold),
        width_cm: form.width_cm !== '' ? Number(form.width_cm) : undefined,
        depth_cm: form.depth_cm !== '' ? Number(form.depth_cm) : undefined,
        height_cm: form.height_cm !== '' ? Number(form.height_cm) : undefined,
        weight_kg: form.weight_kg !== '' ? Number(form.weight_kg) : undefined,
      };

      if (editingProduct) {
        await productsService.updateProduct(editingProduct.id, payload);
      } else {
        await productsService.createProduct(payload as any);
      }
      closeModal();
    } catch (err: any) {
      alert('Erro ao guardar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Eliminar "${product.name}" definitivamente?`)) return;
    try { await productsService.deleteProduct(product.id); } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  const handleToggleAvailable = async (product: Product) => {
    try { await productsService.updateProduct(product.id, { available: !product.available }); } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  const saveStock = async (product: Product) => {
    try {
      await productsService.updateProduct(product.id, { stock: stockInputVal });
      setEditingStockId(null);
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600 mx-auto" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white rounded-lg shadow-md p-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary-800">Catálogo de produtos</h1>
          <p className="text-primary-600 mt-1">{products.length} produto(s) no total</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-accent-500 text-white px-4 py-2 rounded-md hover:bg-accent-600 transition">
          <Plus className="h-5 w-5" /> Adicionar produto
        </button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-accent-600">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-500">Disponíveis</p>
          <p className="text-2xl font-bold text-green-600">{filtered.filter(p => p.available).length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-500">Em rutura de stock</p>
          <p className="text-2xl font-bold text-red-600">{filtered.filter(p => p.track_stock && p.stock === 0).length}</p>
        </div>
      </div>

      {/* Filtro por categoria */}
      <div className="bg-white rounded-lg shadow-md p-4 flex flex-wrap gap-2">
        <button onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${selectedCategory === 'all' ? 'bg-accent-500 text-white' : 'bg-primary-100 text-primary-700 hover:bg-primary-200'}`}>
          Todos ({products.length})
        </button>
        {availableCategories.map(cat => {
          const count = products.filter(p => p.category_id === cat.id).length;
          return (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${selectedCategory === cat.id ? 'bg-accent-500 text-white' : 'bg-primary-100 text-primary-700 hover:bg-primary-200'}`}>
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Tabela de produtos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-primary-800">Produto</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-primary-800">Categoria</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-primary-800">Tamanhos / Preço</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-primary-800">Stock</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-primary-800">Estado</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-primary-800">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100">
              {current.map(product => {
                const isLowStock = product.track_stock && product.stock > 0 && product.stock <= product.stock_alert_threshold;
                const isOutOfStock = product.track_stock && product.stock === 0;
                return (
                  <tr key={product.id} className="hover:bg-primary-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.image_url
                          ? <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                          : <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0"><Package className="h-5 w-5 text-primary-400" /></div>
                        }
                        <div>
                          <p className="font-medium text-primary-800 text-sm">{product.name}</p>
                          {product.description && <p className="text-xs text-primary-500 max-w-xs truncate">{product.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-primary-600 capitalize">{product.category_id || '—'}</td>
                    <td className="px-4 py-3 text-sm text-primary-600">
                      {product.sizes.length > 0
                        ? product.sizes.map(s => <div key={s.code}>{s.label}: {s.price.toFixed(2)}€</div>)
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {product.track_stock ? (
                        editingStockId === product.id ? (
                          <div className="flex items-center gap-1">
                            <input type="number" min="0" value={stockInputVal}
                              onChange={e => setStockInputVal(Number(e.target.value))}
                              className="w-16 px-2 py-1 border rounded text-sm" />
                            <button onClick={() => saveStock(product)} className="text-xs text-green-600 font-medium">✓</button>
                            <button onClick={() => setEditingStockId(null)} className="text-xs text-red-500 font-medium">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingStockId(product.id); setStockInputVal(product.stock); }}
                            className={`flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full ${isOutOfStock ? 'bg-red-100 text-red-700' : isLowStock ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                            {isLowStock && <AlertTriangle className="h-3 w-3" />}
                            {product.stock}
                          </button>
                        )
                      ) : <span className="text-xs text-gray-400">Não rastreado</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${product.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {product.available ? 'Disponível' : 'Indisponível'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleToggleAvailable(product)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          title={product.available ? 'Tornar indisponível' : 'Tornar disponível'}>
                          {product.available ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button onClick={() => openEdit(product)}
                          className="p-1.5 text-accent-600 hover:text-accent-800 hover:bg-accent-50 rounded" title="Editar">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(product)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded" title="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filtered.length)} de {filtered.length}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50">← Anterior</button>
              <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50">Seguinte →</button>
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-primary-500">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum produto nesta categoria.</p>
          </div>
        )}
      </div>

      {/* Modal Adicionar / Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-4">
            <form onSubmit={handleSubmit}>
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-lg z-10">
                <h2 className="text-xl font-bold text-primary-800">
                  {editingProduct ? 'Editar produto' : 'Adicionar produto'}
                </h2>
                <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Informações gerais */}
                <section className="space-y-4">
                  <h3 className="font-semibold text-gray-700 border-b pb-1">Informações gerais</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                    <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      required placeholder="Ex: Sofá 3 lugares Elisa"
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-accent-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      rows={3} placeholder="Descrição do produto…"
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-accent-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-accent-500 focus:outline-none">
                      <option value="">— Selecionar —</option>
                      {activeCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="available" checked={form.available}
                      onChange={e => setForm(f => ({ ...f, available: e.target.checked }))}
                      className="rounded border-gray-300 text-accent-500 focus:ring-accent-500" />
                    <label htmlFor="available" className="text-sm text-gray-700">Produto disponível para venda</label>
                  </div>
                </section>

                {/* Foto principal */}
                <section className="space-y-3">
                  <h3 className="font-semibold text-gray-700 border-b pb-1">Foto principal</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL da imagem</label>
                    <input type="url" value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                      placeholder="https://…"
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-accent-500 focus:outline-none" />
                  </div>
                  {form.image_url && (
                    <img src={form.image_url} alt="Pré-visualização" className="w-32 h-32 object-cover rounded-lg border" />
                  )}
                </section>

                {/* Tamanhos e preços */}
                <section className="space-y-3">
                  <h3 className="font-semibold text-gray-700 border-b pb-1">Tamanhos e preços *</h3>
                  <p className="text-xs text-gray-500">Adicione pelo menos um tamanho com preço (ex: "1 lugar", "2 lugares", "3 lugares").</p>
                  <div className="space-y-2">
                    {form.sizes.map((size, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input type="text" placeholder="Nome (ex: 2 lugares)" value={size.label}
                          onChange={e => updateSize(i, 'label', e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-accent-500 focus:outline-none" />
                        <div className="relative">
                          <input type="number" placeholder="Preço" value={size.price || ''}
                            onChange={e => updateSize(i, 'price', Number(e.target.value))}
                            min="0" step="0.01"
                            className="w-28 px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-accent-500 focus:outline-none" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                        </div>
                        {form.sizes.length > 1 && (
                          <button type="button" onClick={() => removeSize(i)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addSize}
                    className="text-sm text-accent-600 hover:text-accent-700 font-medium flex items-center gap-1">
                    <Plus className="h-4 w-4" /> Adicionar tamanho
                  </button>
                </section>

                {/* Características */}
                <section className="space-y-3">
                  <h3 className="font-semibold text-gray-700 border-b pb-1">Características</h3>
                  <div className="flex flex-wrap gap-2">
                    {form.features.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-accent-100 text-accent-800 rounded-full text-sm">
                        {f}
                        <button type="button" onClick={() => removeFeature(i)} className="text-accent-600 hover:text-accent-900 ml-0.5">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newFeature} onChange={e => setNewFeature(e.target.value)}
                      placeholder="Ex: Tecido lavável…"
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                      className="flex-1 px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-accent-500 focus:outline-none" />
                    <button type="button" onClick={addFeature}
                      className="px-3 py-2 bg-accent-100 text-accent-700 rounded-md text-sm hover:bg-accent-200">Adicionar</button>
                  </div>
                </section>

                {/* Opções */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-1">
                    <h3 className="font-semibold text-gray-700">Opções (cor / material)</h3>
                    <input type="checkbox" id="has_options" checked={form.has_options}
                      onChange={e => setForm(f => ({ ...f, has_options: e.target.checked }))}
                      className="rounded border-gray-300 text-accent-500 focus:ring-accent-500" />
                    <label htmlFor="has_options" className="text-sm text-gray-500">Ativar</label>
                  </div>
                  {form.has_options && (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {form.options.map((opt, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                            {opt}
                            <button type="button" onClick={() => removeOption(i)} className="text-blue-600 hover:text-blue-900 ml-0.5">×</button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input type="text" value={newOption} onChange={e => setNewOption(e.target.value)}
                          placeholder="Ex: Cinzento antracite…"
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                          className="flex-1 px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-accent-500 focus:outline-none" />
                        <button type="button" onClick={addOption}
                          className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200">Adicionar</button>
                      </div>
                    </>
                  )}
                </section>

                {/* Dimensões */}
                <section className="space-y-3">
                  <h3 className="font-semibold text-gray-700 border-b pb-1">Dimensões (opcional)</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { key: 'width_cm', label: 'Largura (cm)' },
                      { key: 'depth_cm', label: 'Profundidade (cm)' },
                      { key: 'height_cm', label: 'Altura (cm)' },
                      { key: 'weight_kg', label: 'Peso (kg)' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                        <input type="number" min="0" step="0.1"
                          value={(form as any)[key]}
                          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-accent-500 focus:outline-none" />
                      </div>
                    ))}
                  </div>
                </section>

                {/* Gestão de stock */}
                <section className="space-y-3">
                  <h3 className="font-semibold text-gray-700 border-b pb-1">Gestão de stock</h3>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="track_stock" checked={form.track_stock}
                      onChange={e => setForm(f => ({ ...f, track_stock: e.target.checked }))}
                      className="rounded border-gray-300 text-accent-500 focus:ring-accent-500" />
                    <label htmlFor="track_stock" className="text-sm text-gray-700">Rastrear stock deste produto</label>
                  </div>
                  {form.track_stock && (
                    <div className="grid grid-cols-2 gap-4 pl-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stock atual</label>
                        <input type="number" min="0" value={form.stock}
                          onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-accent-500 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Limite de alerta</label>
                        <input type="number" min="0" value={form.stock_alert_threshold}
                          onChange={e => setForm(f => ({ ...f, stock_alert_threshold: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-accent-500 focus:outline-none" />
                        <p className="text-xs text-gray-400 mt-1">Alerta se stock ≤ este limite</p>
                      </div>
                    </div>
                  )}
                </section>

                {/* Galeria — apenas para produtos existentes */}
                {editingProduct && (
                  <section className="space-y-3">
                    <h3 className="font-semibold text-gray-700 border-b pb-1">
                      Galeria de fotos ({galleryImages.length}/10)
                    </h3>
                    <p className="text-xs text-gray-500">Fotos adicionais exibidas no carrousel do produto.</p>

                    {galleryImages.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {galleryImages.map((img, i) => (
                          <div key={img.id} className="relative group">
                            <img src={img.image_url} alt="" className="w-full h-20 object-cover rounded-lg border" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center gap-1">
                              <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0}
                                className="p-1 bg-white/80 rounded text-gray-700 hover:bg-white disabled:opacity-30">
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button type="button" onClick={() => moveImage(i, 1)} disabled={i === galleryImages.length - 1}
                                className="p-1 bg-white/80 rounded text-gray-700 hover:bg-white disabled:opacity-30">
                                <ChevronDown className="h-3 w-3" />
                              </button>
                              <button type="button" onClick={() => deleteGalleryImage(img.id)}
                                className="p-1 bg-red-500 rounded text-white hover:bg-red-600">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {galleryImages.length < 10 && (
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={newImageUrl}
                          onChange={e => setNewImageUrl(e.target.value)}
                          placeholder="https://… (URL da foto)"
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddImageByUrl(); } }}
                          className="flex-1 px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-accent-500 focus:outline-none"
                        />
                        <button type="button" onClick={handleAddImageByUrl} disabled={isAddingImg || !newImageUrl.trim()}
                          className="px-4 py-2 bg-accent-100 text-accent-700 rounded-md text-sm hover:bg-accent-200 disabled:opacity-50">
                          {isAddingImg ? 'A adicionar…' : 'Adicionar'}
                        </button>
                      </div>
                    )}
                  </section>
                )}
              </div>

              <div className="border-t px-6 py-4 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
                <button type="button" onClick={closeModal} disabled={isSaving}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={isSaving}
                  className="px-6 py-2 bg-accent-500 text-white rounded-md hover:bg-accent-600 disabled:opacity-50">
                  {isSaving ? 'A guardar…' : (editingProduct ? 'Guardar' : 'Adicionar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
