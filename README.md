# Eventflow Front

Interface d’administration et espace public d’Eventflow, plateforme de gestion d’événements, inscriptions et billetterie.

Ce projet contient l’application front-end utilisée par :
- les **organisateurs** pour gérer leurs événements
- les **participants** pour consulter et s’inscrire aux événements

---

# Stack technique

- **React**
- **TypeScript**
- **Vite**
- **React Router**
- **Supabase**
- **Zod**

---

# Installation

npm install

---

# Lancer le projet en développement

npm run dev

L'application démarre généralement sur : http://localhost:5173

---

# Build production

npm run build

---

# Variables d'environnement

Créer un fichier .env à la racine du projet. 

Exemple : 

VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

Ces variables sont nécessaires pour connecter l’application au backend Supabase.

---

# Structure du projet

Voir README_ARCHITECTURE.md

---

# Organisation générale

Le projet est structuré en modules fonctionnels

## Modules principaux

### admin

Dashboard organisateur :
- gestion des événements
- gestion des commandes
- gestion des participants
- gestion des tickets
- scanner QR

### public

Interface publique :
- pages événement
- inscription
- billetterie

### shared

Code partagé entre admin et public :
- modèles
- helpers
- utilitaires

---

# Architecture

Le projet suit quelques principes simples : 

- Validation des données avec Zod
- Typage strict avec TypeScript
- Séparation logique métier / UI
- Repositories pour accès aux données
- Hooks pour la logique métier React

Les schémas Zod servent de source de vérité pour : 

- Les données venant du backend
- Les structures utilisées dans l'application
- Les données envoyées au backend

---

# Navigation

Le routing est géré avec React Router. 

Exemples : 

/admin/events
/admin/events/:eventSlug
/admin/events/:eventSlug?tab=participants

Certains paramètres d’URL permettent d’ouvrir directement des sous-vues.

/admin/events/:slug?tab=participants&participantsTab=tickets&openScanner=1

Ce lien ouvre directement :

- l’onglet Participants
- la sous-vue Tickets
- le scanner QR

---

# Conventions

- utiliser Zod pour valider toutes les données externes et les données internes avant envoi au backend
- garder les composants UI simples
- déplacer la logique métier dans les hooks
- éviter les effets React inutiles
- préférer des états dérivés quand possible

All rights reserved.