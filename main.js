// 波紋リバーシ - Quantum Ripple Reversi
// HTML5 Canvas + Vanilla JavaScript

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ゲーム設定
const GRID_SIZE = 8;
let CELL_SIZE = 0;
const INFLUENCE_RADIUS = 5.0;
const INTERACTION_COEFFICIENT = 0.4;

// 定数
const EMPTY = null;

// ゲーム状態
let board = [];
let currentPlayer = 'cyan';
let phase = 1; // 1: 第 1 波源選択，2: 第 2 波源配置
let selectedFirstStone = null;
let secondStonePosition = null; // フェーズ 2 で配置された石の位置

// 初期化：8x8 の空の盤面を作成
function initBoard(useMockBoard = false) {
    board = [];
    for (let y = 0; y < GRID_SIZE; y++) {
        const row = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            row.push(EMPTY);
        }
        board.push(row);
    }
    
    if (useMockBoard) {
        // モックボード：90% のセルを埋める（64 個中 58 個）
        let cellCount = 0;
        const targetCells = 58;
        
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                // 中央 4 マスはスキップ（既存の初期配置）
                if ((x === 3 && y === 3) || (x === 4 && y === 3) ||
                    (x === 3 && y === 4) || (x === 4 && y === 4)) {
                    continue;
                }
                
                // ランダムに石を配置（約 90% の確率）
                if (cellCount < targetCells) {
                    const isCyan = Math.random() > 0.5;
                    board[y][x] = isCyan
                        ? { cyan: 1.0, yellow: 0.0 }
                        : { cyan: 0.0, yellow: 1.0 };
                    cellCount++;
                }
            }
        }
    } else {
        // 初期配置（通常のオセロと同様に中央 4 マス）
        board[3][3] = { cyan: 1.0, yellow: 0.0 }; // 白（cyan）
        board[3][4] = { cyan: 0.0, yellow: 1.0 }; // 黒（yellow）
        board[4][3] = { cyan: 0.0, yellow: 1.0 }; // 黒（yellow）
        board[4][4] = { cyan: 1.0, yellow: 0.0 }; // 白（cyan）
    }
}

// 盤面を描画
function drawBoard() {
    // CELL_SIZE を計算（canvas が読み込まれた後）
    CELL_SIZE = canvas.width / GRID_SIZE;

    // 描画領域をクリア
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // グリッド線を描画
    ctx.strokeStyle = '#333366';
    ctx.lineWidth = 2;

    for (let i = 0; i <= GRID_SIZE; i++) {
        // 縦線
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        ctx.stroke();

        // 横線
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
        ctx.stroke();
    }

    // 各マスの石を描画
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const cell = board[y][x];
            const centerX = x * CELL_SIZE + CELL_SIZE / 2;
            const centerY = y * CELL_SIZE + CELL_SIZE / 2;
            const radius = CELL_SIZE / 2 - 5;

            if (cell !== EMPTY) {
                drawStone(centerX, centerY, radius, cell.cyan, cell.yellow);
                
                // フェーズ 1: 選択可能な石をハイライト
                if (phase === 1 && canSelectStone(x, y)) {
                    ctx.strokeStyle = '#00ff00';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
                    ctx.stroke();
                }
            } else if (phase === 2) {
                // フェーズ 2: 空のセルを薄く表示
                ctx.strokeStyle = '#333333';
                ctx.lineWidth = 1;
                ctx.strokeRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            }
        }
    }

    // 選択された石をハイライト（フェーズ 1）
    if (phase === 1 && selectedFirstStone) {
        const x = selectedFirstStone.x * CELL_SIZE;
        const y = selectedFirstStone.y * CELL_SIZE;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    }

    // 現在の手番とフェーズを表示
    drawInfo();
    
    ctx.restore();
}

// 石を描画（確率に応じたグラデーション）
function drawStone(x, y, radius, cyanValue, yellowValue) {
    // 青と黄のグラデーションを作成
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    
    // 確率に応じた色を計算（HSL で補間）
    // cyan = HSL(180, 100%, 50%), yellow = HSL(60, 100%, 50%)
    const hue = 60 + (180 - 60) * cyanValue;
    const stoneColor = `hsl(${hue}, 100%, 50%)`;
    
    gradient.addColorStop(0, stoneColor);
    gradient.addColorStop(1, '#ffffff');

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// 情報表示
function drawInfo() {
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Turn: ${currentPlayer.toUpperCase()}`, 10, 25);
    
    // フェーズ表示を改善
    if (phase === 1) {
        const colorName = currentPlayer === 'cyan' ? 'cyan' : 'yellow';
        ctx.fillStyle = currentPlayer === 'cyan' ? '#00ffff' : '#ffff00';
        ctx.fillText(`Phase 1: Select your stone (${colorName} ≥ 0.1)`, 10, 45);
    } else {
        ctx.fillStyle = '#ffff00';
        ctx.fillText(`Phase 2: Place new stone in empty cell`, 10, 45);
    }
}

// 勝者を判定して表示
function checkWinner() {
    let cyanCount = 0;
    let yellowCount = 0;
    
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const cell = board[y][x];
            if (cell !== EMPTY) {
                if (cell.cyan >= 0.5) {
                    cyanCount++;
                } else {
                    yellowCount++;
                }
            }
        }
    }
    
    // ゲーム終了判定（盤面が満杯）
    let emptyCount = 0;
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (board[y][x] === EMPTY) {
                emptyCount++;
            }
        }
    }
    
    if (emptyCount === 0) {
        let message = '';
        let color = '';
        
        if (cyanCount > yellowCount) {
            message = `GAME OVER! Cyan wins! (${cyanCount} - ${yellowCount})`;
            color = '#00ffff';
        } else if (yellowCount > cyanCount) {
            message = `GAME OVER! Yellow wins! (${yellowCount} - ${cyanCount})`;
            color = '#ffff00';
        } else {
            message = `GAME OVER! It's a tie! (${cyanCount} - ${yellowCount})`;
            color = '#ffffff';
        }
        
        // 画面中央に勝者表示
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height / 2 - 50, canvas.width, 100);
        
        ctx.fillStyle = color;
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(message, canvas.width / 2, canvas.height / 2 + 10);
        
        return true;
    }
    
    return false;
}

// 選択可能な石かどうか（フェーズ 1）
function canSelectStone(x, y) {
    const cell = board[y][x];
    if (cell === EMPTY) {
        console.log(`Cell [${x},${y}] is EMPTY`);
        return false;
    }
    
    const colorName = currentPlayer === 'cyan' ? 'cyan' : 'yellow';
    const colorValue = currentPlayer === 'cyan' ? cell.cyan : cell.yellow;
    const canSelect = colorValue >= 0.1;
    console.log(`Cell [${x},${y}]: ${colorName}=${colorValue}, canSelect=${canSelect}`);
    return canSelect;
}

// 距離の計算（ユークリッド距離）
function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// 波の減衰関数 C(d) = max(0, 1 - d / R)
function decayFunction(d, radius) {
    return Math.max(0, 1 - d / radius);
}

// 波の干渉ロジック（コアアルゴリズム）
function applyWaveInterference() {
    if (!selectedFirstStone || !secondStonePosition) return;

    // 波源 1: フェーズ 1 で選択した石
    const p1 = selectedFirstStone;
    const w1 = currentPlayer === 'cyan' 
        ? board[p1.y][p1.x].cyan 
        : board[p1.y][p1.x].yellow;

    // 波源 2: フェーズ 2 で配置した石（100% 自色）
    const w2 = 1.0;

    // 盤面のすべての石に対して計算
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const cell = board[y][x];
            if (cell === EMPTY) continue;

            // 距離の計算
            const d1 = distance(p1.x, p1.y, x, y);
            const d2 = distance(secondStonePosition.x, secondStonePosition.y, x, y);

            // 波の減衰を計算
            const c1 = decayFunction(d1, INFLUENCE_RADIUS);
            const c2 = decayFunction(d2, INFLUENCE_RADIUS);

            // 影響力の計算
            const i1 = w1 * c1;
            const i2 = w2 * c2;

            // 干渉の条件判定：両方の波が届いているマス
            if (i1 > 0 && i2 > 0) {
                // 色（確率）の変化
                const delta = (i1 + i2) * INTERACTION_COEFFICIENT;
                
                // 手番プレイヤーの色の確率を更新
                if (currentPlayer === 'cyan') {
                    cell.cyan = Math.min(1.0, cell.cyan + delta);
                    cell.yellow = 1.0 - cell.cyan;
                } else {
                    cell.yellow = Math.min(1.0, cell.yellow + delta);
                    cell.cyan = 1.0 - cell.yellow;
                }
            }
        }
    }
}

// マウスクリックイベント
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // グリッド座標に変換
    const gridX = Math.floor(mouseX / CELL_SIZE);
    const gridY = Math.floor(mouseY / CELL_SIZE);

    // 盤面範囲内かチェック
    if (gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE) {
        if (phase === 1) {
            // フェーズ 1: 第 1 波源の選択
            if (canSelectStone(gridX, gridY)) {
                selectedFirstStone = { x: gridX, y: gridY };
                phase = 2;
                drawBoard();
            }
        } else if (phase === 2) {
            // フェーズ 2: 第 2 波源の配置
            if (board[gridY][gridX] === EMPTY) {
                // 第 2 波源の位置を記録
                secondStonePosition = { x: gridX, y: gridY };
                
                // 新しい石を配置
                if (currentPlayer === 'cyan') {
                    board[gridY][gridX] = { cyan: 1.0, yellow: 0.0 };
                } else {
                    board[gridY][gridX] = { cyan: 0.0, yellow: 1.0 };
                }
                
                // 波の干渉ロジックを実行
                applyWaveInterference();
                
                // 手番交代
                currentPlayer = currentPlayer === 'cyan' ? 'yellow' : 'cyan';
                phase = 1;
                selectedFirstStone = null;
                secondStonePosition = null;
                
                updatePlayerIndicator();
                drawBoard();
                
                // 勝者判定
                checkWinner();
            }
        }
    }
});

// 観測機能 - 確率状態を収束させて石の色を決定
function observeBoard() {
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const cell = board[y][x];
            if (cell !== EMPTY) {
                // Math.random() が cyan 確率未満なら cyan に確定
                if (Math.random() < cell.cyan) {
                    board[y][x] = { cyan: 1.0, yellow: 0.0 };
                } else {
                    board[y][x] = { cyan: 0.0, yellow: 1.0 };
                }
            }
        }
    }
    drawBoard();
}

// 手番表示を更新
function updatePlayerIndicator() {
    const cyanPlayer = document.getElementById('cyanPlayer');
    const yellowPlayer = document.getElementById('yellowPlayer');
    
    if (currentPlayer === 'cyan') {
        cyanPlayer.classList.add('active');
        yellowPlayer.classList.remove('active');
    } else {
        cyanPlayer.classList.remove('active');
        yellowPlayer.classList.add('active');
    }
}

// ボタンイベント
const resetBtn = document.getElementById('resetBtn');
const mockBtn = document.getElementById('mockBtn');

resetBtn.addEventListener('click', () => {
    initBoard(false);
    currentPlayer = 'cyan';
    phase = 1;
    selectedFirstStone = null;
    secondStonePosition = null;
    updatePlayerIndicator();
    drawBoard();
});

mockBtn.addEventListener('click', () => {
    initBoard(true);
    currentPlayer = 'cyan';
    phase = 1;
    selectedFirstStone = null;
    secondStonePosition = null;
    updatePlayerIndicator();
    drawBoard();
});

// 初期化実行
initBoard();
drawBoard();
updatePlayerIndicator();

// リサイズ対応
window.addEventListener('resize', () => {
    drawBoard();
});
