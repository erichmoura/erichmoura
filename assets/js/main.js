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
    PROP_SOLID: 5,
    PASSAGE_UP: 6,
    PASSAGE_DOWN: 7
  };

  const ROOM_DISPLAY_NAMES = {
    central: 'Hall de entrada',
    ideas: 'Sala das Ideias',
    posts: 'Sala Musical',
    cinema: 'Sala de Cinema'
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
     2. Construção das Matrizes e Metadados das 4 Salas (Zelda-Style Hub)
        [Sala Musical: posts] <---> [Hall de entrada: central] <---> [Sala das Ideias: ideas]
                                              ^
                                              |
                                    [Sala de Cinema: cinema]
     ========================================================================== */
  function createRoomLayout(hasLeftExit, hasRightExit, hasTopExit, hasBottomExit, solidCoords) {
    const grid = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      const line = [];
      for (let col = 0; col < GRID_COLS; col++) {
        const isPassageRow = row >= 4 && row <= 6;
        const isPassageCol = col >= 7 && col <= 9;

        if (col === 0) {
          if (hasLeftExit && isPassageRow) line.push(TILE_TYPE.PASSAGE_LEFT);
          else if (hasLeftExit && (row === 3 || row === 7)) line.push(TILE_TYPE.WALL);
          else line.push(TILE_TYPE.VOID);
        } else if (col === GRID_COLS - 1) {
          if (hasRightExit && isPassageRow) line.push(TILE_TYPE.PASSAGE_RIGHT);
          else if (hasRightExit && (row === 3 || row === 7)) line.push(TILE_TYPE.WALL);
          else line.push(TILE_TYPE.VOID);
        } else if (row === 0) {
          if (hasTopExit && isPassageCol) line.push(TILE_TYPE.PASSAGE_UP);
          else line.push(TILE_TYPE.WALL);
        } else if (row === GRID_ROWS - 1) {
          if (hasBottomExit && isPassageCol) line.push(TILE_TYPE.PASSAGE_DOWN);
          else line.push(TILE_TYPE.WALL);
        } else if (col === 1) {
          line.push(hasLeftExit && isPassageRow ? TILE_TYPE.FLOOR : TILE_TYPE.WALL);
        } else if (col === GRID_COLS - 2) {
          line.push(hasRightExit && isPassageRow ? TILE_TYPE.FLOOR : TILE_TYPE.WALL);
        } else if (row === 1 && hasTopExit && isPassageCol) {
          line.push(TILE_TYPE.FLOOR);
        } else if (row === GRID_ROWS - 2 && hasBottomExit && isPassageCol) {
          line.push(TILE_TYPE.FLOOR);
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
      hasTopExit: true,
      hasBottomExit: false,
      exits: {
        left: { targetRoom: 'posts', spawnCol: 15 },
        right: { targetRoom: 'ideas', spawnCol: 1 },
        up: { targetRoom: 'cinema', spawnRow: 9 },
        down: null
      },
      rugBounds: { minCol: 6, maxCol: 10, minRow: 3, maxRow: 7 },
      layout: createRoomLayout(true, true, true, false, [
        { col: 12, row: 5 }, // Posição de Erich Moura (NPC)
        { col: 12, row: 4 }, // Posição de Anna Padilha Moura (NPC)
        { col: 4, row: 3 },  // Mesa interativa com livro aberto (metade esquerda)
        { col: 5, row: 3 }   // Mesa interativa com livro aberto (metade direita)
      ]),
      props: [],
      animatedBraziers: [],
      interaction: {
        id: 'central-bio',
        triggerArea: { minCol: 4, maxCol: 5, minRow: 3, maxRow: 4 },
        floorHighlightTiles: [
          { col: 4, row: 4 },
          { col: 5, row: 4 }
        ],
        focusOutlineTiles: [
          { col: 4, row: 3 },
          { col: 5, row: 3 }
        ],
        clickTargetTiles: [
          { col: 4, row: 3 },
          { col: 5, row: 3 },
          { col: 4, row: 4 },
          { col: 5, row: 4 }
        ],
        landingCandidates: [
          { col: 4, row: 4 },
          { col: 5, row: 4 }
        ]
      }
    },

    posts: {
      id: 'posts',
      hasLeftExit: false,
      hasRightExit: true,
      hasTopExit: false,
      hasBottomExit: false,
      exits: {
        left: null,
        right: { targetRoom: 'central', spawnCol: 1 },
        up: null,
        down: null
      },
      rugBounds: { minCol: 3, maxCol: 13, minRow: 3, maxRow: 7 },
      layout: createRoomLayout(false, true, false, false, [
        { col: 2, row: 4 }, // Cabeçote amplificador valvulado
        { col: 2, row: 5 }, // Gabinete de autofalantes 4x12
        { col: 3, row: 4 }, // Guitarra elétrica no pedestal
        { col: 3, row: 6 }, // Sintetizador / Teclado no suporte X
        { col: 5, row: 4 }, // Microfone de estúdio
        { col: 8, row: 4 }, // Monitor de áudio estúdio esquerdo
        { col: 9, row: 4 }, // Mesa de som profissional (metade esquerda)
        { col: 10, row: 4 }, // Mesa de som profissional (metade direita)
        { col: 11, row: 4 }, // Monitor de áudio estúdio direito
        { col: 4, row: 5 }  // Posição de Erich Moura (NPC)
      ]),
      props: [],
      animatedBraziers: [],
      interaction: {
        id: 'posts-totem',
        triggerArea: { minCol: 9, maxCol: 10, minRow: 4, maxRow: 5 },
        floorHighlightTiles: [
          { col: 9, row: 5 },
          { col: 10, row: 5 }
        ],
        focusOutlineTiles: [
          { col: 9, row: 4 },
          { col: 10, row: 4 }
        ],
        clickTargetTiles: [
          { col: 8, row: 4 },
          { col: 9, row: 4 },
          { col: 10, row: 4 },
          { col: 11, row: 4 },
          { col: 9, row: 5 },
          { col: 10, row: 5 }
        ],
        landingCandidates: [
          { col: 9, row: 5 },
          { col: 10, row: 5 }
        ]
      }
    },

    ideas: {
      id: 'ideas',
      hasLeftExit: true,
      hasRightExit: false,
      hasTopExit: false,
      hasBottomExit: false,
      exits: {
        left: { targetRoom: 'central', spawnCol: 15 },
        right: null,
        up: null,
        down: null
      },
      rugBounds: { minCol: 5, maxCol: 12, minRow: 3, maxRow: 7 },
      layout: createRoomLayout(true, false, false, false, [
        // Parede superior: Estantes densas de livros (Grande Biblioteca)
        { col: 2, row: 1 }, { col: 2, row: 2 },
        { col: 3, row: 1 }, { col: 3, row: 2 },
        { col: 4, row: 1 }, { col: 4, row: 2 },
        { col: 5, row: 1 }, { col: 5, row: 2 },
        { col: 8, row: 1 }, { col: 8, row: 2 },
        { col: 9, row: 1 }, { col: 9, row: 2 },
        { col: 10, row: 1 }, { col: 10, row: 2 },
        { col: 11, row: 1 }, { col: 11, row: 2 },
        { col: 13, row: 1 }, { col: 13, row: 2 },
        { col: 14, row: 1 }, { col: 14, row: 2 },
        // Parede direita: Estante vertical alta
        { col: 15, row: 4 }, { col: 15, row: 5 }, { col: 15, row: 6 }, { col: 15, row: 7 },
        // Escrivaninha de estudo e anotações
        { col: 6, row: 5 },
        { col: 7, row: 5 },
        // Posição de Erich Moura (NPC)
        { col: 11, row: 5 }
      ]),
      props: [
        // Banqueta de estudo atrás da escrivaninha (caminhável)
        { sheet: 'props', sx: 1, sy: 3, col: 6, row: 4, fallback: 'stool' },
        // Escrivaninha de acesso aos Ensaios / Ideias
        { sheet: 'props', sx: 10, sy: 0, col: 6, row: 5, fallback: 'deskLeft' },
        { sheet: 'props', sx: 11, sy: 0, col: 7, row: 5, fallback: 'deskRight', deskManuscript: true }
      ],
      animatedBraziers: [],
      interaction: {
        id: 'ideas-desk',
        triggerArea: { minCol: 6, maxCol: 7, minRow: 5, maxRow: 6 },
        floorHighlightTiles: [
          { col: 6, row: 6 },
          { col: 7, row: 6 }
        ],
        focusOutlineTiles: [
          { col: 6, row: 5 },
          { col: 7, row: 5 }
        ],
        clickTargetTiles: [
          { col: 6, row: 5 },
          { col: 7, row: 5 },
          { col: 6, row: 6 },
          { col: 7, row: 6 }
        ],
        landingCandidates: [
          { col: 6, row: 6 },
          { col: 7, row: 6 }
        ]
      }
    },

    cinema: {
      id: 'cinema',
      hasLeftExit: false,
      hasRightExit: false,
      hasTopExit: false,
      hasBottomExit: true,
      exits: {
        left: null,
        right: null,
        up: null,
        down: { targetRoom: 'central', spawnRow: 1 }
      },
      rugBounds: { minCol: 7, maxCol: 9, minRow: 4, maxRow: 9 },
      layout: createRoomLayout(false, false, false, true, [
        // Tela de cinema (3 linhas x 7 colunas)
        { col: 5, row: 1 }, { col: 6, row: 1 }, { col: 7, row: 1 }, { col: 8, row: 1 }, { col: 9, row: 1 }, { col: 10, row: 1 }, { col: 11, row: 1 },
        { col: 5, row: 2 }, { col: 6, row: 2 }, { col: 7, row: 2 }, { col: 8, row: 2 }, { col: 9, row: 2 }, { col: 10, row: 2 }, { col: 11, row: 2 },
        { col: 5, row: 3 }, { col: 6, row: 3 }, { col: 7, row: 3 }, { col: 8, row: 3 }, { col: 9, row: 3 }, { col: 10, row: 3 }, { col: 11, row: 3 },
        // Poltronas de cinema - bloco esquerdo
        { col: 3, row: 5 }, { col: 4, row: 5 }, { col: 5, row: 5 },
        { col: 3, row: 6 }, { col: 4, row: 6 }, { col: 5, row: 6 },
        { col: 3, row: 7 }, { col: 4, row: 7 }, { col: 5, row: 7 },
        { col: 3, row: 8 }, { col: 4, row: 8 }, { col: 5, row: 8 },
        // Poltronas de cinema - bloco direito
        { col: 11, row: 5 }, { col: 12, row: 5 }, { col: 13, row: 5 },
        { col: 11, row: 6 }, { col: 12, row: 6 }, { col: 13, row: 6 },
        { col: 11, row: 7 }, { col: 12, row: 7 }, { col: 13, row: 7 },
        { col: 11, row: 8 }, { col: 12, row: 8 }, { col: 13, row: 8 },
        // Câmera 35mm sobre tripé (col: 2, row: 3)
        { col: 2, row: 3 },
        // Cadeira de Diretor de Cinema (col: 2, row: 4)
        { col: 2, row: 4 },
        // Posição de Erich Moura (NPC)
        { col: 3, row: 4 }
      ]),
      props: [],
      animatedBraziers: [
        { col: 14, row: 3 }
      ],
      interaction: {
        id: 'cinema-screen',
        triggerArea: { minCol: 7, maxCol: 9, minRow: 4, maxRow: 4 },
        floorHighlightTiles: [{ col: 8, row: 4 }],
        focusOutlineTiles: [{ col: 8, row: 3 }],
        clickTargetTiles: [
          { col: 6, row: 3 },
          { col: 7, row: 3 },
          { col: 8, row: 3 },
          { col: 9, row: 3 },
          { col: 10, row: 3 },
          { col: 8, row: 4 }
        ],
        landingCandidates: [{ col: 8, row: 4 }]
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

  /* ==========================================================================
     3.1. Sprites Dedicados de Erich Moura (NPC com Cabelos Cheados, Polo Azul e Espada)
     ========================================================================== */
  const ERICH_COLOR_MAP = {
    '#': '#1b1b1b', // Contorno e sapatos
    'H': '#241e1c', // Cabelos cacheados escuros (Timothée Chalamet)
    'h': '#4e433f', // Ondas e mechas do hairflow cacheado
    '.': '#fafafa', // Pele clara / reflexos
    ':': '#d5d5d5', // Sombras de pele
    'B': '#152542', // Polo azul escura oficial (corpo)
    'b': '#253e6b', // Gola polo e carcela azul escura
    'S': '#fafafa', // Lâmina e guarda de metal da espada
    's': '#4b4b4b', // Bainha de couro da espada nas costas
    '+': '#353535'  // Calça cinza-chumbo
  };

  const ERICH_MATRICES = {
    down: [
      [
        '   hhhhhh   S   ',
        '  hHHHHHHh  s   ',
        ' hHHhHHhHHhs    ',
        ' hH.h..h.Hh     ',
        ' hH..::..Hh s   ',
        '  #::::::#  s   ',
        '  #bb..bb#  s   ',
        ' #BBbbbbBB# s   ',
        ' #BBBBBBBB# s   ',
        ' #.BBBBBB.# s   ',
        '  #BBBBBB#  s   ',
        '  #++++++#      ',
        '  #++##++#      ',
        '  #++##++#      ',
        '  ###  ###      ',
        '  ##    ##      '
      ],
      [
        '                ',
        '   hhhhhh   S   ',
        '  hHHHHHHh  s   ',
        ' hHHhHHhHHhs    ',
        ' hH.h..h.Hh     ',
        ' hH..::..Hh s   ',
        '  #::::::#  s   ',
        '  #bb..bb#  s   ',
        ' #BBbbbbBB# s   ',
        ' #BBBBBBBB# s   ',
        ' #.BBBBBB.# s   ',
        '  #BBBBBB#  s   ',
        '  #++++++#      ',
        '  #++##++#      ',
        '  ###  ###      ',
        '  ##    ##      '
      ]
    ],
    up: [
      [
        '   hhhhhh   S   ',
        '  hHHHHHHh Ss   ',
        ' hHHHHHHHHhss   ',
        ' hHHhHHhHHhs    ',
        '  hHHHHHHh s    ',
        '  #bbbbbb# s    ',
        ' #BBbSSbBB#     ',
        ' #BBBsSbBB#     ',
        ' #BBBbssBB#     ',
        ' #.BBBBBB.#     ',
        '  #BBBBBB#s     ',
        '  #++++++#      ',
        '  #++##++#      ',
        '  #++##++#      ',
        '  ###  ###      ',
        '  ##    ##      '
      ]
    ],
    left: [
      [
        '    hhhhhh  S   ',
        '   hHHHHHHhs    ',
        '  hHHhHHhHHs    ',
        '  hH.h..h.Hs    ',
        '  hH..::..Hs    ',
        '   #::::::#s    ',
        '   #bbbb..#s    ',
        '  #BBbbbb# s    ',
        '  #BBBBBB# s    ',
        '  #BBBBBB.#s    ',
        '   #BBBBB# s    ',
        '   #+++++#      ',
        '   #++#++#      ',
        '   #++#++#      ',
        '   ### ###      ',
        '   ##   ##      '
      ]
    ]
  };

  const compiledErichSprites = {
    down: [],
    up: [],
    left: [],
    right: []
  };

  /* ==========================================================================
     3.2. Sprites Dedicados de Anna Padilha Moura (NPC no Hall de Entrada)
     ========================================================================== */
  const ANNA_COLOR_MAP = {
    '#': '#1b1b1b', // Contorno e sapatos
    'H': '#241a15', // Cabelos longos castanhos escuros
    'h': '#4a3528', // Mechas e ondas de cabelo castanho
    '~': '#72523e', // Brilho suave nos cabelos
    '.': '#fafafa', // Pele clara / reflexos
    ':': '#d5d5d5', // Sombras de pele
    'E': '#2d4438', // Vestido / sobretudo verde-escuro elegante
    'e': '#446654', // Gola / detalhes do vestido
    'W': '#fafafa', // Cachecol / detalhe claro
    'w': '#b9b9b9', // Sombra do detalhe claro
    '+': '#2b2a2a'  // Meia-calça / botas escuras
  };

  const ANNA_MATRICES = {
    down: [
      [
        '    hhhhhh      ',
        '   hHHHHHHh     ',
        '  hHH~HH~HHh    ',
        '  hH.h..h.Hh    ',
        '  hH..::..Hh    ',
        '  #H::::::H#    ',
        '  #hWeeeWWh#    ',
        ' #hEEEEEEEEh#   ',
        ' #hEEEEEEEEh#   ',
        ' #.EEEEEEEE.#   ',
        '  #EEEEEEEE#    ',
        '  #EEEEEEEE#    ',
        '   #++++++#     ',
        '   #++##++#     ',
        '   ###  ###     ',
        '   ##    ##     '
      ],
      [
        '                ',
        '    hhhhhh      ',
        '   hHHHHHHh     ',
        '  hHH~HH~HHh    ',
        '  hH.h..h.Hh    ',
        '  hH..::..Hh    ',
        '  #H::::::H#    ',
        '  #hWeeeWWh#    ',
        ' #hEEEEEEEEh#   ',
        ' #hEEEEEEEEh#   ',
        ' #.EEEEEEEE.#   ',
        '  #EEEEEEEE#    ',
        '  #EEEEEEEE#    ',
        '   #++++++#     ',
        '   ###  ###     ',
        '   ##    ##     '
      ]
    ],
    left: [
      [
        '    hhhhhh      ',
        '   hHHHHHHh     ',
        '  hHH~HH~HHh    ',
        '  hH.h..h.Hh    ',
        '  hH..::..Hh    ',
        '  hH::::::#h    ',
        '   h#WWee#h     ',
        '   #EEEEEE#h    ',
        '  #EEEEEEEE#h   ',
        '  #EEEEEEEE#h   ',
        '   #EEEEEE#h    ',
        '   #EEEEEE#     ',
        '   #++++++#     ',
        '   #++##++#     ',
        '   ###  ###     ',
        '   ##    ##     '
      ],
      [
        '                ',
        '    hhhhhh      ',
        '   hHHHHHHh     ',
        '  hHH~HH~HHh    ',
        '  hH.h..h.Hh    ',
        '  hH..::..Hh    ',
        '  hH::::::#h    ',
        '   h#WWee#h     ',
        '   #EEEEEE#h    ',
        '  #EEEEEEEE#h   ',
        '  #EEEEEEEE#h   ',
        '   #EEEEEE#h    ',
        '   #EEEEEE#     ',
        '   #++++++#     ',
        '   ###  ###     ',
        '   ##    ##     '
      ]
    ]
  };

  const compiledAnnaSprites = {
    down: [],
    left: [],
    right: []
  };

  const ANNA_NPC = {
    col: 12,
    row: 4,
    facing: 'left',
    name: 'Anna Padilha Moura',
    subtitle: 'esposa de Erich',
    role: 'ESPOSA DE ERICH',
    message:
      'Espero que você goste tanto quanto eu de passear pela mente do Erich. Você vai me encontrar em muitos cômodos por aí...',
    actionLabel: null,
    actionModal: null
  };

  const ERICH_NPCS = {
    central: {
      col: 12,
      row: 5,
      facing: 'left',
      role: 'DIRETOR & CRIADOR',
      message:
        'Olá! Seja bem-vindo ao meu mundo. Aqui você poderá explorar o que já fiz em minha vida e o que penso sobre as coisas: à esquerda a Sala Musical, à direita a Sala das Ideias e acima a Sala de Cinema. Sinta-se em casa!',
      actionLabel: null,
      actionModal: null
    },
    posts: {
      col: 4,
      row: 5,
      facing: 'right',
      role: 'PRODUÇÃO MUSICAL',
      message:
        'Parece besteira, mas quando ouvi a música "Insertion" de Crysis 2, feita pelo Hans Zimmer, eu percebi que amava trilha sonora, e também gostaria muito de aprender guitarra...',
      actionLabel: 'Ver Produções Musicais',
      actionModal: 'modalPosts'
    },
    ideas: {
      col: 11,
      row: 5,
      facing: 'left',
      role: 'ESCRITA & ENSAIOS',
      message:
        'Eu sempre fui do tipo de pessoa de pensar muito sobre por que as coisas são como são, e aqui eu compartilho esses pensamentos e aprendizados da minha vida até agora.',
      actionLabel: 'Ler Ensaios & Artigos',
      actionModal: 'modalIdeas'
    },
    cinema: {
      col: 3,
      row: 4,
      facing: 'right',
      role: 'CINEMA & DIREÇÃO',
      message:
        'Eu lembro quando era criança de pegar dois bonequinhos que tinha, colocá-los em uma posição na minha sala de estar e começar a gravar com a câmera falas entre eles... até hoje faço isso, mas não mais sozinho!',
      actionLabel: 'Ver Filmes & Direção',
      actionModal: 'modalCinema'
    }
  };

  const roomBuffers = {};

  const initialRoomId = requestedOpen === 'ideas' ? 'ideas' : (requestedOpen === 'posts' ? 'posts' : 'central');
  const initialPlayerPos = requestedOpen === 'ideas'
    ? { col: 6, row: 6, facing: 'up', activeInteractionId: 'ideas-desk' }
    : (requestedOpen === 'posts'
      ? { col: 9, row: 5, facing: 'up', activeInteractionId: 'posts-totem' }
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
  function createSpriteFromMatrix(matrix, flipHorizontal, colorMap) {
    const cmap = colorMap || PIXEL_COLOR_MAP;
    const c = document.createElement('canvas');
    c.width = TILE_SIZE;
    c.height = TILE_SIZE;
    const cCtx = c.getContext('2d');

    for (let y = 0; y < TILE_SIZE; y++) {
      const rowStr = matrix[y] || '';
      for (let x = 0; x < TILE_SIZE; x++) {
        const ch = rowStr[x];
        const color = cmap[ch];
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

    // Compilação dos sprites dedicados de Erich Moura (NPC)
    compiledErichSprites.down = ERICH_MATRICES.down.map(function (m) {
      return createSpriteFromMatrix(m, false, ERICH_COLOR_MAP);
    });
    compiledErichSprites.up = ERICH_MATRICES.up.map(function (m) {
      return createSpriteFromMatrix(m, false, ERICH_COLOR_MAP);
    });
    compiledErichSprites.left = ERICH_MATRICES.left.map(function (m) {
      return createSpriteFromMatrix(m, false, ERICH_COLOR_MAP);
    });
    compiledErichSprites.right = ERICH_MATRICES.left.map(function (m) {
      return createSpriteFromMatrix(m, true, ERICH_COLOR_MAP);
    });

    // Compilação dos sprites dedicados de Anna Padilha Moura (NPC)
    compiledAnnaSprites.down = ANNA_MATRICES.down.map(function (m) {
      return createSpriteFromMatrix(m, false, ANNA_COLOR_MAP);
    });
    compiledAnnaSprites.left = ANNA_MATRICES.left.map(function (m) {
      return createSpriteFromMatrix(m, false, ANNA_COLOR_MAP);
    });
    compiledAnnaSprites.right = ANNA_MATRICES.left.map(function (m) {
      return createSpriteFromMatrix(m, true, ANNA_COLOR_MAP);
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
    const isPassage =
      type === TILE_TYPE.FLOOR ||
      type === TILE_TYPE.PASSAGE_LEFT ||
      type === TILE_TYPE.PASSAGE_RIGHT ||
      type === TILE_TYPE.PASSAGE_UP ||
      type === TILE_TYPE.PASSAGE_DOWN;

    if (!isPassage) return false;

    // NPCs possuem colisão sólida
    const npc = ERICH_NPCS[room.id];
    if (npc && npc.col === col && npc.row === row) {
      return false;
    }
    if (room.id === 'central' && ANNA_NPC.col === col && ANNA_NPC.row === row) {
      return false;
    }

    return true;
  }

  function getWallSpriteCoord(room, col, row) {
    // Quinas externas principais da sala
    if (col === 1 && row === 0) return [1, 3];   // Top-Left
    if (col === 15 && row === 0) return [0, 0];  // Top-Right
    if (col === 1 && row === 10) return [0, 2];  // Bottom-Left
    if (col === 15 && row === 10) return [3, 3]; // Bottom-Right

    // Quinas da passagem aberta Esquerda
    if (room.hasLeftExit) {
      if (col === 1 && row === 3) return [1, 1];
      if (col === 1 && row === 7) return [2, 2];
    }

    // Quinas da passagem aberta Direita
    if (room.hasRightExit) {
      if (col === 15 && row === 3) return [2, 0];
      if (col === 15 && row === 7) return [3, 1];
    }

    // Quinas da passagem aberta Superior (Sala de Cinema)
    if (room.hasTopExit) {
      if (col === 6 && row === 0) return [0, 0];
      if (col === 10 && row === 0) return [1, 3];
    }

    // Quinas da passagem aberta Inferior
    if (room.hasBottomExit) {
      if (col === 6 && row === 10) return [3, 3];
      if (col === 10 && row === 10) return [0, 2];
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
    } else if (type === TILE_TYPE.PASSAGE_UP) {
      drawDitherRect(ctx, dx, dy, TILE_SIZE, 3, PALETTE.MONO_DARK, 0.5);
      drawDitherRect(ctx, dx, dy + 3, TILE_SIZE, 4, PALETTE.SURFACE, 0.5);
    } else if (type === TILE_TYPE.PASSAGE_DOWN) {
      drawDitherRect(ctx, dx, dy + TILE_SIZE - 3, TILE_SIZE, 3, PALETTE.MONO_DARK, 0.5);
      drawDitherRect(ctx, dx, dy + TILE_SIZE - 7, TILE_SIZE, 4, PALETTE.SURFACE, 0.5);
    }
  }

  function drawSingleCinemaSeat(ctx, dx, dy) {
    // Sombra da poltrona de cinema no piso
    drawDitherRect(ctx, dx + 1, dy + 13, 14, 3, PALETTE.MONO_DARK, 0.5);

    // Estrutura e encosto da poltrona (veludo retrô monocromático)
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(dx + 2, dy + 2, 12, 12);

    ctx.fillStyle = PALETTE.MONO_DARK;
    ctx.fillRect(dx + 3, dy + 3, 10, 6);

    ctx.fillStyle = PALETTE.TEXT_SECONDARY;
    ctx.fillRect(dx + 4, dy + 3, 8, 2);

    // Braços de apoio da poltrona
    ctx.fillStyle = PALETTE.SURFACE;
    ctx.fillRect(dx + 2, dy + 7, 2, 6);
    ctx.fillRect(dx + 12, dy + 7, 2, 6);

    // Assento almofadado
    ctx.fillStyle = PALETTE.TEXT_PRIMARY;
    ctx.fillRect(dx + 4, dy + 9, 8, 4);
    drawDitherRect(ctx, dx + 4, dy + 9, 8, 4, PALETTE.SURFACE, 0.5);
  }

  function drawCinemaDecorations(ctx) {
    // 1. Tela de Cinema (Tela de projeção em rows 1 a 3, cols 5 a 11)
    const sx = 5 * TILE_SIZE;
    const sy = 1 * TILE_SIZE;
    const sw = 7 * TILE_SIZE;  // 112px
    const sh = 3 * TILE_SIZE;  // 48px

    // Moldura externa da tela
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(sx, sy, sw, sh);

    ctx.fillStyle = PALETTE.MONO_DARK;
    ctx.fillRect(sx + 2, sy + 2, sw - 4, sh - 4);

    // Superfície de projeção iluminada
    ctx.fillStyle = PALETTE.TEXT_PRIMARY;
    ctx.fillRect(sx + 4, sy + 4, sw - 8, sh - 8);

    // Dithering suave de película
    drawDitherRect(ctx, sx + 4, sy + 4, sw - 8, sh - 8, PALETTE.TEXT_SECONDARY, 0.25);

    // Ícone de Play / Rolo de Filme central
    const midX = sx + Math.floor(sw / 2);
    const midY = sy + Math.floor(sh / 2);

    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(midX - 10, midY - 8, 20, 16);
    ctx.fillStyle = PALETTE.TEXT_PRIMARY;
    ctx.fillRect(midX - 8, midY - 6, 16, 12);

    // Símbolo clássico de Play ▶
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(midX - 3, midY - 4, 2, 8);
    ctx.fillRect(midX - 1, midY - 3, 2, 6);
    ctx.fillRect(midX + 1, midY - 2, 2, 4);
    ctx.fillRect(midX + 3, midY - 1, 2, 2);

    // Cortinas laterais do cinema
    ctx.fillStyle = PALETTE.MONO_DARK;
    ctx.fillRect(sx, sy, 4, sh);
    ctx.fillRect(sx + sw - 4, sy, 4, sh);

    // 2. Fileiras de Poltronas de Cinema (Rows 5 a 8, Cols 3..5 e 11..13)
    const seatCols = [3, 4, 5, 11, 12, 13];
    const seatRows = [5, 6, 7, 8];

    seatRows.forEach(function (r) {
      seatCols.forEach(function (c) {
        drawSingleCinemaSeat(ctx, c * TILE_SIZE, r * TILE_SIZE);
      });
    });

    // 3. Estação do Diretor de Cinema (col: 2, rows: 3 e 4)
    // Câmera 35mm clássica com rolos duplos sobre tripé de madeira em col: 2, row: 3
    const camX = 2 * TILE_SIZE;
    const camY = 3 * TILE_SIZE;
    // Rolos duplos de filme no topo
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(camX + 3, camY + 1, 4, 4);
    ctx.fillRect(camX + 8, camY + 1, 4, 4);
    ctx.fillStyle = PALETTE.TEXT_SECONDARY;
    ctx.fillRect(camX + 4, camY + 2, 2, 2);
    ctx.fillRect(camX + 9, camY + 2, 2, 2);
    // Corpo metálico da câmera
    ctx.fillStyle = PALETTE.MONO_DARK;
    ctx.fillRect(camX + 4, camY + 5, 8, 5);
    // Lente e matte box apontada para a tela
    ctx.fillStyle = PALETTE.TEXT_PRIMARY;
    ctx.fillRect(camX + 12, camY + 6, 2, 3);
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(camX + 13, camY + 5, 1, 5);
    // Manivela lateral
    ctx.fillStyle = PALETTE.SURFACE;
    ctx.fillRect(camX + 3, camY + 7, 2, 2);
    // Pernas do tripé de madeira
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(camX + 5, camY + 10, 2, 6);
    ctx.fillRect(camX + 7, camY + 10, 2, 6);
    ctx.fillRect(camX + 9, camY + 10, 2, 6);

    // Cadeira dobrável de diretor ("DIRECTOR") em col: 2, row: 4
    const chX = 2 * TILE_SIZE;
    const chY = 4 * TILE_SIZE;
    // Pernas cruzadas de madeira
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(chX + 4, chY + 7, 2, 8);
    ctx.fillRect(chX + 10, chY + 7, 2, 8);
    ctx.fillRect(chX + 5, chY + 9, 6, 2);
    // Assento de lona
    ctx.fillStyle = PALETTE.SURFACE;
    ctx.fillRect(chX + 3, chY + 6, 10, 2);
    // Encosto com faixa
    ctx.fillStyle = PALETTE.TEXT_SECONDARY;
    ctx.fillRect(chX + 3, chY + 2, 10, 3);
    ctx.fillStyle = PALETTE.MONO_DARK;
    ctx.fillRect(chX + 4, chY + 3, 8, 1);
  }

  function drawStudioEquipment(ctx) {
    // 1. Painéis acústicos difusores na parede superior (Rows 1-2, cols 2..5 e 12..14)
    const foamCols = [2, 3, 4, 5, 12, 13, 14];
    foamCols.forEach(function (fc) {
      const fx = fc * TILE_SIZE;
      const fy = 1 * TILE_SIZE;
      ctx.fillStyle = PALETTE.BG_PRIMARY;
      ctx.fillRect(fx + 2, fy + 2, 12, 28);
      ctx.fillStyle = PALETTE.MONO_DARK;
      ctx.fillRect(fx + 3, fy + 3, 10, 26);
      for (let py = fy + 4; py < fy + 28; py += 4) {
        for (let px = fx + 4; px < fx + 12; px += 4) {
          ctx.fillStyle = ((px + py) % 8 === 0) ? PALETTE.SURFACE : PALETTE.BG_PRIMARY;
          ctx.fillRect(px, py, 2, 2);
        }
      }
    });

    // 2. Amplificador valvulado e Gabinete 4x12 (col: 2, rows: 4 e 5)
    const ampX = 2 * TILE_SIZE;
    const ampY = 4 * TILE_SIZE;
    // Cabeçote valvulado (Head amp) em row 4
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(ampX + 1, ampY + 4, 14, 12);
    ctx.fillStyle = PALETTE.MONO_DARK;
    ctx.fillRect(ampX + 2, ampY + 5, 12, 10);
    // Painel frontal
    ctx.fillStyle = PALETTE.TEXT_SECONDARY;
    ctx.fillRect(ampX + 3, ampY + 6, 10, 4);
    // Knobs de controle
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(ampX + 4, ampY + 7, 1, 2);
    ctx.fillRect(ampX + 6, ampY + 7, 1, 2);
    ctx.fillRect(ampX + 8, ampY + 7, 1, 2);
    ctx.fillRect(ampX + 10, ampY + 7, 1, 2);
    // Luz piloto
    ctx.fillStyle = PALETTE.ACCENT;
    ctx.fillRect(ampX + 11, ampY + 11, 2, 2);

    // Gabinete de autofalantes 4x12 em row 5
    const cabY = 5 * TILE_SIZE;
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(ampX + 1, cabY, 14, 15);
    ctx.fillStyle = PALETTE.SURFACE;
    ctx.fillRect(ampX + 1, cabY, 2, 2);
    ctx.fillRect(ampX + 13, cabY, 2, 2);
    ctx.fillRect(ampX + 1, cabY + 13, 2, 2);
    ctx.fillRect(ampX + 13, cabY + 13, 2, 2);
    ctx.fillStyle = PALETTE.MONO_DARK;
    ctx.fillRect(ampX + 3, cabY + 2, 10, 11);
    drawDitherRect(ctx, ampX + 3, cabY + 2, 10, 11, PALETTE.TEXT_SECONDARY, 0.4);

    // 3. Guitarra elétrica no pedestal (col: 3, row: 4)
    const gX = 3 * TILE_SIZE;
    const gY = 4 * TILE_SIZE;
    // Pedestal de chão
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(gX + 4, gY + 13, 8, 3);
    ctx.fillRect(gX + 7, gY + 6, 2, 8);
    // Corpo da Guitarra
    ctx.fillStyle = PALETTE.TEXT_PRIMARY;
    ctx.fillRect(gX + 5, gY + 8, 6, 6);
    ctx.fillRect(gX + 4, gY + 9, 2, 4);
    ctx.fillRect(gX + 10, gY + 10, 2, 3);
    // Escudo e captadores
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(gX + 6, gY + 9, 3, 4);
    ctx.fillStyle = PALETTE.TEXT_SECONDARY;
    ctx.fillRect(gX + 7, gY + 10, 2, 1);
    ctx.fillRect(gX + 7, gY + 12, 2, 1);
    // Braço e escala
    ctx.fillStyle = PALETTE.SURFACE;
    ctx.fillRect(gX + 7, gY + 2, 2, 6);
    // Headstock com tarraxas
    ctx.fillStyle = PALETTE.TEXT_PRIMARY;
    ctx.fillRect(gX + 6, gY, 3, 3);
    ctx.fillStyle = PALETTE.MONO_DARK;
    ctx.fillRect(gX + 5, gY, 1, 2);

    // 4. Sintetizador / Teclado no suporte X (col: 3, row: 6)
    const kX = 3 * TILE_SIZE;
    const kY = 6 * TILE_SIZE;
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(kX + 2, kY + 6, 12, 1);
    ctx.fillRect(kX + 4, kY + 7, 2, 7);
    ctx.fillRect(kX + 10, kY + 7, 2, 7);
    ctx.fillStyle = PALETTE.MONO_DARK;
    ctx.fillRect(kX + 1, kY + 2, 14, 5);
    ctx.fillStyle = PALETTE.SURFACE;
    ctx.fillRect(kX + 2, kY + 1, 12, 2);
    ctx.fillStyle = PALETTE.ACCENT;
    ctx.fillRect(kX + 3, kY + 2, 3, 1);
    // Teclas
    ctx.fillStyle = PALETTE.TEXT_PRIMARY;
    ctx.fillRect(kX + 2, kY + 4, 12, 3);
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(kX + 3, kY + 4, 1, 2);
    ctx.fillRect(kX + 5, kY + 4, 1, 2);
    ctx.fillRect(kX + 8, kY + 4, 1, 2);
    ctx.fillRect(kX + 10, kY + 4, 1, 2);
    ctx.fillRect(kX + 12, kY + 4, 1, 2);

    // 5. Microfone de Estúdio com Pop Filter (col: 5, row: 4)
    const mX = 5 * TILE_SIZE;
    const mY = 4 * TILE_SIZE;
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(mX + 5, mY + 14, 6, 2);
    ctx.fillStyle = PALETTE.MONO_DARK;
    ctx.fillRect(mX + 7, mY + 3, 2, 11);
    ctx.fillStyle = PALETTE.SURFACE;
    ctx.fillRect(mX + 6, mY + 3, 4, 3);
    ctx.fillStyle = PALETTE.TEXT_PRIMARY;
    ctx.fillRect(mX + 7, mY + 1, 2, 4);
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(mX + 10, mY + 1, 1, 4);
    ctx.fillStyle = PALETTE.MONO_DARK;
    ctx.fillRect(mX + 8, mY + 3, 2, 1);

    // 6. Monitores de Áudio Profissionais (col: 8 e 11, row: 4)
    [8, 11].forEach(function (monCol) {
      const sx = monCol * TILE_SIZE;
      const sy = 4 * TILE_SIZE;
      ctx.fillStyle = PALETTE.BG_PRIMARY;
      ctx.fillRect(sx + 6, sy + 11, 4, 5);
      ctx.fillStyle = PALETTE.BG_PRIMARY;
      ctx.fillRect(sx + 3, sy + 1, 10, 11);
      ctx.fillStyle = PALETTE.MONO_DARK;
      ctx.fillRect(sx + 4, sy + 2, 8, 9);
      ctx.fillStyle = PALETTE.TEXT_PRIMARY;
      ctx.fillRect(sx + 7, sy + 3, 2, 2);
      ctx.fillStyle = PALETTE.TEXT_SECONDARY;
      ctx.fillRect(sx + 5, sy + 6, 6, 4);
      ctx.fillStyle = PALETTE.SURFACE;
      ctx.fillRect(sx + 6, sy + 7, 4, 2);
      ctx.fillStyle = PALETTE.BG_PRIMARY;
      ctx.fillRect(sx + 7, sy + 7, 2, 2);
    });

    // 7. Grande Mesa de Som / Console de Mixagem (cols 9 e 10, row: 4)
    const dX = 9 * TILE_SIZE;
    const dY = 4 * TILE_SIZE;
    const dW = 2 * TILE_SIZE;
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(dX, dY + 1, dW, 15);
    ctx.fillStyle = PALETTE.MONO_DARK;
    ctx.fillRect(dX + 1, dY + 2, dW - 2, 13);
    // Painel superior com VU Meters
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(dX + 2, dY + 3, dW - 4, 4);
    ctx.fillStyle = PALETTE.ACCENT;
    ctx.fillRect(dX + 4, dY + 4, 8, 2);
    ctx.fillRect(dX + 14, dY + 4, 8, 2);
    ctx.fillStyle = PALETTE.TEXT_PRIMARY;
    ctx.fillRect(dX + 24, dY + 4, 4, 2);
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(dX + 8, dY + 4, 1, 2);
    ctx.fillRect(dX + 18, dY + 4, 1, 2);
    // Faders deslizantes
    ctx.fillStyle = PALETTE.SURFACE;
    ctx.fillRect(dX + 2, dY + 8, dW - 4, 6);
    for (let c = dX + 4; c < dX + dW - 4; c += 4) {
      ctx.fillStyle = PALETTE.BG_PRIMARY;
      ctx.fillRect(c, dY + 9, 1, 4);
      ctx.fillStyle = PALETTE.TEXT_PRIMARY;
      ctx.fillRect(c - 1, dY + 10, 3, 2);
    }
    // Fone de ouvido pendurado
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(dX + dW - 3, dY + 11, 2, 4);
    ctx.fillStyle = PALETTE.TEXT_SECONDARY;
    ctx.fillRect(dX + dW - 4, dY + 12, 2, 3);
  }

  function drawLibraryDecorations(ctx) {
    // 1. Estantes densas de livros na parede superior (Grande Biblioteca)
    const shelfGroups = [
      { startCol: 2, endCol: 5 },
      { startCol: 8, endCol: 11 },
      { startCol: 13, endCol: 14 }
    ];

    shelfGroups.forEach(function (group) {
      for (let c = group.startCol; c <= group.endCol; c++) {
        const sx = c * TILE_SIZE;
        const sy1 = 1 * TILE_SIZE;
        const sy2 = 2 * TILE_SIZE;

        ctx.fillStyle = PALETTE.BG_PRIMARY;
        ctx.fillRect(sx, sy1, TILE_SIZE, TILE_SIZE * 2);

        ctx.fillStyle = PALETTE.MONO_DARK;
        ctx.fillRect(sx + 1, sy1 + 1, TILE_SIZE - 2, TILE_SIZE * 2 - 2);

        ctx.fillStyle = PALETTE.SURFACE;
        ctx.fillRect(sx + 1, sy1 + 14, TILE_SIZE - 2, 2);
        ctx.fillRect(sx + 1, sy2 + 14, TILE_SIZE - 2, 2);

        drawBookshelfRow(ctx, sx + 2, sy1 + 3, TILE_SIZE - 4, 11, (c * 7) % 5);
        drawBookshelfRow(ctx, sx + 2, sy2 + 3, TILE_SIZE - 4, 11, (c * 11 + 3) % 5);
      }
    });

    // 2. Estante lateral direita alta (col: 15, rows: 4..7)
    for (let r = 4; r <= 7; r++) {
      const sx = 15 * TILE_SIZE;
      const sy = r * TILE_SIZE;
      ctx.fillStyle = PALETTE.BG_PRIMARY;
      ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = PALETTE.MONO_DARK;
      ctx.fillRect(sx + 1, sy + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      ctx.fillStyle = PALETTE.SURFACE;
      ctx.fillRect(sx + 1, sy + 14, TILE_SIZE - 2, 2);
      drawBookshelfRow(ctx, sx + 2, sy + 3, TILE_SIZE - 4, 11, (r * 13) % 5);
    }

    // 3. Pilha de livros no piso (col: 14, row: 3)
    const px = 14 * TILE_SIZE;
    const py = 3 * TILE_SIZE;
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(px + 3, py + 11, 10, 4);
    ctx.fillStyle = PALETTE.TEXT_SECONDARY;
    ctx.fillRect(px + 4, py + 12, 8, 2);
    ctx.fillStyle = PALETTE.MONO_DARK;
    ctx.fillRect(px + 4, py + 8, 9, 3);
    ctx.fillStyle = PALETTE.TEXT_PRIMARY;
    ctx.fillRect(px + 5, py + 9, 7, 2);
    ctx.fillStyle = PALETTE.SURFACE;
    ctx.fillRect(px + 5, py + 6, 7, 2);

    // 4. Cesto de pergaminhos antigos enrolados (col: 14, row: 4)
    const bx = 14 * TILE_SIZE;
    const by = 4 * TILE_SIZE;
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(bx + 4, by + 8, 8, 7);
    ctx.fillStyle = PALETTE.MONO_DARK;
    ctx.fillRect(bx + 5, by + 9, 6, 5);
    ctx.fillStyle = PALETTE.TEXT_PRIMARY;
    ctx.fillRect(bx + 5, by + 4, 2, 5);
    ctx.fillRect(bx + 8, by + 3, 2, 6);
    ctx.fillRect(bx + 10, by + 5, 2, 4);

    // 5. Candelabro com vela ao lado da escrivaninha (col: 5, row: 5)
    const lx = 5 * TILE_SIZE;
    const ly = 5 * TILE_SIZE;
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(lx + 6, ly + 12, 4, 3);
    ctx.fillStyle = PALETTE.MONO_DARK;
    ctx.fillRect(lx + 7, ly + 4, 2, 8);
    ctx.fillStyle = PALETTE.TEXT_PRIMARY;
    ctx.fillRect(lx + 7, ly + 2, 2, 3);
    ctx.fillStyle = PALETTE.ACCENT;
    ctx.fillRect(lx + 7, ly, 2, 2);
  }

  function drawBookshelfRow(ctx, x, y, width, height, seed) {
    let curX = x;
    const bookColors = [PALETTE.SURFACE, PALETTE.TEXT_SECONDARY, PALETTE.TEXT_PRIMARY, PALETTE.MONO_DARK];
    let idx = seed;

    while (curX < x + width) {
      const bookW = ((idx % 3) === 0) ? 3 : 2;
      const bookH = height - (idx % 4);
      const bColor = bookColors[idx % bookColors.length];
      const actualW = Math.min(bookW, (x + width) - curX);

      ctx.fillStyle = PALETTE.BG_PRIMARY;
      ctx.fillRect(curX, y + (height - bookH), actualW, bookH);
      ctx.fillStyle = bColor;
      ctx.fillRect(curX, y + (height - bookH) + 1, actualW, bookH - 1);

      if (bookH > 7 && (idx % 2 === 0)) {
        ctx.fillStyle = PALETTE.BG_PRIMARY;
        ctx.fillRect(curX, y + (height - bookH) + 3, actualW, 1);
      }

      curX += actualW;
      idx++;
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

  function drawCentralHallDecorations(ctx) {
    // Mesa de recepção com livro aberto de biografia ("Quem é Erich Moura?") em cols 4 e 5, row 3
    const tx = 4 * TILE_SIZE;
    const ty = 3 * TILE_SIZE;
    const tw = 2 * TILE_SIZE; // 32px

    // Estrutura de madeira da mesa
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(tx, ty + 2, tw, 14);

    // Tampo de madeira
    ctx.fillStyle = PALETTE.MONO_DARK;
    ctx.fillRect(tx + 1, ty + 3, tw - 2, 6);
    ctx.fillStyle = PALETTE.SURFACE;
    ctx.fillRect(tx + 2, ty + 3, tw - 4, 2);

    // Pernas da mesa
    ctx.fillStyle = PALETTE.MONO_DARK;
    ctx.fillRect(tx + 2, ty + 9, 3, 7);
    ctx.fillRect(tx + tw - 5, ty + 9, 3, 7);

    // Livro aberto em pixel-art ("Quem é Erich Moura?")
    const bx = tx + 7;
    const by = ty + 2;
    // Capa de couro escura
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(bx - 1, by - 1, 18, 9);
    // Páginas abertas em branco
    ctx.fillStyle = PALETTE.TEXT_PRIMARY;
    ctx.fillRect(bx, by, 7, 7);
    ctx.fillRect(bx + 9, by, 7, 7);
    // Lombada central do livro
    ctx.fillStyle = PALETTE.MONO_DARK;
    ctx.fillRect(bx + 7, by, 2, 7);
    // Linhas de escrita manuscrita
    ctx.fillStyle = PALETTE.SURFACE;
    ctx.fillRect(bx + 1, by + 2, 5, 1);
    ctx.fillRect(bx + 1, by + 4, 5, 1);
    ctx.fillRect(bx + 10, by + 2, 5, 1);
    ctx.fillRect(bx + 10, by + 4, 5, 1);
    // Fita marcadora de página verde --accent (#86dd8f) pendurada na frente
    ctx.fillStyle = PALETTE.ACCENT;
    ctx.fillRect(bx + 7, by + 5, 2, 5);

    // Tinteiro com pena de ganso à esquerda
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(tx + 2, by + 3, 3, 3);
    ctx.fillStyle = PALETTE.TEXT_PRIMARY;
    ctx.fillRect(tx + 4, by, 1, 3);
    ctx.fillRect(tx + 5, by - 1, 1, 2);

    // Castiçal com vela acesa à direita
    ctx.fillStyle = PALETTE.SURFACE;
    ctx.fillRect(tx + tw - 5, by + 3, 3, 3);
    ctx.fillStyle = PALETTE.TEXT_PRIMARY;
    ctx.fillRect(tx + tw - 4, by + 1, 1, 2);
    ctx.fillStyle = PALETTE.ACCENT;
    ctx.fillRect(tx + tw - 4, by - 1, 1, 2);
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

    // Decorações especiais estruturais por sala
    if (room.id === 'cinema') {
      drawCinemaDecorations(bCtx);
    } else if (room.id === 'posts') {
      drawStudioEquipment(bCtx);
    } else if (room.id === 'ideas') {
      drawLibraryDecorations(bCtx);
    } else if (room.id === 'central') {
      drawCentralHallDecorations(bCtx);
    }

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

  function isPlayerNearNpc(room) {
    const npc = ERICH_NPCS[room.id];
    if (!npc) return false;
    const dx = Math.abs(player.gridX - npc.col);
    const dy = Math.abs(player.gridY - npc.row);
    return (dx + dy === 1) || (dx <= 1 && dy <= 1 && (dx !== 0 || dy !== 0));
  }

  function isPlayerNearAnna(room) {
    if (room.id !== 'central') return false;
    const dx = Math.abs(player.gridX - ANNA_NPC.col);
    const dy = Math.abs(player.gridY - ANNA_NPC.row);
    return (dx + dy === 1) || (dx <= 1 && dy <= 1 && (dx !== 0 || dy !== 0));
  }

  function setHudText(txt) {
    const hudEl = document.getElementById('interactionHudText');
    if (hudEl) hudEl.textContent = txt;
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
    const nearNpc = isPlayerNearNpc(room);
    const nearAnna = isPlayerNearAnna(room);
    const nearProp = isPlayerNearInteraction(room);

    let nextId = null;
    if (nearAnna) {
      nextId = 'npc-anna';
      setHudText('Falar com Anna');
    } else if (nearNpc) {
      nextId = 'npc-erich';
      setHudText('Conversar');
    } else if (nearProp && room.interaction) {
      nextId = room.interaction.id;
      if (nextId === 'central-bio') {
        setHudText('Ler Biografia');
      } else {
        setHudText('Interagir');
      }
    }

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

    if (room.hasTopExit) {
      const nearTop = player.gridY <= 3;
      ctx.fillStyle = PALETTE.ACCENT;
      const centerX = CENTER_COL * TILE_SIZE + 7;
      const offset = pulse === 0 ? 2 : 3;
      ctx.fillRect(centerX, offset, 2, 1);
      ctx.fillRect(centerX - 1, offset + 1, 1, 1);
      ctx.fillRect(centerX + 2, offset + 1, 1, 1);

      if (nearTop) {
        drawDitherRect(ctx, 7 * TILE_SIZE + 2, 0, 3 * TILE_SIZE - 4, 2, PALETTE.ACCENT, 0.25);
      }
    }

    if (room.hasBottomExit) {
      const nearBottom = player.gridY >= GRID_ROWS - 4;
      ctx.fillStyle = PALETTE.ACCENT;
      const centerX = CENTER_COL * TILE_SIZE + 7;
      const offset = LOGICAL_HEIGHT - (pulse === 0 ? 3 : 4);
      ctx.fillRect(centerX, offset, 2, 1);
      ctx.fillRect(centerX - 1, offset - 1, 1, 1);
      ctx.fillRect(centerX + 2, offset - 1, 1, 1);

      if (nearBottom) {
        drawDitherRect(ctx, 7 * TILE_SIZE + 2, LOGICAL_HEIGHT - 2, 3 * TILE_SIZE - 4, 2, PALETTE.ACCENT, 0.25);
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

  /**
   * Indicadores pulsantes no mapa para facilitar o entendimento de onde estão as interações.
   */
  function drawInteractionPulsingBeacons(ctx, room, timestamp) {
    const pulseTime = timestamp / 240;
    const bob = Math.round(Math.sin(pulseTime) * 2);
    const alpha = 0.55 + 0.45 * Math.sin(pulseTime);

    // 1. Indicador pulsante do prop da sala (Mesa com livro, Mesa de som, Escrivaninha, Tela)
    if (room.interaction) {
      const clickTiles = room.interaction.clickTargetTiles;
      if (clickTiles && clickTiles.length > 0) {
        let minC = Infinity, maxC = -Infinity, minR = Infinity;
        clickTiles.forEach(function (t) {
          if (t.col < minC) minC = t.col;
          if (t.col > maxC) maxC = t.col;
          if (t.row < minR) minR = t.row;
        });

        const centerX = Math.round(((minC + maxC + 1) / 2) * TILE_SIZE);
        const topY = minR * TILE_SIZE - 6 + bob;

        // Se o jogador não estiver colado na interação, exibe o losango pulsante
        if (!isPlayerNearInteraction(room)) {
          drawPulsingBeaconDiamond(ctx, centerX, topY, alpha);

          // E cantoneiras pulsantes nos landing candidates no chão
          room.interaction.landingCandidates.forEach(function (lt) {
            drawFloorCornerBrackets(ctx, lt.col * TILE_SIZE, lt.row * TILE_SIZE, alpha);
          });
        }
      }
    }

    // 2. Indicador pulsante de NPCs quando o jogador está afastado
    const npc = ERICH_NPCS[room.id];
    if (npc) {
      const distToErich = Math.hypot(player.gridX - npc.col, player.gridY - npc.row);
      if (distToErich > 1.8) {
        const erichX = npc.col * TILE_SIZE + 8;
        const erichY = npc.row * TILE_SIZE - 4 + bob;
        drawPulsingBeaconDot(ctx, erichX, erichY, alpha);
      }
    }

    if (room.id === 'central') {
      const distToAnna = Math.hypot(player.gridX - ANNA_NPC.col, player.gridY - ANNA_NPC.row);
      if (distToAnna > 2.2) {
        const annaX = ANNA_NPC.col * TILE_SIZE + 8;
        const annaY = ANNA_NPC.row * TILE_SIZE - 4 + bob;
        drawPulsingBeaconDot(ctx, annaX, annaY, alpha);
      }
    }
  }

  function drawPulsingBeaconDiamond(ctx, cx, cy, alpha) {
    ctx.save();
    ctx.globalAlpha = Math.max(0.35, Math.min(1.0, alpha));

    // Sombra/Contorno escuro
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(cx - 3, cy, 7, 1);
    ctx.fillRect(cx - 2, cy - 1, 5, 3);
    ctx.fillRect(cx - 1, cy - 2, 3, 5);
    ctx.fillRect(cx, cy - 3, 1, 7);

    // Miolo iluminado em --accent (#86dd8f)
    ctx.fillStyle = PALETTE.ACCENT;
    ctx.fillRect(cx - 2, cy, 5, 1);
    ctx.fillRect(cx - 1, cy - 1, 3, 3);
    ctx.fillRect(cx, cy - 2, 1, 5);

    // Ponto focal central branco
    ctx.fillStyle = PALETTE.TEXT_PRIMARY;
    ctx.fillRect(cx, cy, 1, 1);

    ctx.restore();
  }

  function drawPulsingBeaconDot(ctx, cx, cy, alpha) {
    ctx.save();
    ctx.globalAlpha = Math.max(0.35, Math.min(1.0, alpha));

    // Balãozinho de diálogo sutil em cima do NPC
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(cx - 3, cy - 1, 6, 4);

    ctx.fillStyle = PALETTE.ACCENT;
    ctx.fillRect(cx - 2, cy, 4, 2);

    ctx.fillStyle = PALETTE.TEXT_PRIMARY;
    ctx.fillRect(cx - 1, cy, 2, 1);

    ctx.restore();
  }

  function drawFloorCornerBrackets(ctx, x, y, alpha) {
    ctx.save();
    ctx.globalAlpha = Math.max(0.25, Math.min(0.7, alpha * 0.7));
    ctx.fillStyle = PALETTE.ACCENT;

    // Cantoneiras no piso [  ] de 3x3 pixels nos cantos do tile de 16x16
    // Topo-Esquerdo
    ctx.fillRect(x + 2, y + 2, 3, 1);
    ctx.fillRect(x + 2, y + 3, 1, 2);
    // Topo-Direito
    ctx.fillRect(x + 11, y + 2, 3, 1);
    ctx.fillRect(x + 13, y + 3, 1, 2);
    // Base-Esquerda
    ctx.fillRect(x + 2, y + 13, 3, 1);
    ctx.fillRect(x + 2, y + 11, 1, 2);
    // Base-Direita
    ctx.fillRect(x + 11, y + 13, 3, 1);
    ctx.fillRect(x + 13, y + 11, 1, 2);

    ctx.restore();
  }

  function drawOverheadNameplate(ctx, cx, cy, text, subtitle) {
    ctx.save();
    ctx.font = '7px "Press Start 2P", monospace';
    const textWidth = ctx.measureText(text).width;
    let subWidth = 0;
    if (subtitle) {
      ctx.font = '6px "Press Start 2P", monospace';
      subWidth = ctx.measureText(subtitle).width;
    }

    const maxW = Math.max(textWidth, subWidth);
    const padX = 6;
    const boxW = Math.round(maxW + padX * 2);
    const boxH = subtitle ? 23 : 13;
    const boxX = Math.round(cx - boxW / 2);
    const boxY = Math.round(cy - boxH);

    // Sombra de 1px
    ctx.fillStyle = '#111111';
    ctx.fillRect(boxX + 1, boxY + 1, boxW, boxH);

    // Caixa de fundo
    ctx.fillStyle = PALETTE.BG_PRIMARY;
    ctx.fillRect(boxX, boxY, boxW, boxH);

    // Borda em tom de acento oficial (#86dd8f)
    ctx.fillStyle = PALETTE.ACCENT;
    ctx.fillRect(boxX, boxY, boxW, 1);
    ctx.fillRect(boxX, boxY + boxH - 1, boxW, 1);
    ctx.fillRect(boxX, boxY, 1, boxH);
    ctx.fillRect(boxX + boxW - 1, boxY, 1, boxH);

    // Triângulo indicador apontando para baixo
    ctx.fillRect(cx - 2, boxY + boxH, 4, 1);
    ctx.fillRect(cx - 1, boxY + boxH + 1, 2, 1);

    // Linha 1: Nome principal
    ctx.fillStyle = PALETTE.TEXT_PRIMARY;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillText(text, cx, boxY + (subtitle ? 7 : Math.round(boxH / 2) + 1));

    // Linha 2: Subtítulo
    if (subtitle) {
      ctx.fillStyle = PALETTE.ACCENT;
      ctx.font = '6px "Press Start 2P", monospace';
      ctx.fillText(subtitle, cx, boxY + 16);
    }

    ctx.restore();
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
   * Caso o usuário clique sobre Erich (NPC) ou props sólidos (Totem, Escrivaninha, Tela),
   * encontra o tile caminhável de interação mais próximo em frente ao objeto.
   */
  function resolveInteractiveLandingTile(room, clickedCol, clickedRow) {
    // Clique sobre Anna Padilha Moura (Hall de Entrada)
    if (room.id === 'central' && clickedCol === ANNA_NPC.col && clickedRow === ANNA_NPC.row) {
      const candidates = [
        { col: ANNA_NPC.col - 1, row: ANNA_NPC.row },
        { col: ANNA_NPC.col, row: ANNA_NPC.row - 1 },
        { col: ANNA_NPC.col + 1, row: ANNA_NPC.row },
        { col: ANNA_NPC.col, row: ANNA_NPC.row + 1 }
      ];
      let bestTile = null;
      let bestLen = Infinity;
      candidates.forEach(function (cand) {
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

    const npc = ERICH_NPCS[room.id];
    if (npc && npc.col === clickedCol && npc.row === clickedRow) {
      const candidates = [
        { col: npc.col, row: npc.row + 1 },
        { col: npc.col - 1, row: npc.row },
        { col: npc.col + 1, row: npc.row },
        { col: npc.col, row: npc.row - 1 }
      ];
      let bestNpcTile = null;
      let bestNpcLen = Infinity;
      candidates.forEach(function (cand) {
        if (!isWalkableInRoom(room, cand.col, cand.row)) return;
        if (cand.col === player.gridX && cand.row === player.gridY) {
          bestNpcTile = cand;
          bestNpcLen = 0;
          return;
        }
        const p = findGridPath(room, player.gridX, player.gridY, cand.col, cand.row);
        if (p.length > 0 && p.length < bestNpcLen) {
          bestNpcLen = p.length;
          bestNpcTile = cand;
        }
      });
      return bestNpcTile;
    }

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
    const room = getCurrentRoom();

    if (gameState.activeInteractionId === 'npc-anna') {
      openCharacterDialogue('anna');
    } else if (gameState.activeInteractionId === 'npc-erich') {
      openCharacterDialogue('erich', room.id);
    } else if (gameState.activeInteractionId === 'central-bio') {
      openModal('modalBio');
    } else if (gameState.activeInteractionId === 'posts-totem') {
      openModal('modalPosts');
    } else if (gameState.activeInteractionId === 'ideas-desk') {
      openModal('modalIdeas');
    } else if (gameState.activeInteractionId === 'cinema-screen') {
      openModal('modalCinema');
    }
  }

  function openCharacterDialogue(speakerType, roomId) {
    const roleEl = document.getElementById('modalDialogueRole');
    const speakerEl = document.getElementById('modalDialogueSpeaker');
    const subtitleEl = document.getElementById('modalDialogueSubtitle');
    const textEl = document.getElementById('modalDialogueText');
    const actionBtn = document.getElementById('modalDialogueActionBtn');

    if (speakerType === 'anna') {
      if (roleEl) roleEl.textContent = '[ ' + ANNA_NPC.role + ' ]';
      if (speakerEl) speakerEl.textContent = ANNA_NPC.name;
      if (subtitleEl) {
        subtitleEl.textContent = ANNA_NPC.subtitle;
        subtitleEl.style.display = 'block';
      }
      if (textEl) textEl.textContent = ANNA_NPC.message;

      if (actionBtn) {
        actionBtn.style.display = 'none';
        actionBtn.onclick = null;
      }

      renderDialogueAvatar('anna');
      openModal('modalDialogue');
      return;
    }

    const npc = ERICH_NPCS[roomId || gameState.currentRoomId];
    if (!npc) return;

    if (roleEl) roleEl.textContent = '[ ' + npc.role + ' ]';
    if (speakerEl) speakerEl.textContent = 'Erich Moura';
    if (subtitleEl) {
      subtitleEl.style.display = 'none';
      subtitleEl.textContent = '';
    }
    if (textEl) textEl.textContent = npc.message;

    if (actionBtn) {
      if (npc.actionModal && npc.actionLabel) {
        actionBtn.style.display = 'inline-flex';
        actionBtn.textContent = '[ ' + npc.actionLabel + ' ]';
        actionBtn.onclick = function (e) {
          e.preventDefault();
          closeActiveModal();
          openModal(npc.actionModal);
        };
      } else {
        actionBtn.style.display = 'none';
        actionBtn.onclick = null;
      }
    }

    renderDialogueAvatar('erich');
    openModal('modalDialogue');
  }

  function openErichDialogue(roomId) {
    openCharacterDialogue('erich', roomId);
  }

  function renderDialogueAvatar(speaker) {
    const avatarCanvas = document.getElementById('dialogueAvatarCanvas');
    if (!avatarCanvas) return;
    const aCtx = avatarCanvas.getContext('2d');
    if (!aCtx) return;

    avatarCanvas.width = 32;
    avatarCanvas.height = 32;
    aCtx.imageSmoothingEnabled = false;
    aCtx.clearRect(0, 0, 32, 32);

    const sprite = speaker === 'anna'
      ? (compiledAnnaSprites.down[0] || compiledAnnaSprites.left[0])
      : compiledErichSprites.down[0];

    if (sprite) {
      // Amplia 2x o sprite 16x16 com pixels ultra limpos
      aCtx.drawImage(sprite, 0, 0, 16, 16, 0, 0, 32, 32);
    }
  }

  function initEssayFilters() {
    const searchInput = document.getElementById('essaySearchInput');
    const clearSearchBtn = document.getElementById('essaySearchClearBtn');
    const catSelect = document.getElementById('essayCategoryFilter');

    const modeRangeBtn = document.getElementById('essayDateModeRangeBtn');
    const modeSingleBtn = document.getElementById('essayDateModeSingleBtn');
    const fieldStart = document.getElementById('essayDateFieldStart');
    const fieldEnd = document.getElementById('essayDateFieldEnd');
    const fieldSingle = document.getElementById('essayDateFieldSingle');
    const dateStartInput = document.getElementById('essayDateStart');
    const dateEndInput = document.getElementById('essayDateEnd');
    const dateSingleInput = document.getElementById('essayDateSingle');
    const clearDateBtn = document.getElementById('essayDateClearBtn');

    const emptyNotice = document.getElementById('essaysEmptyState');
    const essayList = document.getElementById('essaysList');
    if (!essayList) return;

    const items = essayList.querySelectorAll('.essay-slot');
    let currentDateMode = 'range'; // 'range' | 'single'

    function applyFilters() {
      const q = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : '';
      const cat = catSelect ? catSelect.value : 'all';

      if (clearSearchBtn) {
        clearSearchBtn.style.display = q.length > 0 ? 'block' : 'none';
      }

      let visibleCount = 0;

      items.forEach(function (slot) {
        const itemTitle = (slot.getAttribute('data-title') || '').toLowerCase();
        const itemCat = slot.getAttribute('data-category') || '';
        const itemDate = slot.getAttribute('data-date') || ''; // Formato ISO YYYY-MM-DD
        const itemSearch = (slot.getAttribute('data-search') || slot.textContent || '').toLowerCase();

        const matchQ = !q || itemSearch.indexOf(q) !== -1 || itemTitle.indexOf(q) !== -1;
        const matchCat = cat === 'all' || itemCat === cat;

        let matchDate = true;
        if (currentDateMode === 'single') {
          const singleVal = dateSingleInput ? dateSingleInput.value : '';
          if (singleVal) {
            matchDate = (itemDate === singleVal);
          }
        } else {
          const startVal = dateStartInput ? dateStartInput.value : '';
          const endVal = dateEndInput ? dateEndInput.value : '';

          if (startVal && endVal) {
            matchDate = (itemDate >= startVal && itemDate <= endVal);
          } else if (startVal) {
            matchDate = (itemDate >= startVal);
          } else if (endVal) {
            matchDate = (itemDate <= endVal);
          }
        }

        if (matchQ && matchCat && matchDate) {
          slot.style.display = '';
          visibleCount++;
        } else {
          slot.style.display = 'none';
        }
      });

      if (emptyNotice) {
        emptyNotice.style.display = visibleCount === 0 ? 'block' : 'none';
      }
    }

    if (modeRangeBtn && modeSingleBtn) {
      modeRangeBtn.addEventListener('click', function () {
        if (currentDateMode === 'range') return;
        currentDateMode = 'range';
        modeRangeBtn.classList.add('is-active');
        modeSingleBtn.classList.remove('is-active');
        if (fieldStart) fieldStart.style.display = 'flex';
        if (fieldEnd) fieldEnd.style.display = 'flex';
        if (fieldSingle) fieldSingle.style.display = 'none';
        applyFilters();
      });

      modeSingleBtn.addEventListener('click', function () {
        if (currentDateMode === 'single') return;
        currentDateMode = 'single';
        modeSingleBtn.classList.add('is-active');
        modeRangeBtn.classList.remove('is-active');
        if (fieldStart) fieldStart.style.display = 'none';
        if (fieldEnd) fieldEnd.style.display = 'none';
        if (fieldSingle) fieldSingle.style.display = 'flex';
        applyFilters();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
    }
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', function () {
        searchInput.value = '';
        applyFilters();
        searchInput.focus();
      });
    }
    if (catSelect) {
      catSelect.addEventListener('change', applyFilters);
    }

    if (dateStartInput) {
      dateStartInput.addEventListener('change', applyFilters);
    }
    if (dateEndInput) {
      dateEndInput.addEventListener('change', applyFilters);
    }
    if (dateSingleInput) {
      dateSingleInput.addEventListener('change', applyFilters);
    }

    if (clearDateBtn) {
      clearDateBtn.addEventListener('click', function () {
        if (dateStartInput) dateStartInput.value = '';
        if (dateEndInput) dateEndInput.value = '';
        if (dateSingleInput) dateSingleInput.value = '';
        applyFilters();
      });
    }
  }

  function initModalsAndHud() {
    initEssayFilters();

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
  function updateRoomLocationBadge(roomId) {
    const textEl = document.getElementById('roomLocationText');
    if (textEl && ROOM_DISPLAY_NAMES[roomId]) {
      textEl.textContent = ROOM_DISPLAY_NAMES[roomId];
    }
  }

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

    updateRoomLocationBadge(targetRoomId);
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

    if (tile === TILE_TYPE.PASSAGE_UP && room.exits.up) {
      transitionToRoom(
        room.exits.up.targetRoom,
        player.gridX,
        room.exits.up.spawnRow,
        'up'
      );
      return true;
    }

    if (tile === TILE_TYPE.PASSAGE_DOWN && room.exits.down) {
      transitionToRoom(
        room.exits.down.targetRoom,
        player.gridX,
        room.exits.down.spawnRow,
        'down'
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
          (isPlayerNearInteraction(getCurrentRoom()) || isPlayerNearNpc(getCurrentRoom()))
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
    const npc = ERICH_NPCS[room.id];
    if (npc && npc.col === col && npc.row === row) return true;
    if (room.id === 'central' && ANNA_NPC.col === col && ANNA_NPC.row === row) return true;
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

      // Se clicou no prop ou no NPC e o personagem já está no raio de interação: abre imediatamente!
      if (interactiveLanding && (isPlayerNearInteraction(room) || isPlayerNearNpc(room))) {
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

  function drawRoomNpcs(ctx, room, timestamp) {
    const npc = ERICH_NPCS[room.id];
    if (npc) {
      const dx = npc.col * TILE_SIZE;
      const dy = npc.row * TILE_SIZE;

      // Sombra suave sob o NPC
      drawDitherRect(ctx, dx + 2, dy + 13, 12, 3, PALETTE.MONO_DARK, 0.5);

      const animFrame = Math.floor(timestamp / 750) % 2;
      const spriteList = compiledErichSprites[npc.facing] || compiledErichSprites.down;
      const sprite = spriteList[animFrame] || spriteList[0];

      if (sprite) {
        ctx.drawImage(sprite, dx, dy);
      }
    }

    // Anna Padilha Moura (Hall de Entrada)
    if (room.id === 'central') {
      const ax = ANNA_NPC.col * TILE_SIZE;
      const ay = ANNA_NPC.row * TILE_SIZE;

      // Sombra suave sob Anna
      drawDitherRect(ctx, ax + 2, ay + 13, 12, 3, PALETTE.MONO_DARK, 0.5);

      const animFrame = Math.floor(timestamp / 750) % 2;
      const spriteList = compiledAnnaSprites[ANNA_NPC.facing] || compiledAnnaSprites.down;
      const sprite = spriteList[animFrame] || spriteList[0];

      if (sprite) {
        ctx.drawImage(sprite, ax, ay);
      }

      // Quando o usuário chegar perto, aparece escrito em cima dela Anna Padilha Moura com o subtítulo esposa de Erich
      const isNearAnna = (Math.abs(player.gridX - ANNA_NPC.col) <= 2 && Math.abs(player.gridY - ANNA_NPC.row) <= 2);
      if (isNearAnna) {
        drawOverheadNameplate(ctx, ax + 8, ay - 3, 'Anna Padilha Moura', 'esposa de Erich');
      }
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
        drawInteractionPulsingBeacons(ctx, currentRoom, timestamp);
        drawInteractionFloorIndicator(ctx, currentRoom, timestamp);
        drawAnimatedRoomProps(ctx, currentRoom, timestamp);
        drawRoomNpcs(ctx, currentRoom, timestamp);
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

  function checkFirstVisitWelcome() {
    if (requestedOpen) return;

    try {
      const welcomed = localStorage.getItem('erichmoura_welcome_seen');
      if (!welcomed) {
        openModal('modalWelcome');
        const startBtn = document.getElementById('welcomeStartBtn');
        if (startBtn) {
          startBtn.addEventListener('click', function () {
            try {
              localStorage.setItem('erichmoura_welcome_seen', '1');
            } catch (err) {}
          }, { once: true });
        }
      }
    } catch (err) {}
  }

  /* ==========================================================================
     15. Inicialização Geral
     ========================================================================== */
  compileCustomSprites();
  buildAllRoomBuffers();
  initStageAndLoop();
  initModalsAndHud();
  preloadDungeonAssets();
  updateRoomLocationBadge(gameState.currentRoomId);
  initLoadingScreen();

  window.addEventListener('site:loaded', function () {
    checkFirstVisitWelcome();
  }, { once: true });
})();
