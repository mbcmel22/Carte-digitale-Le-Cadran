import "./globals.css";

export const metadata = {
  title: "Le Cadran — Bar & Cuisine, Cholet",
  description:
    "La carte du Cadran à Cholet : galettes, crêpes, cocktails et bar.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito+Sans:ital,wght@0,400;0,600;1,400&family=Satisfy&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
