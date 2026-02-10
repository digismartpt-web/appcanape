import { useState, useEffect } from 'react';
import { categoriesService } from '../services/firebaseService';
import { InitializationService } from '../services/initializationService';
import { useAuth } from './useAuth';
import type { Category } from '../types';

export function usePizzeriaCategories() {
  const { loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const cached = localStorage.getItem('pizzeria_categories_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => categories.length === 0);

  // Charger les catégories au démarrage
  useEffect(() => {
    if (!InitializationService.isFirebaseAvailable()) {
      setCategories([]);
      setLoading(false);
      return;
    }

    console.log('🔄 [Categories] Starting realtime subscription...');
    setLoading(categories.length === 0);

    const unsubscribe = categoriesService.subscribeToCategories((updatedCategories) => {
      console.log(`🔔 [Categories] Update: ${updatedCategories.length} categories`);
      setCategories(updatedCategories);
      setLoading(false);
      // Sauvegarder dans le cache local
      try {
        localStorage.setItem('pizzeria_categories_cache', JSON.stringify(updatedCategories));
      } catch (e) {
        console.warn('⚠️ [Cache] Failed to save categories to localStorage');
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [authLoading]);

  const addCategory = async (categoryData: Omit<Category, 'id' | 'created_at'>) => {
    try {
      if (InitializationService.isFirebaseAvailable()) {
        // Sauvegarder uniquement dans Firebase
        const newCategoryId = await categoriesService.createCategory(categoryData);
        console.log('✅ Catégorie créée dans Firebase avec ID:', newCategoryId);

        // Les catégories seront mises à jour automatiquement via l'abonnement temps réel
      } else {
        throw new Error('Firebase non disponible - impossible de créer la catégorie');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la catégorie:', error);
      throw error;
    }
  };

  const updateCategory = async (id: string, categoryData: Partial<Category>) => {
    try {
      if (InitializationService.isFirebaseAvailable()) {
        // Mettre à jour uniquement dans Firebase
        await categoriesService.updateCategory(id, categoryData);
        console.log('✅ Catégorie mise à jour dans Firebase');

        // Les catégories seront mises à jour automatiquement via l'abonnement temps réel
      } else {
        throw new Error('Firebase non disponible - impossible de modifier la catégorie');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la catégorie:', error);
      throw error;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      if (InitializationService.isFirebaseAvailable()) {
        // Supprimer uniquement de Firebase
        await categoriesService.deleteCategory(id);
        console.log('✅ Catégorie supprimée de Firebase');

        // Les catégories seront mises à jour automatiquement via l'abonnement temps réel
      } else {
        throw new Error('Firebase non disponible - impossible de supprimer la catégorie');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la catégorie:', error);
      throw error;
    }
  };

  const toggleActive = async (id: string) => {
    const category = categories.find((cat: Category) => cat.id === id);
    if (category) {
      await updateCategory(id, { active: !category.active });
    }
  };

  const getActiveCategories = () => {
    return categories.filter((cat: Category) => cat.active);
  };

  return {
    categories,
    activeCategories: getActiveCategories(),
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleActive
  };
}