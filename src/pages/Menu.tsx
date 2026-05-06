import { useState, useEffect } from 'react';
import { Filter, Package } from 'lucide-react';
import { BrandingFooter } from '../components/BrandingFooter';
import { ProductModal } from '../components/ProductModal';
import { useCartStore } from '../stores/cartStore';
import { usePizzasStore } from '../stores/pizzasStore';
import { usePizzariaSettings } from '../hooks/usePizzariaSettings';
import { useAuth } from '../hooks/useAuth';
import { getProPrice } from '../services/supabaseService';
import type { Product } from '../types';

export function Menu() {
  const { user } = useAuth();
  const { pizzas: products, loading, categories: activeCategories } = usePizzasStore();
  const { settings } = usePizzariaSettings();
  const [loadingState, setLoadingState] = useState(() => products.length === 0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 9;
  const { addItem } = useCartStore();

  useEffect(() => { if (!loading) setLoadingState(false); }, [loading]);

  const getAvailableCategories = () => {
    if (activeCategories.length > 0) {
      return activeCategories.filter(cat => cat.active !== false).map(cat => cat.name.toLowerCase());
    }
    return [...new Set(products.map(p => (p.category_id || 'Autres').toLowerCase()))];
  };
  const availableCategories = getAvailableCategories();

  const filteredProducts = products
    .filter(p => {
      if (p.track_stock && p.stock === 0) return false;
      if (selectedCategory === 'all') return true;
      return (p.category_id || '').toLowerCase() === selectedCategory.toLowerCase();
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const indexOfLast = currentPage * productsPerPage;
  const indexOfFirst = indexOfLast - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  useEffect(() => { setCurrentPage(1); window.scrollTo(0, 0); }, [selectedCategory]);
  useEffect(() => { window.scrollTo(0, 0); }, [currentPage]);

  const handleAddToCart = (product: Product, sizeCode: string, sizeLabel: string, selectedOption?: string, quantity = 1) => {
    addItem({ product, sizeCode, sizeLabel, selectedOption, quantity });
  };

  const isProUser = user?.pro_validated === true;
  const proDiscount = user?.pro_discount_percent ?? 0;

  const getDisplayPrice = (product: Product) => {
    if (!product.sizes || product.sizes.length === 0) return null;
    if (isProUser) {
      const proPrices = product.sizes.map(s => getProPrice(product, s.code, proDiscount));
      if (product.sizes.length === 1) return `${proPrices[0].toFixed(2)}€`;
      const min = Math.min(...proPrices);
      return `A partir de ${min.toFixed(2)}€`;
    }
    if (product.sizes.length === 1) return `${product.sizes[0].price.toFixed(2)}€`;
    const min = Math.min(...product.sizes.map(s => s.price));
    return `A partir de ${min.toFixed(2)}€`;
  };

  return (
    <div className="min-h-screen bg-primary-50">
      <div className="container mx-auto px-4 py-8">
        {loadingState && products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mb-4" />
            <p className="text-primary-600 font-medium">A carregar o catálogo…</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-700">
            {/* Banner */}
            {settings.banner_active && settings.banner_image_url && (
              <div className="mb-8 w-full max-w-5xl mx-auto rounded-xl overflow-hidden shadow-lg">
                <img src={settings.banner_image_url} alt="Promotion" className="w-full h-auto block" />
              </div>
            )}

            {/* Header */}
            <div className="text-center mb-6 sm:mb-8">
              {settings.logo_url && (
                <div className="flex justify-center mb-4 sm:mb-6">
                  <img src={settings.logo_url} alt={settings.name}
                    className="h-16 sm:h-20 md:h-24 w-auto object-contain max-w-xs" />
                </div>
              )}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary-800 mb-2 px-4">
                {settings.name || 'O Nosso Catálogo'}
              </h1>
              <div className="sm:hidden"><BrandingFooter isStatic={true} /></div>
            </div>

            {/* Filtres */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-8">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative w-full">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-400 h-5 w-5" />
                  <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                    aria-label="Filtrar por categoria"
                    className="w-full pl-10 pr-8 py-3 text-base border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 bg-white touch-manipulation">
                    <option value="all">Todas as categorias</option>
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="hidden sm:flex flex-wrap gap-2 mt-4">
                <button onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${selectedCategory === 'all' ? 'bg-accent-500 text-white' : 'bg-primary-100 text-primary-700 hover:bg-primary-200'}`}>
                  Todos ({products.length})
                </button>
                {availableCategories.map(cat => {
                  const count = products.filter(p => (p.category_id || '').toLowerCase() === cat.toLowerCase()).length;
                  return (
                    <button key={cat} onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition ${selectedCategory === cat ? 'bg-accent-500 text-white' : 'bg-primary-100 text-primary-700 hover:bg-primary-200'}`}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-primary-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-primary-800 mb-2">Nenhum produto encontrado</h3>
                <p className="text-primary-600">Tente modificar os seus filtros</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {currentProducts.map(product => {
                    const isLowStock = product.track_stock && product.stock > 0 && product.stock <= product.stock_alert_threshold;
                    const isOutOfStock = product.track_stock && product.stock === 0;
                    const displayPrice = getDisplayPrice(product);
                    return (
                      <div key={product.id}
                        className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer touch-manipulation ${isOutOfStock ? 'opacity-60' : ''}`}
                        onClick={() => !isOutOfStock && setSelectedProduct(product)}>
                        <div className="w-full h-40 sm:h-48 bg-primary-100 flex items-center justify-center relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-primary-100 animate-pulse" />
                          {product.image_url && (
                            <img src={product.image_url} alt={product.name}
                              className="w-full h-full object-cover relative z-10 transition-opacity duration-300 opacity-0"
                              onLoad={(e) => {
                                (e.currentTarget as HTMLImageElement).classList.remove('opacity-0');
                                (e.currentTarget as HTMLImageElement).classList.add('opacity-100');
                                const placeholder = e.currentTarget.previousElementSibling;
                                if (placeholder) placeholder.remove();
                              }} loading="eager" />
                          )}
                          {/* Badges stock */}
                          {isOutOfStock && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
                              <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">Esgotado</span>
                            </div>
                          )}
                          {isLowStock && !isOutOfStock && (
                            <div className="absolute top-2 right-2 z-20">
                              <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                                Apenas {product.stock}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-4 sm:p-6">
                          <h3 className="text-lg sm:text-xl font-semibold text-primary-800 mb-1">{product.name}</h3>
                          {product.description && (
                            <p className="text-primary-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                          )}
                          {product.features.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {product.features.slice(0, 3).map((f, i) => (
                                <span key={i} className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{f}</span>
                              ))}
                            </div>
                          )}
                          <div className="flex justify-between items-center gap-3">
                            <div className="text-sm">
                              {displayPrice ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-lg sm:text-xl font-bold text-accent-600">{displayPrice}</span>
                                  {isProUser && (
                                    <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full w-fit">Preço Pro</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">Preço sob consulta</span>
                              )}
                            </div>
                            <button
                              disabled={isOutOfStock}
                              className="w-auto bg-accent-500 text-white px-4 py-2.5 rounded-md hover:bg-accent-600 transition text-sm font-medium touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed">
                              {isOutOfStock ? 'Indisponível' : 'Ver'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {filteredProducts.length > productsPerPage && (
                  <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-xs sm:text-sm text-primary-600">
                        A mostrar {indexOfFirst + 1}–{Math.min(indexOfLast, filteredProducts.length)} de {filteredProducts.length} produtos
                      </p>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                          className="px-4 py-2 text-sm border border-primary-300 rounded-md hover:bg-primary-50 disabled:opacity-50 touch-manipulation">← Anterior</button>
                        <div className="hidden sm:flex items-center space-x-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                            <button key={n} onClick={() => setCurrentPage(n)}
                              className={`px-3 py-2 text-sm rounded-md ${currentPage === n ? 'bg-accent-500 text-white' : 'border border-primary-300 hover:bg-primary-50'}`}>{n}</button>
                          ))}
                        </div>
                        <div className="sm:hidden px-3 py-2 text-sm font-medium text-primary-700">{currentPage}/{totalPages}</div>
                        <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                          className="px-4 py-2 text-sm border border-primary-300 rounded-md hover:bg-primary-50 disabled:opacity-50 touch-manipulation">Seguinte →</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {selectedProduct && (
          <ProductModal
            product={selectedProduct}
            isOpen={!!selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={handleAddToCart}
          />
        )}
      </div>
    </div>
  );
}
