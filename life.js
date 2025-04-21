const canvas = document.getElementById('life');
const ctx = canvas.getContext('2d');
const resolution = 10;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const cols = Math.floor(canvas.width / resolution);
const rows = Math.floor(canvas.height / resolution);

const OBJECT_PROPERTIES = {
    PLANET: { color: '#00aaff', baseSize: 1.5, mass: 10, charge: 1, gravity: 0.1, lifeInfluence: 0.02, shape: 'circle', pattern: true },
    SUN: { color: '#ffff00', baseSize: 2.5, mass: 20, charge: -1, gravity: 0.2, lifeInfluence: -0.05, shape: 'star' },
    BLACK_HOLE: { color: '#000000', baseSize: 2, mass: 30, charge: 0, gravity: 0.3, lifeInfluence: 0, shape: 'circle' },
    COMET: { color: '#ff00cc', baseSize: 0.7, mass: 1, charge: 0.5, gravity: 0, lifeInfluence: 0.01, shape: 'circle' }
    // NEBULA: { color: 'rgba(100, 100, 255, 0.1)', baseSize: 5, mass: 0, charge: 0, gravity: 0, lifeInfluence: 0.01, shape: 'blob' } // Future Nebula
};

let grid = createGrid();
let dynamicObjects = [];
let currentType = 'PLANET'; // Default creation type
let animationFrameId;
let gameSpeed = 1; // 1 is normal speed

function createGrid() {
    return new Array(cols).fill(null).map(() => new Array(rows).fill(0));
}

// Randomize life to start
for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
        grid[x][y] = Math.random() > 0.9 ? 1 : 0;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw life grid
    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            const cell = grid[x][y];
            ctx.fillStyle = cell ? '#00ff88' : '#111';
            ctx.fillRect(x * resolution, y * resolution, resolution - 1, resolution - 1);
        }
    }

    // Draw all dynamic objects
    for (const obj of dynamicObjects) {
        const props = OBJECT_PROPERTIES[obj.type];
        ctx.fillStyle = props.color;
        drawObject({...props, baseSize: obj.baseSize, shape: obj.shape}, obj.x * resolution, obj.y * resolution);
    }
}

function drawObject(props, centerX, centerY) {
    const radius = props.baseSize * resolution / 2;

    switch (props.shape) {
        case 'circle':
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
            if (props.pattern) {
                const numPatterns = Math.floor(Math.random() * 3) + 1; // 1 to 3 pattern circles
                for (let i = 0; i < numPatterns; i++) {
                    const patternRadius = radius * (0.1 + Math.random() * 0.3);
                    const angle = Math.random() * Math.PI * 2;
                    const dist = radius * (0.2 + Math.random() * 0.4);
                    const patternX = centerX + Math.cos(angle) * dist;
                    const patternY = centerY + Math.sin(angle) * dist;
                    ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + Math.random() * 0.3})`;
                    ctx.beginPath();
                    ctx.arc(patternX, patternY, patternRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            break;
        case 'star':
            const numPoints = Math.floor(Math.random() * 4) + 4; // 4 to 7 points
            const outerRadius = radius * 1.5;
            const innerRadius = radius * 0.6 * 1.5;
            let rot = Math.PI / 2 * 3;
            let x = centerX;
            let y = centerY;
            const step = Math.PI / numPoints;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY - outerRadius);
            for (let i = 0; i < numPoints; i++) {
                x = centerX + Math.cos(rot) * outerRadius;
                y = centerY + Math.sin(rot) * outerRadius;
                ctx.lineTo(x, y);
                rot += step;

                x = centerX + Math.cos(rot + step / 2) * innerRadius;
                y = centerY + Math.sin(rot + step / 2) * innerRadius;
                ctx.lineTo(x, y);
                rot += step;
            }
            ctx.closePath();
            ctx.fill();
            break;
        case 'blob':
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radius * 1.5, radius * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'ellipse':
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radius * 1.5, radius * 0.7, Math.random() * Math.PI * 2, 0, Math.PI * 2);
            ctx.fill();
            break;
        default:
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
    }
}

function nextGen(currentGrid) {
    const next = createGrid();

    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            const cell = currentGrid[x][y];
            let neighbors = 0;
            let environmentFactor = 0;

            for (let i = -1; i < 2; i++) {
                for (let j = -1; j < 2; j++) {
                    if (i === 0 && j === 0) continue;
                    const col = (x + i + cols) % cols;
                    const row = (y + j + rows) % rows;
                    neighbors += currentGrid[col][row];

                    for (const dynamicObj of dynamicObjects) {
                        const dx = (x + 0.5) - dynamicObj.x;
                        const dy = (y + 0.5) - dynamicObj.y;
                        const distSq = dx * dx + dy * dy;
                        if (distSq < 25) { // Influence radius
                            environmentFactor += OBJECT_PROPERTIES[dynamicObj.type].lifeInfluence / (distSq + 1);
                        }
                    }
                }
            }

            const adjustedNeighbors = neighbors + environmentFactor;

            if (cell === 1 && (adjustedNeighbors < 2 || adjustedNeighbors > 3)) {
                next[x][y] = 0;
            } else if (cell === 0 && adjustedNeighbors > 2 && adjustedNeighbors < 4) { // Adjusted birth rule
                next[x][y] = 1;
            } else {
                next[x][y] = cell;
            }
        }
    }

    return next;
}

function applyForces() {
    for (let i = dynamicObjects.length - 1; i >= 0; i--) {
        const obj1 = dynamicObjects[i];
        let forceX = 0;
        let forceY = 0;

        for (let j = i - 1; j >= 0; j--) {
            const obj2 = dynamicObjects[j];
            const props1 = OBJECT_PROPERTIES[obj1.type];
            const props2 = OBJECT_PROPERTIES[obj2.type];
            const dx = obj2.x - obj1.x;
            const dy = obj2.y - obj1.y;
            const distSq = dx * dx + dy * dy;

            if (distSq > 0) {
                const dist = Math.sqrt(distSq);

                // Gravity
                const gravityForce = (obj1.mass * props2.mass * props2.gravity) / distSq;
                forceX += gravityForce * dx / dist;
                forceY += gravityForce * dy / dist;

                // Charge
                const chargeForce = (obj1.charge * props2.charge) / distSq;
                forceX += chargeForce * dx / dist;
                forceY += chargeForce * dy / dist;

                // --- Sun Merging ---
                const mergeThresholdSq = Math.pow((obj1.baseSize + obj2.baseSize) * resolution * 0.2, 2); // Significantly reduced threshold

                if (obj1.type === 'SUN' && obj2.type === 'SUN' && distSq < mergeThresholdSq) {
                    const newMass = obj1.mass + obj2.mass;
                    const newSize = Math.cbrt(Math.pow(obj1.baseSize, 3) + Math.pow(obj2.baseSize, 3)) * 1.1; // Slightly smaller growth

                    const mergedSun = {
                        type: 'SUN',
                        x: (obj1.x + obj2.x) / 2,
                        y: (obj1.y + obj2.y) / 2,
                        mass: newMass,
                        baseSize: newSize,
                        vx: (obj1.vx + obj2.vx) / 2, // Inherit average velocity
                        vy: (obj1.vy + obj2.vy) / 2, // Inherit average velocity
                        charge: -1,
                        mergeCount: (obj1.mergeCount || 0) + (obj2.mergeCount || 0) + 1,
                        shape: 'star'
                    };

                    if (mergedSun.mergeCount > Math.floor(Math.random() * 3) + 2) {
                        mergedSun.type = 'BLACK_HOLE';
                        mergedSun.charge = 0;
                        mergedSun.baseSize *= 0.8;
                        mergedSun.shape = 'circle';
                        console.log("Two suns merged to form a black hole!");
                    } else {
                        console.log("Two suns merged!");
                    }

                    const indexToRemove1 = dynamicObjects.indexOf(obj1);
                    const indexToRemove2 = dynamicObjects.indexOf(obj2);

                    if (indexToRemove1 > -1 && indexToRemove2 > -1) {
                        if (indexToRemove1 > indexToRemove2) {
                            dynamicObjects.splice(indexToRemove1, 1);
                            dynamicObjects.splice(indexToRemove2, 1);
                        } else {
                            dynamicObjects.splice(indexToRemove2, 1);
                            dynamicObjects.splice(indexToRemove1, 1);
                        }
                        dynamicObjects.push(mergedSun);
                        continue;
                    }
                } else {
                    // Basic Collision
                    const collisionThresholdSq = Math.pow((props1.baseSize + props2.baseSize) * resolution * 0.3, 2);
                    if (distSq < collisionThresholdSq) {
                        console.log(`${obj1.type} collided with ${obj2.type}`);
                        dynamicObjects.splice(i, 1);
                        break;
                    }
                }
            }
        }

        if (i < dynamicObjects.length) {
            obj1.vx = (obj1.vx || 0) + forceX / obj1.mass;
            obj1.vy = (obj1.vy || 0) + forceY / obj1.mass;

            obj1.vx *= 0.98;
            obj1.vy *= 0.98;

            obj1.x += obj1.vx;
            obj1.y += obj1.vy;

            if (obj1.x < 0) obj1.x = cols;
            if (obj1.x > cols) obj1.x = 0;
            if (obj1.y < 0) obj1.y = rows;
            if (obj1.y > rows) obj1.y = 0;
        }
    }
}

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = Math.floor((event.clientX - rect.left) / resolution) + 0.5;
    const clickY = Math.floor((event.clientY - rect.top) / resolution) + 0.5;

    const placeDynamic = !event.altKey;
    const typeToPlace = placeDynamic ? currentType : 'COMET';
    const props = OBJECT_PROPERTIES[typeToPlace];
    let baseSize = props.baseSize;
    const baseMass = props.mass;
    let finalShape = props.shape;

    let sizeMultiplier = 0.8 + Math.random() * 0.4;
    let velocityMultiplier = 0.5 + Math.random() * 1.0;
    let massMultiplier = 0.7 + Math.random() * 0.6;

    if (typeToPlace === 'COMET') {
        baseSize = Math.max(0.7, baseSize * 1.5);
        sizeMultiplier *= 0.7;
        velocityMultiplier *= 2.0;
        massMultiplier *= 0.3;
        finalShape = Math.random() > 0.5 ? 'ellipse' : 'circle';
    } else if (typeToPlace === 'PLANET') {
        velocityMultiplier *= 0.5;
        massMultiplier *= 1.5;
    } else if (typeToPlace === 'SUN') {
        sizeMultiplier *= 1.5;
        velocityMultiplier *= 0.2;
        massMultiplier *= 3.0;
    } else if (typeToPlace === 'BLACK_HOLE') {
        sizeMultiplier *= 1.2;
        velocityMultiplier *= 0.3;
        massMultiplier *= 2.5;
    }

    const finalSize = baseSize * sizeMultiplier;
    const finalMass = baseMass * massMultiplier;
    const finalVX = (Math.random() - 0.5) * 0.2 * velocityMultiplier;
    const finalVY = (Math.random() - 0.5) * 0.2 * velocityMultiplier;

    console.log(`Creating ${typeToPlace} at (${clickX.toFixed(2)}, ${clickY.toFixed(2)}) - Shape: ${finalShape}, Size: ${finalSize.toFixed(2)}, Mass: ${finalMass.toFixed(2)}, VX: ${finalVX.toFixed(2)}, VY: ${finalVY.toFixed(2)}`);

    dynamicObjects.push({
        type: typeToPlace,
        x: clickX,
        y: clickY,
        vx: finalVX,
        vy: finalVY,
        mass: finalMass,
        charge: props.charge,
        baseSize: finalSize,
        shape: finalShape
    });
});

document.addEventListener('keydown', (event) => {
    const key = event.key.toUpperCase();
    if (key === 'P') {
        currentType = 'PLANET';
        console.log(`Switched to creation type: ${currentType}`);
    } else if (key === 'S') {
        currentType = 'SUN';
        console.log(`Switched to creation type: ${currentType}`);
    } else if (key === 'B') {
        currentType = 'BLACK_HOLE';
        console.log(`Switched to creation type: ${currentType}`);
    } else if (key === 'C') {
        currentType = 'COMET';
        console.log(`Switched to creation type: ${currentType}`);
    } else if (event.key === '+') {
        gameSpeed *= 1.2;
        console.log(`Game speed increased to: ${gameSpeed.toFixed(2)}`);
    } else if (event.key === '-') {
        gameSpeed /= 1.2;
        gameSpeed = Math.max(0.1, gameSpeed);
        console.log(`Game speed decreased to: ${gameSpeed.toFixed(2)}`);
    } else if (event.key === 'r') {
        console.log("Randomize functionality is now for dynamic objects (not yet implemented).");
    }
});
function update() {
    if (gameSpeed > 0) {
        for (let i = 0; i < gameSpeed; i++) {
            applyForces();
            grid = nextGen(grid);
        }
        draw();
    }
    animationFrameId = requestAnimationFrame(update);
}

// Initial console message with commands
console.log("--- Game of Life in the Universe ---");
console.log("Keyboard 'P': Select Planet for creation.");
console.log("Keyboard 'S': Select Sun for creation.");
console.log("Keyboard 'B': Select Black Hole for creation.");
console.log("Keyboard 'C': Select Comet for creation.");
// console.log("Keyboard 'N': Select Nebula for creation (not yet implemented).");
console.log("Mouse Click: Place a dynamic object of the selected type.");
console.log("Alt + Click: Place a dynamic Comet.");
console.log("Keyboard '+': Increase simulation speed.");
console.log("Keyboard '-': Decrease simulation speed.");
console.log("Keyboard 'R': Placeholder for future dynamic object randomization.");
console.log("-------------------------------------");

// Start the animation loop
update();
