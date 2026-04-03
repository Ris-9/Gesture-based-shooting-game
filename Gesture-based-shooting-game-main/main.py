# main.py
import cv2
from src.input.hand_tracker import HandTracker
from src.input.gesture_input import GestureInput
from src.input.input_adapter import InputAdapter
from src.input.aim_tracker import AimTracker

from src.core.game_session import GameSession

from src.render.renderer import Renderer


# -------------------------
# CONFIG
# -------------------------
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600


def main():
    # -------------------------
    # INIT SYSTEMS
    # -------------------------

    # Single shared camera + MediaPipe pipeline
    hand_tracker = HandTracker(cam_index=0, max_hands=2)

    # Subsystems consume from the shared tracker
    gesture_input = GestureInput(hand_tracker)
    aim_tracker = AimTracker(hand_tracker)

    game_session = GameSession()
    game_session.add_player(player_id=1)

    input_adapter = InputAdapter(
        player_id=1,
        game_session=game_session
    )

    renderer = Renderer(SCREEN_WIDTH, SCREEN_HEIGHT)

    running = True

    # -------------------------
    # GAME LOOP
    # -------------------------
    while running:

        # 0. Get aim (always up-to-date, from background thread)
        frame, aim_data = aim_tracker.get_frame_and_aim()

        # Update aim in game session every frame (continuous crosshair)
        if aim_data:
            aim = aim_data[0]  # primary hand
            game_session.handle_aim(1, aim["aim_x"], aim["aim_y"])

        # Show camera feed with crosshair overlay
        if frame is not None:
            for aim in aim_data:
                h, w, _ = frame.shape
                cx, cy = int(aim["aim_x"] * w), int(aim["aim_y"] * h)
                cv2.circle(frame, (cx, cy), 10, (0, 0, 255), 2)
            cv2.imshow("Aim Tracker", frame)

        # 1. INPUT (gesture detection — reads shared landmarks, non-blocking)
        input_data = gesture_input.get_input()

        # 2. INPUT → COMMANDS
        commands = input_adapter.process(input_data)

        # 3. GAME LOGIC
        game_session.execute_commands(commands)

        # 4. UPDATE (time-based systems)
        game_session.update()

        # 5. RENDER
        game_state = game_session.get_state()
        renderer.render(game_state)

        # 6. Single waitKey for all OpenCV windows + quit check
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            running = False

    # -------------------------
    # CLEANUP
    # -------------------------
    aim_tracker.release()
    renderer.close()
    gesture_input.release()
    hand_tracker.release()     # camera released last
    cv2.destroyAllWindows()    # final cleanup for any remaining windows



if __name__ == "__main__":
    main()