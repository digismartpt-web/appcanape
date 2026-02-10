// Comptes de test pour l'application
export const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@demo.com',
    password: 'admin123',
    role: 'admin' as const,
    full_name: 'Admin Demo',
    phone: '+33 1 23 45 67 89',
    address: '123 Rue de la Demo, 75001 Paris'
  },
  pizzeria: {
    email: 'pizzeria@demo.com', 
    password: 'pizzeria123',
    role: 'pizzeria' as const,
    full_name: 'Pizzeria Demo',
    phone: '+33 6 98 76 54 32',
    address: '456 Avenue de la Pizzeria, 75002 Paris'
  },
  client: {
    email: 'client@demo.com',
    password: 'client123',
    role: 'client' as const,
    full_name: 'Client Demo',
    phone: '+33 6 11 22 33 44',
    address: '789 Boulevard du Client, 75003 Paris'
  }
};

// Instructions détaillées pour créer les comptes dans Firebase
export const ACCOUNT_CREATION_INSTRUCTIONS = `
🔥 CRÉATION DES COMPTES DE TEST DANS FIREBASE

1. **Accédez à Firebase Console :**
   - Allez sur https://console.firebase.google.com
   - Sélectionnez votre projet

2. **Activez Authentication :**
   - Dans le menu latéral, cliquez sur "Authentication"
   - Onglet "Sign-in method"
   - Activez "Email/Password" si ce n'est pas déjà fait

3. **Créez les comptes utilisateurs :**
   - Allez dans l'onglet "Users"
   - Cliquez sur "Add user" pour chaque compte

   📧 COMPTE ADMIN :
   - Email: admin@demo.com
   - Password: admin123

   📧 COMPTE PIZZERIA :
   - Email: pizzeria@demo.com
   - Password: pizzeria123

   📧 COMPTE CLIENT :
   - Email: client@demo.com
   - Password: client123

4. **Ajoutez les données utilisateur dans Firestore :**
   - Allez dans "Firestore Database"
   - Collection "users"
   - Pour chaque utilisateur créé, ajoutez un document avec l'UID comme ID :

   Pour ADMIN (remplacez USER_UID par l'UID généré) :
   {
     "email": "admin@demo.com",
     "role": "admin",
     "full_name": "Admin Demo",
     "phone": "+33 1 23 45 67 89",
     "address": "123 Rue de la Demo, 75001 Paris",
     "created_at": [Timestamp actuel],
     "updated_at": [Timestamp actuel]
   }

   Pour PIZZERIA (remplacez USER_UID par l'UID généré) :
   {
     "email": "pizzeria@demo.com",
     "role": "pizzeria",
     "full_name": "Pizzeria Demo",
     "phone": "+33 6 98 76 54 32",
     "address": "456 Avenue de la Pizzeria, 75002 Paris",
     "created_at": [Timestamp actuel],
     "updated_at": [Timestamp actuel]
   }

   Pour CLIENT (remplacez USER_UID par l'UID généré) :
   {
     "email": "client@demo.com",
     "role": "client",
     "full_name": "Client Demo",
     "phone": "+33 6 11 22 33 44",
     "address": "789 Boulevard du Client, 75003 Paris",
     "created_at": [Timestamp actuel],
     "updated_at": [Timestamp actuel]
   }

5. **Testez les connexions :**
   - Redémarrez votre application
   - Essayez de vous connecter avec chaque compte
   - Vérifiez que les rôles fonctionnent correctement

✅ RÉSULTAT ATTENDU :
- Admin : Accès au dashboard administrateur
- Pizzeria : Accès à la gestion des commandes et du menu
- Client : Accès au menu et aux commandes personnelles
`;

// Fonction utilitaire pour créer automatiquement les comptes (si Firebase est configuré)
export async function createTestAccountsInFirebase() {
  const { auth, db } = await import('../lib/firebase');
  
  if (!auth || !db) {
    throw new Error('Firebase non configuré');
  }

  const { createUserWithEmailAndPassword } = await import('firebase/auth');
  const { doc, setDoc } = await import('firebase/firestore');

  const results = [];

  for (const [role, account] of Object.entries(TEST_ACCOUNTS)) {
    try {
      // Créer le compte dans Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        account.email,
        account.password
      );

      // Créer le profil dans Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: account.email,
        role: account.role,
        full_name: account.full_name,
        phone: account.phone,
        address: account.address,
        created_at: new Date(),
        updated_at: new Date()
      });

      results.push({
        role,
        email: account.email,
        uid: userCredential.user.uid,
        success: true
      });

    } catch (error: any) {
      results.push({
        role,
        email: account.email,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}
