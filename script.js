"use strict";

const DEBUG_MODE = true;

function logDebug(msg) {
    if (DEBUG_MODE) {
        console.log("[DEBUG]", msg);
    }
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const levelNumberDisplay = document.getElementById('levelNumber');
const timeCounterDisplay = document.getElementById('timeCounter');

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
const numRays = canvas.width;
const viewDist = 20;

let startTime = 0;
let currentTime = 0;

loadLevel(currentLevelIndex);
startTime = performance.now();
requestAnimationFrame(gameLoop);

document.addEventListener('keydown', onKeyDown);

function onKeyDown(e) {
    logDebug("Key pressed: " + e.key);
    logDebug("Current Position: (" + playerX.toFixed(2) + "," + playerY.toFixed(2) + "), Angle: " + playerAngle.toFixed(2));

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
        playerAngle -= rotSpeed;
        logDebug("Player angle after turn left: " + playerAngle.toFixed(2));
    }
    if (e.key === "ArrowRight") {
        playerAngle += rotSpeed;
        logDebug("Player angle after turn right: " + playerAngle.toFixed(2));
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
    playerAngle = level.start.angle;
    levelNumberDisplay.textContent = (index + 1).toString();
    startTime = performance.now();
    logDebug("Loaded level " + (index + 1) + " with size " + mapWidth + "x" + mapHeight);
    logDebug("Start position: (" + playerX + "," + playerY + "), angle: " + playerAngle);
}

function checkExit() {
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
    currentTime = (performance.now() - startTime) / 1000;
    timeCounterDisplay.textContent = currentTime.toFixed(2);
    update();
    render();
    requestAnimationFrame(gameLoop);
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
            const lineHeight = Math.min(canvas.height, (1 / dist) * 300);
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
                    // Exit side hit, color blue instead of gray
                    // Brightness like gray, but in the blue channel
                    r = brightness;
                    g = brightness;
                    b = 200; // slightly stronger blue, feel free to adjust
                    // to make it more "blue" you could reduce r and g
                    // e.g. r=brightness*0.5, g=brightness*0.5, b=brightness*1.5
                    r = Math.floor(brightness * 0.5);
                    g = Math.floor(brightness * 0.5);
                    b = Math.min(255, brightness + 55); // slightly brighter blue
                }
            }

            ctx.fillStyle = `rgb(${r},${g},${b})`;

            const x = i; 
            ctx.fillRect(x, (canvas.height - lineHeight) / 2, 1, lineHeight);
        }
    }
}

// DDA-based raycasting to determine side and cell
function castRayDDA(angle) {
    let sinA = Math.sin(angle);
    let cosA = Math.cos(angle);

    let mapX = Math.floor(playerX);
    let mapY = Math.floor(playerY);

    // Length of rays per X/Y direction
    let deltaDistX = Math.abs(1 / cosA);
    let deltaDistY = Math.abs(1 / sinA);

    let stepX, stepY;
    let sideDistX, sideDistY;

    // Set step direction and initial side distance
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
    let side = 0; // 0 = x side hit, 1 = y side hit
    let cellValue = 0;
    let distance = 0;

    while (!hit && distance < viewDist) {
        // Which distance is smaller? Determines whether we proceed in x or y direction
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
            // Outside the map
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

    // Calculate distance to the wall
    if (side === 0) {
        // x side hit
        distance = (sideDistX - deltaDistX);
    } else {
        // y side hit
        distance = (sideDistY - deltaDistY);
    }

    // Determine side (N,S,W,E)
    // Logic:
    // side=0 => vertical wall hit
    //  cosA>0 => ray to the right => hit from the west => wall side is W
    //  cosA<0 => ray to the left => wall side is E
    // side=1 => horizontal wall hit
    //  sinA>0 => ray down => hit from above => wall side is N
    //  sinA<0 => ray up => hit from below => wall side is S

    let wallSide = 'N';
    if (side === 0) {
        // Vertical
        if (cosA > 0) {
            wallSide = 'W'; // coming from the left
        } else {
            wallSide = 'E'; // coming from the right
        }
    } else {
        // Horizontal
        if (sinA > 0) {
            wallSide = 'N'; // coming from above
        } else {
            wallSide = 'S'; // coming from below
        }
    }

    return {dist: distance, cellValue: cellValue, side: wallSide, cellX: mapX, cellY: mapY};
}
