# src/core/game_session.py

import random
import math
import time

class GameSession:
    def __init__(self):
        self.players = {}
        self.targets = []
        self.items = []

        self.width = 1.0
        self.height = 1.0

        self.last_shot_time = {}
        self.shoot_cooldown = 0.25 

        self._init_targets()

    # -------------------------
    # INITIALIZATION
    # -------------------------
    def add_player(self, player_id):
        self.players[player_id] = {
            "score": 0,
            "ammo": 10,
            "bombs": 0,
            "damage": 1,
            "aim_x": None,
            "aim_y": None
        }

    def _init_targets(self):
        self.targets = []
        for _ in range(3):
            self.targets.append(self._spawn_target())

    def _spawn_target(self):
        return {
            "x": random.uniform(0.1, 0.9),
            "y": random.uniform(0.1, 0.9),
            "radius": 0.05
        }
    
    def get_targets(self):
        return self.targets
    # -------------------------
    # MAIN EXECUTION
    # -------------------------
    def execute_commands(self, commands):
        for command in commands:
            command.execute(self)

    # -------------------------
    # COMMAND HANDLERS
    # -------------------------
    def handle_shoot(self, player_id, aim_x, aim_y):

        now = time.time()
        last = self.last_shot_time.get(player_id, 0)

        if now - last < self.shoot_cooldown:
            return

        self.last_shot_time[player_id] = now

        player = self.players[player_id]

        # store aim EVERY time (important for update systems)
        player["aim_x"] = aim_x
        player["aim_y"] = aim_y

        if player["ammo"] <= 0:
            print(f"Player {player_id} OUT OF AMMO!")
            return

        player["ammo"] -= 1
        print(f"Player {player_id} SHOOTS at ({aim_x:.3f}, {aim_y:.3f})! Ammo left: {player['ammo']}")

        hit_target = self._get_hit_target(aim_x, aim_y)

        if hit_target:
            print(">>> HIT! Target destroyed.")
            self.targets.remove(hit_target)
            player["score"] += 1

            self._maybe_drop_item(hit_target)
            self.targets.append(self._spawn_target())
        else:
            print(">>> MISS!")

    def handle_reload(self, player_id):
        player = self.players[player_id]
        player["ammo"] = 10

    def handle_aim(self, player_id, aim_x, aim_y):
        """Update aim position every frame (independent of shooting)."""
        player = self.players.get(player_id)
        if player:
            player["aim_x"] = aim_x
            player["aim_y"] = aim_y

    def handle_switch_weapon(self, player_id, weapon_id):
        pass

    def handle_start_throw(self, player_id, aim_x, aim_y):
        player = self.players[player_id]
        player["aim_x"] = aim_x
        player["aim_y"] = aim_y

    def handle_release_throw(self, player_id, aim_x, aim_y, charge_time):
        player = self.players[player_id]
        player["aim_x"] = aim_x
        player["aim_y"] = aim_y

    # -------------------------
    # UPDATE LOOP (IMPORTANT)
    # -------------------------
    def update(self):
        """
        Called every frame
        Add ALL time-based systems here
        """

        self._update_item_pickups()

        # future systems plug here:
        # self._update_cooldowns()
        # self._update_projectiles()
        # self._update_item_decay()

    # -------------------------
    # ITEM SYSTEM
    # -------------------------
    def _maybe_drop_item(self, target):
        drop_chance = 0.5

        if random.random() > drop_chance:
            return

        item_type = random.choice(["ammo", "bomb", "damage"])

        item = {
            "type": item_type,
            "x": target["x"],
            "y": target["y"],
            "radius": 0.03
        }

        self.items.append(item)

    def _update_item_pickups(self):
        for player_id, player in self.players.items():
            aim_x = player.get("aim_x")
            aim_y = player.get("aim_y")

            if aim_x is None:
                continue

            picked_items = []

            for item in self.items:
                if self._is_colliding(aim_x, aim_y, item):
                    self._apply_item(player_id, item)
                    picked_items.append(item)

            for item in picked_items:
                self.items.remove(item)

    def _apply_item(self, player_id, item):
        player = self.players[player_id]

        if item["type"] == "ammo":
            player["ammo"] += 5

        elif item["type"] == "bomb":
            player["bombs"] += 1

        elif item["type"] == "damage":
            player["damage"] += 0.5

    # -------------------------
    # HIT DETECTION
    # -------------------------
    def check_hit(self, aim_x, aim_y):
        return self._get_hit_target(aim_x, aim_y) is not None

    def _get_hit_target(self, aim_x, aim_y):
        # Aspect ratio correction (visual circle is drawn based on width)
        # Assuming standard width=800, height=600 -> aspect_ratio = 800/600 = 1.333
        aspect_ratio = 800 / 600
        
        for target in self.targets:
            dx = aim_x - target["x"]
            dy = (aim_y - target["y"]) / aspect_ratio

            if (dx * dx + dy * dy) <= (target["radius"] ** 2):
                return target

        return None

    def _is_colliding(self, x, y, obj):
        aspect_ratio = 800 / 600
        dx= x - obj["x"]
        dy= (y - obj["y"]) / aspect_ratio
        dist = dx * dx + dy * dy
        return dist <= (obj["radius"]**2)

    # -------------------------
    # GAME STATE ACCESS
    # -------------------------
    def get_state(self):
        return {
            "players": self.players,
            "targets": self.targets,
            "items": self.items  # ← you forgot this earlier
        }