# Le Cadran — Carte digitale

Carte en ligne + commande à table + back office gérant pour **Le Cadran**, bar et cuisine à Cholet.

Stack : Next.js (App Router) · Supabase (base, authentification, stockage) · Vercel.

## Ce que fait le site

**Côté client (page publique `/`)**
- Carte complète (cuisine + bar) en cartes lisibles, navigation par catégories.
- Photo agrandissable sur les plats qui en ont une.
- Commande à table : le client ajoute des plats avec le bouton +, indique son numéro de table et envoie. Aucun compte client requis.
- Les plats en rupture n'apparaissent pas.

**Back office gérant (`/admin`)**
- Connexion par e-mail / mot de passe (un seul compte gérant).
- Onglet **Commandes** : réception des commandes en quasi temps réel, avec boutons **En cours · Terminé · Servi**.
- Onglet **Carte** : modifier nom / prix / description, basculer un plat en rupture (le masque côté client), **ajouter ou retirer la photo** d'un plat, ajouter et supprimer des plats.

## Installation

1. `npm install`
2. Copier `.env.example` vers `.env.local` et renseigner :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `npm run dev` puis ouvrir http://localhost:3000

## Base de données (Supabase)

Dans le **SQL Editor** de Supabase, lancer dans l'ordre :
1. `supabase/01_setup_supabase.sql` — catégories, plats, sécurité, stockage des photos, contenu de départ.
2. `supabase/02_orders.sql` — commandes, sécurité et fonction d'envoi de commande.

## Créer le compte gérant

Le back office utilise **un seul compte**, créé à la main (pas de page d'inscription) :
Supabase → **Authentication** → **Users** → **Add user** → renseigner e-mail + mot de passe → **Create user**.
Ce compte sert ensuite à se connecter sur `/admin`.

## Photos des plats

Les photos sont gérées **depuis le back office**, onglet Carte :
- « Ajouter une photo » envoie l'image dans le bucket `menu-images` et l'affiche sur la carte.
- « Retirer la photo » enlève l'encart photo du plat (il redevient une fiche texte).

## Personnalisation rapide

- **Couleurs** : tout est centralisé dans le bloc `:root` de `app/globals.css`.
- **Infos restaurant** (ville, happy hour, lien avis Google) : `lib/site.js`.
  - Lien Google : remplacer `googleReviewUrl`. Pour ouvrir directement la fenêtre d'avis, utiliser `https://search.google.com/local/writereview?placeid=VOTRE_PLACE_ID`.

## Déploiement (Vercel)

1. Pousser le dépôt sur GitHub.
2. Importer le projet dans Vercel.
3. Ajouter les deux variables d'environnement (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Déployer.

> Note : pendant le build, un avertissement lié aux polices Google peut apparaître dans un environnement sans accès réseau. Sans effet sur Vercel.
