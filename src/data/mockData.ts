import type { Pizza } from '../types';

export const MOCK_PIZZAS: Pizza[] = [
  {
    id: '1',
    name: "Margherita",
    description: "A clássica italiana com molho de tomate, mozzarella e manjericão fresco",
    image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1350&q=80",
    prices: {
      small: 9,
      medium: 12,
      large: 15
    },
    ingredients: ["molho de tomate", "mozzarella", "manjericão"],
    category: "classiques",
    vegetarian: true
  },
  {
    id: '2',
    name: "Regina",
    description: "Molho de tomate, mozzarella, fiambre, cogumelos frescos",
    image_url: "https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=1350&q=80",
    prices: {
      small: 11,
      medium: 14,
      large: 17
    },
    ingredients: ["molho de tomate", "mozzarella", "fiambre", "cogumelos"],
    category: "classiques",
    vegetarian: false
  },
  {
    id: '3',
    name: "4 Queijos",
    description: "Molho de tomate, mozzarella, gorgonzola, queijo de cabra, parmesão",
    image_url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1350&q=80",
    prices: {
      small: 12,
      medium: 15,
      large: 18
    },
    ingredients: ["molho de tomate", "mozzarella", "gorgonzola", "queijo de cabra", "parmesão"],
    category: "fromages",
    vegetarian: true
  },
  {
    id: '4',
    name: "Vegetariana",
    description: "Molho de tomate, mozzarella, pimentos, cebolas, cogumelos, azeitonas",
    image_url: "https://images.unsplash.com/photo-1511689660979-10d2b1aada49?auto=format&fit=crop&w=1350&q=80",
    prices: {
      small: 11,
      medium: 14,
      large: 17
    },
    ingredients: ["molho de tomate", "mozzarella", "pimentos", "cebolas", "cogumelos", "azeitonas"],
    category: "végétariennes",
    vegetarian: true
  }
];