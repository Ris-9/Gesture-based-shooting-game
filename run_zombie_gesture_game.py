import json
import sys
import time
import threading
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

import cv2


ROOT = Path(__file__).resolve().parent
BACKEND_ROOT = ROOT / "Gesture-based-shooting-game-main"
FRONTEND_ROOT = ROOT / "Zombie Game"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from src.input.hand_tracker import HandTracker  # noqa: E402
from src.input.gesture_input import GestureInput  # noqa: E402
from src.input.actions import ActionType  # noqa: E402


class GestureBridge:
    def __init__(self):
        self._lock = threading.Lock()
        self._state = {
            "tracking": False,
            "aimX": 0.5,
            "aimY": 0.5,
            "shotSequence": 0,
            "grenadeSequence": 0,
            "gestureName": None,
            "timestamp": time.time(),
        }
        self._running = False
        self._thread = None
        self._tracker = None
        self._gesture_input = None
        self._last_shoot_active = False
        self._last_shot_time = 0.0
        self.shoot_cooldown = 0.2  # Reduced from 0.35 for faster shooting
        
        # Aim smoothing parameters
        self._smooth_aim_x = 0.5
        self._smooth_aim_y = 0.5
        self._aim_smoothing_factor = 0.3  # Lower = more smoothing
        self._aim_velocity_x = 0.0
        self._aim_velocity_y = 0.0
        
        # Shoot gesture debouncing
        self._shoot_detection_history = []  # Store last few detection results
        self._shoot_history_size = 3  # Reduced from 5 for faster response
        self._shoot_confidence_threshold = 0.5  # Reduced from 0.6 for faster triggering

        # Grenade gesture state
        self._grenade_holding = False
        self._fist_frame_count = 0
        self._open_frame_count = 0
        self._last_grenade_time = 0.0
        self.grenade_cooldown = 3.0  # seconds between grenade throws

    def start(self):
        self._tracker = HandTracker(
            cam_index=0, 
            max_hands=2,
            detection_confidence=0.7,  # Higher confidence for more stable tracking
            tracking_confidence=0.7,    # Higher confidence for more stable tracking
            frame_width=640,            # Lower resolution for better performance
            frame_height=480
        )
        self._gesture_input = GestureInput(self._tracker)
        self._running = True
        self._thread = threading.Thread(target=self._update_loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=2)
        if self._gesture_input:
            self._gesture_input.release()
        if self._tracker:
            self._tracker.release()
        cv2.destroyAllWindows()

    def get_state(self):
        with self._lock:
            return dict(self._state)

    def _update_loop(self):
        while self._running:
            frame, _landmarks, aim_data = self._tracker.get_snapshot()
            input_data = self._gesture_input.get_input()

            tracking = bool(aim_data)
            raw_aim_x = 0.5
            raw_aim_y = 0.5
            if tracking:
                primary = aim_data[0]
                raw_aim_x = float(primary["aim_x"])
                raw_aim_y = float(primary["aim_y"])

            # Apply exponential smoothing with velocity prediction
            if tracking:
                # Calculate velocity for prediction
                new_velocity_x = (raw_aim_x - self._smooth_aim_x) * 0.5
                new_velocity_y = (raw_aim_y - self._smooth_aim_y) * 0.5
                
                # Smooth velocity changes
                self._aim_velocity_x = self._aim_velocity_x * 0.7 + new_velocity_x * 0.3
                self._aim_velocity_y = self._aim_velocity_y * 0.7 + new_velocity_y * 0.3
                
                # Apply smoothing with velocity prediction
                predicted_x = raw_aim_x + self._aim_velocity_x * 0.1
                predicted_y = raw_aim_y + self._aim_velocity_y * 0.1
                
                self._smooth_aim_x = self._smooth_aim_x * (1 - self._aim_smoothing_factor) + predicted_x * self._aim_smoothing_factor
                self._smooth_aim_y = self._smooth_aim_y * (1 - self._aim_smoothing_factor) + predicted_y * self._aim_smoothing_factor
                
                # Clamp to valid range
                self._smooth_aim_x = max(0.0, min(1.0, self._smooth_aim_x))
                self._smooth_aim_y = max(0.0, min(1.0, self._smooth_aim_y))
            
            aim_x = self._smooth_aim_x
            aim_y = self._smooth_aim_y

            shoot_active = False
            if input_data and input_data.get("gestures"):
                actions = input_data["gestures"][0].get("actions", [])
                raw_shoot_active = any(action.type == ActionType.SHOOT for action in actions)
                
                # Update shoot detection history for debouncing
                self._shoot_detection_history.append(raw_shoot_active)
                if len(self._shoot_detection_history) > self._shoot_history_size:
                    self._shoot_detection_history.pop(0)
                
                # Check shoot confidence based on history
                if len(self._shoot_detection_history) >= 2:  # Reduced from 3 for faster response
                    shoot_count = sum(self._shoot_detection_history)
                    shoot_confidence = shoot_count / len(self._shoot_detection_history)
                    shoot_active = shoot_confidence >= self._shoot_confidence_threshold

            shot_fired = False
            now = time.time()
            if shoot_active and not self._last_shoot_active and (now - self._last_shot_time) >= self.shoot_cooldown:
                shot_fired = True
                self._last_shot_time = now

            self._last_shoot_active = shoot_active

            # Grenade gesture detection (fist = hold, open hand = throw)
            fist_active = False
            open_active = False
            if input_data and input_data.get("gestures"):
                actions = input_data["gestures"][0].get("actions", [])
                fist_active = any(action.type == ActionType.HOLD for action in actions)
                open_active = any(action.type == ActionType.THROW for action in actions)

            if fist_active:
                self._fist_frame_count = min(self._fist_frame_count + 1, 10)
                self._open_frame_count = 0
            elif open_active:
                self._open_frame_count = min(self._open_frame_count + 1, 10)
                self._fist_frame_count = max(0, self._fist_frame_count - 1)
            else:
                self._fist_frame_count = max(0, self._fist_frame_count - 2)
                self._open_frame_count = max(0, self._open_frame_count - 2)

            if self._fist_frame_count >= 3:
                self._grenade_holding = True

            grenade_thrown = False
            if self._grenade_holding and self._open_frame_count >= 2 and (now - self._last_grenade_time) >= self.grenade_cooldown:
                grenade_thrown = True
                self._last_grenade_time = now
                self._grenade_holding = False
                self._fist_frame_count = 0
                self._open_frame_count = 0
            elif self._fist_frame_count == 0 and self._open_frame_count == 0:
                self._grenade_holding = False

            with self._lock:
                self._state["tracking"] = tracking
                self._state["aimX"] = aim_x
                self._state["aimY"] = aim_y
                self._state["gestureName"] = "grenade-hold" if self._grenade_holding else ("shoot" if shoot_active else None)
                self._state["timestamp"] = now
                if shot_fired:
                    self._state["shotSequence"] += 1
                if grenade_thrown:
                    self._state["grenadeSequence"] += 1

            self._draw_debug(frame, aim_x, aim_y, tracking, shoot_active, self._state["shotSequence"])
            time.sleep(0.008)  # Reduced from 0.01 for better responsiveness

    def _draw_debug(self, frame, aim_x, aim_y, tracking, shoot_active, shot_sequence):
        if frame is None:
            return

        h, w = frame.shape[:2]
        if tracking:
            cx = int(aim_x * w)
            cy = int(aim_y * h)
            cv2.circle(frame, (cx, cy), 12, (0, 0, 255), 2)

        status = "TRACKING" if tracking else "NO HAND"
        shoot_text = "SHOOT" if shoot_active else "READY"
        cv2.putText(frame, f"{status} | {shoot_text}", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        cv2.putText(frame, f"Shots: {shot_sequence}", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.imshow("Gesture Controller", frame)
        cv2.waitKey(1)


BRIDGE = GestureBridge()


class ZombieGameHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(FRONTEND_ROOT), **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/gesture-state":
            state = BRIDGE.get_state()
            payload = json.dumps(state).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)
            return

        return super().do_GET()

    def log_message(self, format, *args):
        super().log_message(format, *args)


def main():
    host = "127.0.0.1"
    port = 8000

    BRIDGE.start()

    httpd = ThreadingHTTPServer((host, port), ZombieGameHandler)
    print(f"Zombie gesture game running at http://{host}:{port}")
    print("Press Ctrl+C to stop.")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.shutdown()
        BRIDGE.stop()


if __name__ == "__main__":
    main()
