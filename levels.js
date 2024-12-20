// 0 = empty space, 1 = wall
// 2 = exit top, 3 = exit left, 4 = exit right, 5 = exit bottom

function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

const level1 = {
    layout: [
        [1,1,1,1,1,1,1],
        [1,0,0,0,1,0,1],
        [1,0,1,0,0,0,1], 
        [1,0,0,0,1,2,1],
        [1,0,1,1,1,0,1],
        [1,0,0,0,0,0,1],
        [1,1,1,1,1,1,1]
    ],
    start: {x: 1.5, y: 1.5, angle: 0}
};

const level2 = {
    layout: [
        [1,1,1,1,1,1,1],
        [1,0,0,0,0,0,1],
        [1,0,1,0,1,0,1], 
        [1,0,0,0,0,0,1],
        [1,0,1,0,1,0,1],
        [1,0,0,0,4,0,1],
        [1,1,1,1,1,1,1]
    ],
    start: {x: 1.5, y: 1.5, angle: 0}
};

const level3 = {
    layout: [
        [1,1,1,1,1,1,1,1,1],
        [1,0,0,1,0,0,0,0,1],
        [1,0,0,0,0,1,0,0,1],
        [1,0,1,0,0,1,0,0,1],
        [1,0,0,1,0,4,0,0,1],
        [1,0,0,0,0,0,1,0,1],
        [1,0,0,1,0,0,0,0,1],
        [1,0,1,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1]
    ],
    start: {x: 1.5, y: 1.5, angle: 45}
};

const level4 = {
    layout: [
        [1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,1],
        [1,0,3,0,1,0,1,0,1],
        [1,0,0,0,0,0,0,0,1],
        [1,0,1,0,1,0,1,0,1],
        [1,0,0,0,0,0,0,0,1],
        [1,0,1,0,1,0,1,0,1],
        [1,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1]
    ],
    start: {x: 3.5, y: 3.5, angle: 0}
};

const level5 = {
    layout: [
        [1,1,1,1,1,1,1,1,1],
        [1,0,0,1,0,0,0,0,1],
        [1,0,1,0,3,1,1,0,1],
        [1,0,1,0,0,0,0,0,1],
        [1,0,1,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1]
    ],
    start: {x: 2.3, y: 1.3, angle: 135}
};

const level6 = {
    layout: [
        [1,1,1,1,1,1,1],
        [1,0,0,0,0,0,1],
        [1,0,1,0,1,0,1],
        [1,0,1,2,1,0,1],
        [1,0,1,0,1,0,1],
        [1,0,0,0,0,0,1],
        [1,1,1,1,1,1,1]
    ],
    start: {x: 5.5, y: 5.5, angle: 180}
};

const level7 = {
    layout: [
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,1,0,0,0,1],
        [1,0,1,1,0,1,0,1,0,1],
        [1,0,1,0,0,0,0,1,0,1],
        [1,0,1,0,1,1,0,1,0,1],
        [1,0,0,0,0,0,0,1,0,1],
        [1,1,1,1,1,1,0,1,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,2,1]
    ],
    start: {x: 1.5, y: 1.5, angle: 0}
};

const level8 = {
    layout: [
        [1,1,1,1,1,1,1,1],
        [1,0,0,0,1,0,0,1],
        [1,0,1,0,1,0,1,1],
        [1,0,1,0,0,0,0,1],
        [1,0,1,1,1,1,0,1],
        [1,0,0,0,0,1,0,1],
        [1,1,1,1,0,0,3,1],
        [1,1,1,1,1,1,1,1]
    ],
    start: {x: 1.5, y: 5.5, angle: -90}
};

const level9 = {
    layout: [
        [1,1,1,1,1,1,1,1,1],
        [1,0,0,1,0,0,0,0,1],
        [1,0,1,0,1,0,1,0,1],
        [1,0,1,0,0,0,1,0,1],
        [1,0,1,1,1,0,1,0,1],
        [1,0,0,0,1,0,1,0,1],
        [1,1,1,0,1,0,1,0,1],
        [1,0,0,0,0,0,0,3,1],
        [1,1,1,1,1,1,1,1,1]
    ],
    start: {x: 1.5, y: 1.5, angle: 0}
};

const level10 = {
    layout: [
        [1,1,1,1,1,1,1],
        [1,0,1,0,0,0,1],
        [1,0,1,0,1,0,1],
        [1,0,0,0,1,0,1],
        [1,0,1,1,1,0,1],
        [1,0,0,0,0,3,1],
        [1,1,1,1,1,1,1]
    ],
    start: {x: 5.5, y: 1.5, angle: 180}
};

const level11 = {
    layout: [
        [1,1,1,1,1,1,1,1],
        [1,0,0,1,0,0,0,1],
        [1,0,1,1,0,1,0,1],
        [1,0,1,0,0,1,0,1],
        [1,0,0,0,1,1,0,1],
        [1,1,1,0,0,0,0,1],
        [1,0,1,0,0,1,0,1],
        [1,1,1,1,1,1,2,1]
    ],
    start: {x: 1.5, y: 1.5, angle: 0}
};

const level12 = {
    layout: [
        [1,1,1,1,1,1,1,1,1],
        [1,0,0,0,1,0,0,0,1],
        [1,1,1,0,1,0,1,0,1],
        [1,0,0,0,0,0,1,0,1],
        [1,0,1,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,3,1],
        [1,1,1,1,1,1,1,1,1]
    ],
    start: {x: 7.5, y: 1.5, angle: 180}
};

const level13 = {
    layout: [
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,1,0,0,0,0,1],
        [1,0,1,0,1,0,1,1,0,1],
        [1,0,1,0,0,0,0,1,0,1],
        [1,0,1,1,1,1,0,1,0,1],
        [1,0,0,0,0,1,0,1,0,1],
        [1,1,1,1,0,1,0,1,0,1],
        [1,0,0,0,0,0,0,1,2,1],
        [1,1,1,1,1,1,1,1,1,1]
    ],
    start: {x: 1.5, y: 7.5, angle: -90}
};

const level14 = {
    layout: [
        [1,1,1,1,1,5,1],
        [1,0,1,0,1,0,1],
        [1,0,1,0,1,0,1],
        [1,0,1,0,1,0,1],
        [1,0,1,0,1,0,1],
        [1,0,0,0,0,0,1],
        [1,1,1,1,1,1,1]
    ],
    start: {x: 5.5, y: 1.5, angle: 90}
};

const levels = [level1, level2, level3, level4, level5, level6, level7, level8, level9, level10, level11, level12, level13, level14];
