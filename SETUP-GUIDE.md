# 🍕 Guide de Configuration Firebase - Pizza Délice

## 📋 Ce que vous devez faire maintenant

### 1. 🔥 Configuration Firebase Console

1. **Allez sur Firebase Console** : https://console.firebase.google.com/project/pizzas-e0a57

2. **Activez Authentication** :
   - Cliquez sur "Authentication" dans le menu
   - Onglet "Sign-in method"
   - Activez "Email/Password"
   - ✅ Cochez "Enable" et sauvegardez

3. **Activez Firestore Database** :
   - Cliquez sur "Firestore Database"
   - "Create database"
   - Choisissez "Start in test mode" (temporaire)
   - Sélectionnez une région (europe-west1 recommandé)

4. **Appliquez les règles de sécurité** :
   - Dans Firestore Database > Règles
   - Remplacez tout le contenu par celui du fichier `firestore.rules`
   - Cliquez "Publier"

### 2. 📊 Ajout des données initiales

**IMPORTANT** : Vous devez ajouter manuellement les données dans Firebase Console :

#### A. Ajouter les pizzas :
1. Dans Firestore Database > Données
2. Créez une collection "pizzas"
3. Pour chaque pizza, créez un document avec ces champs :

```
Document ID: (auto-généré)
Champs:
- name: "Margherita" (string)
- description: "La classique italienne..." (string)
- image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1350&q=80" (string)
- prices: (map)
  - small: 9 (number)
  - medium: 12 (number)
  - large: 15 (number)
- ingredients: ["sauce tomate", "mozzarella", "basilic"] (array)
- category: "classiques" (string)
- vegetarian: true (boolean)
- active: true (boolean)
- created_at: (timestamp - maintenant)
- updated_at: (timestamp - maintenant)
```

**Répétez pour toutes les pizzas** (voir `src/data/initialData.ts` pour la liste complète)

#### B. Créer les comptes administrateurs :
1. **Compte Admin** :
   - Email: `admin@demo.com`
   - Mot de passe: `admin123`
   - Après création, ajoutez dans Firestore collection "users" :
   ```
   Document ID: (UID de l'utilisateur créé)
   - email: "admin@demo.com"
   - role: "admin"
   - full_name: "Admin Demo"
   - phone: "+33 1 23 45 67 89"
   - address: "123 Rue de la Demo, 75001 Paris"
   - created_at: (timestamp)
   - updated_at: (timestamp)
   ```

2. **Compte Pizzeria** :
   - Email: `pizzeria@demo.com`
   - Mot de passe: `demo123`
   - Même processus avec role: "pizzeria"

### 3. ✅ Test de l'application

1. **Redémarrez le serveur** : `npm run dev`
2. **Testez la connexion** avec les comptes créés
3. **Vérifiez le menu** : les pizzas doivent s'afficher
4. **Testez les commandes** : créez un compte client et passez une commande
5. **Vérifiez le temps réel** : les commandes doivent apparaître instantanément

### 4. 🚀 Fonctionnalités temps réel activées

✅ **Menu dynamique** : Les pizzas se chargent depuis Firebase
✅ **Commandes temps réel** : Nouvelles commandes visibles instantanément
✅ **Mise à jour des statuts** : Changements synchronisés automatiquement
✅ **Authentification sécurisée** : Rôles admin/pizzeria/client
✅ **Interface responsive** : Fonctionne sur mobile et desktop

### 5. 🔐 Sécurité

- ✅ Règles Firestore strictes basées sur les rôles
- ✅ Authentification Firebase sécurisée
- ✅ Validation des données côté client et serveur
- ✅ Permissions granulaires par collection

## 🎯 Résultat final

Une fois configuré, vous aurez :
- **Application complètement fonctionnelle** pour vos clients
- **Interface admin** pour gérer les commandes et le menu
- **Interface pizzeria** pour suivre les commandes en temps réel
- **Système de commandes** avec statuts temps réel
- **Authentification sécurisée** avec rôles

L'application est prête pour la production ! 🚀