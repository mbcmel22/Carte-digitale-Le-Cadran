// Formes organiques reprises de la carte imprimée, placées le long des bords.
// Purement décoratives, derrière le contenu.
const G = "#2c3a1e"; // vert
const O = "#e8742c"; // orange

const star = (c) => (
  <svg viewBox="0 0 100 100">
    <path d="M50 4C54 34 66 46 96 50C66 54 54 66 50 96C46 66 34 54 4 50C34 46 46 34 50 4Z" fill={c} />
  </svg>
);
const leaf = (c) => (
  <svg viewBox="0 0 100 100">
    <path d="M18 82C18 40 50 10 84 14C76 52 50 80 18 82Z" fill={c} />
  </svg>
);
const frond = (c) => (
  <svg viewBox="0 0 100 100">
    <g stroke={c} strokeWidth="5" strokeLinecap="round" fill="none">
      <path d="M50 96 L50 26" />
      <path d="M50 44 L26 30" /><path d="M50 44 L74 30" />
      <path d="M50 60 L28 50" /><path d="M50 60 L72 50" />
      <path d="M50 36 L33 20" /><path d="M50 36 L67 20" />
    </g>
  </svg>
);

// side, top (en vh), forme
const SHAPES = [
  ["left", 3, leaf(O)],
  ["left", 14, star(G)],
  ["left", 25, frond(O)],
  ["left", 36, star(G)],
  ["left", 47, leaf(O)],
  ["left", 58, star(G)],
  ["left", 69, frond(O)],
  ["left", 80, leaf(O)],
  ["left", 91, star(G)],
  ["right", 6, star(G)],
  ["right", 17, leaf(O)],
  ["right", 28, star(G)],
  ["right", 39, frond(O)],
  ["right", 50, leaf(O)],
  ["right", 61, star(G)],
  ["right", 72, frond(O)],
  ["right", 83, star(G)],
  ["right", 94, leaf(O)],
];

export default function Decor() {
  return (
    <div className="decor" aria-hidden="true">
      {SHAPES.map(([side, top, svg], i) => (
        <div key={i} className={"d " + side} style={{ top: top + "vh" }}>
          {svg}
        </div>
      ))}
    </div>
  );
}
