"use strict";

function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
}

const DEBUG_MODE = true;

// Lade den zuletzt verwendeten Namen aus dem localStorage
let lastEnteredName = localStorage.getItem('lastEnteredName') || "UNKNOWN";

// At the beginning of the file, load the name from localStorage if it exists
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

// Load highscores from localStorage or init
let highscores = loadHighscores();

loadLevel(currentLevelIndex);
startTime = performance.now();
requestAnimationFrame(gameLoop);

document.addEventListener('keydown', onKeyDown);

function onKeyDown(e) {
    if (levelFinished && showingScoreboard && !waitingForNameEntry) {
        // If scoreboard is showing
        if (newHighscore) {
            // If a new highscore was achieved, pressing a key now triggers the name input
            newHighscore = false;
            waitingForNameEntry = true;
            // After a small timeout (to ensure screen is updated), prompt name
            setTimeout(() => {
                let playerName = prompt("NEW BEST TIME: " + pendingHighscoreTime.toFixed(3) + "s!\nEnter your name (up to 8 chars):", lastEnteredName);
                if (!playerName) playerName = lastEnteredName;  // Verwende den letzten Namen wenn Cancel oder leer
                playerName = playerName.substring(0,8).toUpperCase();

                // Update lastEnteredName und speichere im localStorage
                lastEnteredName = playerName;
                localStorage.setItem('lastEnteredName', lastEnteredName);

                let scoreList = highscores[levelNo] || [];
                scoreList.push({name: playerName, time: pendingHighscoreTime});
                scoreList.sort((a,b) => a.time - b.time);
                scoreList = scoreList.slice(0,5);
                highscores[levelNo] = scoreList;
                saveHighscores();

                waitingForNameEntry = false;
                // Show updated scoreboard
                showScoreboard(levelNo, pendingHighscoreTime, false); 
            }, 200);
            return;
        } else {
            // Only proceed to next level if Enter is pressed
            if (e.key === 'Enter') {
                nextLevel();
            }
        }
        return;
    }

    if (levelFinished) {
        // Level finished but scoreboard not shown yet - do nothing
        return;
    }

    // Normal gameplay keys
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
    logDebug("Level completed in " + finalTime.toFixed(3) + "s");
    levelFinished = true;
    levelNo = currentLevelIndex + 1;

    let scoreList = highscores[levelNo] || [];
    scoreList.sort((a,b) => a.time - b.time);

    let canBeHighscore = false;
    if (scoreList.length < 5) {
        canBeHighscore = true;
    } else {
        for (let i = 0; i < scoreList.length; i++) {
            if (finalTime < scoreList[i].time) {
                canBeHighscore = true;
                break;
            }
        }
    }

    pendingHighscoreTime = finalTime;
    newHighscore = canBeHighscore;
    showScoreboard(levelNo, finalTime, canBeHighscore);
}

function showScoreboard(levelNo, finalTime, showNewBestTime) {
    showingScoreboard = true;

    // Clear screen
    ctx.fillStyle = "#000000";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    let scoreList = highscores[levelNo] || [];
    scoreList.sort((a,b) => a.time - b.time);

    ctx.fillStyle = "#ffffff";
    ctx.font = "26px monospace";
    
    // Berechne die Breite des Scoreboards (ca. 500 Pixel)
    const scoreboardWidth = 500;
    const leftMargin = (canvas.width - scoreboardWidth) / 2;
    
    // Alle Texte linksbündig beginnen
    ctx.textAlign = "left";

    // Header
    let title = "MAZE                       LVL " + levelNo;
    ctx.fillText(title, leftMargin, 50);
    ctx.fillText("--------------------------------", leftMargin, 80);
    
    // "BEST TIMES" rechtsbündig zur Linie ausrichten
    ctx.textAlign = "right";
    ctx.fillText("BEST TIMES", leftMargin + scoreboardWidth, 110);
    ctx.textAlign = "left";

    // Highscore-Einträge
    for (let i = 0; i < 5; i++) {
        let entry = scoreList[i];
        let rank = (i+1) + ".";
        if (entry) {
            // Rank linksbündig
            ctx.fillText(rank.padEnd(3), leftMargin, 150 + i*30);
            // Name nach dem Rank, mit mehr Abstand
            ctx.fillText(entry.name.padEnd(8), leftMargin + 70, 150 + i*30);
            // Zeit rechtsbündig
            ctx.textAlign = "right";
            ctx.fillText(entry.time.toFixed(3) + "s", leftMargin + scoreboardWidth, 150 + i*30);
            ctx.textAlign = "left";
        } else {
            ctx.fillText(rank, leftMargin, 150 + i*30);
        }
    }

    let yOffset = 150 + 5*30 + 40;

    if (showNewBestTime) {
        let msg = "NEW BEST TIME: " + finalTime.toFixed(3) + "s!";
        ctx.fillText(msg, leftMargin, yOffset);
        yOffset += 40;
        ctx.fillText("Press any key to enter your name", leftMargin, yOffset);
    } else {
        ctx.fillText("Press ENTER for next level", leftMargin, yOffset);
    }
}

function nextLevel() {
    currentLevelIndex++;
    if (currentLevelIndex >= levels.length) {
        // All levels done, restart?
        currentLevelIndex = 0;
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
    if (!levelFinished) {
        currentTime = (performance.now() - startTime) / 1000;
        update();
        render();
        requestAnimationFrame(gameLoop);
    }
}

function update() {
    // possibly additional logic
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

// When displaying the name input field, set its initial value
function showNameInput() {
    const nameInput = document.getElementById('nameInput');
    nameInput.value = playerName;
}

function normalizeAngle(angle) {
    // Konvertiere zu Grad
    let degrees = radiansToDegrees(angle);
    // Normalisiere auf 0-360
    degrees = ((degrees % 360) + 360) % 360;
    // Zurück zu Radianten
    return degreesToRadians(degrees);
}
