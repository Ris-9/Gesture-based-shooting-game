# src/render/renderer.py

import cv2
import numpy as np


class Renderer:
    def __init__(self, width=800, height=600):
        self.width = width
        self.height = height

        self.window_name = "Gesture Shooter"
        cv2.namedWindow(self.window_name)

    # -------------------------
    # MAIN RENDER FUNCTION
    # -------------------------
    def render(self, game_state):
        frame = self._create_background()

        self._draw_targets(frame, game_state["targets"])
        self._draw_items(frame, game_state["items"])
        self._draw_players(frame, game_state["players"])

        cv2.imshow(self.window_name, frame)
        # NOTE: waitKey is NOT called here anymore.
        # The single waitKey lives in the main loop.

    # -------------------------
    # BACKGROUND
    # -------------------------
    def _create_background(self):
        return self._blank_frame()

    def _blank_frame(self):
        return np.zeros((self.height, self.width, 3), dtype="uint8")

    # -------------------------
    # DRAW TARGETS
    # -------------------------
    def _draw_targets(self, frame, targets):
        for target in targets:
            x, y = self._to_screen(target["x"], target["y"])
            radius = int(target["radius"] * self.width)

            cv2.circle(frame, (x, y), radius, (0, 0, 255), -1)  # red

    # -------------------------
    # DRAW ITEMS
    # -------------------------
    def _draw_items(self, frame, items):
        for item in items:
            x, y = self._to_screen(item["x"], item["y"])
            radius = int(item["radius"] * self.width)

            color = self._get_item_color(item["type"])

            cv2.circle(frame, (x, y), radius, color, -1)

    def _get_item_color(self, item_type):
        if item_type == "ammo":
            return (255, 255, 0)   # yellow
        elif item_type == "bomb":
            return (0, 0, 0)       # black
        elif item_type == "damage":
            return (255, 0, 255)   # purple
        return (255, 255, 255)

    # -------------------------
    # DRAW PLAYERS (AIM + UI)
    # -------------------------
    def _draw_players(self, frame, players):
        y_offset = 20

        for player_id, player in players.items():

            # Draw aim crosshair
            aim_x = player.get("aim_x")
            aim_y = player.get("aim_y")

            if aim_x is not None:
                x, y = self._to_screen(aim_x, aim_y)
                cv2.circle(frame, (x, y), 10, (0, 255, 0), 2)  # green crosshair

            # Draw HUD text
            text = f"P{player_id} | Score: {player['score']} | Ammo: {player['ammo']} | Bombs: {player['bombs']}"

            cv2.putText(
                frame,
                text,
                (10, y_offset),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 255, 255),
                1,
                cv2.LINE_AA
            )

            y_offset += 20

    # -------------------------
    # CROSSHAIR RENDERING
    # -------------------------
    def draw_crosshair(self, frame, x, y, size=10, color=(0, 0, 255), thickness=2):
        px = int(x * self.width)
        py = int(y * self.height)
        cv2.line(frame, (px - size, py), (px + size, py), color, thickness)
        cv2.line(frame, (px, py - size), (px, py + size), color, thickness)

    # -------------------------
    # UTILS
    # -------------------------
    def _to_screen(self, norm_x, norm_y):
        x = int(norm_x * self.width)
        y = int(norm_y * self.height)
        return x, y

    # -------------------------
    # CLEANUP
    # -------------------------
    def should_close(self):
        # Consumed by main loop — does NOT call waitKey itself anymore.
        # Main loop handles the single waitKey.
        return False

    def close(self):
        cv2.destroyWindow(self.window_name)