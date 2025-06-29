import * as THREE from 'three';

export class Building {
    constructor() {
        this.rooms = [];
        this.walls = [];
        this.doors = [];
        this.exits = [];
        this.meshes = new THREE.Group();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.safeSpots = []; // Store safe spots under desks and tables
    }

    createRoom(position, size, name, wallColor = 0xf5f5dc) {
        const room = {
            name,
            position,
            size,
            walls: [],
            color: wallColor
        };
        this.rooms.push(room);
        return room;
    }

    createWall(start, end, height = 3, color = 0xf5f5dc) {
        const length = start.distanceTo(end);
        const wallGeometry = new THREE.BoxGeometry(length, height, 0.2);
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: color,
            roughness: 0.7,
            metalness: 0.1
        });
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        
        const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        wall.position.copy(center);
        wall.position.y = height / 2;
        
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        wall.rotation.y = Math.atan2(direction.x, direction.z);
        
        wall.castShadow = true;
        wall.receiveShadow = true;
        
        this.walls.push(wall);
        this.meshes.add(wall);
        
        return wall;
    }

    createDoor(position, rotation = 0, color = 0x8B4513) {
        const doorGeometry = new THREE.BoxGeometry(1.2, 2.5, 0.1);
        const doorMaterial = new THREE.MeshStandardMaterial({ 
            color: color,
            roughness: 0.5,
            metalness: 0.2
        });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        
        door.position.copy(position);
        door.position.y = 1.25;
        door.rotation.y = rotation;
        
        door.castShadow = true;
        door.receiveShadow = true;
        
        // Add door frame
        const frameGeometry = new THREE.BoxGeometry(1.4, 2.7, 0.2);
        const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.copy(position);
        frame.position.y = 1.35;
        frame.rotation.y = rotation;
        
        this.doors.push({
            mesh: door,
            frame: frame,
            isOpen: false,
            originalRotation: rotation
        });
        
        this.meshes.add(frame);
        this.meshes.add(door);
        
        return door;
    }

    createExit(position) {
        const exit = {
            position: position.clone(),
            mesh: null
        };
        
        const exitGeometry = new THREE.BoxGeometry(2, 0.1, 2);
        const exitMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.2
        });
        const exitMesh = new THREE.Mesh(exitGeometry, exitMaterial);
        exitMesh.position.copy(position);
        exitMesh.position.y = 0.05;
        
        this.exits.push(exit);
        this.meshes.add(exitMesh);
        
        return exit;
    }

    createBarCounter(position, rotation = 0) {
        // Create main bar counter
        const counterGeometry = new THREE.BoxGeometry(15, 1.5, 1); // Larger counter
        const counterMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Dark wood color
            roughness: 0.5,
            metalness: 0.3,
            emissive: 0x4a2f1b,
            emissiveIntensity: 0.3
        });
        const counter = new THREE.Mesh(counterGeometry, counterMaterial);
        counter.position.copy(position);
        counter.position.y = 1.5;
        counter.rotation.y = rotation;
        counter.castShadow = true;
        counter.receiveShadow = true;
        this.meshes.add(counter);

        // Create back shelf with increased height and moved forward
        const shelfGeometry = new THREE.BoxGeometry(12, 8, 0.6); // Larger shelf
        const shelfMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a2f1b, // Darker wood color
            roughness: 0.6,
            metalness: 0.2,
            emissive: 0x4a2f1b, // Add glow
            emissiveIntensity: 0.8
        });
        const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
        shelf.position.set(
            position.x,
            position.y + 5, // Higher position
            position.z + (rotation === 0 ? -0.5 : 0.5) // Much closer to counter
        );
        shelf.rotation.y = rotation;
        shelf.castShadow = true;
        shelf.receiveShadow = true;
        shelf.userData.isInteractive = true;
        shelf.userData.type = 'shelf';
        this.meshes.add(shelf);

        // Create shelf levels with increased spacing
        const shelfLevels = 5; // More levels
        for (let i = 0; i < shelfLevels; i++) {
            const levelGeometry = new THREE.BoxGeometry(12, 0.2, 0.6); // Thicker levels
            const levelMaterial = new THREE.MeshStandardMaterial({
                color: 0x4a2f1b,
                roughness: 0.6,
                metalness: 0.2,
                emissive: 0x4a2f1b,
                emissiveIntensity: 0.8
            });
            const level = new THREE.Mesh(levelGeometry, levelMaterial);
            level.position.set(
                position.x,
                position.y + 2.5 + i * 1.8, // More spacing between levels
                position.z + (rotation === 0 ? -0.5 : 0.5)
            );
            level.rotation.y = rotation;
            level.castShadow = true;
            level.receiveShadow = true;
            level.userData.isInteractive = true;
            level.userData.type = 'shelfLevel';
            this.meshes.add(level);
        }

        // Modify drink positions to include many more bottles
        const drinkPositions = [];
        
        // Function to add bottles at a specific height
        const addBottlesAtHeight = (height, spacing) => {
            for (let i = -5; i <= 5; i += spacing) {
                drinkPositions.push({
                    x: i,
                    y: height,
                    z: rotation === 0 ? -0.5 : 0.5
                });
            }
        };

        // Bottom section bottles (very densely packed)
        for (let h = 2.5; h <= 4.3; h += 0.15) { // Even closer vertical spacing
            addBottlesAtHeight(h, 0.2); // Closer horizontal spacing
        }

        // Middle section bottles (extremely densely packed)
        for (let h = 4.8; h <= 7.9; h += 0.15) { // Even closer vertical spacing
            addBottlesAtHeight(h, 0.15); // Even closer horizontal spacing
        }

        // Top section bottles (densely packed)
        for (let h = 8.4; h <= 9.7; h += 0.15) { // Even closer vertical spacing
            addBottlesAtHeight(h, 0.2); // Closer horizontal spacing
        }

        // Add extra bottles in the middle spaces
        // Bottom to middle transition
        for (let h = 4.3; h <= 4.8; h += 0.15) {
            addBottlesAtHeight(h, 0.2);
        }

        // Middle to top transition
        for (let h = 7.9; h <= 8.4; h += 0.15) {
            addBottlesAtHeight(h, 0.2);
        }

        // Add staggered bottles in the middle spaces
        const addStaggeredBottles = (startHeight, endHeight, spacing) => {
            for (let h = startHeight; h <= endHeight; h += spacing) {
                for (let i = -5; i <= 5; i += spacing * 1.5) {
                    drinkPositions.push({
                        x: i + (spacing / 2), // Offset every other row
                        y: h,
                        z: rotation === 0 ? -0.5 : 0.5
                    });
                }
            }
        };

        // Add staggered bottles in the middle spaces
        addStaggeredBottles(4.3, 4.8, 0.15); // Bottom to middle
        addStaggeredBottles(7.9, 8.4, 0.15); // Middle to top

        const drinkTypes = [
            { name: "Whiskey", color: 0x8B4513, height: 0.6, price: 12 },
            { name: "Rum", color: 0xD2691E, height: 0.55, price: 10 },
            { name: "Vodka", color: 0xFFFFFF, height: 0.5, price: 8 },
            { name: "Gin", color: 0xE6E6FA, height: 0.55, price: 9 },
            { name: "Tequila", color: 0xFFD700, height: 0.5, price: 11 },
            { name: "Champagne", color: 0xFFFACD, height: 0.6, price: 15 },
            { name: "Beer", color: 0xFFA500, height: 0.7, price: 6 },
            { name: "Wine", color: 0x800000, height: 0.65, price: 14 },
            { name: "Brandy", color: 0x8B0000, height: 0.55, price: 13 },
            { name: "Liqueur", color: 0x00FF00, height: 0.5, price: 7 },
            { name: "Scotch", color: 0xCD853F, height: 0.6, price: 16 },
            { name: "Bourbon", color: 0x8B4513, height: 0.55, price: 14 },
            { name: "Cognac", color: 0x8B0000, height: 0.6, price: 18 },
            { name: "Absinthe", color: 0x7FFF00, height: 0.5, price: 20 },
            { name: "Sake", color: 0xFFE4B5, height: 0.45, price: 12 },
            { name: "Port", color: 0x8B0000, height: 0.5, price: 15 },
            { name: "Sherry", color: 0xD2691E, height: 0.45, price: 13 },
            { name: "Vermouth", color: 0xFFD700, height: 0.5, price: 11 },
            { name: "Rye", color: 0xCD853F, height: 0.55, price: 14 },
            { name: "Mezcal", color: 0x8B4513, height: 0.5, price: 16 },
            { name: "Pisco", color: 0xFFD700, height: 0.45, price: 13 },
            { name: "Grappa", color: 0xFFFFFF, height: 0.5, price: 12 }
        ];

        drinkPositions.forEach((pos, index) => {
            const drink = drinkTypes[index % drinkTypes.length];
            // Create much larger bottles
            const bottleGeometry = new THREE.CylinderGeometry(0.2, 0.2, drink.height * 2, 16);
            const bottleMaterial = new THREE.MeshStandardMaterial({
                color: drink.color,
                roughness: 0.2,
                metalness: 0.8,
                transparent: true,
                opacity: 0.9,
                emissive: drink.color,
                emissiveIntensity: 0.8
            });
            const bottle = new THREE.Mesh(bottleGeometry, bottleMaterial);
            bottle.position.set(
                position.x + pos.x * Math.cos(rotation) - pos.z * Math.sin(rotation),
                position.y + pos.y,
                position.z + pos.x * Math.sin(rotation) + pos.z * Math.cos(rotation)
            );
            bottle.rotation.y = rotation;
            bottle.castShadow = true;
            bottle.receiveShadow = true;
            bottle.userData.isInteractive = true;
            bottle.userData.type = 'drink';
            bottle.userData.drinkInfo = {
                name: drink.name,
                price: drink.price
            };
            this.meshes.add(bottle);

            // Add much larger, more visible drink labels
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 512;
            canvas.height = 256;
            context.fillStyle = '#ffffff';
            context.font = 'Bold 48px Arial';
            context.fillText(drink.name, 20, 80);
            context.font = 'Bold 42px Arial';
            context.fillText(`$${drink.price}`, 20, 160);

            const texture = new THREE.CanvasTexture(canvas);
            const labelMaterial = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 1.0
            });
            const labelGeometry = new THREE.PlaneGeometry(1.6, 0.8);
            const label = new THREE.Mesh(labelGeometry, labelMaterial);
            label.position.set(
                position.x + pos.x * Math.cos(rotation) - pos.z * Math.sin(rotation),
                position.y + pos.y + 0.6,
                position.z + pos.x * Math.sin(rotation) + pos.z * Math.cos(rotation)
            );
            label.rotation.y = rotation;
            this.meshes.add(label);
        });

        // Add multiple spotlights above shelf for better visibility
        const spotlightPositions = [
            { x: -6, y: 10, z: 0 },
            { x: -3, y: 10, z: 0 },
            { x: 0, y: 10, z: 0 },
            { x: 3, y: 10, z: 0 },
            { x: 6, y: 10, z: 0 }
        ];

        spotlightPositions.forEach(pos => {
            const spotlight = new THREE.SpotLight(0xffffff, 2.0);
            spotlight.position.set(
                position.x + pos.x * Math.cos(rotation) - pos.z * Math.sin(rotation),
                position.y + pos.y,
                position.z + pos.x * Math.sin(rotation) + pos.z * Math.cos(rotation)
            );
            spotlight.angle = Math.PI / 6;
            spotlight.penumbra = 0.1;
            spotlight.decay = 2;
            spotlight.distance = 20;
            spotlight.castShadow = true;
            this.meshes.add(spotlight);
        });

        // Add ambient light around the shelf
        const shelfLight = new THREE.PointLight(0xffffff, 1.0);
        shelfLight.position.set(
            position.x,
            position.y + 5,
            position.z + (rotation === 0 ? -0.5 : 0.5)
        );
        this.meshes.add(shelfLight);

        // Create bar stools
        const stoolPositions = [
            { x: -7, z: 0.8 },
            { x: -5, z: 0.8 },
            { x: -3, z: 0.8 },
            { x: -1, z: 0.8 },
            { x: 1, z: 0.8 },
            { x: 3, z: 0.8 },
            { x: 5, z: 0.8 },
            { x: 7, z: 0.8 }
        ];

        stoolPositions.forEach(pos => {
            const stoolGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1.0, 16);
            const stoolMaterial = new THREE.MeshStandardMaterial({
                color: 0x4a4a4a,
                roughness: 0.7,
                metalness: 0.3
            });
            const stool = new THREE.Mesh(stoolGeometry, stoolMaterial);
            stool.position.set(
                position.x + pos.x * Math.cos(rotation) - pos.z * Math.sin(rotation),
                0.5,
                position.z + pos.x * Math.sin(rotation) + pos.z * Math.cos(rotation)
            );
            stool.castShadow = true;
            stool.receiveShadow = true;
            this.meshes.add(stool);
        });
    }

    createDrinks(position, rotation = 0) {
        // Create bottles
        const bottleColors = [
            0xFF0000, // Red wine
            0x00FF00, // Green liqueur
            0x0000FF, // Blue vodka
            0xFFFF00, // Yellow tequila
            0xFF00FF  // Purple gin
        ];

        bottleColors.forEach((color, index) => {
            // Create bottle
            const bottleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 16);
            const bottleMaterial = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.2,
                metalness: 0.8,
                transparent: true,
                opacity: 0.7
            });
            const bottle = new THREE.Mesh(bottleGeometry, bottleMaterial);
            bottle.position.set(
                position.x + (index - 2) * 0.3 * Math.cos(rotation),
                0.8,
                position.z + (index - 2) * 0.3 * Math.sin(rotation)
            );
            bottle.castShadow = true;
            bottle.receiveShadow = true;
            this.meshes.add(bottle);

            // Create glass
            const glassGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 16);
            const glassMaterial = new THREE.MeshStandardMaterial({
                color: 0xFFFFFF,
                roughness: 0.1,
                metalness: 0.9,
                transparent: true,
                opacity: 0.3
            });
            const glass = new THREE.Mesh(glassGeometry, glassMaterial);
            glass.position.set(
                position.x + (index - 2) * 0.3 * Math.cos(rotation),
                0.4,
                position.z + (index - 2) * 0.3 * Math.sin(rotation)
            );
            glass.castShadow = true;
            glass.receiveShadow = true;
            this.meshes.add(glass);
        });
    }

    createDanceFloor(position, size = 10) {
        const floorGeometry = new THREE.PlaneGeometry(size, size);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            roughness: 0.3,
            metalness: 0.8,
            emissive: 0x111111
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.position.copy(position);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.meshes.add(floor);

        // Add disco tiles
        const tileSize = 1;
        const tiles = size / tileSize;
        for (let i = 0; i < tiles; i++) {
            for (let j = 0; j < tiles; j++) {
                const tileGeometry = new THREE.PlaneGeometry(tileSize - 0.1, tileSize - 0.1);
                const tileMaterial = new THREE.MeshStandardMaterial({
                    color: (i + j) % 2 === 0 ? 0xFFFFFF : 0x000000,
                    roughness: 0.2,
                    metalness: 0.9,
                    emissive: (i + j) % 2 === 0 ? 0x333333 : 0x000000
                });
                const tile = new THREE.Mesh(tileGeometry, tileMaterial);
                tile.position.set(
                    position.x - size/2 + i * tileSize + tileSize/2,
                    position.y + 0.01,
                    position.z - size/2 + j * tileSize + tileSize/2
                );
                tile.rotation.x = -Math.PI / 2;
                tile.receiveShadow = true;
                this.meshes.add(tile);
            }
        }
    }

    createDJBooth(position, rotation = 0) {
        const boothGeometry = new THREE.BoxGeometry(4, 1.2, 2);
        const boothMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.5,
            metalness: 0.7
        });
        const booth = new THREE.Mesh(boothGeometry, boothMaterial);
        booth.position.copy(position);
        booth.position.y = 0.6;
        booth.rotation.y = rotation;
        booth.castShadow = true;
        booth.receiveShadow = true;
        this.meshes.add(booth);

        // Add DJ equipment
        const equipmentPositions = [
            { x: -1, z: 0.5, type: 'turntable' },
            { x: 1, z: 0.5, type: 'mixer' }
        ];

        equipmentPositions.forEach(pos => {
            const equipmentGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.8);
            const equipmentMaterial = new THREE.MeshStandardMaterial({
                color: 0x333333,
                roughness: 0.3,
                metalness: 0.8
            });
            const equipment = new THREE.Mesh(equipmentGeometry, equipmentMaterial);
            equipment.position.set(
                position.x + pos.x * Math.cos(rotation) - pos.z * Math.sin(rotation),
                1.3,
                position.z + pos.x * Math.sin(rotation) + pos.z * Math.cos(rotation)
            );
            equipment.rotation.y = rotation;
            equipment.castShadow = true;
            equipment.receiveShadow = true;
            this.meshes.add(equipment);
        });
    }

    createLoungeArea(position, rotation = 0) {
        const tablePositions = [
            { x: -3, z: -3 },
            { x: 3, z: -3 },
            { x: -3, z: 3 },
            { x: 3, z: 3 }
        ];

        tablePositions.forEach(pos => {
            // Create table
            const tableGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16);
            const tableMaterial = new THREE.MeshStandardMaterial({
                color: 0x4a4a4a,
                roughness: 0.5,
                metalness: 0.3
            });
            const table = new THREE.Mesh(tableGeometry, tableMaterial);
            table.position.set(
                position.x + pos.x * Math.cos(rotation) - pos.z * Math.sin(rotation),
                0.5,
                position.z + pos.x * Math.sin(rotation) + pos.z * Math.cos(rotation)
            );
            table.castShadow = true;
            table.receiveShadow = true;
            this.meshes.add(table);

            // Create chairs around table
            for (let i = 0; i < 4; i++) {
                const chairGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 16);
                const chairMaterial = new THREE.MeshStandardMaterial({
                    color: 0x2a2a2a,
                    roughness: 0.7,
                    metalness: 0.3
                });
                const chair = new THREE.Mesh(chairGeometry, chairMaterial);
                const angle = (i * Math.PI / 2) + rotation;
                chair.position.set(
                    position.x + (pos.x + Math.cos(angle) * 1.2) * Math.cos(rotation) - (pos.z + Math.sin(angle) * 1.2) * Math.sin(rotation),
                    0.4,
                    position.z + (pos.x + Math.cos(angle) * 1.2) * Math.sin(rotation) + (pos.z + Math.sin(angle) * 1.2) * Math.cos(rotation)
                );
                chair.castShadow = true;
                chair.receiveShadow = true;
                this.meshes.add(chair);
            }
        });
    }

    createDecorativeLighting() {
        const spotlightPositions = [
            { x: -15, y: 8, z: -15 },
            { x: 15, y: 8, z: -15 },
            { x: -15, y: 8, z: 15 },
            { x: 15, y: 8, z: 15 }
        ];

        spotlightPositions.forEach(pos => {
            const spotlight = new THREE.SpotLight(0xffffff, 1);
            spotlight.position.set(pos.x, pos.y, pos.z);
            spotlight.angle = Math.PI / 6;
            spotlight.penumbra = 0.1;
            spotlight.decay = 2;
            spotlight.distance = 30;
            spotlight.castShadow = true;
            this.meshes.add(spotlight);

            const housingGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.4, 16);
            const housingMaterial = new THREE.MeshStandardMaterial({
                color: 0x333333,
                roughness: 0.5,
                metalness: 0.8
            });
            const housing = new THREE.Mesh(housingGeometry, housingMaterial);
            housing.position.copy(spotlight.position);
            housing.rotation.x = Math.PI / 2;
            this.meshes.add(housing);
        });

        // Add neon signs
        const neonSigns = [
            { text: "CLUB", position: new THREE.Vector3(0, 8, -15), color: 0xff0000 },
            { text: "BAR", position: new THREE.Vector3(0, 8, 15), color: 0x00ff00 }
        ];

        neonSigns.forEach(sign => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 64;
            context.fillStyle = '#ffffff';
            context.font = 'Bold 48px Arial';
            context.fillText(sign.text, 10, 50);

            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                color: sign.color,
                transparent: true,
                opacity: 0.8
            });
            const geometry = new THREE.PlaneGeometry(4, 1);
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(sign.position);
            mesh.rotation.y = Math.PI;
            this.meshes.add(mesh);
        });
    }

    createMoreDrinks(position, rotation = 0) {
        const drinkVarieties = [
            { name: "Whiskey", color: 0x8B4513, height: 0.5 },
            { name: "Rum", color: 0xD2691E, height: 0.45 },
            { name: "Vodka", color: 0xFFFFFF, height: 0.4 },
            { name: "Gin", color: 0xE6E6FA, height: 0.45 },
            { name: "Tequila", color: 0xFFD700, height: 0.4 },
            { name: "Champagne", color: 0xFFFACD, height: 0.5 },
            { name: "Beer", color: 0xFFA500, height: 0.6 }
        ];

        drinkVarieties.forEach((drink, index) => {
            const bottleGeometry = new THREE.CylinderGeometry(0.1, 0.1, drink.height, 16);
            const bottleMaterial = new THREE.MeshStandardMaterial({
                color: drink.color,
                roughness: 0.2,
                metalness: 0.8,
                transparent: true,
                opacity: 0.7
            });
            const bottle = new THREE.Mesh(bottleGeometry, bottleMaterial);
            bottle.position.set(
                position.x + (index - 3) * 0.3 * Math.cos(rotation),
                0.8,
                position.z + (index - 3) * 0.3 * Math.sin(rotation)
            );
            bottle.castShadow = true;
            bottle.receiveShadow = true;
            this.meshes.add(bottle);

            const glassGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 16);
            const glassMaterial = new THREE.MeshStandardMaterial({
                color: 0xFFFFFF,
                roughness: 0.1,
                metalness: 0.9,
                transparent: true,
                opacity: 0.3
            });
            const glass = new THREE.Mesh(glassGeometry, glassMaterial);
            glass.position.set(
                position.x + (index - 3) * 0.3 * Math.cos(rotation),
                0.4,
                position.z + (index - 3) * 0.3 * Math.sin(rotation)
            );
            glass.castShadow = true;
            glass.receiveShadow = true;
            this.meshes.add(glass);
        });
    }

    createRealisticHouse() {
        // Clear existing meshes
        this.meshes.clear();
        this.exits = [];
        this.rooms = [];
        this.safeSpots = [];

        // Create a group for all building parts
        const buildingGroup = new THREE.Group();

        // House dimensions
        const width = 40;
        const length = 40;
        const wallHeight = 12;
        const roofHeight = 6;

        // Room dimensions
        const centralSize = 25; // Large central space
        const exitRoomSize = 8; // Smaller exit rooms
        const wallThickness = 0.5;

        // Room colors
        const exitRoomColors = [
            0xFF6B6B, // Bright Coral Red
            0x4ECDC4, // Turquoise
            0x45B7D1, // Sky Blue
            0x96CEB4  // Sage Green
        ];

        // Create central space
        const centralRoom = {
            name: "Central Space",
            position: new THREE.Vector3(0, 0, 0),
            size: centralSize,
            walls: []
        };

        // Create central floor
        const centralFloorGeometry = new THREE.PlaneGeometry(centralSize - 0.5, centralSize - 0.5);
        const centralFloorMaterial = new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0.9,
            metalness: 0.1
        });
        const centralFloor = new THREE.Mesh(centralFloorGeometry, centralFloorMaterial);
        centralFloor.rotation.x = -Math.PI / 2;
        centralFloor.position.set(0, 0.01, 0);
        centralFloor.receiveShadow = true;
        buildingGroup.add(centralFloor);

        // Create exit rooms
        const createExitRoom = (x, z, name, colorIndex) => {
            const room = {
                name,
                position: new THREE.Vector3(x, 0, z),
                size: exitRoomSize,
                walls: []
            };

            // Create floor with room color
            const floorGeometry = new THREE.PlaneGeometry(exitRoomSize - 0.5, exitRoomSize - 0.5);
            const floorMaterial = new THREE.MeshStandardMaterial({
                color: exitRoomColors[colorIndex],
                roughness: 0.8,
                metalness: 0.2
            });
            const floor = new THREE.Mesh(floorGeometry, floorMaterial);
            floor.rotation.x = -Math.PI / 2;
            floor.position.set(x, 0.01, z);
            floor.receiveShadow = true;
            buildingGroup.add(floor);

            // Create exit at the center of each exit room
            this.createExit(new THREE.Vector3(x, 0, z));

            // Create room walls with slightly darker color
            const wallColor = new THREE.Color(exitRoomColors[colorIndex]).multiplyScalar(0.8);
            const wallMaterial = new THREE.MeshStandardMaterial({ 
                color: wallColor,
                roughness: 0.7,
                metalness: 0.2,
                transparent: true,
                opacity: 0.7
            });

            // Create room walls
            const walls = [
                // North wall
                new THREE.Mesh(
                    new THREE.BoxGeometry(exitRoomSize, wallHeight, wallThickness),
                    wallMaterial
                ),
                // South wall
                new THREE.Mesh(
                    new THREE.BoxGeometry(exitRoomSize, wallHeight, wallThickness),
                    wallMaterial
                ),
                // East wall
                new THREE.Mesh(
                    new THREE.BoxGeometry(wallThickness, wallHeight, exitRoomSize),
                    wallMaterial
                ),
                // West wall
                new THREE.Mesh(
                    new THREE.BoxGeometry(wallThickness, wallHeight, exitRoomSize),
                    wallMaterial
                )
            ];

            // Position walls
            walls[0].position.set(x, wallHeight/2, z - exitRoomSize/2); // North
            walls[1].position.set(x, wallHeight/2, z + exitRoomSize/2); // South
            walls[2].position.set(x + exitRoomSize/2, wallHeight/2, z); // East
            walls[3].position.set(x - exitRoomSize/2, wallHeight/2, z); // West

            // Add walls to room and scene
            walls.forEach(wall => {
                wall.castShadow = true;
                wall.receiveShadow = true;
                room.walls.push(wall);
                buildingGroup.add(wall);
            });

            // Add door frame
            const frameGeometry = new THREE.BoxGeometry(3, 5, 0.2);
            const frameMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x4a4a4a,
                roughness: 0.5,
                metalness: 0.3
            });
            const frame = new THREE.Mesh(frameGeometry, frameMaterial);
            frame.position.set(x, 2.5, z + exitRoomSize/2 + 0.1);
            frame.castShadow = true;
            frame.receiveShadow = true;
            buildingGroup.add(frame);

            // Add door
            const doorGeometry = new THREE.BoxGeometry(2.5, 4.5, 0.1);
            const doorMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x8B4513,
                roughness: 0.5,
                metalness: 0.3
            });
            const door = new THREE.Mesh(doorGeometry, doorMaterial);
            door.position.set(x, 2.25, z + exitRoomSize/2 + 0.15);
            door.castShadow = true;
            door.receiveShadow = true;
            buildingGroup.add(door);

            // Add door position to exits
            this.exits.push({ 
                position: new THREE.Vector3(x, 0, z + exitRoomSize/2),
                room: room
            });

            // Add room label
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 128;
            context.fillStyle = '#000000';
            context.font = 'Bold 40px Arial';
            context.fillText(name, 10, 50);

            const texture = new THREE.CanvasTexture(canvas);
            const labelMaterial = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true
            });
            const labelGeometry = new THREE.PlaneGeometry(2, 1);
            const label = new THREE.Mesh(labelGeometry, labelMaterial);
            label.position.set(x, wallHeight + 0.1, z);
            label.rotation.x = -Math.PI / 2;
            buildingGroup.add(label);

            this.rooms.push(room);
            return room;
        };

        // Create exit rooms at the corners
        createExitRoom(-20, -20, "Exit Room 1", 0);
        createExitRoom(20, -20, "Exit Room 2", 1);
        createExitRoom(-20, 20, "Exit Room 3", 2);
        createExitRoom(20, 20, "Exit Room 4", 3);

        // Add central room to rooms array
        this.rooms.push(centralRoom);

        // Create roof with glass material
        const roofGeometry = new THREE.ConeGeometry(Math.sqrt(width * width + length * length) / 2, roofHeight, 4);
        const roofMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x87CEEB,
            roughness: 0.2,
            metalness: 0.8,
            transparent: true,
            opacity: 0.3
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(0, wallHeight + roofHeight/2, 0);
        roof.rotation.y = Math.PI/4;
        roof.castShadow = true;
        roof.receiveShadow = true;
        buildingGroup.add(roof);

        // Add windows to each exit room
        const windowGeometry = new THREE.BoxGeometry(2, 2, 0.1);
        const windowMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x87CEEB,
            roughness: 0.2,
            metalness: 0.8,
            transparent: true,
            opacity: 0.6
        });

        this.rooms.forEach(room => {
            if (room.name !== "Central Space") {
                // Add windows to each wall
                const windowPositions = [
                    // North wall windows
                    { x: room.position.x - 2, z: room.position.z - exitRoomSize/2 - 0.1, rot: 0 },
                    { x: room.position.x + 2, z: room.position.z - exitRoomSize/2 - 0.1, rot: 0 },
                    // South wall windows
                    { x: room.position.x - 2, z: room.position.z + exitRoomSize/2 + 0.1, rot: 0 },
                    { x: room.position.x + 2, z: room.position.z + exitRoomSize/2 + 0.1, rot: 0 },
                    // East wall windows
                    { x: room.position.x + exitRoomSize/2 + 0.1, z: room.position.z - 2, rot: Math.PI/2 },
                    { x: room.position.x + exitRoomSize/2 + 0.1, z: room.position.z + 2, rot: Math.PI/2 },
                    // West wall windows
                    { x: room.position.x - exitRoomSize/2 - 0.1, z: room.position.z - 2, rot: Math.PI/2 },
                    { x: room.position.x - exitRoomSize/2 - 0.1, z: room.position.z + 2, rot: Math.PI/2 }
                ];

                windowPositions.forEach(pos => {
                    const window = new THREE.Mesh(windowGeometry, windowMaterial);
                    window.position.set(pos.x, wallHeight/2, pos.z);
                    window.rotation.y = pos.rot;
                    window.castShadow = true;
                    window.receiveShadow = true;
                    buildingGroup.add(window);
                });
            }
        });

        // Add dance floor
        this.createDanceFloor(new THREE.Vector3(0, 0, 0));

        // Add DJ booth
        this.createDJBooth(new THREE.Vector3(0, 0, 8), Math.PI);

        // Add lounge area
        this.createLoungeArea(new THREE.Vector3(0, 0, -8));

        // Add decorative lighting
        this.createDecorativeLighting();

        // Add more drink varieties
        this.createMoreDrinks(new THREE.Vector3(0, 0, -9.5), 0);

        // Add bar counter at the back of the wider room
        this.createBarCounter(new THREE.Vector3(0, 0, -15), 0);

        // Add the building group to the meshes
        this.meshes.add(buildingGroup);
    }

    onMouseMove(event, camera) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, camera);
        const intersects = this.raycaster.intersectObjects(this.doors.map(d => d.mesh));
        
        if (intersects.length > 0) {
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = 'auto';
        }
    }

    onMouseClick(event, camera) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, camera);
        const intersects = this.raycaster.intersectObjects(this.doors.map(d => d.mesh));
        
        if (intersects.length > 0) {
            const door = this.doors.find(d => d.mesh === intersects[0].object);
            if (door) {
                door.isOpen = !door.isOpen;
                const targetRotation = door.isOpen ? door.originalRotation + Math.PI / 2 : door.originalRotation;
                door.mesh.rotation.y = targetRotation;
            }
        }
    }

    createDesk(position, rotation = 0) {
        // Create desk top
        const deskTopGeometry = new THREE.BoxGeometry(2, 0.1, 1);
        const deskMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.7,
            metalness: 0.2
        });
        const deskTop = new THREE.Mesh(deskTopGeometry, deskMaterial);
        deskTop.position.copy(position);
        deskTop.position.y = 0.75; // Desk height
        deskTop.rotation.y = rotation;
        
        // Create desk legs
        const legGeometry = new THREE.BoxGeometry(0.1, 0.75, 0.1);
        const legs = [];
        const legPositions = [
            [-0.9, 0, -0.4], // Front left
            [0.9, 0, -0.4],  // Front right
            [-0.9, 0, 0.4],  // Back left
            [0.9, 0, 0.4]    // Back right
        ];
        
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, deskMaterial);
            leg.position.set(
                position.x + pos[0],
                position.y + 0.375,
                position.z + pos[1]
            );
            leg.rotation.y = rotation;
            legs.push(leg);
        });
        
        // Add to scene
        this.meshes.add(deskTop);
        legs.forEach(leg => this.meshes.add(leg));
        
        // Add safe spot under desk
        const safeSpot = {
            position: new THREE.Vector3(position.x, 0, position.z),
            type: 'desk',
            size: new THREE.Vector3(1.8, 0.75, 0.8) // Space under desk
        };
        this.safeSpots.push(safeSpot);
        
        return { deskTop, legs };
    }

    createTable(position, rotation = 0) {
        // Create table top
        const tableTopGeometry = new THREE.BoxGeometry(3, 0.1, 2);
        const tableMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.7,
            metalness: 0.2
        });
        const tableTop = new THREE.Mesh(tableTopGeometry, tableMaterial);
        tableTop.position.copy(position);
        tableTop.position.y = 0.75; // Table height
        tableTop.rotation.y = rotation;
        
        // Create table legs
        const legGeometry = new THREE.BoxGeometry(0.1, 0.75, 0.1);
        const legs = [];
        const legPositions = [
            [-1.4, 0, -0.9], // Front left
            [1.4, 0, -0.9],  // Front right
            [-1.4, 0, 0.9],  // Back left
            [1.4, 0, 0.9]    // Back right
        ];
        
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, tableMaterial);
            leg.position.set(
                position.x + pos[0],
                position.y + 0.375,
                position.z + pos[1]
            );
            leg.rotation.y = rotation;
            legs.push(leg);
        });
        
        // Add to scene
        this.meshes.add(tableTop);
        legs.forEach(leg => this.meshes.add(leg));
        
        // Add safe spot under table
        const safeSpot = {
            position: new THREE.Vector3(position.x, 0, position.z),
            type: 'table',
            size: new THREE.Vector3(2.8, 0.75, 1.8) // Space under table
        };
        this.safeSpots.push(safeSpot);
        
        return { tableTop, legs };
    }

    reset() {
        // Reset doors to their original state
        this.doors.forEach(door => {
            if (door.mesh) {
                door.mesh.rotation.y = door.originalRotation;
                door.isOpen = false;
            }
        });

        // Reset any other building state if needed
        // For example, if there are any dynamic elements that need to be reset
    }
}