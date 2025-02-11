import React, { useState, useEffect, useCallback, memo } from 'react';

// --- Data Definitions ---

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

// Resource distributions for board types
const RESOURCE_DISTRIBUTIONS = {
  normal: {
    hills: 3,
    forest: 4,
    pasture: 4,
    fields: 4,
    mountains: 3,
    desert: 1,
  },
  expansion: {
    hills: 5,
    forest: 6,
    pasture: 6,
    fields: 6,
    mountains: 5,
    desert: 2,
  },
};

// Fixed dice number distributions
const NUMBER_DISTRIBUTIONS = {
  normal: [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12],
  expansion: [2, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 6, 8, 8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 11, 12],
};

// --- Helper Functions ---

// Returns true if two tiles are adjacent (using center-to-center distance)
function isAdjacent(a, b, hexSize) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy) <= hexSize * 1.8;
}

// Backtracking for resource assignment.
// 'tiles' is an array of tile objects (with resource initially null).
// 'available' is an object like { hills: 3, forest: 4, ... } representing counts left.
function backtrackResources(tiles, available, index, hexSize) {
  if (index >= tiles.length) return true;
  const tile = tiles[index];
  for (let resource in available) {
    if (available[resource] > 0) {
      let valid = true;
      // Only check already-assigned tiles.
      for (let j = 0; j < index; j++) {
        if (tiles[j].resource === resource && isAdjacent(tiles[j], tile, hexSize)) {
          valid = false;
          break;
        }
      }
      if (!valid) continue;
      tile.resource = resource;
      available[resource]--;
      if (backtrackResources(tiles, available, index + 1, hexSize)) return true;
      available[resource]++;
      tile.resource = null;
    }
  }
  return false;
}

// Backtracking for dice assignment.
// 'nonDesertTiles' is an array of tiles needing a dice number.
// 'availableDice' is an array of available dice numbers.
function backtrackDice(nonDesertTiles, availableDice, index, hexSize) {
  if (index >= nonDesertTiles.length) return true;
  const tile = nonDesertTiles[index];
  for (let i = 0; i < availableDice.length; i++) {
    const dice = availableDice[i];
    let valid = true;
    for (let j = 0; j < index; j++) {
      const other = nonDesertTiles[j];
      if (isAdjacent(tile, other, hexSize) && other.dice === dice) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;
    tile.dice = dice;
    const newAvailable = availableDice.slice(0, i).concat(availableDice.slice(i + 1));
    if (backtrackDice(nonDesertTiles, newAvailable, index + 1, hexSize)) return true;
    tile.dice = null;
  }
  return false;
}

// Simple array shuffle helper.
const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// --- Tile Component ---
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
  }

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

// --- Main App Component ---
function App() {
  // Board size: "normal" = Classic Catan (19 tiles) or "expansion" = Catan Carnival (30 tiles)
  const [boardType, setBoardType] = useState('normal');
  // Enforced restrictions (both are applied together):
  // • No two adjacent tiles share the same resource.
  // • No two adjacent non‑desert tiles share the same dice number.
  const [enforceResourceRule, setEnforceResourceRule] = useState(true);
  const [enforceDiceRule, setEnforceDiceRule] = useState(true);
  const [tiles, setTiles] = useState([]);
  const [viewBox, setViewBox] = useState('0 0 800 600');
  const [hexSize, setHexSize] = useState(50);
  const [numberSize, setNumberSize] = useState(30);
  const [isMobile, setIsMobile] = useState(false);

  // Update dimensions for mobile devices.
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

  // Generate hexagon center positions.
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
            y: hexSize * 1.5 * r,
          });
        }
      }
      return positions;
    } else {
      const rows = [3, 4, 5, 6, 5, 4, 3];
      const positions = [];
      rows.forEach((count, row) => {
        const offset = (6 - count) / 2;
        for (let i = 0; i < count; i++) {
          positions.push({
            x: (offset + i) * hexSize * Math.sqrt(3),
            y: row * hexSize * 1.5,
          });
        }
      });
      return positions;
    }
  }, [boardType, hexSize]);

  // --- Board Generation ---
  // This function uses backtracking for resource and dice assignments.
  // If backtracking fails, it falls back to a random assignment.
  const generateBoard = useCallback(() => {
    const positions = generateHexPositions();
    // Create a candidate board: an array of tile objects with positions; resource and dice are initially null.
    const candidate = positions.map((pos, index) => ({
      id: index,
      x: pos.x,
      y: pos.y,
      resource: null,
      dice: null,
    }));

    // Resource assignment:
    if (enforceResourceRule) {
      const available = {};
      Object.entries(RESOURCE_DISTRIBUTIONS[boardType]).forEach(([resource, count]) => {
        available[resource] = count;
      });
      const resourceSuccess = backtrackResources(candidate, available, 0, hexSize);
      if (!resourceSuccess) {
        console.warn("Resource backtracking failed. Falling back to random assignment.");
        const resourceEntries = Object.entries(RESOURCE_DISTRIBUTIONS[boardType]);
        const resources = resourceEntries.reduce(
          (acc, [resource, count]) => acc.concat(Array(count).fill(resource)),
          []
        );
        const shuffledResources = shuffleArray(resources);
        candidate.forEach((tile, idx) => {
          tile.resource = shuffledResources[idx];
        });
      }
    } else {
      // Not enforcing: random assignment.
      const resourceEntries = Object.entries(RESOURCE_DISTRIBUTIONS[boardType]);
      const resources = resourceEntries.reduce(
        (acc, [resource, count]) => acc.concat(Array(count).fill(resource)),
        []
      );
      const shuffledResources = shuffleArray(resources);
      candidate.forEach((tile, idx) => {
        tile.resource = shuffledResources[idx];
      });
    }

    // Dice assignment for non‑desert tiles:
    if (enforceDiceRule) {
      const nonDesertTiles = candidate.filter((t) => t.resource !== 'desert');
      const diceAvailable = NUMBER_DISTRIBUTIONS[boardType].slice();
      const diceSuccess = backtrackDice(nonDesertTiles, diceAvailable, 0, hexSize);
      if (!diceSuccess) {
        console.warn("Dice backtracking failed. Falling back to random dice assignment.");
        const numbers = shuffleArray([...NUMBER_DISTRIBUTIONS[boardType]]);
        candidate.forEach((tile) => {
          if (tile.resource !== 'desert') {
            tile.dice = numbers.shift();
          }
        });
      }
    } else {
      const numbers = shuffleArray([...NUMBER_DISTRIBUTIONS[boardType]]);
      candidate.forEach((tile) => {
        if (tile.resource !== 'desert') {
          tile.dice = numbers.shift();
        }
      });
    }

    // Compute SVG viewBox.
    const padding = hexSize * 1.2;
    const bounds = candidate.reduce(
      (acc, tile) => ({
        minX: Math.min(acc.minX, tile.x - hexSize),
        minY: Math.min(acc.minY, tile.y - hexSize),
        maxX: Math.max(acc.maxX, tile.x + hexSize),
        maxY: Math.max(acc.maxY, tile.y + hexSize),
      }),
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );
    setViewBox(
      `${bounds.minX - padding} ${bounds.minY - padding} ${bounds.maxX - bounds.minX + 2 * padding} ${bounds.maxY - bounds.minY + 2 * padding}`
    );
    setTiles(candidate);
  }, [boardType, enforceResourceRule, enforceDiceRule, generateHexPositions, hexSize]);

  // Automatically re-generate the board when options change.
  useEffect(() => {
    generateBoard();
  }, [boardType, enforceResourceRule, enforceDiceRule, hexSize, generateBoard]);

  // --- Render ---
  return (
    <div style={styles.appWrapper}>
      <header style={styles.header}>
        <h1 style={{ ...styles.title, fontSize: isMobile ? '2rem' : '2.5rem' }}>
          Catan Board Generator
        </h1>
      </header>
      <div style={{ ...styles.controls, flexDirection: isMobile ? 'column' : 'row' }}>
        {/* Board Size Dropdown */}
        <select
          value={boardType}
          onChange={(e) => setBoardType(e.target.value)}
          style={styles.select}
        >
          <option value="normal">Classic Catan (19 tiles)</option>
          <option value="expansion">Catan Carnival (30 tiles)</option>
        </select>
        {/* Enforced Rules (both are applied together) */}
        <label style={styles.label}>
          <input
            type="checkbox"
            checked={enforceResourceRule}
            onChange={(e) => setEnforceResourceRule(e.target.checked)}
          />
          No adjacent same resource
        </label>
        <label style={styles.label}>
          <input
            type="checkbox"
            checked={enforceDiceRule}
            onChange={(e) => setEnforceDiceRule(e.target.checked)}
          />
          No adjacent same dice
        </label>
        <button onClick={generateBoard} style={styles.button}>
          Generate Board
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
          {tiles.map((tile) => (
            <Tile key={tile.id} tile={tile} hexSize={hexSize} numberSize={numberSize} />
          ))}
        </svg>
      </div>
    </div>
  );
}

const styles = {
  appWrapper: { margin: 0, padding: 20, background: 'white', fontFamily: 'sans-serif' },
  header: { marginBottom: 20, textAlign: 'center' },
  title: { color: 'darkgoldenrod', margin: 0 },
  controls: { display: 'flex', gap: 10, marginBottom: 20, justifyContent: 'center', alignItems: 'center' },
  select: { borderRadius: 4, border: '1px solid #ccc', backgroundColor: 'darkgoldenrod', color: 'white', padding: '8px 16px' },
  label: { color: 'darkgoldenrod', fontSize: '1rem' },
  button: { borderRadius: 4, border: 'none', backgroundColor: 'darkgoldenrod', color: 'white', padding: '8px 16px', cursor: 'pointer' },
  boardContainer: { background: 'rgba(255,255,255,0.15)', borderRadius: 16, boxShadow: '0 8px 32px 0 rgba(31,38,135,0.37)', backdropFilter: 'blur(8px)', padding: 10, margin: '0 auto', display: 'flex', justifyContent: 'center' },
};

export default App;
