# Zombie Elevator

A browser-based zombie survival shooter built with `Three.js`, featuring a cinematic arcade-style UI, floor-based progression, grenade combat, sound effects, and optional hand-gesture controls powered by a Python backend.

The goal is simple: survive the undead, clear each floor, upgrade your performance through progression, and make it to the top alive.

## Demo Video

Watch the gameplay demo here:

[Zombie Elevator Demo Video](https://drive.google.com/file/d/117aHkN-X43rR5CV8HRHZ4IY7ApCSRLkk/view?usp=drive_link)

## Screenshots

These screenshots are currently stored in the sibling `Screenshots` folder in the workspace.

### Home Screen

![Home Screen](https://github.com/Ris-9/Gesture-based-shooting-game/blob/main/Screenshots/Home.png)

### Elevator Transition

![Elevator Transition](https://github.com/Ris-9/Gesture-based-shooting-game/blob/main/Screenshots/elevator.png)

### Combat / Shooting

![Combat](https://github.com/Ris-9/Gesture-based-shooting-game/blob/main/Screenshots/shoot.png)

### Kill Feedback

![Kills](https://github.com/Ris-9/Gesture-based-shooting-game/blob/main/Screenshots/kills.png)

### Reward Screen

![Reward Screen](https://github.com/Ris-9/Gesture-based-shooting-game/blob/main/Screenshots/reward.png)

### Game Over Screen

![Game Over](https://github.com/Ris-9/Gesture-based-shooting-game/blob/main/Screenshots/game%20over.png)

## Gameplay

## Overview

`Zombie Elevator` is a 3D survival game where you fight waves of zombies inside a dark corridor/elevator-themed environment. The game combines:

- Mouse and keyboard shooting controls
- Optional gesture-based aim and fire integration
- Floor progression with elevator transitions
- Grenades, headshots, combo scoring, and damage upgrades
- Sound effects for combat and game over feedback
- Polished HUD, reward, pause, game-over, and victory screens

## Features

- **3D gameplay with Three.js**
- **Zombie combat system** with headshots and body damage
- **Floor progression** with animated elevator transitions
- **Combo and score system**
- **Grenade mechanic** with explosion effects
- **Sound integration** for gunshots, explosions, kills, and game over
- **Gesture backend support** through a Python bridge and `/api/gesture-state`
- **Pause, reward, victory, and restart flows**
- **Modern horror-themed UI**

## Project Structure

```text
Zombie Game/
├── README.md
├── index.html              # Main game page and script bootstrapping
├── style.css               # All UI styling, HUD, overlays, and effects
├── Game.js                 # Main game controller and gameplay loop
├── UIManager.js            # DOM/UI updates and overlay control
├── InputManager.js         # Mouse, keyboard, and gesture input bridge
├── SoundManager.js         # Sound loading and playback
├── GameObject3D.js         # Base class for 3D game objects
├── Zombie.js               # Zombie enemy behavior and hit logic
├── Corridor.js             # 3D environment setup
├── ElevatorDoor.js         # Elevator door visuals and transitions
├── Game Intro.mp4          # Intro video asset
├── package.json            # JavaScript dependency config
├── package-lock.json       # Lock file for npm dependencies
├── node_modules/           # Installed packages
└── sound assets/
    ├── enemykill.wav
    ├── explosion.wav
    ├── gameover.wav
    ├── gunshot.wav
    ├── laser.wav
    └── pause.wav
```



You start at the lobby/start screen and enter the game by pressing `START GAME`.

Each floor contains zombies that advance toward the player. Your job is to eliminate them before they reach you and drain your health.

### Combat Rules

- **Headshots** deal lethal damage and award higher points
- **Body shots** may require multiple hits
- **Grenades** help clear enemies in dangerous situations
- **Combos** improve your score when kills happen in quick succession
- **Weapon damage** increases over time through progression and performance

### Progression

- Clear enemies on the current floor
- Transition via the elevator sequence
- Earn score and bonuses
- Continue through up to `10 floors`
- Survive until the final victory screen

## Controls

### Mouse and Keyboard

- **Mouse Move** — Aim
- **Left Click** — Shoot
- **Space** — Shoot
- **P** — Pause / Resume
- **R** — Restart

### Gesture Controls

If the Python backend is running, the game can also receive gesture input.

Supported interaction flow:

- **Aim gesture** updates the crosshair position
- **Shoot gesture** triggers firing
- **Hold gesture** prepares grenade mode
- **Throw gesture** throws a grenade

The frontend polls the backend at:

```text
/api/gesture-state
```

## Tech Stack

### Frontend

- `HTML5`
- `CSS3`
- `JavaScript`
- `Three.js`

### Backend / Gesture Integration

- `Python`
- `OpenCV`
- Custom gesture tracking modules from:
  - `Gesture-based-shooting-game-main/src/input/hand_tracker.py`
  - `Gesture-based-shooting-game-main/src/input/gesture_input.py`
  - `Gesture-based-shooting-game-main/src/input/actions.py`

## How to Start

There are two ways to run the game.

### Option 1: Run the full game with gesture backend

Use the Python launcher from the workspace root:

```bash
python run_zombie_gesture_game.py
```

This will:

- Start the hand-tracking / gesture bridge
- Start a local HTTP server
- Serve the frontend from the `Zombie Game` folder
- Expose the game at:

```text
http://127.0.0.1:8000
```

### Option 2: Run the frontend only

If you only want the browser game without gesture tracking, serve the `Zombie Game` folder with any local static server.

Example:

```bash
npx serve "Zombie Game"
```

Or use any VS Code / IDE live server equivalent.

## Installation

### JavaScript dependency

Inside the `Zombie Game` folder:

```bash
npm install
```

This installs:

- `three`

### Python dependencies

The launcher imports `cv2` and gesture modules from the sibling backend project. Make sure your Python environment has the required packages installed.

At minimum:

- `opencv-python`
- Any dependencies required by the gesture backend project

If your backend project has its own dependency file, install from there as well.

## How the Game Boots

The startup flow in `index.html` does the following:

1. Loads local `Three.js`
2. Loads the gameplay scripts in order
3. Creates a new `Game()` instance
4. Starts the main game loop

This keeps the project simple and easy to run locally without a bundler.

## Important Files Explained

### `Game.js`
Controls:

- Core game state
- Floor progression
- Zombie spawning
- Combat resolution
- Score and health updates
- Victory and game over flow

### `InputManager.js`
Handles:

- Mouse aim
- Keyboard input
- Click-to-fire logic
- Polling the gesture backend
- Exposing `window.gestureInput`

### `UIManager.js`
Responsible for:

- HUD updates
- Start / reward / pause / game-over / victory screen behavior
- Damage text and hit effects
- Elevator overlay transitions

### `SoundManager.js`
Manages:

- Loading `.wav` assets
- Playback for shooting, explosions, kills, and game over
- Volume and reset behavior

## Audio Assets

The `sound assets` folder includes:

- `gunshot.wav`
- `explosion.wav`
- `enemykill.wav`
- `gameover.wav`
- `laser.wav`
- `pause.wav`

These are triggered during different gameplay events to improve feedback and immersion.

## Notes

- The project is designed for local/browser play.
- Gesture controls depend on the Python backend being active.
- If the backend is unavailable, the game still works with mouse and keyboard.
- The browser must be able to load local assets such as sounds and video through the local server.

## Future Improvements

Some good next upgrades for this project could be:

- Better mobile responsiveness
- Settings menu for audio and sensitivity
- Difficulty selection
- More enemy types
- More levels and environment variations
- Persistent high scores
- Better intro video flow and polished transitions

## Credits

Built as a gesture-enabled zombie survival shooting game using `Three.js`, browser UI logic, and a Python-based hand-tracking backend.
