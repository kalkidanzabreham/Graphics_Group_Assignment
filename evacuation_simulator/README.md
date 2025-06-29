# Building Evacuation Simulator

## Group Members

| Name             | Section | ID          |
| ---------------- | ------- | ----------- |
| Afomiya Zenachew | 1       | UGR/5801/15 |
| Bezawit Sebsebe  | 1       | UGR/8889/15 |
| Kalkidan Abreham | 1       | UGR/3534/15 |
| Solome Bereket   | 1       | UGR/3839/15 |
| Tsion Mekasha    | 1       | UGR/8558/15 |

## Description

The **Building Evacuation Simulator** is a sophisticated 3D interactive web application that demonstrates emergency evacuation scenarios in a realistic building environment. Built with Three.js and modern web technologies, this simulator visualizes how people navigate through buildings during emergencies such as fire, earthquake, and active shooter situations. The application provides valuable insights into crowd movement patterns, response times, and evacuation efficiency through advanced computer graphics and physics-based animations.

## Table of Contents

- [Features](#features)
- [Technical Architecture](#technical-architecture)
- [Setup & Installation](#setup--installation)
- [Usage Instructions](#usage-instructions)
- [File Structure](#file-structure)
- [Performance Considerations](#performance-considerations)
- [Development Guidelines](#development-guidelines)
- [Deployment Guide](#deployment-guide)
- [Testing Guide](#testing-guide)
- [Troubleshooting](#troubleshooting)
- [Future Enhancements](#future-enhancements)
- [Credits & Acknowledgments](#credits--acknowledgments)
- [License](#license)
- [Contact](#contact)

## Features

### Core Functionality

- **3D Building Environment**
- **Animated Agents**
- **Emergency Scenarios**
- **Pathfinding System**
- **Physics Integration**

### Visual Effects

- Realistic fire with particles and shaders
- Smoke, lighting, emergency alarms
- Earthquake camera shakes, debris
- Active shooter urgency animations

### User Interaction

- Camera controls
- Door interactivity
- Start/reset via GUI
- Real-time monitoring
- Responsive UI

### Technical Features

- Modular JavaScript architecture
- Optimized rendering
- Emergency audio
- Works on desktop/mobile
- Vite-powered build

## Technical Architecture

### Stack

- **Frontend**: Vanilla JavaScript, ES6
- **3D Engine**: Three.js
- **Physics**: Cannon.js
- **Pathfinding**: three-pathfinding
- **Build Tool**: Vite
- **UI**: dat.GUI

### Modules

- `main.js`: App entry
- `agents.js`: Agent logic
- `building.js`: Geometry/rooms
- `fire.js`: Fire visuals
- `earthquake.js`: Quake effects
- `evacuation.js`: Evacuation logic
- `sceneSetup.js`: Scene init
- `controls.js`: User inputs
- `heatDistortionShader.js`: Shader

## Setup & Installation

### Requirements

- Node.js v16+
- Git
- Modern browser

### Steps

```bash
git clone <repo-url>
cd building-evacuation-simulator
npm install
npm run dev
```

Go to: `http://localhost:5173`

### Production

```bash
npm run build
npm run preview
```

## Usage Instructions

- **Camera**:

  - Left-click drag: rotate
  - Scroll: zoom
  - Right-drag: pan

- **Scenarios**:

  - Fire: agents avoid fire
  - Earthquake: shake + urgency
  - Shooter: max panic + alerts

- **Reset**: Reset button in GUI

- **Doors**: Click to open/close

## File Structure

```
building-evacuation-simulator/
├── src/
│   ├── agents.js
│   ├── building.js
│   ├── controls.js
│   ├── earthquake.js
│   ├── evacuation.js
│   ├── fire.js
│   ├── heatDistortionShader.js
│   ├── main.js
│   └── sceneSetup.js
├── public/
│   ├── models/
│   └── sounds/
├── index.html
├── vite.config.js
└── package.json
```

## Performance Considerations

- Min: 4GB RAM, i3
- Rec: 8GB RAM, i5
- WebGL2 GPU

### Optimizations

- Frustum culling
- LODs for distance
- Model/audio/image compression
- Memory-efficient agents

## Development Guidelines

- ES6 syntax
- Modular code
- Error handling
- Cross-browser tests

### Add Features

1. New module in `src/`
2. Use existing naming
3. Update docs/tests

## Deployment Guide

**Local Dev:**

```bash
npm install
npm run dev
```

**Build:**

```bash
npm run build
npm run preview
```

### Static Hosting

- **Netlify**:

  - Build: `npm run build`
  - Publish dir: `dist`

- **Vercel**: Auto-detects Vite

- **GitHub Pages**: Use Actions

### Cloud Hosting

- **AWS S3 + CloudFront**
- **GCP Cloud Storage**
- **Azure Static Web Apps**

### Docker

- Multi-stage Dockerfile
- Nginx + assets
- `docker-compose up -d`

## Testing Guide

### Unit Testing

Use **Jest**:

```bash
npm install --save-dev jest @testing-library/jest-dom
npm run test:unit
```

Test agent logic, building methods, fire behavior.

### Integration Testing

Combine systems like agents + evacuation or building + pathfinding.

### Performance Testing

- Measure FPS
- Memory profiling
- Simulate 50+ agents

### UAT (User Acceptance Testing)

- GUI controls
- Agent reactions
- Reset correctness

### Browser Compatibility

Test on:

- Chrome
- Firefox
- Safari
- Edge

### GitHub Actions

```yaml
- name: Run tests
  run: npm run test:ci
```

## Troubleshooting

- **Doesn’t start?** Check Node, clear cache
- **Models not loading?** Check paths, console
- **Slow performance?** Reduce agent count
- **No audio?** Browser permissions

## Future Enhancements

- Multi-floor support
- VR/AR mode
- More intelligent agents
- Multiplayer evacuation
- Mobile app version

## Credits & Acknowledgments

- **Three.js**: 3D rendering
- **Cannon.js**: Physics
- **Vite**: Build tool
- **dat.GUI**: GUI controls
- **Assets**: Freesound, public GLTF sources

## License

Educational purposes only. Open-source for learning and research.

## Contact

For issues or contributions, visit the repository or contact the development team.
