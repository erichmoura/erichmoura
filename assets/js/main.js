/**
 * Site Pessoal - Erich Moura
 * Ciclos 1, 2 e 3:
 * - Loading Screen
 * - Motor Grid-Based Monocromático (Paleta Oficial do Guideline + Acento #86dd8f)
 * - 3 Salas Horizontais (Central, Minhas Postagens, Minhas Ideias), Transição de Tela e Pontos Interativos
 */
(function () {
  'use strict';

  /* ==========================================================================
     0. Parâmetros de Navegação Externa (Deep Linking)
     ========================================================================== */
  const urlParams = new URLSearchParams(window.location.search);
  const requestedOpen = urlParams.get('open'); // ex.: 'ideas' ou 'posts'

  if (requestedOpen === 'ideas' || requestedOpen === 'posts') {
    const earlyLoading = document.getElementById('loadingScreen');
    if (earlyLoading) {
      earlyLoading.style.display = 'none';
      earlyLoading.setAttribute('aria-busy', 'false');
    }
  }

  /* ==========================================================================
     1. Constantes da Grade Lógica e Paleta Oficial do Projeto
     ========================================================================== */
  const TILE_SIZE = 16;
  const GRID_COLS = 17;
  const GRID_ROWS = 11;
  const LOGICAL_WIDTH = GRID_COLS * TILE_SIZE;  // 272px
  const LOGICAL_HEIGHT = GRID_ROWS * TILE_SIZE; // 176px

  const PALETTE = {
    BG_PRIMARY: '#2b2a2a',     // --bg-primary: fundo, contornos e bordas escuras
    MONO_DARK: '#555555',      // intermediário escuro para paredes/estruturas/sombras
    SURFACE: '#b9b9b9',        // --surface: meio-tom de pisos, rejuntes e estruturas
    TEXT_SECONDARY: '#d5d5d5', // --text-secondary: superfícies claras de piso e alvenaria
    TEXT_PRIMARY: '#fafafa',   // --text-primary: personagem e detalhes claros
    ACCENT: '#86dd8f'          // --accent: cursor, brilho de passagem ativa e interação
  };

  const TILE_TYPE = {
    VOID: 0,
    WALL: 1,
    FLOOR: 2,
    PASSAGE_LEFT: 3,
    PASSAGE_RIGHT: 4,
    PROP_SOLID: 5
  };

  const DIRECTIONS = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 }
  };

  const STEP_DURATION_MS = 135;
  const BUMP_DURATION_MS = 110;
  const TRANSITION_COOLDOWN_MS = 85;

  const CENTER_COL = Math.floor(GRID_COLS / 2); // 8
  const CENTER_ROW = Math.floor(GRID_ROWS / 2); // 5

  /* ==========================================================================
     2. Construção das Matrizes e Metadados das 3 Salas Horizontais
        [Sala da Esquerda: posts] <---> [Sala Central: central] <---> [Sala da Direita: ideas]
     ========================================================================== */
  function createRoomLayout(hasLeftExit, hasRightExit, solidCoords) {
    const grid = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      const line = [];
      for (let col = 0; col < GRID_COLS; col++) {
        const isPassageRow = row >= 4 && row <= 6;

        if (col === 0) {
          if (hasLeftExit && isPassageRow) line.push(TILE_TYPE.PASSAGE_LEFT);
          else if (hasLeftExit && (row === 3 || row === 7)) line.push(TILE_TYPE.WALL);
          else line.push(TILE_TYPE.VOID);
        } else if (col === GRID_COLS - 1) {
          if (hasRightExit && isPassageRow) line.push(TILE_TYPE.PASSAGE_RIGHT);
          else if (hasRightExit && (row === 3 || row === 7)) line.push(TILE_TYPE.WALL);
          else line.push(TILE_TYPE.VOID);
        } else if (row === 0 || row === GRID_ROWS - 1) {
          line.push(TILE_TYPE.WALL);
        } else if (col === 1) {
          line.push(hasLeftExit && isPassageRow ? TILE_TYPE.FLOOR : TILE_TYPE.WALL);
        } else if (col === GRID_COLS - 2) {
          line.push(hasRightExit && isPassageRow ? TILE_TYPE.FLOOR : TILE_TYPE.WALL);
        } else {
          line.push(TILE_TYPE.FLOOR);
        }
      }
      grid.push(line);
    }

    if (Array.isArray(solidCoords)) {
      solidCoords.forEach(function (pt) {
        if (grid[pt.row] && grid[pt.row][pt.col] !== undefined) {
          grid[pt.row][pt.col] = TILE_TYPE.PROP_SOLID;
        }
      });
    }

    return grid;
  }

  const ROOMS = {
    central: {
      id: 'central',
      hasLeftExit: true,
      hasRightExit: true,
      exits: {
        left: { targetRoom: 'posts', spawnCol: 15 },
        right: { targetRoom: 'ideas', spawnCol: 1 }
      },
      rugBounds: { minCol: 6, maxCol: 10, minRow: 3, maxRow: 7 },
      layout: createRoomLayout(true, true, []),
      props: [],
      animatedBraziers: [],
      interaction: null
    },

    posts: {
      id: 'posts',
      hasLeftExit: false,
      hasRightExit: true,
      exits: {
        left: null,
        right: { targetRoom: 'central', spawnCol: 1 }
      },
      rugBounds: { minCol: 5, maxCol: 9, minRow: 3, maxRow: 6 },
      layout: createRoomLayout(false, true, [
        { col: 7, row: 3 }, // Topo do Totem
        { col: 7, row: 4 }, // Base do Totem
        { col: 4, row: 3 }, // Pira esquerda
        { col: 10, row: 3 } // Pira direita
      ]),
      props: [
        // Placa de piso em frente ao Totem (caminhável)
        { sheet: 'animated', sx: 4, sy: 2, col: 7, row: 5, fallback: 'plate' },
        // Totem / Pedestal de acesso às Postagens (2 blocos verticais)
        { sheet: 'props', sx: 16, sy: 0, col: 7, row: 3, fallback: 'totemTop' },
        { sheet: 'props', sx: 16, sy: 1, col: 7, row: 4, fallback: 'totemBase' }
      ],
      animatedBraziers: [
        { col: 4, row: 3 },
        { col: 10, row: 3 }
      ],
      interaction: {
        id: 'posts-totem',
        // Dispara quando adjacente ao totem (7,4) ou sobre/ao redor da placa (7,5)
        triggerArea: { minCol: 6, maxCol: 8, minRow: 3, maxRow: 6 },
        floorHighlightTiles: [{ col: 7, row: 5 }],
        focusOutlineTiles: [{ col: 7, row: 4 }],
        clickTargetTiles: [
          { col: 7, row: 3 },
          { col: 7, row: 4 },
          { col: 7, row: 5 }
        ],
        landingCandidates: [
          { col: 7, row: 5 },
          { col: 8, row: 4 },
          { col: 6, row: 4 }
        ]
      }
    },

    ideas: {
      id: 'ideas',
      hasLeftExit: true,
      hasRightExit: false,
      exits: {
        left: { targetRoom: 'central', spawnCol: 15 },
        right: null
      },
      rugBounds: { minCol: 8, maxCol: 11, minRow: 3, maxRow: 6 },
      layout: createRoomLayout(true, false, [
        { col: 8, row: 1 },  // Estante esquerda (topo)
        { col: 8, row: 2 },  // Estante esquerda (base)
        { col: 11, row: 1 }, // Estante direita (topo)
        { col: 11, row: 2 }, // Estante direita (base)
        { col: 9, row: 4 },  // Escrivaninha (metade esquerda)
        { col: 10, row: 4 }  // Escrivaninha (metade direita)
      ]),
      props: [
        // Estante de livros esquerda
        { sheet: 'props', sx: 15, sy: 0, col: 8, row: 1, fallback: 'shelfTop' },
        { sheet: 'props', sx: 15, sy: 1, col: 8, row: 2, fallback: 'shelfBottom' },
        // Estante de livros direita
        { sheet: 'props', sx: 15, sy: 0, col: 11, row: 1, fallback: 'shelfTop' },
        { sheet: 'props', sx: 15, sy: 1, col: 11, row: 2, fallback: 'shelfBottom' },
        // Banqueta de estudo atrás da escrivaninha (caminhável)
        { sheet: 'props', sx: 1, sy: 3, col: 9, row: 3, fallback: 'stool' },
        // Escrivaninha dupla de acesso aos Ensaios / Ideias
        { sheet: 'props', sx: 10, sy: 0, col: 9, row: 4, fallback: 'deskLeft' },
        { sheet: 'props', sx: 11, sy: 0, col: 10, row: 4, fallback: 'deskRight', deskManuscript: true }
      ],
      animatedBraziers: [],
      interaction: {
        id: 'ideas-desk',
        // Dispara quando adjacente à escrivaninha (9..10, 4) ou sobre o tapete frontal
        triggerArea: { minCol: 8, maxCol: 11, minRow: 3, maxRow: 5 },
        floorHighlightTiles: [
          { col: 9, row: 5 },
          { col: 10, row: 5 }
        ],
        focusOutlineTiles: [
          { col: 9, row: 4 },
          { col: 10, row: 4 }
        ],
        clickTargetTiles: [
          { col: 9, row: 4 },
          { col: 10, row: 4 },
          { col: 9, row: 5 },
          { col: 10, row: 5 }
        ],
        landingCandidates: [
          { col: 9, row: 5 },
          { col: 10, row: 5 },
          { col: 8, row: 4 },
          { col: 11, row: 4 }
        ]
      }
    }
  };

  /* ==========================================================================
     3. Sprites Pixel-Art 16x16 do Personagem (Escala Monocromática Oficial)
     ========================================================================== */
  const PIXEL_COLOR_MAP = {
    '#': PALETTE.BG_PRIMARY,     // #2b2a2a
    '+': PALETTE.MONO_DARK,      // #555555
    ':': PALETTE.TEXT_SECONDARY, // #d5d5d5
    '.': PALETTE.TEXT_PRIMARY    // #fafafa
  };

  const PLAYER_MATRICES = {
    down: [
      [
        '     ######     ',
        '    #...:.:#    ',
        '   #:::::::##   ',
        '  #.#::::::#.#  ',
        '  #.#+::::+#.#  ',
        '  #...++++...#  ',
        '  ##.##..##.+#  ',
        '  ##.#:..:#.+#  ',
        '  #+#..##..#+#  ',
        '  ####:##+####  ',
        '  #..#:++++#..# ',
        '  #..#:++++#..# ',
        '   ###:++++###  ',
        '    #++###+#    ',
        '    ###  ###    ',
        '     ##  ##     '
      ],
      [
        '                ',
        '     ######     ',
        '    #...:.:#    ',
        '   #:::::::##   ',
        '  #.#::::::#.#  ',
        '  #.#+::::+#.#  ',
        '  #...++++...#  ',
        '  ##.##..##.+#  ',
        '  ##.#:..:#.+#  ',
        '  #+#..##..#+#  ',
        '  ####:##+####  ',
        '  #..#:++++#..# ',
        '  #..#:++++#..# ',
        '   ###+++++###  ',
        '    ###  ###    ',
        '     ##  ##     '
      ],
      [
        '     ######     ',
        '    #...:.:#    ',
        '   #:::::::##   ',
        '  #.#::::::#.#  ',
        '  #.#+::::+#.#  ',
        '  #...++++...#  ',
        '  ##.##..##.+#  ',
        '  ##.#:..:#.+#  ',
        '  #+#..##..#+#  ',
        '  ####:##+####  ',
        '  #..#:++++#..# ',
        '   ##+:++++#..# ',
        '    #++####+### ',
        '    ###   ###   ',
        '    ##          ',
        '                '
      ],
      [
        '                ',
        '     ######     ',
        '    #...:.:#    ',
        '   #:::::::##   ',
        '  #.#::::::#.#  ',
        '  #.#+::::+#.#  ',
        '  #...++++...#  ',
        '  ##.##..##.+#  ',
        '  ##.#:..:#.+#  ',
        '  #+#..##..#+#  ',
        '  ####:##+####  ',
        '  #..#:++++#..# ',
        '  #..#:++++###  ',
        '   ###+++++#    ',
        '    ###  ##     ',
        '     ##         '
      ],
      [
        '     ######     ',
        '    #...:.:#    ',
        '   #:::::::##   ',
        '  #.#::::::#.#  ',
        '  #.#+::::+#.#  ',
        '  #...++++...#  ',
        '  ##.##..##.+#  ',
        '  ##.#:..:#.+#  ',
        '  #+#..##..#+#  ',
        '  ####:##+####  ',
        '  #..#:++++#..# ',
        '  #..#:+++++##  ',
        '  ###+####++#   ',
        '   ###   ###    ',
        '          ##    ',
        '                '
      ],
      [
        '                ',
        '     ######     ',
        '    #...:.:#    ',
        '   #:::::::##   ',
        '  #.#::::::#.#  ',
        '  #.#+::::+#.#  ',
        '  #...++++...#  ',
        '  ##.##..##.+#  ',
        '  ##.#:..:#.+#  ',
        '  #+#..##..#+#  ',
        '  ####:##+####  ',
        '  #..#:++++#..# ',
        '   ###:++++#..# ',
        '    #+++++###   ',
        '     ##  ###    ',
        '         ##     '
      ]
    ],
    up: [
      [
        '     ######     ',
        '    #...:.:#    ',
        '   #::::::::#   ',
        '  #.#::::::#.#  ',
        '  #.#::::::#.#  ',
        '  #.+::::::+.#  ',
        '  ##+::::::+##  ',
        '  #++:+::+:++#  ',
        '  #+#++++++#+#  ',
        '  ####++++####  ',
        '  #..#:++++#..# ',
        '  #..#+++++#..# ',
        '   ###+++++###  ',
        '    #++###+#    ',
        '    ###  ###    ',
        '     ##  ##     '
      ],
      [
        '                ',
        '     ######     ',
        '    #...:.:#    ',
        '   #::::::::#   ',
        '  #.#::::::#.#  ',
        '  #.#::::::#.#  ',
        '  #.+::::::+.#  ',
        '  ##+::::::+##  ',
        '  #++:+::+:++#  ',
        '  #+#++++++#+#  ',
        '  ####++++####  ',
        '  #..#:++++#..# ',
        '  #..#+++++#..# ',
        '   ###+++++###  ',
        '    ###  ###    ',
        '     ##  ##     '
      ],
      [
        '     ######     ',
        '    #...:.:#    ',
        '   #::::::::#   ',
        '  #.#::::::#.#  ',
        '  #.#::::::#.#  ',
        '  #.+::::::+.#  ',
        '  ##+::::::+##  ',
        '  #++:+::+:++#  ',
        '  #+#++++++#+#  ',
        '  ####++++####  ',
        '  #..#:++++#..# ',
        '   ##++++++#..# ',
        '    #++####+### ',
        '    ###   ###   ',
        '    ##          ',
        '                '
      ],
      [
        '                ',
        '     ######     ',
        '    #...:.:#    ',
        '   #::::::::#   ',
        '  #.#::::::#.#  ',
        '  #.#::::::#.#  ',
        '  #.+::::::+.#  ',
        '  ##+::::::+##  ',
        '  #++:+::+:++#  ',
        '  #+#++++++#+#  ',
        '  ####++++####  ',
        '  #..#:++++#..# ',
        '  #..#+++++###  ',
        '   ###+++++#    ',
        '    ###  ##     ',
        '     ##         '
      ],
      [
        '     ######     ',
        '    #...:.:#    ',
        '   #::::::::#   ',
        '  #.#::::::#.#  ',
        '  #.#::::::#.#  ',
        '  #.+::::::+.#  ',
        '  ##+::::::+##  ',
        '  #++:+::+:++#  ',
        '  #+#++++++#+#  ',
        '  ####++++####  ',
        '  #..#:++++#..# ',
        '  #..#++++++##  ',
        '  ###+####++#   ',
        '   ###   ###    ',
        '          ##    ',
        '                '
      ],
      [
        '                ',
        '     ######     ',
        '    #...:.:#    ',
        '   #::::::::#   ',
        '  #.#::::::#.#  ',
        '  #.#::::::#.#  ',
        '  #.+::::::+.#  ',
        '  ##+::::::+##  ',
        '  #++:+::+:++#  ',
        '  #+#++++++#+#  ',
        '  ####++++####  ',
        '  #..#:++++#..# ',
        '   ###+++++#..# ',
        '    #+++++###   ',
        '     ##  ###    ',
        '         ##     '
      ]
    ],
    rightFallback: [
      [
        '    #######     ',
        '   #::.:...#    ',
        '  #:##:::::.#   ',
        '  #:#.#:::::#   ',
        '  #+#.#::+++#   ',
        '  #+#.+++.###   ',
        '  #++..##.#:#   ',
        '  #+#..#:...#   ',
        '  #+#......#    ',
        '   ###++###.#   ',
        '  #..#+++:#.#   ',
        '  #..#+++:##    ',
        '   ##++++:#     ',
        '    #++####     ',
        '    ###  ##     ',
        '    ##          '
      ],
      [
        '                ',
        '    #######     ',
        '   #::.:...#    ',
        '  #:##:::::.#   ',
        '  #+#.#:::::#   ',
        '  #+#.#::+++#   ',
        '  #+#.+++.###   ',
        '  #++..##.#:#   ',
        '   #+..#:...#   ',
        '    #......##   ',
        '  ###+++####.#  ',
        ' #..#++++:#..#  ',
        ' #..##+++:###   ',
        '  ####+#+:#     ',
        '    ### #+#     ',
        '         ##     '
      ]
    ]
  };

  /* ==========================================================================
     4. Estado Global do Minigame, Assets e Buffers das 3 Salas
     ========================================================================== */
  const assets = {
    elf: null,
    walls: null,
    grounds: null,
    props: null,
    animated: null,
    loadedCount: 0,
    totalCount: 5,
    allSettled: false
  };

  const compiledSprites = {
    up: [],
    down: [],
    rightFallback: [],
    leftFallback: []
  };

  const roomBuffers = {};

  const initialRoomId = requestedOpen === 'ideas' ? 'ideas' : (requestedOpen === 'posts' ? 'posts' : 'central');
  const initialPlayerPos = requestedOpen === 'ideas'
    ? { col: 9, row: 5, facing: 'up', activeInteractionId: 'ideas-desk' }
    : (requestedOpen === 'posts'
      ? { col: 7, row: 5, facing: 'up', activeInteractionId: 'posts-totem' }
      : { col: CENTER_COL, row: CENTER_ROW, facing: 'down', activeInteractionId: null });

  const gameState = {
    currentRoomId: initialRoomId,
    transitionCooldownMs: 0,
    activeInteractionId: initialPlayerPos.activeInteractionId,
    isModalOpen: false,
    activeModalId: null
  };

  const player = {
    gridX: initialPlayerPos.col,
    gridY: initialPlayerPos.row,
    fromX: initialPlayerPos.col,
    fromY: initialPlayerPos.row,
    renderX: initialPlayerPos.col * TILE_SIZE,
    renderY: initialPlayerPos.row * TILE_SIZE,
    facing: initialPlayerPos.facing,
    isMoving: false,
    moveElapsed: 0,
    stepCount: 0,
    bumpDir: null,
    bumpElapsed: 0
  };

  const inputState = {
    enabled: false,
    heldDirections: [],
    bufferedDirection: null,
    pathQueue: [],
    targetMarker: null,
    openOnArrival: false
  };

  function getCurrentRoom() {
    return ROOMS[gameState.currentRoomId];
  }

  /* ==========================================================================
     5. Utilitários de Pixel Art & Dithering Monocromático
     ========================================================================== */
  function createSpriteFromMatrix(matrix, flipHorizontal) {
    const c = document.createElement('canvas');
    c.width = TILE_SIZE;
    c.height = TILE_SIZE;
    const cCtx = c.getContext('2d');

    for (let y = 0; y < TILE_SIZE; y++) {
      const rowStr = matrix[y] || '';
      for (let x = 0; x < TILE_SIZE; x++) {
        const ch = rowStr[x];
        const color = PIXEL_COLOR_MAP[ch];
        if (color) {
          cCtx.fillStyle = color;
          const drawX = flipHorizontal ? TILE_SIZE - 1 - x : x;
          cCtx.fillRect(drawX, y, 1, 1);
        }
      }
    }
    return c;
  }

  function compileCustomSprites() {
    compiledSprites.down = PLAYER_MATRICES.down.map(function (m) {
      return createSpriteFromMatrix(m, false);
    });
    compiledSprites.up = PLAYER_MATRICES.up.map(function (m) {
      return createSpriteFromMatrix(m, false);
    });
    compiledSprites.rightFallback = PLAYER_MATRICES.rightFallback.map(function (m) {
      return createSpriteFromMatrix(m, false);
    });
    compiledSprites.leftFallback = PLAYER_MATRICES.rightFallback.map(function (m) {
      return createSpriteFromMatrix(m, true);
    });
  }

  function drawDitherRect(ctx, x, y, w, h, color, density) {
    ctx.fillStyle = color;
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        if (density === 0.5) {
          if ((px + py) % 2 === 0) ctx.fillRect(px, py, 1, 1);
        } else if (density === 0.25) {
          if (px % 2 === 0 && py % 2 === 0) ctx.fillRect(px, py, 1, 1);
        } else if (density === 0.75) {
          if (px % 2 === 0 || py % 2 === 0) ctx.fillRect(px, py, 1, 1);
        }
      }
    }
  }

  function drawTileFromSheet(ctx, img, tileCol, tileRow, destX, destY) {
    ctx.drawImage(
      img,
      tileCol * TILE_SIZE,
      tileRow * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE,
      destX,
      destY,
      TILE_SIZE,
      TILE_SIZE
    );
  }

  /* ==========================================================================
     6. Consultas de Grade, Paredes, Pisos e Props das 3 Salas
     ========================================================================== */
  function getTileTypeInRoom(room, col, row) {
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) {
      return TILE_TYPE.WALL;
    }
    return room.layout[row][col];
  }

  function isTileStructuralWall(room, col, row) {
    const type = getTileTypeInRoom(room, col, row);
    return type === TILE_TYPE.WALL || type === TILE_TYPE.VOID;
  }

  function isWalkableInRoom(room, col, row) {
    const type = getTileTypeInRoom(room, col, row);
    return (
      type === TILE_TYPE.FLOOR ||
      type === TILE_TYPE.PASSAGE_LEFT ||
      type === TILE_TYPE.PASSAGE_RIGHT
    );
  }

  function getWallSpriteCoord(room, col, row) {
    // Quinas externas principais da sala
    if (col === 1 && row === 0) return [1, 3];   // Top-Left
    if (col === 15 && row === 0) return [0, 0];  // Top-Right
    if (col === 1 && row === 10) return [0, 2];  // Bottom-Left
    if (col === 15 && row === 10) return [3, 3]; // Bottom-Right

    // Quinas da passagem aberta Esquerda (apenas se a sala possuir saída à esquerda)
    if (room.hasLeftExit) {
      if (col === 1 && row === 3) return [1, 1];
      if (col === 1 && row === 7) return [2, 2];
    }

    // Quinas da passagem aberta Direita (apenas se a sala possuir saída à direita)
    if (room.hasRightExit) {
      if (col === 15 && row === 3) return [2, 0];
      if (col === 15 && row === 7) return [3, 1];
    }

    // Paredes superiores (sala e corredores abertos)
    if (row === 0 || (col === 0 && row === 3) || (col === 16 && row === 3)) {
      const topVariants = [[3, 0], [5, 0], [6, 0], [7, 0], [3, 0]];
      return topVariants[(col * 3 + row) % topVariants.length];
    }

    // Paredes inferiores (sala e corredores abertos)
    if (row === 10 || (col === 0 && row === 7) || (col === 16 && row === 7)) {
      const bottomVariants = [[1, 2], [5, 3], [6, 3], [7, 3], [1, 2]];
      return bottomVariants[(col * 5 + row) % bottomVariants.length];
    }

    // Parede lateral esquerda
    if (col === 1) {
      const leftVariants = [[1, 0], [5, 2], [6, 2]];
      return leftVariants[row % leftVariants.length];
    }

    // Parede lateral direita
    if (col === 15) {
      const rightVariants = [[3, 2], [5, 1], [6, 1]];
      return rightVariants[row % rightVariants.length];
    }

    return [3, 0];
  }

  function drawProceduralWallFallback(ctx, room, col, row, dx, dy) {
    ctx.fillStyle = PALETTE.MONO_DARK;
    ctx.fillRect(dx, dy, TILE_SIZE, TILE_SIZE);

    drawDitherRect(ctx, dx + 2, dy + 2, TILE_SIZE - 4, TILE_SIZE - 4, PALETTE.SURFACE, 0.5);

    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(dx, dy + 7, TILE_SIZE, 1);
    ctx.fillRect(dx + ((row % 2) * 8 + 4), dy, 1, 8);
    ctx.fillRect(dx + (((row + 1) % 2) * 6 + 3), dy + 8, 1, 8);

    if (!isTileStructuralWall(room, col, row + 1)) {
      ctx.fillStyle = PALETTE.TEXT_SECONDARY;
      ctx.fillRect(dx, dy + 4, TILE_SIZE, 2);
      ctx.fillStyle = PALETTE.BG_PRIMARY;
      ctx.fillRect(dx, dy + TILE_SIZE - 1, TILE_SIZE, 1);
    }
    if (!isTileStructuralWall(room, col, row - 1)) {
      ctx.fillStyle = PALETTE.BG_PRIMARY;
      ctx.fillRect(dx, dy, TILE_SIZE, 1);
    }
    if (!isTileStructuralWall(room, col + 1, row)) {
      ctx.fillStyle = PALETTE.BG_PRIMARY;
      ctx.fillRect(dx + TILE_SIZE - 1, dy, 1, TILE_SIZE);
    }
    if (!isTileStructuralWall(room, col - 1, row)) {
      ctx.fillStyle = PALETTE.BG_PRIMARY;
      ctx.fillRect(dx, dy, 1, TILE_SIZE);
    }
  }

  function drawFloorTile(ctx, room, col, row, dx, dy) {
    const rb = room.rugBounds;
    const isRugZone =
      rb &&
      col >= rb.minCol &&
      col <= rb.maxCol &&
      row >= rb.minRow &&
      row <= rb.maxRow;

    if (assets.grounds) {
      if (isRugZone) {
        drawTileFromSheet(ctx, assets.grounds, 5, 1, dx, dy);
      } else if ((col * 7 + row * 13) % 11 === 0) {
        drawTileFromSheet(ctx, assets.grounds, 5, 13, dx, dy);
      } else {
        const gx = 5 + (col % 2);
        const gy = 5 + (row % 2);
        drawTileFromSheet(ctx, assets.grounds, gx, gy, dx, dy);
      }
    } else {
      ctx.fillStyle = PALETTE.TEXT_SECONDARY;
      ctx.fillRect(dx, dy, TILE_SIZE, TILE_SIZE);
      if (!isRugZone) {
        ctx.fillStyle = PALETTE.SURFACE;
        ctx.fillRect(dx, dy + TILE_SIZE - 1, TILE_SIZE, 1);
        ctx.fillRect(dx + TILE_SIZE - 1, dy, 1, TILE_SIZE);
      }
    }

    // Moldura em dithering ao redor da área focal de cada sala
    if (isRugZone) {
      if (col === rb.minCol) drawDitherRect(ctx, dx, dy, 1, TILE_SIZE, PALETTE.SURFACE, 0.5);
      if (col === rb.maxCol) drawDitherRect(ctx, dx + TILE_SIZE - 1, dy, 1, TILE_SIZE, PALETTE.SURFACE, 0.5);
      if (row === rb.minRow) drawDitherRect(ctx, dx, dy, TILE_SIZE, 1, PALETTE.SURFACE, 0.5);
      if (row === rb.maxRow) drawDitherRect(ctx, dx, dy + TILE_SIZE - 1, TILE_SIZE, 1, PALETTE.SURFACE, 0.5);
    }

    // Sombras projetadas pelas paredes estruturais usando dithering monocromático
    const wallTop = isTileStructuralWall(room, col, row - 1);
    const wallBottom = isTileStructuralWall(room, col, row + 1);
    const wallLeft = isTileStructuralWall(room, col - 1, row);
    const wallRight = isTileStructuralWall(room, col + 1, row);

    if (wallTop) {
      ctx.fillStyle = PALETTE.SURFACE;
      ctx.fillRect(dx, dy, TILE_SIZE, 2);
      drawDitherRect(ctx, dx, dy + 2, TILE_SIZE, 2, PALETTE.SURFACE, 0.5);
    }
    if (wallBottom) {
      drawDitherRect(ctx, dx, dy + TILE_SIZE - 2, TILE_SIZE, 2, PALETTE.SURFACE, 0.5);
    }
    if (wallLeft && col > 0) {
      ctx.fillStyle = PALETTE.SURFACE;
      ctx.fillRect(dx, dy, 1, TILE_SIZE);
      drawDitherRect(ctx, dx + 1, dy, 2, TILE_SIZE, PALETTE.SURFACE, 0.5);
    }
    if (wallRight && col < GRID_COLS - 1) {
      ctx.fillStyle = PALETTE.SURFACE;
      ctx.fillRect(dx + TILE_SIZE - 1, dy, 1, TILE_SIZE);
      drawDitherRect(ctx, dx + TILE_SIZE - 3, dy, 2, TILE_SIZE, PALETTE.SURFACE, 0.5);
    }

    if (wallTop && wallLeft && col > 0) {
      drawDitherRect(ctx, dx, dy, 5, 5, PALETTE.MONO_DARK, 0.5);
    }
    if (wallTop && wallRight && col < GRID_COLS - 1) {
      drawDitherRect(ctx, dx + TILE_SIZE - 5, dy, 5, 5, PALETTE.MONO_DARK, 0.5);
    }
    if (wallBottom && wallLeft && col > 0) {
      drawDitherRect(ctx, dx, dy + TILE_SIZE - 4, 4, 4, PALETTE.MONO_DARK, 0.25);
    }
    if (wallBottom && wallRight && col < GRID_COLS - 1) {
      drawDitherRect(ctx, dx + TILE_SIZE - 4, dy + TILE_SIZE - 4, 4, 4, PALETTE.MONO_DARK, 0.25);
    }

    // Sombra em dithering nas passagens abertas
    const type = getTileTypeInRoom(room, col, row);
    if (type === TILE_TYPE.PASSAGE_LEFT) {
      drawDitherRect(ctx, dx, dy, 3, TILE_SIZE, PALETTE.MONO_DARK, 0.5);
      drawDitherRect(ctx, dx + 3, dy, 4, TILE_SIZE, PALETTE.SURFACE, 0.5);
    } else if (type === TILE_TYPE.PASSAGE_RIGHT) {
      drawDitherRect(ctx, dx + TILE_SIZE - 3, dy, 3, TILE_SIZE, PALETTE.MONO_DARK, 0.5);
      drawDitherRect(ctx, dx + TILE_SIZE - 7, dy, 4, TILE_SIZE, PALETTE.SURFACE, 0.5);
    }
  }

  function drawProceduralPropFallback(ctx, kind, dx, dy) {
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    if (kind === 'plate') {
      ctx.fillRect(dx + 1, dy + 1, 14, 14);
      ctx.fillStyle = PALETTE.SURFACE;
      ctx.fillRect(dx + 2, dy + 2, 12, 12);
      ctx.fillStyle = PALETTE.MONO_DARK;
      ctx.fillRect(dx + 4, dy + 4, 8, 8);
      return;
    }
    if (kind === 'stool') {
      ctx.fillRect(dx + 4, dy + 4, 8, 8);
      ctx.fillStyle = PALETTE.TEXT_PRIMARY;
      ctx.fillRect(dx + 5, dy + 5, 6, 4);
      return;
    }
    ctx.fillRect(dx + 1, dy + 1, 14, 14);
    ctx.fillStyle = PALETTE.SURFACE;
    ctx.fillRect(dx + 2, dy + 2, 12, 11);
    ctx.fillStyle = PALETTE.TEXT_PRIMARY;
    ctx.fillRect(dx + 3, dy + 3, 10, 3);
  }

  function drawDeskManuscriptDetail(ctx, dx, dy) {
    // Folha/caderno aberto em pixel-art (#fafafa + #2b2a2a + #555555) sobre a escrivaninha
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(dx + 2, dy + 3, 9, 7);
    ctx.fillStyle = PALETTE.TEXT_PRIMARY;
    ctx.fillRect(dx + 3, dy + 4, 3, 5);
    ctx.fillRect(dx + 7, dy + 4, 3, 5);
    ctx.fillStyle = PALETTE.SURFACE;
    ctx.fillRect(dx + 6, dy + 4, 1, 5);
    ctx.fillStyle = PALETTE.MONO_DARK;
    ctx.fillRect(dx + 4, dy + 5, 1, 1);
    ctx.fillRect(dx + 4, dy + 7, 1, 1);
    ctx.fillRect(dx + 8, dy + 5, 1, 1);
    ctx.fillRect(dx + 8, dy + 7, 1, 1);
  }

  function buildSingleRoomBuffer(room) {
    const buffer = document.createElement('canvas');
    buffer.width = LOGICAL_WIDTH;
    buffer.height = LOGICAL_HEIGHT;
    const bCtx = buffer.getContext('2d');
    if (!bCtx) return buffer;

    bCtx.imageSmoothingEnabled = false;

    // Fundo oficial --bg-primary (#2b2a2a)
    bCtx.fillStyle = PALETTE.BG_PRIMARY;
    bCtx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Camada 1: Paredes estruturais e Pisos
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const type = room.layout[row][col];
        const dx = col * TILE_SIZE;
        const dy = row * TILE_SIZE;

        if (type === TILE_TYPE.VOID) {
          if (
            (col === 0 && room.hasLeftExit && (row === 2 || row === 8)) ||
            (col === GRID_COLS - 1 && room.hasRightExit && (row === 2 || row === 8))
          ) {
            drawDitherRect(bCtx, dx, dy, TILE_SIZE, TILE_SIZE, PALETTE.MONO_DARK, 0.25);
          }
        } else if (type === TILE_TYPE.WALL) {
          if (assets.walls) {
            const coord = getWallSpriteCoord(room, col, row);
            drawTileFromSheet(bCtx, assets.walls, coord[0], coord[1], dx, dy);
          } else {
            drawProceduralWallFallback(bCtx, room, col, row, dx, dy);
          }
        } else {
          // Tanto FLOOR quanto PASSAGE quanto células sob PROP_SOLID recebem o piso base
          drawFloorTile(bCtx, room, col, row, dx, dy);
        }
      }
    }

    // Camada 2: Props estáticos da sala (Totem, Placa, Estantes, Escrivaninha, Banqueta)
    room.props.forEach(function (prop) {
      const dx = prop.col * TILE_SIZE;
      const dy = prop.row * TILE_SIZE;
      const sheetImg = prop.sheet === 'animated' ? assets.animated : assets.props;

      // Sombra discreta no piso sob props sólidos
      if (room.layout[prop.row][prop.col] === TILE_TYPE.PROP_SOLID) {
        drawDitherRect(bCtx, dx + 1, dy + 13, TILE_SIZE - 2, 3, PALETTE.MONO_DARK, 0.5);
      }

      if (sheetImg) {
        drawTileFromSheet(bCtx, sheetImg, prop.sx, prop.sy, dx, dy);
      } else {
        drawProceduralPropFallback(bCtx, prop.fallback, dx, dy);
      }

      if (prop.deskManuscript) {
        drawDeskManuscriptDetail(bCtx, dx, dy);
      }
    });

    return buffer;
  }

  function buildAllRoomBuffers() {
    Object.keys(ROOMS).forEach(function (roomId) {
      roomBuffers[roomId] = buildSingleRoomBuffer(ROOMS[roomId]);
    });
  }

  /* ==========================================================================
     7. Proximidade Interativa e Destaques em --accent (#86dd8f)
     ========================================================================== */
  function isPlayerNearInteraction(room) {
    if (!room || !room.interaction) return false;
    const area = room.interaction.triggerArea;
    return (
      player.gridX >= area.minCol &&
      player.gridX <= area.maxCol &&
      player.gridY >= area.minRow &&
      player.gridY <= area.maxRow
    );
  }

  function updateHudVisibility(forceHide) {
    const hud = document.getElementById('interactionHud');
    const mobileBtn = document.getElementById('mobileActionBtn');
    const shouldShow =
      !forceHide &&
      !gameState.isModalOpen &&
      Boolean(gameState.activeInteractionId);

    if (hud) {
      if (shouldShow) hud.classList.add('is-visible');
      else hud.classList.remove('is-visible');
    }

    if (mobileBtn) {
      if (shouldShow) mobileBtn.classList.add('is-visible');
      else mobileBtn.classList.remove('is-visible');
    }
  }

  function updateInteractionProximityState() {
    const room = getCurrentRoom();
    const near = isPlayerNearInteraction(room);
    const nextId = near && room.interaction ? room.interaction.id : null;

    if (nextId !== gameState.activeInteractionId) {
      gameState.activeInteractionId = nextId;
      window.dispatchEvent(
        new CustomEvent('site:proximity', {
          detail: {
            roomId: room.id,
            interactionId: nextId,
            active: Boolean(nextId)
          }
        })
      );
    }

    updateHudVisibility();
  }

  /**
   * Desenha piras animadas monocromáticas (Sala de Postagens).
   */
  function drawAnimatedRoomProps(ctx, room, timestamp) {
    if (!room.animatedBraziers || room.animatedBraziers.length === 0) return;

    const animFrame = Math.floor(timestamp / 220) % 4;

    room.animatedBraziers.forEach(function (brazier) {
      const dx = brazier.col * TILE_SIZE;
      const dy = brazier.row * TILE_SIZE;

      drawDitherRect(ctx, dx + 2, dy + 14, TILE_SIZE - 4, 2, PALETTE.MONO_DARK, 0.5);

      if (assets.animated) {
        // Base esculpida da pira (linha 7) e fagulhas monocromáticas (linha 6)
        drawTileFromSheet(ctx, assets.animated, animFrame, 7, dx, dy);
        drawTileFromSheet(ctx, assets.animated, animFrame, 6, dx, dy - TILE_SIZE);
      } else {
        drawProceduralPropFallback(ctx, 'brazier', dx, dy);
      }
    });
  }

  /**
   * Brilho discreto em --accent (#86dd8f) nos limiares de passagens abertas.
   */
  function drawPassageHighlights(ctx, room, timestamp) {
    const pulse = Math.floor(timestamp / 420) % 2;
    const centerY = CENTER_ROW * TILE_SIZE + 7;

    if (room.hasLeftExit) {
      const nearLeft = player.gridX <= 3;
      ctx.fillStyle = PALETTE.ACCENT;
      const offset = pulse === 0 ? 2 : 3;
      ctx.fillRect(offset, centerY, 1, 2);
      ctx.fillRect(offset + 1, centerY - 1, 1, 1);
      ctx.fillRect(offset + 1, centerY + 2, 1, 1);

      if (nearLeft) {
        drawDitherRect(ctx, 0, 4 * TILE_SIZE + 2, 2, 3 * TILE_SIZE - 4, PALETTE.ACCENT, 0.25);
      }
    }

    if (room.hasRightExit) {
      const nearRight = player.gridX >= GRID_COLS - 4;
      ctx.fillStyle = PALETTE.ACCENT;
      const offset = LOGICAL_WIDTH - (pulse === 0 ? 3 : 4);
      ctx.fillRect(offset, centerY, 1, 2);
      ctx.fillRect(offset - 1, centerY - 1, 1, 1);
      ctx.fillRect(offset - 1, centerY + 2, 1, 1);

      if (nearRight) {
        drawDitherRect(
          ctx,
          LOGICAL_WIDTH - 2,
          4 * TILE_SIZE + 2,
          2,
          3 * TILE_SIZE - 4,
          PALETTE.ACCENT,
          0.25
        );
      }
    }
  }

  /**
   * Indicador sutil no chão em --accent (#86dd8f) quando o personagem está
   * adjacente ou sobre a área do ponto de interesse (Totem ou Escrivaninha).
   */
  function drawInteractionFloorIndicator(ctx, room, timestamp) {
    if (!isPlayerNearInteraction(room)) return;

    const tiles = room.interaction.floorHighlightTiles;
    if (!tiles || tiles.length === 0) return;

    // Calcula retângulo unificado dos tiles de destaque no piso
    let minCol = tiles[0].col;
    let maxCol = tiles[0].col;
    let minRow = tiles[0].row;
    let maxRow = tiles[0].row;

    tiles.forEach(function (t) {
      if (t.col < minCol) minCol = t.col;
      if (t.col > maxCol) maxCol = t.col;
      if (t.row < minRow) minRow = t.row;
      if (t.row > maxRow) maxRow = t.row;
    });

    const pulse = Math.floor(timestamp / 280) % 2;
    const x = minCol * TILE_SIZE;
    const y = minRow * TILE_SIZE;
    const w = (maxCol - minCol + 1) * TILE_SIZE;
    const h = (maxRow - minRow + 1) * TILE_SIZE;

    // Aura em dithering suave no piso
    drawDitherRect(
      ctx,
      x + 1,
      y + 1,
      w - 2,
      h - 2,
      PALETTE.ACCENT,
      pulse === 0 ? 0.25 : 0.5
    );

    // Moldura retangular seca pixel-art no chão (#86dd8f com sombra de 1px #2b2a2a)
    const inset = pulse === 0 ? 1 : 2;
    const rx = x + inset;
    const ry = y + inset;
    const rw = w - inset * 2;
    const rh = h - inset * 2;

    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(rx, ry + rh, rw, 1);

    ctx.fillStyle = PALETTE.ACCENT;
    // Linhas horizontais e verticais do indicador no chão
    ctx.fillRect(rx, ry, rw, 1);
    ctx.fillRect(rx, ry + rh - 1, rw, 1);
    ctx.fillRect(rx, ry, 1, rh);
    ctx.fillRect(rx + rw - 1, ry, 1, rh);

    // Reforço nos 4 cantos internos
    ctx.fillRect(rx + 1, ry + 1, 2, 1);
    ctx.fillRect(rx + rw - 3, ry + 1, 2, 1);
    ctx.fillRect(rx + 1, ry + rh - 2, 2, 1);
    ctx.fillRect(rx + rw - 3, ry + rh - 2, 2, 1);

    // Brilho sutil rente à base do objeto interativo (Totem / Escrivaninha)
    const focusTiles = room.interaction.focusOutlineTiles || [];
    focusTiles.forEach(function (ft) {
      const fx = ft.col * TILE_SIZE;
      const fy = ft.row * TILE_SIZE;
      ctx.fillRect(fx + 2, fy + TILE_SIZE - 1, TILE_SIZE - 4, 1);
    });
  }

  /* ==========================================================================
     8. Pathfinding em Grade (BFS) e Resolução de Clique em Objetos Interativos
     ========================================================================== */
  function findGridPath(room, startCol, startRow, targetCol, targetRow) {
    if (!isWalkableInRoom(room, targetCol, targetRow)) return [];
    if (startCol === targetCol && startRow === targetRow) return [];

    const visited = Array.from({ length: GRID_ROWS }, function () {
      return Array(GRID_COLS).fill(false);
    });
    const queue = [{ col: startCol, row: startRow, path: [] }];
    visited[startRow][startCol] = true;

    const dirKeys = ['up', 'down', 'left', 'right'];

    while (queue.length > 0) {
      const current = queue.shift();

      for (let i = 0; i < dirKeys.length; i++) {
        const dirName = dirKeys[i];
        const vec = DIRECTIONS[dirName];
        const nextCol = current.col + vec.dx;
        const nextRow = current.row + vec.dy;

        if (
          nextRow >= 0 &&
          nextRow < GRID_ROWS &&
          nextCol >= 0 &&
          nextCol < GRID_COLS &&
          !visited[nextRow][nextCol] &&
          isWalkableInRoom(room, nextCol, nextRow)
        ) {
          const nextPath = current.path.concat(dirName);
          if (nextCol === targetCol && nextRow === targetRow) {
            return nextPath;
          }
          visited[nextRow][nextCol] = true;
          queue.push({ col: nextCol, row: nextRow, path: nextPath });
        }
      }
    }

    return [];
  }

  /**
   * Caso o usuário clique sobre o Totem ou a Escrivaninha (tiles sólidos),
   * encontra o tile caminhável de interação mais próximo em frente ao objeto.
   */
  function resolveInteractiveLandingTile(room, clickedCol, clickedRow) {
    if (!room.interaction) return null;

    const matchesProp = room.interaction.clickTargetTiles.some(function (t) {
      return t.col === clickedCol && t.row === clickedRow;
    });
    if (!matchesProp) return null;

    let bestTile = null;
    let bestLen = Infinity;

    room.interaction.landingCandidates.forEach(function (cand) {
      if (!isWalkableInRoom(room, cand.col, cand.row)) return;
      if (cand.col === player.gridX && cand.row === player.gridY) {
        bestTile = cand;
        bestLen = 0;
        return;
      }
      const p = findGridPath(room, player.gridX, player.gridY, cand.col, cand.row);
      if (p.length > 0 && p.length < bestLen) {
        bestLen = p.length;
        bestTile = cand;
      }
    });

    return bestTile;
  }

  /* ==========================================================================
     9. Telas Sobrepostas (Modais de Conteúdo) e Controle de Pausa
     ========================================================================== */
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    if (gameState.activeModalId && gameState.activeModalId !== modalId) {
      const active = document.getElementById(gameState.activeModalId);
      if (active) {
        active.classList.remove('is-open');
        active.setAttribute('aria-hidden', 'true');
      }
    }

    gameState.isModalOpen = true;
    gameState.activeModalId = modalId;

    clearAllHeldDirections();
    inputState.pathQueue = [];
    inputState.targetMarker = null;
    inputState.openOnArrival = false;

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');

    updateHudVisibility(true);

    const closeBtn = modal.querySelector('.modal__close');
    if (closeBtn) closeBtn.focus();

    window.dispatchEvent(
      new CustomEvent('site:modalopen', {
        detail: { modalId: modalId }
      })
    );
  }

  function closeActiveModal() {
    const openModals = document.querySelectorAll('.modal-backdrop.is-open');
    if (openModals.length === 0 && !gameState.isModalOpen) return;

    openModals.forEach(function (m) {
      m.classList.remove('is-open');
      m.setAttribute('aria-hidden', 'true');
    });

    gameState.isModalOpen = false;
    gameState.activeModalId = null;
    clearAllHeldDirections();

    updateInteractionProximityState();

    window.dispatchEvent(new CustomEvent('site:modalclose'));
  }

  function triggerCurrentInteraction() {
    if (gameState.isModalOpen) return;
    if (gameState.activeInteractionId === 'posts-totem') {
      openModal('modalPosts');
    } else if (gameState.activeInteractionId === 'ideas-desk') {
      openModal('modalIdeas');
    }
  }

  function initModalsAndHud() {
    document.querySelectorAll('.modal-backdrop').forEach(function (backdrop) {
      backdrop.addEventListener('click', function (event) {
        if (event.target === backdrop) {
          closeActiveModal();
        }
      });
    });

    document.querySelectorAll('[data-close-modal]').forEach(function (btn) {
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        closeActiveModal();
      });
    });

    document.querySelectorAll('[data-open-modal]').forEach(function (btn) {
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        const targetModalId = btn.getAttribute('data-open-modal');
        if (targetModalId) {
          openModal(targetModalId);
        }
      });
    });

    const hud = document.getElementById('interactionHud');
    if (hud) {
      hud.addEventListener('click', function (event) {
        event.preventDefault();
        triggerCurrentInteraction();
      });
    }

    const mobileBtn = document.getElementById('mobileActionBtn');
    if (mobileBtn) {
      mobileBtn.addEventListener('click', function (event) {
        event.preventDefault();
        triggerCurrentInteraction();
      });
    }
  }

  /* ==========================================================================
     10. Movimentação Tile-a-Tile, Colisões e Transição entre as 3 Salas
     ========================================================================== */
  function transitionToRoom(targetRoomId, spawnCol, spawnRow, facingDir) {
    if (!ROOMS[targetRoomId]) return;

    if (gameState.isModalOpen) {
      closeActiveModal();
    }

    gameState.currentRoomId = targetRoomId;
    gameState.transitionCooldownMs = TRANSITION_COOLDOWN_MS;

    player.gridX = spawnCol;
    player.gridY = spawnRow;
    player.fromX = spawnCol;
    player.fromY = spawnRow;
    player.renderX = spawnCol * TILE_SIZE;
    player.renderY = spawnRow * TILE_SIZE;
    player.facing = facingDir;
    player.isMoving = false;
    player.moveElapsed = 0;
    player.bumpDir = null;
    player.bumpElapsed = 0;

    inputState.pathQueue = [];
    inputState.targetMarker = null;
    inputState.bufferedDirection = null;
    inputState.openOnArrival = false;

    updateInteractionProximityState();

    window.dispatchEvent(
      new CustomEvent('site:roomchange', {
        detail: { roomId: targetRoomId }
      })
    );
  }

  function checkAndTriggerRoomExit() {
    const room = getCurrentRoom();
    const tile = getTileTypeInRoom(room, player.gridX, player.gridY);

    if (tile === TILE_TYPE.PASSAGE_LEFT && room.exits.left) {
      transitionToRoom(
        room.exits.left.targetRoom,
        room.exits.left.spawnCol,
        player.gridY,
        'left'
      );
      return true;
    }

    if (tile === TILE_TYPE.PASSAGE_RIGHT && room.exits.right) {
      transitionToRoom(
        room.exits.right.targetRoom,
        room.exits.right.spawnCol,
        player.gridY,
        'right'
      );
      return true;
    }

    return false;
  }

  function tryStep(dirName) {
    const vec = DIRECTIONS[dirName];
    if (!vec || player.isMoving) return false;

    const room = getCurrentRoom();
    player.facing = dirName;

    const nextCol = player.gridX + vec.dx;
    const nextRow = player.gridY + vec.dy;

    if (!isWalkableInRoom(room, nextCol, nextRow)) {
      player.bumpDir = dirName;
      player.bumpElapsed = 0;
      inputState.pathQueue = [];
      inputState.targetMarker = null;
      return false;
    }

    player.fromX = player.gridX;
    player.fromY = player.gridY;
    player.gridX = nextCol;
    player.gridY = nextRow;
    player.isMoving = true;
    player.moveElapsed = 0;
    player.bumpDir = null;
    player.stepCount += 1;

    return true;
  }

  function getNextDesiredDirection() {
    if (inputState.bufferedDirection) {
      const buffered = inputState.bufferedDirection;
      inputState.bufferedDirection = null;
      return buffered;
    }

    if (inputState.heldDirections.length > 0) {
      return inputState.heldDirections[inputState.heldDirections.length - 1];
    }

    if (inputState.pathQueue.length > 0) {
      return inputState.pathQueue.shift();
    }

    return null;
  }

  function easeOutQuad(t) {
    return t * (2 - t);
  }

  function updatePlayer(dtMs) {
    if (gameState.transitionCooldownMs > 0) {
      gameState.transitionCooldownMs = Math.max(0, gameState.transitionCooldownMs - dtMs);
    }

    if (player.isMoving) {
      player.moveElapsed += dtMs;
      const t = Math.min(1, player.moveElapsed / STEP_DURATION_MS);
      const eased = easeOutQuad(t);

      player.renderX = (player.fromX + (player.gridX - player.fromX) * eased) * TILE_SIZE;
      player.renderY = (player.fromY + (player.gridY - player.fromY) * eased) * TILE_SIZE;

      if (t >= 1) {
        player.isMoving = false;
        player.renderX = player.gridX * TILE_SIZE;
        player.renderY = player.gridY * TILE_SIZE;

        if (
          inputState.targetMarker &&
          inputState.targetMarker.col === player.gridX &&
          inputState.targetMarker.row === player.gridY
        ) {
          inputState.targetMarker = null;
        }

        // Verifica se pisou no tile limite de saída da sala atual
        if (checkAndTriggerRoomExit()) {
          return;
        }

        updateInteractionProximityState();

        if (
          !gameState.isModalOpen &&
          inputState.openOnArrival &&
          inputState.pathQueue.length === 0 &&
          isPlayerNearInteraction(getCurrentRoom())
        ) {
          inputState.openOnArrival = false;
          triggerCurrentInteraction();
        }
      }
    }

    if (gameState.isModalOpen) {
      return;
    }

    if (!player.isMoving && inputState.enabled && gameState.transitionCooldownMs <= 0) {
      const nextDir = getNextDesiredDirection();
      if (nextDir) {
        tryStep(nextDir);
      }
    }

    if (player.bumpDir) {
      player.bumpElapsed += dtMs;
      if (player.bumpElapsed >= BUMP_DURATION_MS) {
        player.bumpDir = null;
        player.bumpElapsed = 0;
      }
    }
  }

  /* ==========================================================================
     11. Renderização do Cursor (#86dd8f) e do Jogador (4 Direções)
     ========================================================================== */
  function drawTargetMarker(ctx, timestamp) {
    const marker = inputState.targetMarker;
    if (!marker) return;

    const pulse = Math.floor(timestamp / 180) % 2;
    const inset = pulse === 0 ? 2 : 3;
    const x = marker.col * TILE_SIZE;
    const y = marker.row * TILE_SIZE;

    // Sombra de contraste 1px (#2b2a2a) sob as cantoneiras --accent (#86dd8f)
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(x + inset, y + inset + 1, 3, 1);
    ctx.fillRect(x + TILE_SIZE - inset - 3, y + inset + 1, 3, 1);
    ctx.fillRect(x + inset, y + TILE_SIZE - inset, 3, 1);
    ctx.fillRect(x + TILE_SIZE - inset - 3, y + TILE_SIZE - inset, 3, 1);

    ctx.fillStyle = PALETTE.ACCENT;
    ctx.fillRect(x + inset, y + inset, 3, 1);
    ctx.fillRect(x + inset, y + inset, 1, 3);

    ctx.fillRect(x + TILE_SIZE - inset - 3, y + inset, 3, 1);
    ctx.fillRect(x + TILE_SIZE - inset - 1, y + inset, 1, 3);

    ctx.fillRect(x + inset, y + TILE_SIZE - inset - 1, 3, 1);
    ctx.fillRect(x + inset, y + TILE_SIZE - inset - 3, 1, 3);

    ctx.fillRect(x + TILE_SIZE - inset - 3, y + TILE_SIZE - inset - 1, 3, 1);
    ctx.fillRect(x + TILE_SIZE - inset - 1, y + TILE_SIZE - inset - 3, 1, 3);
  }

  function drawPlayer(ctx, timestamp) {
    let bumpOffsetX = 0;
    let bumpOffsetY = 0;

    if (player.bumpDir) {
      const vec = DIRECTIONS[player.bumpDir];
      const wave = Math.sin((player.bumpElapsed / BUMP_DURATION_MS) * Math.PI);
      bumpOffsetX = Math.round(vec.dx * wave * 2);
      bumpOffsetY = Math.round(vec.dy * wave * 2);
    }

    const drawX = Math.round(player.renderX) + bumpOffsetX;
    const drawY = Math.round(player.renderY) - 2 + bumpOffsetY;

    // Sombra pontilhada monocromática sob os pés
    drawDitherRect(ctx, drawX + 4, drawY + 14, 8, 2, PALETTE.MONO_DARK, 0.5);

    const moveProgress = player.isMoving
      ? Math.min(0.999, player.moveElapsed / STEP_DURATION_MS)
      : 0;

    if (player.facing === 'right') {
      if (assets.elf) {
        if (player.isMoving) {
          const walkBase = (player.stepCount % 2) * 2;
          const subFrame = moveProgress < 0.5 ? 0 : 1;
          drawTileFromSheet(ctx, assets.elf, walkBase + subFrame, 2, drawX, drawY);
        } else {
          const idleFrame = Math.floor(timestamp / 420) % 2;
          drawTileFromSheet(ctx, assets.elf, idleFrame, 0, drawX, drawY);
        }
      } else {
        const fbIdx = player.isMoving ? 1 : 0;
        ctx.drawImage(compiledSprites.rightFallback[fbIdx], drawX, drawY);
      }
      return;
    }

    if (player.facing === 'left') {
      if (assets.elf) {
        if (player.isMoving) {
          const walkBase = (player.stepCount % 2) * 2;
          const subFrame = moveProgress < 0.5 ? 0 : 1;
          drawTileFromSheet(ctx, assets.elf, walkBase + subFrame, 3, drawX, drawY);
        } else {
          const idleFrame = Math.floor(timestamp / 420) % 2;
          drawTileFromSheet(ctx, assets.elf, idleFrame, 1, drawX, drawY);
        }
      } else {
        const fbIdx = player.isMoving ? 1 : 0;
        ctx.drawImage(compiledSprites.leftFallback[fbIdx], drawX, drawY);
      }
      return;
    }

    const dirFrames = player.facing === 'up' ? compiledSprites.up : compiledSprites.down;
    if (player.isMoving) {
      const parity = player.stepCount % 2;
      const walkIndex = parity === 0
        ? (moveProgress < 0.45 ? 2 : 3)
        : (moveProgress < 0.45 ? 4 : 5);
      ctx.drawImage(dirFrames[walkIndex], drawX, drawY);
    } else {
      const idleIndex = Math.floor(timestamp / 460) % 2;
      ctx.drawImage(dirFrames[idleIndex], drawX, drawY);
    }
  }

  /* ==========================================================================
     11. Controles Responsivos (WASD/Setas, Clique Mouse, Touch & D-Pad)
     ========================================================================== */
  function mapKeyToDirection(event) {
    const code = event.code;
    const key = event.key ? event.key.toLowerCase() : '';

    if (code === 'ArrowUp' || code === 'KeyW' || key === 'w' || key === 'arrowup') return 'up';
    if (code === 'ArrowDown' || code === 'KeyS' || key === 's' || key === 'arrowdown') return 'down';
    if (code === 'ArrowLeft' || code === 'KeyA' || key === 'a' || key === 'arrowleft') return 'left';
    if (code === 'ArrowRight' || code === 'KeyD' || key === 'd' || key === 'arrowright') return 'right';
    return null;
  }

  function pushHeldDirection(dir) {
    if (!inputState.enabled) return;
    inputState.pathQueue = [];
    inputState.targetMarker = null;

    const existingIdx = inputState.heldDirections.indexOf(dir);
    if (existingIdx !== -1) {
      inputState.heldDirections.splice(existingIdx, 1);
    }
    inputState.heldDirections.push(dir);
    inputState.bufferedDirection = dir;
  }

  function releaseHeldDirection(dir) {
    const idx = inputState.heldDirections.indexOf(dir);
    if (idx !== -1) {
      inputState.heldDirections.splice(idx, 1);
    }
  }

  function clearAllHeldDirections() {
    inputState.heldDirections = [];
    inputState.bufferedDirection = null;
  }

  function getDirectionTowardTile(targetCol, targetRow) {
    const dx = targetCol - player.gridX;
    const dy = targetRow - player.gridY;
    if (dx === 0 && dy === 0) return null;

    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    }
    return dy > 0 ? 'down' : 'up';
  }

  function isCellClickableInRoom(room, col, row) {
    if (isWalkableInRoom(room, col, row)) return true;
    if (!room.interaction) return false;
    return room.interaction.clickTargetTiles.some(function (t) {
      return t.col === col && t.row === row;
    });
  }

  function initControls(canvas) {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.body.classList.add('is-touch-device');
    }

    window.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if (gameState.isModalOpen) {
          event.preventDefault();
          closeActiveModal();
          return;
        }
      }

      if (gameState.isModalOpen) return;

      const keyLower = event.key ? event.key.toLowerCase() : '';
      if (
        event.code === 'KeyE' ||
        keyLower === 'e' ||
        event.code === 'Enter' ||
        event.code === 'Space' ||
        keyLower === ' '
      ) {
        if (gameState.activeInteractionId) {
          event.preventDefault();
          triggerCurrentInteraction();
          return;
        }
      }

      const dir = mapKeyToDirection(event);
      if (!dir) return;
      event.preventDefault();

      if (!event.repeat) {
        pushHeldDirection(dir);
      }
    });

    window.addEventListener('keyup', function (event) {
      if (gameState.isModalOpen) return;
      const dir = mapKeyToDirection(event);
      if (!dir) return;
      releaseHeldDirection(dir);
    });

    window.addEventListener('blur', clearAllHeldDirections);

    let pointerStart = null;

    function clientToGrid(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const borderL = canvas.clientLeft || 0;
      const borderT = canvas.clientTop || 0;
      const width = canvas.clientWidth || rect.width;
      const height = canvas.clientHeight || rect.height;
      if (width <= 0 || height <= 0) return null;

      const normX = (clientX - rect.left - borderL) / width;
      const normY = (clientY - rect.top - borderT) / height;

      if (normX < 0 || normX >= 1 || normY < 0 || normY >= 1) return null;

      return {
        col: Math.floor(normX * GRID_COLS),
        row: Math.floor(normY * GRID_ROWS)
      };
    }

    canvas.addEventListener('pointermove', function (event) {
      if (event.pointerType !== 'mouse') return;
      if (gameState.isModalOpen) {
        canvas.style.cursor = 'default';
        return;
      }
      const room = getCurrentRoom();
      const cell = clientToGrid(event.clientX, event.clientY);
      canvas.style.cursor =
        cell && isCellClickableInRoom(room, cell.col, cell.row) ? 'pointer' : 'default';
    });

    canvas.addEventListener('pointerdown', function (event) {
      if (gameState.isModalOpen) return;
      if (!inputState.enabled) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      if (event.pointerType === 'touch') {
        document.body.classList.add('is-touch-device');
      }

      pointerStart = {
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId
      };
    });

    canvas.addEventListener('pointerup', function (event) {
      if (gameState.isModalOpen) return;
      if (!inputState.enabled || !pointerStart) return;
      if (event.pointerId !== pointerStart.pointerId) return;

      const deltaX = event.clientX - pointerStart.x;
      const deltaY = event.clientY - pointerStart.y;
      const dist = Math.hypot(deltaX, deltaY);
      pointerStart = null;

      if (event.pointerType === 'touch' && dist >= 26) {
        const swipeDir =
          Math.abs(deltaX) >= Math.abs(deltaY)
            ? deltaX > 0 ? 'right' : 'left'
            : deltaY > 0 ? 'down' : 'up';
        inputState.pathQueue = [];
        inputState.targetMarker = null;
        inputState.openOnArrival = false;
        inputState.bufferedDirection = swipeDir;
        return;
      }

      const cell = clientToGrid(event.clientX, event.clientY);
      if (!cell) return;

      const room = getCurrentRoom();
      const interactiveLanding = resolveInteractiveLandingTile(room, cell.col, cell.row);

      // Se clicou no prop e o personagem já está no raio de interação: abre imediatamente!
      if (interactiveLanding && isPlayerNearInteraction(room)) {
        const faceDir = getDirectionTowardTile(cell.col, cell.row);
        if (faceDir) player.facing = faceDir;
        triggerCurrentInteraction();
        return;
      }

      const dest = interactiveLanding || cell;

      if (isWalkableInRoom(room, dest.col, dest.row)) {
        inputState.pathQueue = [];
        inputState.targetMarker = null;
        inputState.openOnArrival = Boolean(interactiveLanding);
        const path = findGridPath(room, player.gridX, player.gridY, dest.col, dest.row);
        if (path.length > 0) {
          inputState.pathQueue = path;
          inputState.targetMarker = { col: dest.col, row: dest.row };
        } else if (interactiveLanding) {
          const faceDir = getDirectionTowardTile(cell.col, cell.row);
          if (faceDir) player.facing = faceDir;
          updateInteractionProximityState();
          triggerCurrentInteraction();
        }
      } else {
        const stepDir = getDirectionTowardTile(cell.col, cell.row);
        if (stepDir) {
          inputState.pathQueue = [];
          inputState.targetMarker = null;
          inputState.openOnArrival = false;
          inputState.bufferedDirection = stepDir;
        }
      }
    });

    canvas.addEventListener('pointercancel', function () {
      pointerStart = null;
    });

    const dpad = document.getElementById('touchDpad');
    if (dpad) {
      const buttons = dpad.querySelectorAll('.touch-dpad__btn[data-dir]');
      buttons.forEach(function (btn) {
        const dir = btn.getAttribute('data-dir');

        function handlePressStart(event) {
          if (gameState.isModalOpen) return;
          event.preventDefault();
          btn.classList.add('is-pressed');
          if (btn.setPointerCapture && event.pointerId !== undefined) {
            try {
              btn.setPointerCapture(event.pointerId);
            } catch (_) {
              // Ignora caso o ponteiro já tenha sido liberado
            }
          }
          pushHeldDirection(dir);
        }

        function handlePressEnd(event) {
          if (event) event.preventDefault();
          btn.classList.remove('is-pressed');
          releaseHeldDirection(dir);
        }

        btn.addEventListener('pointerdown', handlePressStart);
        btn.addEventListener('pointerup', handlePressEnd);
        btn.addEventListener('pointercancel', handlePressEnd);
        btn.addEventListener('lostpointercapture', handlePressEnd);
        btn.addEventListener('contextmenu', function (e) {
          e.preventDefault();
        });
      });
    }
  }

  /* ==========================================================================
     12. Câmera Estática por Sala e Loop Principal de Renderização
     ========================================================================== */
  function initStageAndLoop() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    canvas.width = LOGICAL_WIDTH;
    canvas.height = LOGICAL_HEIGHT;

    function fitCanvasToViewport() {
      const stage = document.querySelector('.stage') || canvas.closest('.stage') || canvas.parentElement;
      const stageStyle = stage ? window.getComputedStyle(stage) : null;
      const padX = stageStyle
        ? (parseFloat(stageStyle.paddingLeft) || 0) + (parseFloat(stageStyle.paddingRight) || 0)
        : 32;
      const padY = stageStyle
        ? (parseFloat(stageStyle.paddingTop) || 0) + (parseFloat(stageStyle.paddingBottom) || 0)
        : 32;

      const isMobile = window.innerWidth < 768;
      let availW = Math.max(1, window.innerWidth - padX);
      if (!isMobile) {
        availW = Math.min(availW, 680);
      }
      const availH = Math.max(1, window.innerHeight - padY);
      const scale = Math.min(availW / LOGICAL_WIDTH, availH / LOGICAL_HEIGHT);

      const displayW = Math.max(1, Math.floor(LOGICAL_WIDTH * scale));
      const displayH = Math.max(1, Math.floor(LOGICAL_HEIGHT * scale));

      canvas.style.width = displayW + 'px';
      canvas.style.height = displayH + 'px';

      if (ctx) {
        ctx.imageSmoothingEnabled = false;
      }
    }

    fitCanvasToViewport();
    window.addEventListener('resize', fitCanvasToViewport);
    window.addEventListener('orientationchange', fitCanvasToViewport);

    initControls(canvas);

    let lastTimestamp = performance.now();
    let hasRenderedFirstFrame = false;

    function frame(timestamp) {
      const dtMs = Math.min(50, Math.max(0, timestamp - lastTimestamp));
      lastTimestamp = timestamp;

      updatePlayer(dtMs);

      if (ctx) {
        const currentRoom = getCurrentRoom();
        const activeBuffer = roomBuffers[currentRoom.id];

        ctx.imageSmoothingEnabled = false;
        if (activeBuffer) {
          ctx.drawImage(activeBuffer, 0, 0);
        }

        drawPassageHighlights(ctx, currentRoom, timestamp);
        drawInteractionFloorIndicator(ctx, currentRoom, timestamp);
        drawAnimatedRoomProps(ctx, currentRoom, timestamp);
        drawTargetMarker(ctx, timestamp);
        drawPlayer(ctx, timestamp);
      }

      if (!hasRenderedFirstFrame) {
        hasRenderedFirstFrame = true;
        if (requestedOpen === 'ideas') {
          openModal('modalIdeas');
        } else if (requestedOpen === 'posts') {
          openModal('modalPosts');
        }
      }

      window.requestAnimationFrame(frame);
    }

    window.requestAnimationFrame(frame);
    return canvas;
  }

  /* ==========================================================================
     13. Pré-carregamento dos Assets Monocromáticos + Tela de Loading
     ========================================================================== */
  function preloadDungeonAssets() {
    const manifest = [
      { key: 'elf', src: './assets/img/dungeon/elf.png' },
      { key: 'walls', src: './assets/img/dungeon/walls.png' },
      { key: 'grounds', src: './assets/img/dungeon/grounds.png' },
      { key: 'props', src: './assets/img/dungeon/props.png' },
      { key: 'animated', src: './assets/img/dungeon/animated_props.png' }
    ];

    assets.totalCount = manifest.length;

    const promises = manifest.map(function (item) {
      return new Promise(function (resolve) {
        const img = new Image();
        img.onload = function () {
          assets[item.key] = img;
          assets.loadedCount += 1;
          resolve();
        };
        img.onerror = function () {
          assets.loadedCount += 1;
          resolve();
        };
        img.src = item.src;
      });
    });

    return Promise.all(promises).then(function () {
      assets.allSettled = true;
      buildAllRoomBuffers();
    });
  }

  function initLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    const progressBar = document.getElementById('loadingProgressBar');
    const progressFill = document.getElementById('loadingBarFill');

    if (!loadingScreen || !progressFill) {
      inputState.enabled = true;
      return;
    }

    if (requestedOpen === 'ideas' || requestedOpen === 'posts') {
      loadingScreen.style.display = 'none';
      loadingScreen.setAttribute('aria-busy', 'false');
      inputState.enabled = true;
      window.dispatchEvent(new CustomEvent('site:loaded'));
      return;
    }

    let currentProgress = 0;
    let isWindowLoaded = document.readyState === 'complete';
    let isFinishing = false;

    if (!isWindowLoaded) {
      window.addEventListener(
        'load',
        function () {
          isWindowLoaded = true;
        },
        { once: true }
      );
    }

    function updateBar(value) {
      const clamped = Math.min(100, Math.max(0, Math.round(value)));
      progressFill.style.width = clamped + '%';
      if (progressBar) {
        progressBar.setAttribute('aria-valuenow', String(clamped));
      }
    }

    function hideLoadingScreen() {
      if (isFinishing) return;
      isFinishing = true;

      updateBar(100);
      loadingScreen.setAttribute('aria-busy', 'false');

      window.setTimeout(function () {
        let isHidden = false;
        inputState.enabled = true;

        function completeHide() {
          if (isHidden) return;
          isHidden = true;
          loadingScreen.style.display = 'none';
          window.dispatchEvent(new CustomEvent('site:loaded'));
        }

        loadingScreen.addEventListener('transitionend', function onTransitionEnd(event) {
          if (event.target === loadingScreen && event.propertyName === 'opacity') {
            loadingScreen.removeEventListener('transitionend', onTransitionEnd);
            completeHide();
          }
        });

        loadingScreen.classList.add('is-fading-out');
        window.setTimeout(completeHide, 700);
      }, 180);
    }

    const intervalId = window.setInterval(function () {
      const readyToComplete = isWindowLoaded && assets.allSettled;
      const assetRatio = assets.totalCount > 0 ? (assets.loadedCount / assets.totalCount) * 40 : 40;

      if (readyToComplete) {
        const step = Math.max(4, (100 - currentProgress) * 0.28);
        currentProgress = Math.min(100, currentProgress + step);
      } else if (currentProgress < 90) {
        const targetCap = Math.min(90, 50 + assetRatio);
        const step = Math.max(1.5, (targetCap - currentProgress) * 0.14);
        currentProgress = Math.min(targetCap, currentProgress + step);
      }

      updateBar(currentProgress);

      if (currentProgress >= 99.5 && readyToComplete) {
        window.clearInterval(intervalId);
        hideLoadingScreen();
      }
    }, 65);
  }

  /* ==========================================================================
     15. Inicialização Geral
     ========================================================================== */
  compileCustomSprites();
  buildAllRoomBuffers();
  initStageAndLoop();
  initModalsAndHud();
  preloadDungeonAssets();
  initLoadingScreen();
})();
