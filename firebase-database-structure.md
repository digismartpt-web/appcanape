# Structure de la base de données Firebase pour Pizza Délice

## Collections Firestore

### 1. Collection `users`
```javascript
{
  id: "user_uid", // Document ID = Firebase Auth UID
  email: "user@example.com",
  role: "client" | "admin" | "pizzeria",
  full_name: "Nom Complet",
  phone: "+33 6 12 34 56 78",
  address: "123 Rue de l'Adresse, 75001 Paris",
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### 2. Collection `pizzas`
```javascript
{
  id: "pizza_id", // Auto-généré
  name: "Margherita",
  description: "La classique italienne avec sauce tomate, mozzarella et basilic frais",
  image_url: "https://images.unsplash.com/photo-...",
  prices: {
    small: 9,
    medium: 12,
    large: 15
  },
  ingredients: ["sauce tomate", "mozzarella", "basilic"],
  category: "classiques",
  vegetarian: true,
  active: true,
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### 3. Collection `orders`
```javascript
{
  id: "order_id", // Auto-généré
  user_id: "user_uid", // Référence vers users
  user: {
    full_name: "Nom du client",
    phone: "+33 6 12 34 56 78",
    address: "Adresse de livraison"
  },
  items: [
    {
      pizza_id: "pizza_id",
      pizza_name: "Margherita",
      size: "medium",
      quantity: 2,
      price: 12.00,
      removed_ingredients: ["basilic"],
      extras: [
        {
          id: 1,
          name: "Mozzarella supplémentaire",
          price: 2.00
        }
      ]
    }
  ],
  total: 26.00,
  status: "en_attente" | "confirmee" | "en_preparation" | "prete" | "recuperee",
  created_at: Timestamp,
  updated_at: Timestamp
}
```

## Règles de sécurité Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règles pour les utilisateurs
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'pizzeria'];
    }
    
    // Règles pour les pizzas
    match /pizzas/{pizzaId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Règles pour les commandes
    match /orders/{orderId} {
      allow read: if request.auth != null && (
        resource.data.user_id == request.auth.uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'pizzeria']
      );
      allow create: if request.auth != null && 
        request.resource.data.user_id == request.auth.uid &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'client';
      allow update: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'pizzeria'];
    }
  }
}
```

## Configuration Firebase Authentication

### Méthodes d'authentification à activer :
- Email/Password

### Données utilisateur personnalisées :
Les informations supplémentaires (rôle, téléphone, adresse) sont stockées dans Firestore dans la collection `users`.

## Données de test à ajouter

### Utilisateurs de démonstration :
1. **Admin** : admin@demo.com / demo123
   - Role: admin
   - Full name: Admin Demo
   - Phone: +33 6 12 34 56 78
   - Address: 123 Rue de la Demo, 75001 Paris

2. **Pizzeria** : pizzeria@demo.com / demo123
   - Role: pizzeria
   - Full name: Pizzeria Demo
   - Phone: +33 6 98 76 54 32
   - Address: 456 Avenue de la Pizzeria, 75002 Paris

3. **Client** : client@demo.com / demo123
   - Role: client
   - Full name: Client Demo
   - Phone: +33 6 11 22 33 44
   - Address: 789 Boulevard du Client, 75003 Paris

### Pizzas de base :
Utilisez les données du fichier `src/pages/Menu.tsx` pour créer les pizzas initiales.

## Fonctionnalités temps réel

L'application utilise les listeners Firestore pour :
- Mise à jour en temps réel des commandes
- Synchronisation automatique des statuts
- Notifications instantanées des nouvelles commandes

## Indexation recommandée

Créez ces index composites dans Firebase Console :
1. `orders` : `user_id` (Ascending) + `created_at` (Descending)
2. `orders` : `status` (Ascending) + `created_at` (Descending)
3. `pizzas` : `active` (Ascending) + `category` (Ascending)
4. `extras` : `active` (Ascending) - Index simple requis pour les requêtes d'extras actifs