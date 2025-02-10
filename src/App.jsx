import React, { useState, useEffect, useCallback, memo } from 'react';

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

// Probability weights for each number
const PROBABILITY_WEIGHTS = {
  2: 1 / 36,
  3: 2 / 36,
  4: 3 / 36,
  5: 4 / 36,
  6: 5 / 36,
  8: 5 / 36,
  9: 4 / 36,
  10: 3 / 36,
  11: 2 / 36,
  12: 1 / 36
};

// Resource distributions for different board types
const RESOURCE_DISTRIBUTIONS = {
  normal: {
    hills: 3,    // Brick
    forest: 4,   // Wood
    pasture: 4,  // Sheep
    fields: 4,   // Grain
    mountains: 3, // Ore
    desert: 1
  },
  expansion: {
    hills: 5,
    forest: 6,
    pasture: 6,
    fields: 6,
    mountains: 5,
    desert: 2
  }
};

// Number distributions for different board types
const NUMBER_DISTRIBUTIONS = {
  normal: [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12],
  expansion: [2, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 6, 8, 8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 11, 12]
};

// Tile component
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
  const [viewBox, setViewBox] = useState("0 0 800 600");
  const [hexSize, setHexSize] = useState(50);
  const [numberSize, setNumberSize] = useState(30);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setHexSize(mobile ? 40 : 50);
      setNumberSize(mobile ? 20 : 30);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const generateHexPositions = useCallback(() => {
    if (boardType === 'normal') {
      const positions = [];
      const N = 2;
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
    } else {
      const rows = [3, 4, 5, 6, 5, 4, 3];
      const positions = [];
      let y = 0;
      rows.forEach((count, row) => {
        const offset = (6 - count) / 2;
        for (let i = 0; i < count; i++) {
          positions.push({
            x: (offset + i) * hexSize * Math.sqrt(3),
            y: row * hexSize * 1.5
          });
        }
      });
      return positions;
    }
  }, [boardType, hexSize]);

  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const getAdjacentHexes = (tile, allTiles) => {
    return allTiles.filter(t => {
      if (t.id === tile.id) return false;
      const dx = t.x - tile.x;
      const dy = t.y - tile.y;
      return Math.sqrt(dx * dx + dy * dy) <= hexSize * 1.8;
    });
  };

  const isValidPlacement = (tile, number, tiles) => {
    if (!number) return true; // Desert tiles don't need validation

    const adjacentTiles = getAdjacentHexes(tile, tiles);
    const redNumbers = [6, 8];

    // If this is a red number (6 or 8), check that no adjacent tiles have red numbers
    if (redNumbers.includes(number)) {
      return !adjacentTiles.some(t => t.dice && redNumbers.includes(t.dice));
    }

    return true;
  };

  const generateBoard = useCallback(() => {
    const positions = generateHexPositions();
    let attempts = 0;
    let bestTiles = null;

    while (attempts < 100) {
      // Generate resources
      const resources = Object.entries(RESOURCE_DISTRIBUTIONS[boardType])
        .flatMap(([resource, count]) => Array(count).fill(resource));
      const shuffledResources = shuffleArray(resources);

      // Generate numbers
      const numbers = [...NUMBER_DISTRIBUTIONS[boardType]];
      const shuffledNumbers = shuffleArray(numbers);
      let numberIndex = 0;

      // Create tiles without numbers first
      let currentTiles = positions.map((pos, index) => ({
        id: index,
        x: pos.x,
        y: pos.y,
        resource: shuffledResources[index],
        dice: null
      }));

      // Assign numbers with validation
      let validNumberAssignment = true;
      for (let tile of currentTiles) {
        if (tile.resource !== 'desert') {
          let validNumberFound = false;
          // Try each remaining number until we find a valid one
          for (let i = numberIndex; i < shuffledNumbers.length; i++) {
            if (isValidPlacement(tile, shuffledNumbers[i], currentTiles)) {
              tile.dice = shuffledNumbers[i];
              // Swap the used number to the current position and increment index
              [shuffledNumbers[numberIndex], shuffledNumbers[i]] =
                [shuffledNumbers[i], shuffledNumbers[numberIndex]];
              numberIndex++;
              validNumberFound = true;
              break;
            }
          }
          if (!validNumberFound) {
            validNumberAssignment = false;
            break;
          }
        }
      }

      if (validNumberAssignment) {
        bestTiles = currentTiles;
        break;
      }

      attempts++;
    }

    if (!bestTiles) {
      console.error('Failed to generate a valid board');
      return;
    }

    // Calculate viewBox
    const padding = hexSize * 1.2;
    const bounds = bestTiles.reduce((acc, tile) => ({
      minX: Math.min(acc.minX, tile.x - hexSize),
      minY: Math.min(acc.minY, tile.y - hexSize),
      maxX: Math.max(acc.maxX, tile.x + hexSize),
      maxY: Math.max(acc.maxY, tile.y + hexSize),
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

    setViewBox(`${bounds.minX - padding} ${bounds.minY - padding} 
                ${bounds.maxX - bounds.minX + 2 * padding} 
                ${bounds.maxY - bounds.minY + 2 * padding}`);
    setTiles(bestTiles);
  }, [boardType, generateHexPositions, hexSize]);

  useEffect(() => {
    generateBoard();
  }, [generateBoard]);

  return (
    <div style={styles.appWrapper}>
      <header style={styles.header}>
        <h1 style={{ ...styles.title, fontSize: isMobile ? '2rem' : '2.5rem' }}>
          Catan Board Generator
        </h1>
      </header>

      <div style={{ ...styles.controls, flexDirection: isMobile ? 'column' : 'row' }}>
        <select
          value={boardType}
          onChange={(e) => setBoardType(e.target.value)}
          style={styles.select}
        >
          <option value="normal">Normal (19 tiles)</option>
          <option value="expansion">Expansion (30 tiles)</option>
        </select>

        <button onClick={generateBoard} style={styles.button}>
          Generate New Board
        </button>
      </div>

      <div style={styles.boardContainer}>
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
    padding: '8px 16px',
  },
  button: {
    borderRadius: 4,
    border: 'none',
    backgroundColor: 'darkgoldenrod',
    color: 'white',
    padding: '8px 16px',
    cursor: 'pointer',
  },
  boardContainer: {
    background: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    boxShadow: '0 8px 32px 0 rgba(31,38,135,0.37)',
    backdropFilter: 'blur(8px)',
    padding: 10,
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'center'
  },
};

export default App;