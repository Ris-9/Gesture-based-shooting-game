# src/input/hand_tracker.py
#
# Single shared camera + MediaPipe pipeline.
# All hand-related subsystems (aim tracking, gesture detection)
# consume landmarks from this service instead of opening
# their own camera / MediaPipe instance.

import cv2
import mediapipe as mp
import threading
import time


class HandTracker:
    """
    Runs a single camera capture + MediaPipe Hands pipeline
    in a background thread. Provides thread-safe access to:
      - the latest camera frame
      - the latest hand landmarks (raw MediaPipe objects)
      - a pre-computed aim position (index finger tip)

    Designed so that AimTracker and GestureInput can both
    read from it without duplicating work.
    """

    def __init__(self, cam_index=0, max_hands=2,
                 detection_confidence=0.6, tracking_confidence=0.6,
                 frame_width=640, frame_height=480):

        # ---- camera ----
        self.cap = cv2.VideoCapture(cam_index)
        if not self.cap.isOpened():
            raise RuntimeError(f"Camera {cam_index} failed to open")

        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, frame_width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, frame_height)
        # Minimize internal buffer so we always get the freshest frame
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        # ---- MediaPipe ----
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            max_num_hands=max_hands,
            min_detection_confidence=detection_confidence,
            min_tracking_confidence=tracking_confidence
        )

        # ---- shared state (protected by lock) ----
        self._lock = threading.Lock()
        self._frame = None            # latest BGR frame (already mirrored)
        self._hand_landmarks = None   # result.multi_hand_landmarks (list or None)
        self._handedness = None       # result.multi_handedness (list or None)
        self._aim_data = []           # [{aim_x, aim_y}, ...] per detected hand

        # ---- thread control ----
        self._running = True
        self._thread = threading.Thread(target=self._update_loop, daemon=True)
        self._thread.start()

    # --------------------------------------------------
    # Background loop — single camera read + inference
    # --------------------------------------------------
    def _update_loop(self):
        while self._running:
            success, frame = self.cap.read()
            if not success:
                continue

            frame = cv2.flip(frame, 1)  # mirror for natural aiming
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = self.hands.process(rgb)

            hand_landmarks = result.multi_hand_landmarks
            handedness = result.multi_handedness

            # Pre-compute aim (midpoint of index + middle tips for stability)
            aim_data = []
            if hand_landmarks:
                for hand_lm in hand_landmarks:
                    index_tip = hand_lm.landmark[8]
                    middle_tip = hand_lm.landmark[12]
                    aim_data.append({
                        "aim_x": (index_tip.x + middle_tip.x) / 2,
                        "aim_y": (index_tip.y + middle_tip.y) / 2
                    })

            # Atomic write
            with self._lock:
                self._frame = frame
                self._hand_landmarks = hand_landmarks
                self._handedness = handedness
                self._aim_data = aim_data

            # Tiny sleep to avoid pegging CPU at 100 %
            time.sleep(0.003)  # Reduced from 0.005 for better responsiveness

    # --------------------------------------------------
    # Public API — all thread-safe
    # --------------------------------------------------
    def get_snapshot(self):
        """
        Returns (frame, hand_landmarks, aim_data) atomically.
        - frame: BGR numpy array (mirrored), or None
        - hand_landmarks: list of MediaPipe hand landmark objects, or None
        - aim_data: list of {aim_x, aim_y} dicts
        """
        with self._lock:
            frame = self._frame.copy() if self._frame is not None else None
            landmarks = self._hand_landmarks  # immutable between frames
            aim = list(self._aim_data)         # shallow copy
        return frame, landmarks, aim

    def get_frame(self):
        """Just the latest frame (convenience)."""
        with self._lock:
            return self._frame.copy() if self._frame is not None else None

    def get_aim(self):
        """Just the aim data (convenience)."""
        with self._lock:
            return list(self._aim_data)

    def get_landmarks(self):
        """Raw MediaPipe hand landmarks (for gesture detection)."""
        with self._lock:
            return self._hand_landmarks

    # --------------------------------------------------
    # Cleanup
    # --------------------------------------------------
    def release(self):
        self._running = False
        self._thread.join(timeout=2)
        self.cap.release()
