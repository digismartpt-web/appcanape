import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import type { Pizza, User } from '../types';

// Données des pizzas à ajouter
export const INITIAL_PIZZAS: Omit<Pizza, 'id'>[] = [
  {
    name: "Margherita",
    description: "La classique italienne avec sauce tomate, mozzarella et basilic frais",
    image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1350&q=80",
    prices: {
      small: 9,
      medium: 12,
      large: 15
    },
    ingredients: ["sauce tomate", "mozzarella", "basilic"],
    category: "classiques",
    vegetarian: true
  },
  {
    name: "Regina",
    description: "Sauce tomate, mozzarella, jambon, champignons frais",
    image_url: "https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=1350&q=80",
    prices: {
      small: 11,
      medium: 14,
      large: 17
    },
    ingredients: ["sauce tomate", "mozzarella", "jambon", "champignons"],
    category: "classiques",
    vegetarian: false
  },
  {
    name: "4 Fromages",
    description: "Sauce tomate, mozzarella, gorgonzola, chèvre, parmesan",
    image_url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1350&q=80",
    prices: {
      small: 12,
      medium: 15,
      large: 18
    },
    ingredients: ["sauce tomate", "mozzarella", "gorgonzola", "chèvre", "parmesan"],
    category: "fromages",
    vegetarian: true
  },
  {
    name: "Calzone",
    description: "Pizza pliée avec sauce tomate, mozzarella, jambon, œuf",
    image_url: "https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=1350&q=80",
    prices: {
      small: 11,
      medium: 14,
      large: 17
    },
    ingredients: ["sauce tomate", "mozzarella", "jambon", "œuf"],
    category: "spécialités",
    vegetarian: false
  },
  {
    name: "Végétarienne",
    description: "Sauce tomate, mozzarella, poivrons, oignons, champignons, olives",
    image_url: "https://images.unsplash.com/photo-1511689660979-10d2b1aada49?auto=format&fit=crop&w=1350&q=80",
    prices: {
      small: 11,
      medium: 14,
      large: 17
    },
    ingredients: ["sauce tomate", "mozzarella", "poivrons", "oignons", "champignons", "olives"],
    category: "végétariennes",
    vegetarian: true
  },
  {
    name: "Diavola",
    description: "Sauce tomate, mozzarella, salami piquant, poivrons, piments",
    image_url: "https://images.unsplash.com/photo-1458642849426-cfb724f15ef7?auto=format&fit=crop&w=1350&q=80",
    prices: {
      small: 12,
      medium: 15,
      large: 18
    },
    ingredients: ["sauce tomate", "mozzarella", "salami piquant", "poivrons", "piments"],
    category: "spécialités",
    vegetarian: false
  },
  {
    name: "Caprese",
    description: "Sauce tomate, mozzarella di bufala, tomates cerises, roquette, huile d'olive",
    image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1350&q=80",
    prices: {
      small: 13,
      medium: 16,
      large: 19
    },
    ingredients: ["sauce tomate", "mozzarella di bufala", "tomates cerises", "roquette"],
    category: "spécialités",
    vegetarian: true
  },
  {
    name: "Fruits de Mer",
    description: "Sauce tomate, mozzarella, fruits de mer, ail, persil",
    image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1350&q=80",
    prices: {
      small: 14,
      medium: 17,
      large: 20
    },
    ingredients: ["sauce tomate", "mozzarella", "fruits de mer", "ail", "persil"],
    category: "spécialités",
    vegetarian: false
  }
];

// Fonction pour ajouter les pizzas initiales
export async function addInitialPizzas() {
  if (!db) return;
  
  const pizzasRef = collection(db, 'pizzas');
  
  for (const pizza of INITIAL_PIZZAS) {
    await addDoc(pizzasRef, {
      ...pizza,
      active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }
}

// Comptes de démonstration
export const DEMO_ACCOUNTS = [
  {
    email: 'admin@demo.com',
    password: 'admin123',
    userData: {
      role: 'admin' as const,
      full_name: 'Admin Demo',
      phone: '+33 1 23 45 67 89',
      address: '123 Rue de la Demo, 75001 Paris'
    }
  },
  {
    email: 'pizzeria@demo.com',
    password: 'demo123',
    userData: {
      role: 'pizzeria' as const,
      full_name: 'Pizzeria Demo',
      phone: '+33 6 98 76 54 32',
      address: '456 Avenue de la Pizzeria, 75002 Paris'
    }
  }
];

// Fonction pour créer les comptes de démonstration
export async function createDemoAccounts() {
  if (!auth || !db) return;
  
  for (const account of DEMO_ACCOUNTS) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        account.email,
        account.password
      );
      
      // Créer le profil utilisateur dans Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: account.email,
        ...account.userData,
        created_at: new Date(),
        updated_at: new Date()
      });
    } catch (error) {
      console.log(`Compte ${account.email} existe déjà ou erreur:`, error);
    }
  }
}