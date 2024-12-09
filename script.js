"use strict";

function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
}

const DEBUG_MODE = false;
const DEV_MODE = false;

let lastEnteredName = localStorage.getItem('lastEnteredName') || "";

let playerName = localStorage.getItem('playerName') || '';

function logDebug(msg) {
    if (DEBUG_MODE) {
        console.log("[DEBUG]", msg);
    }
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let currentLevelIndex = 0;
let map = [];
let mapWidth = 0;
let mapHeight = 0;

let playerX = 2;
let playerY = 2;
let playerAngle = 0;
const moveSpeed = 0.05;
const rotSpeed = 0.05;

const fov = Math.PI / 3;
const numRays = canvas.width / 2;
const viewDist = 20;

let startTime = 0;
let currentTime = 0;

// Game states
let levelFinished = false;
let showingScoreboard = false;
let waitingForNameEntry = false;
let newHighscore = false;
let finalTime = 0;
let pendingHighscoreTime = 0;
let levelNo = 0;

let highscores = loadHighscores();

let showingStartScreen = true;
let nameInputActive = false;
let currentInput = lastEnteredName === "YOU" ? "" : (lastEnteredName || "");
let inputCursorVisible = true;
let lastCursorBlink = 0;

let showDevOverlay = false;

let showingEndScreen = false;
let totalTime = 0;

let escPressStartTime = 0;
const ESC_HOLD_TIME = 3000; // 3 Sekunden in Millisekunden
let isEscPressed = false;

loadLevel(currentLevelIndex);
nameInputActive = true;
requestAnimationFrame(gameLoop);

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keypress', onKeyPress);
document.addEventListener('keyup', onKeyUp);

function onKeyDown(e) {
    if (showingEndScreen) {
        if (e.key === 'Enter') {
            // Back to the start screen
            showingEndScreen = false;
            showingStartScreen = true;
            nameInputActive = true;
            currentLevelIndex = 0;
            totalTime = 0;
            currentInput = lastEnteredName || "";
            loadLevel(currentLevelIndex);
            requestAnimationFrame(gameLoop);
        } else if (e.key === 'Escape') {
            if (!isEscPressed) {
                escPressStartTime = performance.now();
                isEscPressed = true;
            }
            return;
        }
        return;
    }

    if (showingStartScreen) {
        if (e.key === 'Enter') {
            if (currentInput.length > 0) {
                lastEnteredName = currentInput;
            } else {
                lastEnteredName = "YOU";
                currentInput = "YOU";
            }
            localStorage.setItem('lastEnteredName', lastEnteredName);
            showingStartScreen = false;
            startTime = performance.now();
            requestAnimationFrame(gameLoop);
        } else if (e.key === 'Backspace' && nameInputActive) {
            e.preventDefault();
            currentInput = currentInput.slice(0, -1);
            lastEnteredName = currentInput || "YOU";  // Name aktualisieren beim Löschen
            localStorage.setItem('lastEnteredName', lastEnteredName);
        } else if (e.key === 'F2') {
            e.preventDefault();
            showDevOverlay = !showDevOverlay;
            return;
        }
        return;
    }

    if (levelFinished && showingScoreboard) {
        if (e.key === 'Enter') {
            nextLevel();
        } else if (e.key === 'Escape') {
            // Level neu starten
            loadLevel(currentLevelIndex);
            startTime = performance.now();
            requestAnimationFrame(gameLoop);
        }
        return;
    }

    if (e.key === 'F2') {
        e.preventDefault();
        showDevOverlay = !showDevOverlay;
        return;
    }

    if (e.key === 'Escape') {
        if (!isEscPressed) {
            escPressStartTime = performance.now();
            isEscPressed = true;
        }
        return;
    }

    logDebug("Key pressed: " + e.key);
    logDebug("Current Position: (" + playerX.toFixed(2) + "," + playerY.toFixed(2) + "), Angle: " + radiansToDegrees(playerAngle).toFixed(1) + "°");

    if (e.key === "ArrowUp") {
        let newX = playerX + Math.cos(playerAngle) * moveSpeed;
        let newY = playerY + Math.sin(playerAngle) * moveSpeed;
        if (!isWall(newX, newY)) {
            playerX = newX;
            playerY = newY;
            logDebug("Moved forward to (" + playerX.toFixed(2) + "," + playerY.toFixed(2) + ")");
        } else {
            logDebug("Forward blocked by wall");
        }
    }
    if (e.key === "ArrowDown") {
        let newX = playerX - Math.cos(playerAngle) * moveSpeed;
        let newY = playerY - Math.sin(playerAngle) * moveSpeed;
        if (!isWall(newX, newY)) {
            playerX = newX;
            playerY = newY;
            logDebug("Moved backward to (" + playerX.toFixed(2) + "," + playerY.toFixed(2) + ")");
        } else {
            logDebug("Backward blocked by wall");
        }
    }
    if (e.key === "ArrowLeft") {
        playerAngle = normalizeAngle(playerAngle - rotSpeed);
        logDebug("Player angle after turn left: " + radiansToDegrees(playerAngle).toFixed(1) + "°");
    }
    if (e.key === "ArrowRight") {
        playerAngle = normalizeAngle(playerAngle + rotSpeed);
        logDebug("Player angle after turn right: " + radiansToDegrees(playerAngle).toFixed(1) + "°");
    }

    checkExit();
}

function loadLevel(index) {
    const level = levels[index];
    map = level.layout;
    mapWidth = map[0].length;
    mapHeight = map.length;
    playerX = level.start.x;
    playerY = level.start.y;
    playerAngle = level.start.angle * (Math.PI / 180);
    startTime = performance.now();
    logDebug("Loaded level " + (index + 1) + " with size " + mapWidth + "x" + mapHeight);
    logDebug("Start position: (" + playerX + "," + playerY + "), angle: " + level.start.angle + "°");
    levelFinished = false;
    showingScoreboard = false;
    waitingForNameEntry = false;
    newHighscore = false;
}

function checkExit() {
    let cellX = Math.floor(playerX);
    let cellY = Math.floor(playerY);
    if (cellX < 0 || cellX >= mapWidth || cellY < 0 || cellY >= mapHeight) return;

    let cellValue = map[cellY][cellX];
    if (cellValue >= 2 && cellValue <= 5) {
        finishLevel();
    }
}

function finishLevel() {
    finalTime = (performance.now() - startTime) / 1000;
    totalTime += finalTime;  // Add total time
    logDebug("Level completed in " + finalTime.toFixed(3) + "s");
    levelFinished = true;
    levelNo = currentLevelIndex + 1;

    let scoreList = highscores[levelNo] || [];
    let canBeHighscore = false;
    
    if (scoreList.length < 5 || finalTime < scoreList[scoreList.length - 1].time) {
        canBeHighscore = true;
        scoreList.push({name: lastEnteredName, time: finalTime});
        scoreList.sort((a,b) => a.time - b.time);
        scoreList = scoreList.slice(0,5);
        highscores[levelNo] = scoreList;
        saveHighscores();
    }

    showScoreboard(levelNo, finalTime, canBeHighscore);
}

function showScoreboard(levelNo, finalTime, isNewHighscore) {
    showingScoreboard = true;

    // Clear screen
    ctx.fillStyle = "#000000";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    let scoreList = highscores[levelNo] || [];
    scoreList.sort((a,b) => a.time - b.time);

    ctx.fillStyle = "#ffffff";
    ctx.font = "26px monospace";
    
    // Calculate the width of the scoreboard (about 500 pixels)
    const scoreboardWidth = 500;
    const leftMargin = (canvas.width - scoreboardWidth) / 2;
    
    // Start all text left-aligned
    ctx.textAlign = "left";

    // Header
    let title = "MAZE                       LVL " + levelNo;
    ctx.fillText(title, leftMargin, 50);
    ctx.fillText("--------------------------------", leftMargin, 80);
    
    ctx.textAlign = "right";
    ctx.fillText("BEST TIMES", leftMargin + scoreboardWidth, 110);
    ctx.textAlign = "left";

    // Highscore entries
    for (let i = 0; i < 5; i++) {
        let entry = scoreList[i];
        let rank = (i+1) + ".";
        if (entry) {
            // Check if this is the newly achieved score
            const isNewScore = isNewHighscore && 
                             entry.name === lastEnteredName && 
                             Math.abs(entry.time - finalTime) < 0.001;

            // Set color to blue for the new score
            if (isNewScore) {
                ctx.fillStyle = "rgb(100,100,255)";
            }

            // Rank left-aligned
            ctx.fillText(rank.padEnd(3), leftMargin, 150 + i*30);
            // Name after the rank, with more space
            ctx.fillText(entry.name.padEnd(8), leftMargin + 70, 150 + i*30);
            // Time right-aligned
            ctx.textAlign = "right";
            ctx.fillText(entry.time.toFixed(3) + "s", leftMargin + scoreboardWidth, 150 + i*30);
            ctx.textAlign = "left";

            // Back to white for other entries
            if (isNewScore) {
                ctx.fillStyle = "#ffffff";
            }
        } else {
            ctx.fillText(rank, leftMargin, 150 + i*30);
        }
    }

    let yOffset = 150 + 5*30 + 40;

    if (isNewHighscore) {
        ctx.fillStyle = "rgb(100,100,255)";
        ctx.fillText("NEW BEST TIME!", leftMargin, yOffset);
        ctx.fillStyle = "#ffffff";
    }
    
    // Change text if it is the last level
    if (currentLevelIndex >= levels.length - 1) {
        ctx.fillText("Press ENTER to see final results", leftMargin, yOffset + (isNewHighscore ? 40 : 0));
    } else {
        ctx.fillText("Press ENTER for next level", leftMargin, yOffset + (isNewHighscore ? 40 : 0));
    }
}

function nextLevel() {
    currentLevelIndex++;
    if (currentLevelIndex >= levels.length) {
        // All levels completed - show end screen
        showingEndScreen = true;
        return;
    }
    loadLevel(currentLevelIndex);
    startTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function isWall(x, y) {
    if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) {
        return true;
    }
    return map[Math.floor(y)][Math.floor(x)] === 1;
}

function isExitBlock(x, y) {
    if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) {
        return false;
    }
    let val = map[Math.floor(y)][Math.floor(x)];
    return (val >= 2 && val <= 5);
}

function gameLoop() {
    if (showingStartScreen) {
        renderStartScreen();
        requestAnimationFrame(gameLoop);
        return;
    }

    if (showingEndScreen) {
        renderEndScreen();
        requestAnimationFrame(gameLoop);
        return;
    }

    if (showingScoreboard) {
        // Continue showing scoreboard
        requestAnimationFrame(gameLoop);
        return;
    }

    if (!levelFinished) {
        currentTime = (performance.now() - startTime) / 1000;
        update();
        render();
        requestAnimationFrame(gameLoop);
    }
}

function update() {
}

function render() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const halfFov = fov / 2;
    const startAngle = playerAngle - halfFov;
    const angleStep = fov / numRays;

    for (let i = 0; i < numRays; i++) {
        const rayAngle = startAngle + i * angleStep;
        const hit = castRayDDA(rayAngle);
        if (hit) {
            const dist = hit.dist;
            const lineHeight = Math.min(canvas.height, (1 / dist) * 500);
            const brightness = Math.floor(200 - (dist / viewDist) * 150);

            // Standard gray
            let r = brightness, g = brightness, b = brightness;

            if (hit.cellValue >= 2 && hit.cellValue <= 5) {
                let targetSide = null;
                switch (hit.cellValue) {
                    case 2: targetSide = 'N'; break;
                    case 3: targetSide = 'W'; break;
                    case 4: targetSide = 'E'; break;
                    case 5: targetSide = 'S'; break;
                }

                if (hit.side === targetSide) {
                    // Exit side hit, color blue
                    r = Math.floor(brightness * 0.5);
                    g = Math.floor(brightness * 0.5);
                    b = Math.min(255, brightness + 55);
                }
            }

            ctx.fillStyle = `rgb(${r},${g},${b})`;

            const x = i * 2;
            ctx.fillRect(x, (canvas.height - lineHeight) / 2, 2, lineHeight);
        }
    }

    // Add level display in top right
    ctx.font = "20px monospace";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "right";
    ctx.fillText(`LVL ${currentLevelIndex + 1}`, canvas.width - 10, 30);

    // Add time display in bottom left
    ctx.textAlign = "left";
    ctx.fillText(currentTime.toFixed(2) + "s", 10, canvas.height - 10);

    // Only render the overlay that contains the controls
    renderDevOverlay();

    // Ladebalken für ESC-Taste rendern
    renderEscapeProgress();
}

// DDA-based raycasting
function castRayDDA(angle) {
    let sinA = Math.sin(angle);
    let cosA = Math.cos(angle);

    let mapX = Math.floor(playerX);
    let mapY = Math.floor(playerY);

    let deltaDistX = Math.abs(1 / cosA);
    let deltaDistY = Math.abs(1 / sinA);

    let stepX, stepY;
    let sideDistX, sideDistY;

    if (cosA < 0) {
        stepX = -1;
        sideDistX = (playerX - mapX) * deltaDistX;
    } else {
        stepX = 1;
        sideDistX = (mapX + 1.0 - playerX) * deltaDistX;
    }

    if (sinA < 0) {
        stepY = -1;
        sideDistY = (playerY - mapY) * deltaDistY;
    } else {
        stepY = 1;
        sideDistY = (mapY + 1.0 - playerY) * deltaDistY;
    }

    let hit = false;
    let side = 0;
    let cellValue = 0;
    let distance = 0;

    while (!hit && distance < viewDist) {
        if (sideDistX < sideDistY) {
            sideDistX += deltaDistX;
            mapX += stepX;
            side = 0;
        } else {
            sideDistY += deltaDistY;
            mapY += stepY;
            side = 1;
        }

        if (mapX < 0 || mapX >= mapWidth || mapY < 0 || mapY >= mapHeight) {
            hit = true;
            cellValue = 1; // imaginary wall
            distance = viewDist;
        } else {
            cellValue = map[mapY][mapX];
            if (cellValue !== 0) {
                hit = true;
            }
        }
    }

    if (!hit) return null;

    if (side === 0) {
        distance = (sideDistX - deltaDistX);
    } else {
        distance = (sideDistY - deltaDistY);
    }

    let wallSide = 'N';
    if (side === 0) {
        if (cosA > 0) {
            wallSide = 'W';
        } else {
            wallSide = 'E';
        }
    } else {
        if (sinA > 0) {
            wallSide = 'N';
        } else {
            wallSide = 'S';
        }
    }

    return {dist: distance, cellValue: cellValue, side: wallSide, cellX: mapX, cellY: mapY};
}

function loadHighscores() {
    let hs = localStorage.getItem("mazeHighscores");
    if (hs) {
        return JSON.parse(hs);
    }
    return {};
}

function saveHighscores() {
    localStorage.setItem("mazeHighscores", JSON.stringify(highscores));
}

// Find the existing name input handling code and modify it
function handleNameInput() {
    const nameInput = document.getElementById('nameInput');
    playerName = nameInput.value;
    // Save to localStorage whenever the name changes
    localStorage.setItem('playerName', playerName);
    updateNameDisplay();
}

function showNameInput() {
    const nameInput = document.getElementById('nameInput');
    nameInput.value = playerName;
}

function normalizeAngle(angle) {
    let degrees = radiansToDegrees(angle);
    // Normalize to 0-360
    degrees = ((degrees % 360) + 360) % 360;
    return degreesToRadians(degrees);
}

// New function for keyboard input
function onKeyPress(e) {
    if (!showingStartScreen || !nameInputActive) return;
    
    // Prevent default event when we are in name input mode
    e.preventDefault();

    // Allow only letters
    if (/^[a-zA-Z]$/.test(e.key)) {
        if (currentInput.length < 8) {
            currentInput += e.key.toUpperCase();
            lastEnteredName = currentInput || "YOU";  // Leerer Name wird zu "YOU"
            localStorage.setItem('lastEnteredName', lastEnteredName);
        }
    }
}

function renderStartScreen() {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render the game field dimmed in the background
    ctx.globalAlpha = 0.2;
    render();
    ctx.globalAlpha = 1.0;

    // Center the text
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.fillStyle = "#ffffff";
    ctx.font = "48px monospace";
    ctx.textAlign = "center";
    
    // Title
    ctx.fillText("MAZE", centerX, centerY - 100);
    
    // Name Input first
    ctx.font = "20px monospace";
    ctx.fillText("Who is playing?", centerX, centerY - 40);
    
    // Input Box
    const inputWidth = 200;
    const inputHeight = 40;
    const inputY = centerY - 20;
    
    ctx.strokeStyle = "#ffffff";
    ctx.strokeRect(centerX - inputWidth/2, inputY, inputWidth, inputHeight);
    
    ctx.font = "26px monospace";
    
    let displayText = currentInput;
    let cursorSpace = "█";
    ctx.fillText(displayText, centerX, inputY + 30);
    
    if (Date.now() - lastCursorBlink > 500) {
        inputCursorVisible = !inputCursorVisible;
        lastCursorBlink = Date.now();
    }
    
    if (inputCursorVisible && currentInput.length < 8) {
        // Calculate the width of the current text
        const textWidth = ctx.measureText(displayText).width;
        // Draw the cursor at the correct position
        ctx.fillText(cursorSpace, centerX + textWidth/2 + 7, inputY + 30);
    }
    
    ctx.font = "20px monospace";
    ctx.fillText("Move with arrow keys", centerX, centerY + 80);
    
    ctx.fillText("Press ENTER to start", centerX, centerY + 120);
}

function renderDevControls() {
    if (!DEV_MODE) return;
    
    const buttonHeight = 30;
    const buttonSpacing = 5;
    const buttonsY = canvas.height - buttonHeight - 5;
    
    // Background for the buttons
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, buttonsY - 5, canvas.width, buttonHeight + 10);
    
    // Draw buttons
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    
    // Calculate button width based on the number of levels
    const buttonWidth = Math.min(40, (canvas.width - (levels.length + 1) * buttonSpacing) / levels.length);
    
    for (let i = 0; i < levels.length; i++) {
        const x = (buttonWidth + buttonSpacing) * i + buttonSpacing + buttonWidth/2;
        
        // Button background
        ctx.fillStyle = currentLevelIndex === i ? "#4444ff" : "#666666";
        ctx.fillRect(x - buttonWidth/2, buttonsY, buttonWidth, buttonHeight);
        
        // Button text
        ctx.fillStyle = "#ffffff";
        ctx.fillText((i + 1), x, buttonsY + 20);
    }
}

function handleDevClick(e) {
    if (!DEV_MODE || !showDevOverlay) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const buttonHeight = 30;
    const buttonSpacing = 5;
    const buttonsY = canvas.height - buttonHeight - 5;
    const buttonWidth = Math.min(40, (canvas.width - (levels.length + 1) * buttonSpacing) / levels.length);
    
    // Check if click was in the button row
    if (clickY >= buttonsY && clickY <= buttonsY + buttonHeight) {
        for (let i = 0; i < levels.length; i++) {
            const x = (buttonWidth + buttonSpacing) * i + buttonSpacing;
            if (clickX >= x && clickX <= x + buttonWidth) {
                currentLevelIndex = i;
                loadLevel(i);
                startTime = performance.now();
                break;
            }
        }
    }
}

if (DEV_MODE) {
    canvas.addEventListener('click', handleDevClick);
}

// New function for the overlay
function renderDevOverlay() {
    if (!DEV_MODE || !showDevOverlay) return;
    
    // Semi-transparent black background
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Minimap area
    const mapSize = Math.min(canvas.width, canvas.height) * 0.4;
    const cellSize = mapSize / Math.max(mapWidth, mapHeight);
    const mapX = (canvas.width - mapWidth * cellSize) / 2;
    const mapY = 50;
    
    // Draw grid
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const cellX = mapX + x * cellSize;
            const cellY = mapY + y * cellSize;
            
            // Choose color based on cell type
            switch(map[y][x]) {
                case 0: // Empty space
                    ctx.fillStyle = "#444444";
                    break;
                case 1: // Wall
                    ctx.fillStyle = "#888888";
                    break;
                case 2: // Exit top
                case 3: // Exit left
                case 4: // Exit right
                case 5: // Exit bottom
                    ctx.fillStyle = "#4444ff";
                    break;
            }
            
            ctx.fillRect(cellX, cellY, cellSize - 1, cellSize - 1);
        }
    }
    
    // Draw colored sides for exits
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const cellX = mapX + x * cellSize;
            const cellY = mapY + y * cellSize;
            const cellValue = map[y][x];
            
            if (cellValue >= 2 && cellValue <= 5) {
                // Draw cell like a normal wall
                ctx.fillStyle = "#888888";
                ctx.fillRect(cellX, cellY, cellSize - 1, cellSize - 1);
                
                // Then the blue border on the corresponding side
                ctx.strokeStyle = "#4444ff";
                ctx.lineWidth = cellSize * 0.25; // 25% of cell size as border width
                
                ctx.beginPath();
                switch(cellValue) {
                    case 2: // Exit top
                        ctx.moveTo(cellX, cellY + ctx.lineWidth/2);
                        ctx.lineTo(cellX + cellSize, cellY + ctx.lineWidth/2);
                        break;
                    case 3: // Exit left
                        ctx.moveTo(cellX + ctx.lineWidth/2, cellY);
                        ctx.lineTo(cellX + ctx.lineWidth/2, cellY + cellSize);
                        break;
                    case 4: // Exit right
                        ctx.moveTo(cellX + cellSize - ctx.lineWidth/2, cellY);
                        ctx.lineTo(cellX + cellSize - ctx.lineWidth/2, cellY + cellSize);
                        break;
                    case 5: // Exit bottom
                        ctx.moveTo(cellX, cellY + cellSize - ctx.lineWidth/2);
                        ctx.lineTo(cellX + cellSize, cellY + cellSize - ctx.lineWidth/2);
                        break;
                }
                ctx.stroke();
                
                // Blue border around the entire cell
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 1;
                ctx.strokeRect(cellX, cellY, cellSize, cellSize);
            }
        }
    }
    
    // Draw player
    const playerScreenX = mapX + playerX * cellSize;
    const playerScreenY = mapY + playerY * cellSize;
    
    // Player point
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    ctx.arc(playerScreenX, playerScreenY, cellSize/3, 0, Math.PI * 2);
    ctx.fill();
    
    // View direction
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playerScreenX, playerScreenY);
    ctx.lineTo(
        playerScreenX + Math.cos(playerAngle) * cellSize,
        playerScreenY + Math.sin(playerAngle) * cellSize
    );
    ctx.stroke();
    
    // Title
    ctx.font = "20px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("Developer Overlay (F2 to toggle)", canvas.width/2, 30);
    
    // Level buttons only show in overlay
    renderDevControls();
}

function renderEndScreen() {
    // Black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    let y = 80;

    // Title
    ctx.font = "48px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("CONGRATULATIONS!", centerX, y);
    
    y += 60;
    ctx.font = "26px monospace";
    ctx.fillText(`${lastEnteredName}`, centerX, y);
    
    y += 60;
    ctx.fillText("You completed all mazes!", centerX, y);
    
    y += 40;
    ctx.fillText(`Total Time: ${totalTime.toFixed(3)}s`, centerX, y);
    
    // Restart hint
    y = canvas.height - 60;
    ctx.font = "20px monospace";
    ctx.fillText("Press ENTER to play again", centerX, y);
}

function onKeyUp(e) {
    if (e.key === 'Escape') {
        if (isEscPressed) {
            const holdTime = performance.now() - escPressStartTime;
            if (holdTime < ESC_HOLD_TIME) {
                // Normales ESC-Verhalten (Level neu starten)
                loadLevel(currentLevelIndex);
                startTime = performance.now();
                requestAnimationFrame(gameLoop);
            }
            isEscPressed = false;
            escPressStartTime = 0;
        }
    }
}

// Neue Funktion für den Ladebalken
function renderEscapeProgress() {
    if (!isEscPressed) return;
    
    const currentTime = performance.now();
    const holdTime = currentTime - escPressStartTime;
    const progress = Math.min(1.0, holdTime / ESC_HOLD_TIME);
    
    // Position und Größe des Ladebalkens
    const barWidth = 200;
    const barHeight = 20;
    const x = (canvas.width - barWidth) / 2;
    const y = canvas.height - 100;
    
    // Hintergrund des Ladebalkens
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(x - 5, y - 5, barWidth + 10, barHeight + 10);
    
    // Äußerer Rahmen
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);
    
    // Fortschrittsbalken
    ctx.fillStyle = "#4444ff";
    ctx.fillRect(x, y, barWidth * progress, barHeight);
    
    // Text
    ctx.font = "14px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("Hold ESC to restart", canvas.width/2, y - 10);
    
    // Wenn genau 3 Sekunden erreicht sind, zurück zum Start
    if (progress >= 1.0) {
        showingEndScreen = false;
        showingStartScreen = true;
        nameInputActive = true;
        currentLevelIndex = 0;
        totalTime = 0;
        currentInput = lastEnteredName || "";
        loadLevel(currentLevelIndex);
        isEscPressed = false;
        requestAnimationFrame(gameLoop);
    }
}
