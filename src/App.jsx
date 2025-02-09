import React, { useState, useEffect, useCallback, memo } from 'react';

// Board setup constants
const SVG_WIDTH = 800;
const SVG_HEIGHT = 600;
const HEX_SIZE = 50;
const NUMBER_SIZE = 30;

// Events
const EVENTS = [
  { name: "Storm", description: "Coastal hexes produce half resources!", bgColor: "#1e1e2f" },
  { name: "Boom", description: "Forests produce double wood!", bgColor: "#1c3a4d" },
  { name: "Famine", description: "Fields produce no hay!", bgColor: "#3d1f1f" }
];

// Resource image paths (update these paths to match your actual files)
const resourceImages = {
  hills: '/images/Brick.png',
  forest: '/images/Wood.png',
  pasture: '/images/Sheep.png',
  fields: '/images/Hay.png',
  mountains: '/images/Ore.png',
  desert: '/images/desert.png',
};

// Number token image paths (update these paths to match your actual files)
const numberImages = {
  2: '/images/coins/2.png',
  3: '/images/coins/3.png',
  4: '/images/coins/4.png',
  5: '/images/coins/5.png',
  6: '/images/coins/6.png',
  8: '/images/coins/8.png',
  9: '/images/coins/9.png',
  10: '/images/coins/10.png',
  11: '/images/coins/11.png',
  12: '/images/coins/12.png',
};

// Preload images
const preloadImages = () => {
  return new Promise((resolve) => {
    const images = [
      ...Object.values(resourceImages),
      ...Object.values(numberImages)
    ];

    let loadedCount = 0;
    const totalImages = images.length;

    const checkCompletion = () => {
      loadedCount++;
      if (loadedCount === totalImages) resolve();
    };

    images.forEach(src => {
      const img = new Image();
      img.src = src;
      img.onload = checkCompletion;
      img.onerror = checkCompletion; // Handle broken images gracefully
    });
  });
};

// Memoized Tile component
const Tile = memo(({ tile }) => {
  const getHexPoints = (cx, cy) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 3 * i + Math.PI / 6;
      const x = cx + HEX_SIZE * Math.cos(angle);
      const y = cy + HEX_SIZE * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    return points.join(' ');
  };

  return (
    <g>
      <defs>
        <pattern
          id={`pattern-${tile.id}`}
          patternUnits="userSpaceOnUse"
          x={tile.x - HEX_SIZE}
          y={tile.y - HEX_SIZE}
          width={HEX_SIZE * 2}
          height={HEX_SIZE * 2}
        >
          <image
            href={resourceImages[tile.resource]}
            width={HEX_SIZE * 2}
            height={HEX_SIZE * 2}
            preserveAspectRatio="xMidYMid meet"
            filter="url(#lowContrast)"
          />
        </pattern>
      </defs>

      <polygon
        points={getHexPoints(tile.x, tile.y)}
        fill={`url(#pattern-${tile.id})`}
        stroke="#333"
        strokeWidth="2"
        onClick={() => alert(`Tile: ${tile.resource.toUpperCase()}${tile.dice ? ' - ' + tile.dice : ''}`)}
        style={{ cursor: 'pointer' }}
      />
      {tile.dice && (
        <image
          href={numberImages[tile.dice]}
          x={tile.x - NUMBER_SIZE / 2}
          y={tile.y - NUMBER_SIZE / 2}
          width={NUMBER_SIZE}
          height={NUMBER_SIZE}
          preserveAspectRatio="xMidYMid meet"
          filter="url(#coinBrightness)"
        />
      )}
    </g>
  );
});

function App() {
  const [boardType, setBoardType] = useState('normal');
  const [tiles, setTiles] = useState([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [currentEvent] = useState(EVENTS[0]);

  // Preload images on mount
  useEffect(() => {
    preloadImages().then(() => {
      setImagesLoaded(true);
    });
  }, []);

  // Board generation logic
  const generateNormalPositions = useCallback(() => {
    const N = 2;
    const positions = [];
    for (let q = -N; q <= N; q++) {
      const r1 = Math.max(-N, -q - N);
      const r2 = Math.min(N, -q + N);
      for (let r = r1; r <= r2; r++) {
        positions.push({
          x: HEX_SIZE * Math.sqrt(3) * (q + r / 2),
          y: HEX_SIZE * 1.5 * r
        });
      }
    }
    return positions;
  }, []);

  const generateExpansionPositions = useCallback(() => {
    const rows = [
      { count: 3, offset: (6 - 3) / 2 },
      { count: 4, offset: (6 - 4) / 2 },
      { count: 5, offset: (6 - 5) / 2 },
      { count: 6, offset: 0 },
      { count: 5, offset: 0.5 },
      { count: 4, offset: 1 },
      { count: 3, offset: 1.5 },
    ];
    const colWidth = HEX_SIZE * Math.sqrt(3);
    const rowHeight = HEX_SIZE * 1.5;
    return rows.flatMap((row, rowIndex) =>
      Array.from({ length: row.count }, (_, i) => ({
        x: (row.offset + i) * colWidth,
        y: rowIndex * rowHeight
      }))
    );
  }, []);

  const generateBoard = useCallback(() => {

    const positions = boardType === 'normal'
      ? generateNormalPositions()
      : generateExpansionPositions();

    const resourceCounts = {
      normal: { hills: 3, forest: 4, pasture: 4, fields: 4, mountains: 3, desert: 1 },
      expansion: { hills: 5, forest: 6, pasture: 6, fields: 6, mountains: 5, desert: 2 }
    };

    const resources = Object.entries(resourceCounts[boardType])
      .flatMap(([resource, count]) => Array(count).fill(resource))
      .sort(() => Math.random() - 0.5);

    const diceNumbers = {
      normal: [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12],
      expansion: [2, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 6, 8, 8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 11, 12]
    };

    const diceTokens = [...diceNumbers[boardType]].sort(() => Math.random() - 0.5);

    const rawTiles = positions.map((pos, i) => ({
      ...pos,
      resource: resources[i],
      dice: resources[i] === 'desert' ? null : diceTokens.pop(),
      id: i
    }));

    // Calculate board boundaries
    const bounds = rawTiles.reduce((acc, tile) => ({
      minX: Math.min(acc.minX, tile.x - HEX_SIZE),
      minY: Math.min(acc.minY, tile.y - HEX_SIZE),
      maxX: Math.max(acc.maxX, tile.x + HEX_SIZE),
      maxY: Math.max(acc.maxY, tile.y + HEX_SIZE),
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

    const offsetX = (SVG_WIDTH - (bounds.maxX - bounds.minX)) / 2 - bounds.minX;
    const offsetY = (SVG_HEIGHT - (bounds.maxY - bounds.minY)) / 2 - bounds.minY;

    setTiles(rawTiles.map(tile => ({
      ...tile,
      x: tile.x + offsetX,
      y: tile.y + offsetY
    })));
  }, [boardType, generateNormalPositions, generateExpansionPositions]);

  useEffect(() => {
    generateBoard();
  }, [boardType, generateBoard]);

  return (
    <div style={styles.appWrapper}>
      <header style={styles.header}>
        <h1 style={styles.title}>Catan Simulator</h1>
      </header>

      <div style={styles.controls}>
        <select
          value={boardType}
          onChange={(e) => setBoardType(e.target.value)}
          style={styles.select}
        >
          <option value="normal">Normal (19 tiles)</option>
          <option value="expansion">Expansion (30 tiles)</option>
        </select>

        <button onClick={generateBoard} style={styles.button}>
          New Board
        </button>
      </div>

      <div style={styles.boardContainer}>
        <svg width={SVG_WIDTH} height={SVG_HEIGHT}>
          <defs>
            <filter id="lowContrast">
              <feComponentTransfer>
                <feFuncR type="linear" slope="0.9" intercept="0.02" />
                <feFuncG type="linear" slope="0.9" intercept="0.02" />
                <feFuncB type="linear" slope="0.9" intercept="0.02" />
              </feComponentTransfer>
            </filter>
            <filter id="coinBrightness">
              <feComponentTransfer>
                <feFuncR type="linear" slope="1.9" intercept="0.003" />
                <feFuncG type="linear" slope="1.9" intercept="0.003" />
                <feFuncB type="linear" slope="1.9" intercept="0.003" />
              </feComponentTransfer>
            </filter>
          </defs>
          {tiles.map(tile => <Tile key={tile.id} tile={tile} />)}
        </svg>
      </div>
    </div>
  );
}

const styles = {
  appWrapper: {
    margin: 0,
    padding: 20,
    background: 'white',
    fontFamily: 'sans-serif',
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    color: 'darkgoldenrod',
    fontSize: '2.5rem',
    margin: 0,
  },
  controls: {
    display: 'flex',
    gap: 10,
    marginBottom: 20,
    justifyContent: 'center',
  },
  select: {
    padding: '8px 16px',
    borderRadius: 4,
    border: '1px solid #ccc',
    fontSize: '1rem',
    backgroundColor: 'darkgoldenrod',
  },
  button: {
    padding: '8px 16px',
    borderRadius: 4,
    border: 'none',
    backgroundColor: 'darkgoldenrod',
    color: 'white',
    fontSize: '1rem',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: 'burlywood',
    },
  },
  boardContainer: {
    background: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    boxShadow: '0 8px 32px 0 rgba(31,38,135,0.37)',
    backdropFilter: 'blur(8px)',
    padding: 10,
    width: 'fit-content',
    margin: '0 auto',
  },
};

export default App;