// Informations du restaurant, modifiables ici en un seul endroit.
export const SITE = {
  name: "Le Cadran",
  city: "Cholet",

  // Identifiant Google de l'établissement (Place ID).
  googlePlaceId: "ChIJx3CfsrRHBkgRLfkUP4KFSCA",

  // Lien qui ouvre DIRECTEMENT la fenêtre "Rédiger un avis" sur Google.
  googleReviewUrl:
    "https://search.google.com/local/writereview?placeid=ChIJx3CfsrRHBkgRLfkUP4KFSCA",

  // Lien vers la fiche Google (pour "voir tous les avis").
  googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Le+Cadran+Cholet",

  // Note globale affichée dans la section avis.
  rating: "4,8",
  reviewCount: 18,

  // Avis mis en avant sur le site. Remplacez-les / ajoutez les vôtres ici.
  // (Pour un affichage 100% automatique des derniers avis Google, il faut
  //  une clé API Google : voir avec le développeur, c'est une option.)
  reviews: [
    {
      name: "Jerome F.",
      stars: 5,
      text: "Top ! Les galettes sont parfaites, croustillantes à l'extérieur, moelleuses à l'intérieur.",
    },
    {
      name: "Client Google",
      stars: 5,
      text: "Une très belle adresse au coeur de Cholet : ambiance chaleureuse, cuisine simple et généreuse. La pergola bioclimatique est un vrai plus.",
    },
    {
      name: "Client Google",
      stars: 5,
      text: "Superbe endroit, accueil au top et galettes délicieuses. Je recommande !",
    },
  ],

  happyHour: "Du mercredi au vendredi, de 18h à 19h.",
};
