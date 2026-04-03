import random
import time

from src.input.actions import ActionType
from src.core.commands import ShootCommand, ReloadCommand


class InputAdapter:
    def __init__(self, player_id, game_session, shoot_cooldown=0.5):
        self.player_id = player_id
        self.game_session = game_session

        # dict: hand_id -> set(ActionType)
        self.prev_actions = {}

        # Shoot cooldown (seconds) — prevents machine-gun firing
        self.shoot_cooldown = shoot_cooldown
        self.last_shoot_time = 0

    # -------------------------
    # MAIN ENTRY
    # -------------------------
    def process(self, input_data):
        """
        Convert gesture input into game commands.
        Shoot only fires when:
          1. SHOOT gesture is newly detected (was NOT active previous frame)
          2. Enough time has passed since last shot (cooldown)
        """

        if not input_data or not input_data.get("gestures"):
            # No gestures this frame → clear previous state
            self.prev_actions = {}
            return []

        # Pick the first detected action gesture (low latency)
        gesture = input_data["gestures"][0]

        hand_id = gesture["hand_id"]
        current_actions = set(a.type for a in gesture["actions"])

        # Determine new actions (tap) vs held actions
        prev = self.prev_actions.get(hand_id, set())
        new_actions = current_actions - prev
        held_actions = current_actions & prev
        released_actions = prev - current_actions

        # Store copy of current actions for next frame
        self.prev_actions[hand_id] = current_actions.copy()

        commands = []

        # -------------------------
        # SHOOT (tap + cooldown)
        # Requires: gesture is NEW this frame + cooldown elapsed
        # -------------------------
        if ActionType.SHOOT in new_actions:
            now = time.time()
            if (now - self.last_shoot_time) >= self.shoot_cooldown:
                self.last_shoot_time = now
                commands.append(
                    ShootCommand(
                        self.player_id,
                        gesture["aim_x"],
                        gesture["aim_y"]
                    )
                )

        # -------------------------
        # RELOAD (tap)
        # -------------------------
        if ActionType.RELOAD in new_actions:
            commands.append(ReloadCommand(self.player_id))

        # -------------------------
        # FUTURE: HOLD / THROW
        # -------------------------
        # if ActionType.THROW in held_actions:
        #     commands.append(ChargeThrowCommand(...))

        return commands

    # -------------------------
    # ANTI-CHEAT GESTURE SELECTION
    # not using rn due to latency
    # -------------------------
    def _select_gesture(self, gestures):
        """
        Rule:
        - Prefer gestures that DO NOT hit any target
        - If all gestures hit, pick random
        """

        non_hitting = []

        for gesture in gestures:
            if not self._will_hit_target(gesture):
                non_hitting.append(gesture)

        if non_hitting:
            return non_hitting[0]  # deterministic

        return random.choice(gestures)

    # -------------------------
    # HIT CHECK (uses game state)
    # -------------------------
    def _will_hit_target(self, gesture):
        aim_x = gesture["aim_x"]
        aim_y = gesture["aim_y"]

        return self.game_session.check_hit(aim_x, aim_y)