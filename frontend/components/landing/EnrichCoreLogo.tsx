export default function EnrichCoreLogo() {
  return (
    <div className="relative inline-block">
      <svg
        width="160"
        height="160"
        viewBox="0 0 160 160"
        fill="none"
      >
        {/* Minimal geometric engine mark inspired by Exa's clean aesthetic */}
        {/* Engine block shape with pistons/cylinders abstracted as clean lines */}

        <g stroke="#E63946" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          {/* Outer engine housing - hexagonal/block shape */}
          <path d="M 80 30 L 120 50 L 120 110 L 80 130 L 40 110 L 40 50 Z" fill="none" />

          {/* Inner chamber - represents combustion core */}
          <path d="M 80 50 L 100 60 L 100 100 L 80 110 L 60 100 L 60 60 Z" fill="none" />

          {/* Central power line - crankshaft/drive shaft */}
          <line x1="80" y1="50" x2="80" y2="110" />

          {/* Piston arms - horizontal connecting rods */}
          <line x1="60" y1="70" x2="100" y2="70" />
          <line x1="60" y1="90" x2="100" y2="90" />
        </g>
      </svg>
    </div>
  );
}
