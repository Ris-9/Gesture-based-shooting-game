# src/input/gesture_input.py
#
# Detects action gestures (shoot, reload, etc.) from hand landmarks.
# No longer opens its own camera or MediaPipe — reads from HandTracker.

from src.input.actions import ActionType, Action


class GestureInput:
    """
    Reads shared hand landmarks from HandTracker and
    converts hand poses into action events (shoot, reload, etc.).
    """

    def __init__(self, hand_tracker):
        """
        Args:
            hand_tracker: a HandTracker instance (shared)
        """
        self.hand_tracker = hand_tracker

    def get_input(self):
        """
        Non-blocking: reads the latest landmarks from the shared tracker.
        Returns dict with 'gestures' list, or None if no frame available.
        """
        hand_landmarks = self.hand_tracker.get_landmarks()

        if not hand_landmarks:
            return {"gestures": []}

        gestures = []

        for hand_id, hand_lm in enumerate(hand_landmarks):

            index_tip = hand_lm.landmark[8]
            middle_tip = hand_lm.landmark[12]

            aim_x = (index_tip.x + middle_tip.x) / 2
            aim_y = (index_tip.y + middle_tip.y) / 2

            actions = self._detect_actions(hand_lm, hand_id)

            gestures.append({
                "hand_id": hand_id,
                "aim_x": aim_x,
                "aim_y": aim_y,
                "actions": actions,
                "is_aiming": True
            })

        return {"gestures": gestures}

    # -------------------------
    # ACTION DETECTION
    # -------------------------
    def _detect_actions(self, landmarks, hand_id):
        actions = []

        if self._detect_shoot_gesture(landmarks):
            actions.append(Action(ActionType.SHOOT, hand_id=hand_id))

        return actions

    # -------------------------
    # HELPER FUNCTIONS
    # -------------------------
    def _is_forward(self, tip, pip, thresh=0.01):
        """Finger tip closer to camera than pip → pointing at camera."""
        return (pip.z - tip.z) > thresh

    def _is_folded_2d(self, tip, pip, wrist):
        """Robust rotation-independent check: tip is visually closer to wrist than pip."""
        import math
        dist_tip = math.hypot(tip.x - wrist.x, tip.y - wrist.y)
        dist_pip = math.hypot(pip.x - wrist.x, pip.y - wrist.y)
        return dist_tip < dist_pip

    def _is_thumb_extended_2d(self, thumb_tip, thumb_ip, thumb_mcp):
        """Robust rotation-independent check: thumb tip is further from its base than IP."""
        import math
        dist_tip = math.hypot(thumb_tip.x - thumb_mcp.x, thumb_tip.y - thumb_mcp.y)
        dist_ip = math.hypot(thumb_ip.x - thumb_mcp.x, thumb_ip.y - thumb_mcp.y)
        return dist_tip > dist_ip

    # -------------------------
    # SHOOT GESTURE
    # Index + middle pointing at camera
    # Ring + pinky folded
    # Thumb extended outward (gun pose)
    # -------------------------
    def _detect_shoot_gesture(self, lm):
        wrist = lm.landmark[0]

        index_tip, index_pip = lm.landmark[8], lm.landmark[6]
        middle_tip, middle_pip = lm.landmark[12], lm.landmark[10]
        ring_tip, ring_pip = lm.landmark[16], lm.landmark[14]
        pinky_tip, pinky_pip = lm.landmark[20], lm.landmark[18]
        
        thumb_tip, thumb_ip = lm.landmark[4], lm.landmark[3]
        thumb_mcp = lm.landmark[2]  # base of the thumb unit

        idx_fwd = self._is_forward(index_tip, index_pip)
        mid_fwd = self._is_forward(middle_tip, middle_pip)
        
        ring_fold = self._is_folded_2d(ring_tip, ring_pip, wrist)
        pinky_fold = self._is_folded_2d(pinky_tip, pinky_pip, wrist)
        
        thumb_ext = self._is_thumb_extended_2d(thumb_tip, thumb_ip, thumb_mcp)

        return (idx_fwd and mid_fwd and ring_fold and pinky_fold and thumb_ext)

    # -------------------------
    # CLEANUP (nothing to release — HandTracker owns the camera)
    # -------------------------
    def release(self):
        pass