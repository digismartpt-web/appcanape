import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { pizzasService } from '../../services/supabaseService';
import { usePizzasStore } from '../../stores/pizzasStore';
import { usePizzariaCategories } from '../../hooks/usePizzariaCategories';
import type { Pizza } from '../../types';

interface PizzaFormData {
  name: string;
  description: string;
  image_url: string;
  prices: {
    small: number;
    medium: number;
    large: number;
  };
  unique_price?: number;
  has_unique_price: boolean;
  ingredients: string[];
  category: string;
  vegetarian: boolean;
  active: boolean;
  customizable: boolean;
  max_custom_ingredients: number;
  custom_ingredients: string[];
}

const initialFormData: PizzaFormData = {
  name: '',
  description: '',
  image_url: '',
  prices: {
    small: 0,
    medium: 0,
    large: 0
  },
  unique_price: undefined,
  has_unique_price: false,
  ingredients: [],
  category: '',
  vegetarian: false,
  active: true,
  customizable: false,
  max_custom_ingredients: 3,
  custom_ingredients: []
};

export function PizzariaMenu() {
  const { allPizzas: pizzas, loading } = usePizzasStore();
  const { activeCategories } = usePizzariaCategories();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const pizzasPerPage = 8;
  const [showModal, setShowModal] = useState(false);
  const [editingPizza, setEditingPizza] = useState<Pizza | null>(null);
  const [formData, setFormData] = useState<PizzaFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  // Helper functions for 10% markup (apply to pizzas only)
  const applyMarkup = (price: number) => Math.round(price * 1.1 * 100) / 100;
  const removeMarkup = (price: number) => Math.round((price / 1.1) * 100) / 100;

  // Ouvir as mudanças de categorias
  useEffect(() => {
    const handleCategoriesUpdate = () => {
      // Forçar o re-render quando as categorias mudam
      setFormData(prev => ({ ...prev }));
    };

    window.addEventListener('categoriesUpdated', handleCategoriesUpdate);
    return () => window.removeEventListener('categoriesUpdated', handleCategoriesUpdate);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    console.log('🍕 Início da submissão do formulário');
    console.log('📝 Dados do formulário:', formData);

    // Verificar se pelo menos um preço está definido (preço único ou um tamanho)
    const hasUniquePrice = formData.has_unique_price && formData.unique_price && formData.unique_price > 0;
    const hasSizePrice = (!formData.has_unique_price) && (
      (formData.prices.small > 0) ||
      (formData.prices.medium > 0) ||
      (formData.prices.large > 0)
    );

    console.log('💰 Validação dos preços:', { hasUniquePrice, hasSizePrice, prices: formData.prices });

    if (!hasUniquePrice && !hasSizePrice) {
      console.log('❌ Falha na validação: nenhum preço definido');
      alert('⚠️ Atenção: Deve definir pelo menos um preço (preço único ou pelo menos um tamanho).');
      setIsSaving(false);
      return;
    }

    console.log('✅ Validação OK, gravação em curso...');

    // Aplicar a margem de 10% apenas para as pizzas
    const markedUpFormData: any = {
      ...formData,
      unique_price: formData.unique_price !== undefined ? applyMarkup(formData.unique_price) : undefined,
    };

    // Se tiver preço único, limpamos os preços individuais para evitar conflitos no backend
    if (formData.has_unique_price) {
      markedUpFormData.prices = {
        small: 0,
        medium: formData.unique_price ? applyMarkup(formData.unique_price) : 0,
        large: 0
      };
    } else {
      markedUpFormData.prices = {
        small: formData.prices.small ? applyMarkup(formData.prices.small) : 0,
        medium: formData.prices.medium ? applyMarkup(formData.prices.medium) : 0,
        large: formData.prices.large ? applyMarkup(formData.prices.large) : 0,
      };
    }

    try {
      console.log('💾 A gravar pizza no Supabase...');
      if (editingPizza) {
        console.log('📝 Modificando a pizza:', editingPizza.id);
        await pizzasService.updatePizza(editingPizza.id, markedUpFormData);
      } else {
        console.log('➕ Criando nova pizza');
        const newId = await pizzasService.createPizza(markedUpFormData);
        console.log('✅ Pizza criada com ID:', newId);
      }
      // Não é necessário recarregar manualmente, o Realtime atualizará o store

      console.log('✅ Gravação concluída com sucesso, a fechar o modal');
      setShowModal(false);
      setEditingPizza(null);
      setFormData(initialFormData);
    } catch (error) {
      console.error('❌ Erro ao guardar:', error);
      alert('Erro ao guardar a pizza: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
      console.log('🏁 Fim da submissão');
    }
  };

  const handleEdit = (pizza: Pizza) => {
    setEditingPizza(pizza);
    setFormData({
      name: pizza.name || '',
      description: pizza.description || '',
      image_url: pizza.image_url || '',
      prices: {
        small: pizza.prices.small ? removeMarkup(pizza.prices.small) : 0,
        medium: pizza.prices.medium ? removeMarkup(pizza.prices.medium) : 0,
        large: pizza.prices.large ? removeMarkup(pizza.prices.large) : 0,
      },
      has_unique_price: pizza.has_unique_price || false,
      unique_price: pizza.unique_price ? removeMarkup(pizza.unique_price) : undefined,
      ingredients: pizza.ingredients || [],
      category: pizza.category || 'Outros',
      vegetarian: pizza.vegetarian || false,
      active: true,
      customizable: pizza.customizable || false,
      max_custom_ingredients: pizza.max_custom_ingredients || 3,
      custom_ingredients: pizza.custom_ingredients || []
    });
    setShowModal(true);
  };

  const handleDelete = async (pizza: Pizza) => {
    if (!confirm(`Tem a certeza que deseja eliminar "${pizza.name}"?`)) {
      return;
    }
    try {
      await pizzasService.deletePizza(pizza.id);
      // Não é necessário recarregar manualmente
    } catch (error) {
      console.error('Erro ao apagar:', error);
      alert('Erro ao eliminar a pizza');
    }
  };

  const handleToggleActive = async (pizza: Pizza) => {
    try {
      const currentActiveState = (pizza as any).active ?? true;
      const newActiveState = !currentActiveState;
      await pizzasService.updatePizza(pizza.id, { active: newActiveState });
      // Não é necessário recarregar manualmente
    } catch (error) {
      console.error('Erro na atualização:', error);
      alert('Erro ao atualizar a pizza');
    }
  };

  // Filtrar e ordenar as pizzas
  const filteredAndSortedPizzas = [...pizzas]
    .filter(pizza => {
      if (selectedCategory === 'all') return true;
      const pizzaCategory = pizza.category || 'Outros';
      return pizzaCategory.toLowerCase() === selectedCategory.toLowerCase();
    })
    .sort((a, b) => {
      // Primeiro por categoria
      const categoryCompare = (a.category || '').localeCompare(b.category || '');
      if (categoryCompare !== 0) return categoryCompare;
      // Depois por nome alfabético
      return (a.name || '').localeCompare(b.name || '');
    });

  // Calcular as pizzas para a página atual
  const indexOfLastPizza = currentPage * pizzasPerPage;
  const indexOfFirstPizza = indexOfLastPizza - pizzasPerPage;
  const currentPizzas = filteredAndSortedPizzas.slice(indexOfFirstPizza, indexOfLastPizza);
  const totalPages = Math.ceil(filteredAndSortedPizzas.length / pizzasPerPage);

  // Repor para a página 1 apenas quando o filtro muda e fazer scroll para cima
  useEffect(() => {
    setCurrentPage(1);
    window.scrollTo(0, 0);
  }, [selectedCategory]);

  // Fazer scroll para cima quando a página muda
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  // Obter as categorias disponíveis
  const availableCategories = activeCategories.length > 0
    ? activeCategories.map(cat => cat.name)
    : [...new Set(pizzas.map(pizza => pizza.category || 'Outros'))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-800 mx-auto mb-4"></div>
          <p className="text-primary-600">A carregar o menu de pizzas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-full">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary-800 mb-2">Gestão do Menu</h1>
            <p className="text-primary-600">Adicione, modifique e gira</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setEditingPizza(null);
                setFormData(initialFormData);
                setShowModal(true);
              }}
              className="flex items-center space-x-2 bg-accent-500 text-white px-4 py-2 rounded-md hover:bg-accent-600 transition"
            >
              <Plus className="h-5 w-5" />
              <span>Adicionar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <label className="text-sm font-medium text-primary-700 flex-shrink-0">
            Filtrar por categoria:
          </label>
          <div className="flex flex-wrap gap-2 flex-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${selectedCategory === 'all'
                ? 'bg-accent-500 text-white'
                : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                }`}
            >
              Todas ({pizzas.length})
            </button>
            {availableCategories.map((category) => {
              const count = pizzas.filter(p => p.category === category).length;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${selectedCategory === category
                    ? 'bg-accent-500 text-white'
                    : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                    }`}
                >
                  {category} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-primary-800">Total</h3>
          <p className="text-2xl font-bold text-accent-600">{filteredAndSortedPizzas.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-primary-800">Ativas</h3>
          <p className="text-2xl font-bold text-green-600">
            {filteredAndSortedPizzas.filter(p => (p as any).active !== false).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-primary-800">Vegetarianas</h3>
          <p className="text-2xl font-bold text-purple-600">
            {filteredAndSortedPizzas.filter(p => p.vegetarian).length}
          </p>
        </div>
      </div>

      {/* Lista de pizzas */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {filteredAndSortedPizzas.length > pizzasPerPage && (
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Mostrando {indexOfFirstPizza + 1} a {Math.min(indexOfLastPizza, filteredAndSortedPizzas.length)} de {filteredAndSortedPizzas.length} pizzas
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-700">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-primary-800">Pizza</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-primary-800">Categoria</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-primary-800">Preço</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-primary-800">Estado</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-primary-800">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100">
              {currentPizzas.map((pizza, index) => {
                // Verificar se é a primeira pizza de uma nova categoria
                const isFirstInCategory = index === 0 ||
                  currentPizzas[index - 1].category !== pizza.category;

                return (
                  <tr key={pizza.id} className={`hover:bg-primary-50 ${isFirstInCategory ? 'border-t-2 border-accent-200' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={pizza.image_url}
                          alt={pizza.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div>
                          <div className="text-sm font-medium text-primary-800">{pizza.name}</div>
                          <div className="text-sm text-primary-600 max-w-xs truncate">
                            {pizza.description}
                          </div>
                          {pizza.vegetarian && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Vegetariana
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-primary-600 capitalize">
                      {pizza.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-primary-600">
                      {pizza.has_unique_price ? (
                        <div>
                          <span className="font-medium">Preço Único: </span>
                          {(pizza.unique_price || 0).toFixed(2)}€
                        </div>
                      ) : (
                        <>
                          <div>P: {(pizza.prices.small || 0).toFixed(2)}€</div>
                          <div>M: {(pizza.prices.medium || 0).toFixed(2)}€</div>
                          <div>G: {(pizza.prices.large || 0).toFixed(2)}€</div>
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(pizza as any).active !== false
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {(pizza as any).active !== false ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleActive(pizza)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title={(pizza as any).active !== false ? 'Desativar' : 'Ativar'}
                        >
                          {(pizza as any).active !== false ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(pizza)}
                          className="text-accent-600 hover:text-accent-800 p-1"
                          title="Modificar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(pizza)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Eliminar"
                        >
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
        {filteredAndSortedPizzas.length > pizzasPerPage && (
          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>

              {/* Números de páginas */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`px-3 py-2 text-sm rounded-md ${currentPage === pageNumber
                    ? 'bg-accent-500 text-white'
                    : 'border border-gray-300 hover:bg-gray-100'
                    }`}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>

      {
        filteredAndSortedPizzas.length === 0 && pizzas.length > 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-primary-600 mb-4">Nenhuma pizza nesta categoria</p>
            <button
              onClick={() => setSelectedCategory('all')}
              className="bg-accent-500 text-white px-4 py-2 rounded-md hover:bg-accent-600 transition"
            >
              Ver todas
            </button>
          </div>
        )
      }

      {
        pizzas.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-primary-600 mb-4">Nenhuma item no menu</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-accent-500 text-white px-4 py-2 rounded-md hover:bg-accent-600 transition"
            >
              Adicionar
            </button>
          </div>
        )
      }


      {/* Modal d'ajout/modification */}
      {
        showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <h2 className="text-2xl font-bold text-primary-800">
                  {editingPizza ? 'Modificar' : 'Adicionar'}
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      Nome
                    </label>
                    <input
                      type="text"
                      id="pizza-name"
                      name="pizza-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                      required
                      placeholder="Nome do produto"
                      title="Nome do produto"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      id="pizza-description"
                      name="pizza-description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                      rows={3}
                      placeholder="Descrição dos ingredientes, etc."
                      title="Descrição do produto"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      URL da Imagem
                    </label>
                    <input
                      type="url"
                      id="pizza-image-url"
                      name="pizza-image-url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      className="w-full px-3 py-2 border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                      required
                      placeholder="https://exemplo.com/imagem.jpg"
                      title="URL da imagem do produto"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="has_unique_price"
                      checked={formData.has_unique_price}
                      onChange={(e) => setFormData({
                        ...formData,
                        has_unique_price: e.target.checked,
                        unique_price: e.target.checked ? 0 : undefined,
                        prices: e.target.checked ? { small: 0, medium: 0, large: 0 } : formData.prices
                      })}
                      className="rounded border-primary-300 text-accent-500 focus:ring-accent-500"
                    />
                    <label htmlFor="has_unique_price" className="text-sm font-medium text-primary-700">
                      Este item tem um preço único
                    </label>
                  </div>

                  {formData.has_unique_price ? (
                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-1">
                        Preço Único (€)
                      </label>
                      <input
                        type="number"
                        id="unique_price"
                        name="unique_price"
                        value={formData.unique_price || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          unique_price: Number(e.target.value)
                        })}
                        className="w-full px-3 py-2 border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                        min="0.01"
                        step="0.01"
                        required
                        title="Preço único em euros"
                      />
                      {formData.unique_price !== undefined && formData.unique_price > 0 && (
                        <p className="text-xs text-green-600 mt-1 font-medium italic">
                          Preço Final (com +10%): {applyMarkup(formData.unique_price || 0).toFixed(2)}€
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-primary-600 mb-3">
                        💡 Defina pelo menos um preço
                      </p>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-primary-700 mb-1">
                            Preço (Pequena)
                          </label>
                          <input
                            type="number"
                            id="price-small"
                            name="price-small"
                            value={formData.prices.small || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              prices: { ...formData.prices, small: Number(e.target.value) || 0 }
                            })}
                            className="w-full px-3 py-2 border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                            min="0"
                            step="0.01"
                            placeholder="0 = não disponível"
                            title="Preço para tamanho pequeno"
                          />
                          {formData.prices.small > 0 && (
                            <p className="text-[10px] text-green-600 mt-1 font-medium italic">
                              Final (+10%): {applyMarkup(formData.prices.small).toFixed(2)}€
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary-700 mb-1">
                            Preço (Média)
                          </label>
                          <input
                            type="number"
                            id="price-medium"
                            name="price-medium"
                            value={formData.prices.medium || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              prices: { ...formData.prices, medium: Number(e.target.value) || 0 }
                            })}
                            className="w-full px-3 py-2 border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                            min="0"
                            step="0.01"
                            placeholder="0 = não disponible"
                            title="Preço para tamanho médio"
                          />
                          {formData.prices.medium > 0 && (
                            <p className="text-[10px] text-green-600 mt-1 font-medium italic">
                              Final (+10%): {applyMarkup(formData.prices.medium).toFixed(2)}€
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary-700 mb-1">
                            Preço (Grande)
                          </label>
                          <input
                            type="number"
                            id="price-large"
                            name="price-large"
                            value={formData.prices.large || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              prices: { ...formData.prices, large: Number(e.target.value) || 0 }
                            })}
                            className="w-full px-3 py-2 border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                            min="0"
                            step="0.01"
                            placeholder="0 = não disponible"
                            title="Preço para tamanho grande"
                          />
                          {formData.prices.large > 0 && (
                            <p className="text-[10px] text-green-600 mt-1 font-medium italic">
                              Final (+10%): {applyMarkup(formData.prices.large).toFixed(2)}€
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      Ingredientes
                    </label>
                    <div className="space-y-3">
                      {/* Lista de ingredientes atuais */}
                      {(formData.ingredients || []).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {(formData.ingredients || []).map((ingredient, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-accent-100 text-accent-800"
                            >
                              {ingredient}
                              <button
                                type="button"
                                onClick={() => {
                                  const newIngredients = (formData.ingredients || []).filter((_, i) => i !== index);
                                  setFormData({ ...formData, ingredients: newIngredients });
                                }}
                                className="ml-2 text-accent-600 hover:text-accent-800"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-primary-500 italic">Nenhum ingrediente adicionado.</p>
                      )}

                      {/* Campo para adicionar um novo ingrediente */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="newIngredient"
                          placeholder="Adicionar ingrediente..."
                          className="flex-1 px-3 py-2 border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const input = e.target as HTMLInputElement;
                              const newIngredient = input.value.trim();
                              if (newIngredient && !(formData.ingredients || []).includes(newIngredient)) {
                                setFormData({
                                  ...formData,
                                  ingredients: [...(formData.ingredients || []), newIngredient]
                                });
                                input.value = '';
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById('newIngredient') as HTMLInputElement;
                            const newIngredient = input.value.trim();
                            if (newIngredient && !(formData.ingredients || []).includes(newIngredient)) {
                              setFormData({
                                ...formData,
                                ingredients: [...(formData.ingredients || []), newIngredient]
                              });
                              input.value = '';
                            }
                          }}
                          className="px-4 py-2 bg-accent-500 text-white rounded-md hover:bg-accent-600 transition"
                        >
                          Adicionar
                        </button>
                      </div>

                      <p className="text-xs text-primary-500">
                        Digite um ingrediente e clique "Adicionar" ou pressione Enter
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      Categoria
                    </label>
                    <select
                      id="pizza-category-select"
                      name="pizza-category-select"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                      required
                      title="Selecione a categoria"
                    >
                      <option value="">Selecionar categoria</option>
                      {activeCategories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t border-primary-200 pt-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <input
                        type="checkbox"
                        id="customizable"
                        checked={formData.customizable}
                        onChange={(e) => setFormData({
                          ...formData,
                          customizable: e.target.checked
                        })}
                        className="rounded border-primary-300 text-accent-500 focus:ring-accent-500"
                      />
                      <label htmlFor="customizable" className="text-sm font-medium text-primary-700">
                        Personalizável (clientes podem adicionar ingredientes)
                      </label>
                    </div>

                    {formData.customizable && (
                      <div className="space-y-4 pl-6 border-l-2 border-accent-200">
                        <div>
                          <label className="block text-sm font-medium text-primary-700 mb-1">
                            Número máximo de ingredientes (1-10)
                          </label>
                          <input
                            type="number"
                            id="max-custom-ingredients"
                            name="max-custom-ingredients"
                            value={formData.max_custom_ingredients}
                            onChange={(e) => setFormData({
                              ...formData,
                              max_custom_ingredients: Math.min(10, Math.max(1, Number(e.target.value)))
                            })}
                            className="w-full px-3 py-2 border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                            min="1"
                            max="10"
                            required
                            title="Número máximo de ingredientes permitidos"
                            placeholder="3"
                          />
                          <p className="text-xs text-primary-500 mt-1">
                            Clientes poderão escolher até {formData.max_custom_ingredients} ingrediente(s)
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-primary-700 mb-1">
                            Ingredientes disponíveis para personalização
                          </label>
                          <div className="space-y-3">
                            {(formData.custom_ingredients || []).length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {(formData.custom_ingredients || []).map((ingredient, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                                  >
                                    {ingredient}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newIngredients = (formData.custom_ingredients || []).filter((_, i) => i !== index);
                                        setFormData({ ...formData, custom_ingredients: newIngredients });
                                      }}
                                      className="ml-2 text-green-600 hover:text-green-800"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-primary-500 italic">Nenhum ingrediente personalizável adicionado.</p>
                            )}

                            <div className="flex gap-2">
                              <input
                                type="text"
                                id="newCustomIngredient"
                                placeholder="Ex: Cogumelos, Azeitonas..."
                                className="flex-1 px-3 py-2 border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const input = e.target as HTMLInputElement;
                                    const newIngredient = input.value.trim();
                                    if (newIngredient && !formData.custom_ingredients.includes(newIngredient)) {
                                      setFormData({
                                        ...formData,
                                        custom_ingredients: [...formData.custom_ingredients, newIngredient]
                                      });
                                      input.value = '';
                                    }
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.getElementById('newCustomIngredient') as HTMLInputElement;
                                  const newIngredient = input.value.trim();
                                  if (newIngredient && !formData.custom_ingredients.includes(newIngredient)) {
                                    setFormData({
                                      ...formData,
                                      custom_ingredients: [...formData.custom_ingredients, newIngredient]
                                    });
                                    input.value = '';
                                  }
                                }}
                                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition"
                              >
                                Adicionar
                              </button>
                            </div>

                            <p className="text-xs text-primary-500">
                              Estes ingredientes estarão disponíveis para os clientes escolherem ao personalizar
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingPizza(null);
                      setFormData(initialFormData);
                    }}
                    disabled={isSaving}
                    className="px-4 py-2 text-primary-600 hover:text-primary-800 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-accent-500 text-white rounded-md hover:bg-accent-600 disabled:opacity-50"
                  >
                    {isSaving ? 'A guardar...' : (editingPizza ? 'Modificar' : 'Adicionar')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}