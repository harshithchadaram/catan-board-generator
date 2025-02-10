import React, { useState, useEffect, useCallback, memo } from 'react';

// Responsive board setup
const getHexSize = () => (window.innerWidth <= 768 ? 40 : 50);
const getNumberSize = () => (window.innerWidth <= 768 ? 20 : 30);

// Events
const EVENTS = [
  { name: "Storm", description: "Coastal hexes produce half resources!", bgColor: "#1e1e2f" },
  { name: "Boom", description: "Forests produce double wood!", bgColor: "#1c3a4d" },
  { name: "Famine", description: "Fields produce no hay!", bgColor: "#3d1f1f" }
];

// Resource image paths
const resourceImages = {
  hills: '/images/Brick.png',
  forest: '/images/Wood.png',
  pasture: '/images/Sheep.png',
  fields: '/images/Hay.png',
  mountains: '/images/Ore.png',
  desert: '/images/desert.png',
};

// Number token image paths
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
      img.onerror = checkCompletion;
    });
  });
};

// Memoized Tile component
const Tile = memo(({ tile, hexSize, numberSize }) => {
  const getHexPoints = (cx, cy) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 3 * i + Math.PI / 6;
      const x = cx + hexSize * Math.cos(angle);
      const y = cy + hexSize * Math.sin(angle);
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
          x={tile.x - hexSize}
          y={tile.y - hexSize}
          width={hexSize * 2}
          height={hexSize * 2}
        >
          <image
            href={resourceImages[tile.resource]}
            width={hexSize * 2}
            height={hexSize * 2}
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
          x={tile.x - numberSize / 2}
          y={tile.y - numberSize / 2}
          width={numberSize}
          height={numberSize}
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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [hexSize, setHexSize] = useState(getHexSize());
  const [numberSize, setNumberSize] = useState(getNumberSize());
  const [viewBox, setViewBox] = useState("0 0 100 100");

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setHexSize(getHexSize());
      setNumberSize(getNumberSize());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    preloadImages().then(() => {
      setImagesLoaded(true);
    });
  }, []);

  const generateNormalPositions = useCallback((hexSize) => {
    const N = 2;
    const positions = [];
    for (let q = -N; q <= N; q++) {
      const r1 = Math.max(-N, -q - N);
      const r2 = Math.min(N, -q + N);
      for (let r = r1; r <= r2; r++) {
        positions.push({
          x: hexSize * Math.sqrt(3) * (q + r / 2),
          y: hexSize * 1.5 * r
        });
      }
    }
    return positions;
  }, []);

  const generateExpansionPositions = useCallback((hexSize) => {
    const rows = [
      { count: 3, offset: (6 - 3) / 2 },
      { count: 4, offset: (6 - 4) / 2 },
      { count: 5, offset: (6 - 5) / 2 },
      { count: 6, offset: 0 },
      { count: 5, offset: 0.5 },
      { count: 4, offset: 1 },
      { count: 3, offset: 1.5 },
    ];
    const colWidth = hexSize * Math.sqrt(3);
    const rowHeight = hexSize * 1.5;
    return rows.flatMap((row, rowIndex) =>
      Array.from({ length: row.count }, (_, i) => ({
        x: (row.offset + i) * colWidth,
        y: rowIndex * rowHeight
      }))
    );
  }, []);

  const generateBoard = useCallback(() => {
    const positions = boardType === 'normal'
      ? generateNormalPositions(hexSize)
      : generateExpansionPositions(hexSize);

    const resourceCounts = {
      normal: { hills: 3, forest: 4, pasture: 4, fields: 4, mountains: 3, desert: 1 },
      expansion: { hills: 5, forest: 6, pasture: 6, fields: 6, mountains: 5, desert: 2 }
    };

    const generateResources = () => {
      const resources = Object.entries(resourceCounts[boardType])
        .flatMap(([resource, count]) => Array(count).fill(resource))
        .sort(() => Math.random() - 0.5);

      const tiles = positions.map((pos, i) => ({
        ...pos,
        resource: resources[i],
        id: i,
        adjacent: [],
        dice: null
      }));

      // Calculate adjacency
      tiles.forEach(tile => {
        tile.adjacent = tiles.filter(t => {
          if (t.id === tile.id) return false;
          const dx = t.x - tile.x;
          const dy = t.y - tile.y;
          return Math.sqrt(dx * dx + dy * dy) < hexSize * Math.sqrt(3) * 1.1;
        }).map(t => t.id);
      });

      // Anti-clustering logic
      const MAX_SAME_NEIGHBORS = 2;
      for (let i = 0; i < tiles.length; i++) {
        const tile = tiles[i];
        const neighborResources = tile.adjacent.map(id =>
          tiles.find(t => t.id === id).resource
        );
        const sameCount = neighborResources.filter(r => r === tile.resource).length;

        if (sameCount > MAX_SAME_NEIGHBORS) {
          for (let j = i + 1; j < tiles.length; j++) {
            const other = tiles[j];
            if (other.resource === tile.resource) continue;

            const otherNeighbors = other.adjacent.map(id =>
              tiles.find(t => t.id === id).resource
            );
            const otherSame = otherNeighbors.filter(r => r === other.resource).length;
            const newSame = neighborResources.filter(r => r === other.resource).length;
            const newOtherSame = otherNeighbors.filter(r => r === tile.resource).length;

            if (newSame <= MAX_SAME_NEIGHBORS && newOtherSame <= MAX_SAME_NEIGHBORS) {
              [tile.resource, other.resource] = [other.resource, tile.resource];
              break;
            }
          }
        }
      }

      return tiles;
    };

    const rawTiles = generateResources();

    const assignNumbers = (tiles) => {
      const nonDesert = tiles.filter(t => t.resource !== 'desert');
      const diceNumbers = {
        normal: [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12],
        expansion: [2, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 6, 8, 8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 11, 12]
      }[boardType];

      const numbers = [...diceNumbers].sort(() => Math.random() - 0.5);
      const redNumbers = numbers.filter(n => n === 6 || n === 8);
      const others = numbers.filter(n => !redNumbers.includes(n));

      const placeRedNumbers = () => {
        const availableTiles = [...nonDesert];
        redNumbers.forEach(red => {
          availableTiles.sort(() => Math.random() - 0.5);
          const tile = availableTiles.find(t =>
            !t.dice &&
            t.adjacent.every(id => {
              const adjTile = tiles.find(t => t.id === id);
              return !redNumbers.includes(adjTile?.dice);
            })
          );

          if (tile) {
            tile.dice = red;
            availableTiles.splice(availableTiles.indexOf(tile), 1);
          } else {
            const fallbackTile = availableTiles.find(t => !t.dice);
            if (fallbackTile) fallbackTile.dice = red;
          }
        });
      };

      const placeOthers = () => {
        nonDesert.forEach(tile => {
          if (!tile.dice) tile.dice = others.pop();
        });
      };

      placeRedNumbers();
      placeOthers();
    };

    assignNumbers(rawTiles);

    // Calculate viewBox
    const bounds = rawTiles.reduce((acc, tile) => ({
      minX: Math.min(acc.minX, tile.x - hexSize),
      minY: Math.min(acc.minY, tile.y - hexSize),
      maxX: Math.max(acc.maxX, tile.x + hexSize),
      maxY: Math.max(acc.maxY, tile.y + hexSize),
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

    setViewBox(`${bounds.minX} ${bounds.minY} ${bounds.maxX - bounds.minX} ${bounds.maxY - bounds.minY}`);
    setTiles(rawTiles);
  }, [boardType, generateNormalPositions, generateExpansionPositions, hexSize]);

  useEffect(() => {
    generateBoard();
  }, [boardType, generateBoard]);

  return (
    <div style={styles.appWrapper}>
      <header style={styles.header}>
        <h1 style={{ ...styles.title, fontSize: isMobile ? '2rem' : '2.5rem' }}>
          Catan Simulator
        </h1>
      </header>

      <div style={{ ...styles.controls, flexDirection: isMobile ? 'column' : 'row' }}>
        <select
          value={boardType}
          onChange={(e) => setBoardType(e.target.value)}
          style={{
            ...styles.select,
            padding: isMobile ? '12px 20px' : '8px 16px',
            fontSize: isMobile ? '1.2rem' : '1rem'
          }}
        >
          <option value="normal">Normal (19 tiles)</option>
          <option value="expansion">Expansion (30 tiles)</option>
        </select>

        <button
          onClick={generateBoard}
          style={{
            ...styles.button,
            padding: isMobile ? '12px 20px' : '8px 16px',
            fontSize: isMobile ? '1.2rem' : '1rem'
          }}
        >
          New Board
        </button>
      </div>

      <div style={{
        ...styles.boardContainer,
        padding: isMobile ? 5 : 10,
        margin: isMobile ? '0 10px' : '0 auto',
        width: isMobile ? 'calc(100% - 20px)' : 'fit-content',
      }}>
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', maxWidth: 800 }}
        >
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
          {tiles.map(tile => (
            <Tile
              key={tile.id}
              tile={tile}
              hexSize={hexSize}
              numberSize={numberSize}
            />
          ))}
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
    margin: 0,
  },
  controls: {
    display: 'flex',
    gap: 10,
    marginBottom: 20,
    justifyContent: 'center',
  },
  select: {
    borderRadius: 4,
    border: '1px solid #ccc',
    backgroundColor: 'darkgoldenrod',
    color: 'white',
  },
  button: {
    borderRadius: 4,
    border: 'none',
    backgroundColor: 'darkgoldenrod',
    color: 'white',
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
  },
};

export default App;