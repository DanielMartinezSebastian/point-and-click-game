// Finer than the historical 0.9 so narrow passages between walls are
// represented by at least one open cell and A* can route through them.
const DEFAULT_CELL_SIZE = 0.5;
// Wall clearance: thin walls (halfZ≈0.25) need 0.6 so grid cells near the
// wall face are marked blocked and the player never clips through diagonals.
const DEFAULT_OBSTACLE_PADDING = 0.6;
// Interaction object clearance: small cubes (halfX/Z≈0.95) don't need the
// same clearance as walls. 0.3 keeps the player just clear of the surface
// while leaving narrow corridors navigable.
const DEFAULT_INTERACTION_PADDING = 0.3;
const DEFAULT_SEGMENT_SAMPLE_STEP = 0.25;
const NEIGHBOR_OFFSETS = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
];
export function findPath({ start, goal, bounds, walls, interactions, cellSize = DEFAULT_CELL_SIZE, obstaclePadding = DEFAULT_OBSTACLE_PADDING, interactionPadding = DEFAULT_INTERACTION_PADDING, segmentSampleStep = DEFAULT_SEGMENT_SAMPLE_STEP, maxIterations, allowPartialPath = true, }) {
    const obstacles = [
        ...walls.map((wall) => toObstacle(wall.position[0], wall.position[2], wall.halfSize[0], wall.halfSize[2], wall.rotationY, obstaclePadding, wall.openings)),
        ...interactions
            .filter((interaction) => interaction.hasCollision)
            .map((interaction) => toObstacle(interaction.position[0], interaction.position[2], interaction.halfSize[0], interaction.halfSize[2], interaction.rotationY ?? 0, interactionPadding)),
    ];
    if (isSegmentClear(start, goal, bounds, obstacles, segmentSampleStep)) {
        return [goal];
    }
    const width = Math.max(1, Math.floor((bounds.maxX - bounds.minX) / cellSize) + 1);
    const height = Math.max(1, Math.floor((bounds.maxZ - bounds.minZ) / cellSize) + 1);
    const cellCount = width * height;
    // Generous default: each cell is expanded at most once, so the whole grid
    // can be explored. Callers can still cap it explicitly.
    const iterationCap = maxIterations ?? cellCount * 4;
    const blocked = new Uint8Array(cellCount);
    for (let gridZ = 0; gridZ < height; gridZ += 1) {
        for (let gridX = 0; gridX < width; gridX += 1) {
            const point = gridToPoint(gridX, gridZ, bounds, cellSize);
            blocked[gridIndex(gridX, gridZ, width)] = isPointBlocked(point, bounds, obstacles)
                ? 1
                : 0;
        }
    }
    const startCell = findNearestOpenCell(pointToGrid(start, bounds, cellSize), width, height, blocked);
    const goalCell = findNearestOpenCell(pointToGrid(goal, bounds, cellSize), width, height, blocked);
    if (!startCell || !goalCell) {
        return null;
    }
    const startIndex = gridIndex(startCell.x, startCell.z, width);
    const goalIndex = gridIndex(goalCell.x, goalCell.z, width);
    if (startIndex === goalIndex) {
        // Start and goal collapse to the same cell but the direct segment was
        // blocked (thin obstacle between them) — just steer toward the goal.
        return [goal];
    }
    const gScore = new Float64Array(cellCount).fill(Number.POSITIVE_INFINITY);
    const cameFrom = new Int32Array(cellCount).fill(-1);
    const closed = new Uint8Array(cellCount);
    const open = new MinHeap();
    gScore[startIndex] = 0;
    open.push(startIndex, heuristic(startCell, goalCell));
    // Track the open cell closest to the goal so we can return a partial route
    // when the goal sits in a different connected region.
    let bestIndex = startIndex;
    let bestHeuristic = heuristic(startCell, goalCell);
    let iterations = 0;
    while (open.size > 0 && iterations < iterationCap) {
        iterations += 1;
        const currentIndex = open.pop();
        if (currentIndex < 0 || closed[currentIndex]) {
            continue;
        }
        closed[currentIndex] = 1;
        if (currentIndex === goalIndex) {
            return buildRoute(cameFrom, currentIndex, width, bounds, cellSize, start, goal, obstacles, segmentSampleStep);
        }
        const currentCell = indexToGrid(currentIndex, width);
        const currentHeuristic = heuristic(currentCell, goalCell);
        if (currentHeuristic < bestHeuristic) {
            bestHeuristic = currentHeuristic;
            bestIndex = currentIndex;
        }
        for (const [offsetX, offsetZ] of NEIGHBOR_OFFSETS) {
            const nextX = currentCell.x + offsetX;
            const nextZ = currentCell.z + offsetZ;
            if (nextX < 0 || nextX >= width || nextZ < 0 || nextZ >= height) {
                continue;
            }
            const neighborIndex = gridIndex(nextX, nextZ, width);
            if (blocked[neighborIndex] || closed[neighborIndex]) {
                continue;
            }
            // Disallow cutting diagonally past a corner: both orthogonal cells must
            // be open, otherwise the path would clip the obstacle.
            if (offsetX !== 0 && offsetZ !== 0) {
                const horizontalIndex = gridIndex(currentCell.x + offsetX, currentCell.z, width);
                const verticalIndex = gridIndex(currentCell.x, currentCell.z + offsetZ, width);
                if (blocked[horizontalIndex] || blocked[verticalIndex]) {
                    continue;
                }
            }
            const tentativeGScore = gScore[currentIndex] + Math.hypot(offsetX, offsetZ);
            if (tentativeGScore >= gScore[neighborIndex]) {
                continue;
            }
            cameFrom[neighborIndex] = currentIndex;
            gScore[neighborIndex] = tentativeGScore;
            open.push(neighborIndex, tentativeGScore + heuristic({ x: nextX, z: nextZ }, goalCell));
        }
    }
    // Goal unreachable. Return a partial route toward the closest reachable cell
    // so the character still advances (and a follow-up click can continue).
    if (allowPartialPath && bestIndex !== startIndex) {
        return buildRoute(cameFrom, bestIndex, width, bounds, cellSize, start, 
        // The partial route ends at the reachable cell, not the real goal.
        gridToPoint(indexToGrid(bestIndex, width).x, indexToGrid(bestIndex, width).z, bounds, cellSize), obstacles, segmentSampleStep);
    }
    return null;
}
/**
 * Reconstructs the grid path to `endIndex`, swaps the snapped endpoints for the
 * real world start/goal, and smooths the result via line-of-sight checks.
 */
function buildRoute(cameFrom, endIndex, width, bounds, cellSize, start, goal, obstacles, segmentSampleStep) {
    const gridPath = reconstructPath(cameFrom, endIndex, width);
    const rawPoints = [
        start,
        ...gridPath.map((cell) => gridToPoint(cell.x, cell.z, bounds, cellSize)),
        goal,
    ];
    return smoothPath(rawPoints, bounds, obstacles, segmentSampleStep);
}
/**
 * Array-backed binary min-heap keyed by an external priority. Uses lazy
 * deletion: a node may be pushed multiple times with improving priorities,
 * and stale pops are skipped by the caller via a `closed` check.
 */
class MinHeap {
    constructor() {
        this.indices = [];
        this.priorities = [];
    }
    get size() {
        return this.indices.length;
    }
    push(index, priority) {
        this.indices.push(index);
        this.priorities.push(priority);
        this.siftUp(this.indices.length - 1);
    }
    pop() {
        const n = this.indices.length;
        if (n === 0)
            return -1;
        const topIndex = this.indices[0];
        const lastIndex = this.indices.pop();
        const lastPriority = this.priorities.pop();
        if (n > 1) {
            this.indices[0] = lastIndex;
            this.priorities[0] = lastPriority;
            this.siftDown(0);
        }
        return topIndex;
    }
    siftUp(i) {
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (this.priorities[parent] <= this.priorities[i])
                break;
            this.swap(i, parent);
            i = parent;
        }
    }
    siftDown(i) {
        const n = this.indices.length;
        for (;;) {
            const left = 2 * i + 1;
            const right = 2 * i + 2;
            let smallest = i;
            if (left < n && this.priorities[left] < this.priorities[smallest]) {
                smallest = left;
            }
            if (right < n && this.priorities[right] < this.priorities[smallest]) {
                smallest = right;
            }
            if (smallest === i)
                break;
            this.swap(i, smallest);
            i = smallest;
        }
    }
    swap(a, b) {
        const ti = this.indices[a];
        this.indices[a] = this.indices[b];
        this.indices[b] = ti;
        const tp = this.priorities[a];
        this.priorities[a] = this.priorities[b];
        this.priorities[b] = tp;
    }
}
function toObstacle(x, z, halfX, halfZ, rotationY, padding, openings) {
    return {
        x,
        z,
        halfX,
        halfZ,
        rotationY: rotationY ?? 0,
        padding,
        openings: openings?.map((o) => ({
            centerX: o.position[0],
            centerZ: o.position[2],
            halfX: o.halfSize[0],
            halfZ: o.halfSize[2],
        })),
    };
}
function pointToGrid(point, bounds, cellSize) {
    return {
        x: Math.round((point.x - bounds.minX) / cellSize),
        z: Math.round((point.z - bounds.minZ) / cellSize),
    };
}
function gridToPoint(gridX, gridZ, bounds, cellSize) {
    return {
        x: bounds.minX + gridX * cellSize,
        z: bounds.minZ + gridZ * cellSize,
    };
}
function gridIndex(gridX, gridZ, width) {
    return gridZ * width + gridX;
}
function indexToGrid(index, width) {
    return {
        x: index % width,
        z: Math.floor(index / width),
    };
}
function heuristic(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
}
function reconstructPath(cameFrom, currentIndex, width) {
    const path = [indexToGrid(currentIndex, width)];
    let cursor = currentIndex;
    while (cameFrom[cursor] >= 0) {
        cursor = cameFrom[cursor];
        path.push(indexToGrid(cursor, width));
    }
    path.reverse();
    return path.slice(1, -1);
}
function smoothPath(points, bounds, obstacles, segmentSampleStep) {
    if (points.length <= 2) {
        return [points[points.length - 1]];
    }
    const result = [];
    let anchorIndex = 0;
    while (anchorIndex < points.length - 1) {
        let nextIndex = points.length - 1;
        while (nextIndex > anchorIndex + 1) {
            if (isSegmentClear(points[anchorIndex], points[nextIndex], bounds, obstacles, segmentSampleStep)) {
                break;
            }
            nextIndex -= 1;
        }
        result.push(points[nextIndex]);
        anchorIndex = nextIndex;
    }
    return result;
}
function findNearestOpenCell(cell, width, height, blocked) {
    const clampedX = clamp(cell.x, 0, width - 1);
    const clampedZ = clamp(cell.z, 0, height - 1);
    const startIndex = gridIndex(clampedX, clampedZ, width);
    if (!blocked[startIndex]) {
        return { x: clampedX, z: clampedZ };
    }
    const maxRadius = Math.max(width, height);
    for (let radius = 1; radius < maxRadius; radius += 1) {
        for (let offsetZ = -radius; offsetZ <= radius; offsetZ += 1) {
            for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
                if (Math.max(Math.abs(offsetX), Math.abs(offsetZ)) !== radius) {
                    continue;
                }
                const nextX = clampedX + offsetX;
                const nextZ = clampedZ + offsetZ;
                if (nextX < 0 || nextX >= width || nextZ < 0 || nextZ >= height) {
                    continue;
                }
                if (!blocked[gridIndex(nextX, nextZ, width)]) {
                    return { x: nextX, z: nextZ };
                }
            }
        }
    }
    return null;
}
function isSegmentClear(start, goal, bounds, obstacles, segmentSampleStep) {
    const distance = Math.hypot(goal.x - start.x, goal.z - start.z);
    const samples = Math.max(1, Math.ceil(distance / segmentSampleStep));
    for (let index = 0; index <= samples; index += 1) {
        const t = index / samples;
        const point = {
            x: lerp(start.x, goal.x, t),
            z: lerp(start.z, goal.z, t),
        };
        if (isPointBlocked(point, bounds, obstacles)) {
            return false;
        }
    }
    return true;
}
function isPointBlocked(point, bounds, obstacles) {
    if (point.x < bounds.minX ||
        point.x > bounds.maxX ||
        point.z < bounds.minZ ||
        point.z > bounds.maxZ) {
        return true;
    }
    return obstacles.some((obstacle) => isPointInsideObstacle(point, obstacle));
}
function isPointInsideObstacle(point, obstacle) {
    const localX = point.x - obstacle.x;
    const localZ = point.z - obstacle.z;
    const cos = Math.cos(-obstacle.rotationY);
    const sin = Math.sin(-obstacle.rotationY);
    const rotatedX = localX * cos - localZ * sin;
    const rotatedZ = localX * sin + localZ * cos;
    // Check if the point is inside the obstacle's solid area (with padding)
    const insideWall = Math.abs(rotatedX) <= obstacle.halfX + obstacle.padding &&
        Math.abs(rotatedZ) <= obstacle.halfZ + obstacle.padding;
    if (!insideWall)
        return false;
    // If the point is inside the wall, check if it is also inside an opening.
    // Openings are holes that allow traversal.
    // - halfX (horizontal width): subtract padding so the agent fits through
    //   with clearance (opening must be wide enough).
    // - halfZ (wall depth/thickness): do NOT subtract padding — this dimension
    //   spans the wall's thickness, not the passage width. The opening is always
    //   set to wall.halfZ + margin, so subtracting padding would make it
    //   negative for thin walls (halfZ ≈ 0.25–0.30).
    if (obstacle.openings && obstacle.openings.length > 0) {
        for (const opening of obstacle.openings) {
            const openHalfX = opening.halfX - obstacle.padding;
            if (openHalfX > 0 &&
                Math.abs(rotatedX - opening.centerX) <= openHalfX &&
                Math.abs(rotatedZ - opening.centerZ) <= opening.halfZ) {
                // Point is inside an opening → not blocked
                return false;
            }
        }
    }
    return true;
}
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function lerp(start, end, amount) {
    return start + (end - start) * amount;
}
//# sourceMappingURL=findPath.js.map