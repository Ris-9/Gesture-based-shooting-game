# src/input/aim_tracker.py
#
# Thin wrapper over HandTracker that provides
# the aim-specific API (frame + aim data for rendering).
# No longer opens its own camera or MediaPipe.

import cv2


class AimTracker:
    """
    Provides aim position and camera frames for the crosshair overlay.
    Delegates all heavy lifting to the shared HandTracker.
    """

    def __init__(self, hand_tracker):
        """
        Args:
            hand_tracker: a HandTracker instance (shared)
        """
        self.hand_tracker = hand_tracker

    # -------------------------
    # Public API
    # -------------------------
    def get_frame_and_aim(self):
        """
        Returns (frame, aim_data) atomically from the shared tracker.
        - frame: BGR numpy array (mirrored) or None
        - aim_data: list of {aim_x, aim_y} dicts
        """
        frame, _landmarks, aim_data = self.hand_tracker.get_snapshot()
        return frame, aim_data

    def get_frame(self):
        return self.hand_tracker.get_frame()

    def get_aim(self):
        return self.hand_tracker.get_aim()

    # -------------------------
    # Cleanup (nothing to release — HandTracker owns the camera)
    # -------------------------
    def release(self):
        # Camera cleanup is handled by HandTracker
        cv2.destroyWindow("Aim Tracker")