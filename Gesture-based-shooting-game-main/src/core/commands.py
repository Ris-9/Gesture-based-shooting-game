# src/core/commands.py


class Command:
    """
    Base Command class
    Every command should implement execute()
    """

    def execute(self, game_session):
        raise NotImplementedError("Execute method not implemented")


# -------------------------
# SHOOT COMMAND
# -------------------------
class ShootCommand(Command):
    def __init__(self, player_id, aim_x, aim_y):
        self.player_id = player_id
        self.aim_x = aim_x
        self.aim_y = aim_y

    def execute(self, game_session):
        game_session.handle_shoot(
            self.player_id,
            self.aim_x,
            self.aim_y
        )


# -------------------------
# RELOAD COMMAND
# -------------------------
class ReloadCommand(Command):
    def __init__(self, player_id):
        self.player_id = player_id

    def execute(self, game_session):
        game_session.handle_reload(self.player_id)


# -------------------------
# FUTURE COMMANDS (PLACEHOLDERS)
# -------------------------

class SwitchWeaponCommand(Command):
    def __init__(self, player_id, weapon_id):
        self.player_id = player_id
        self.weapon_id = weapon_id

    def execute(self, game_session):
        game_session.handle_switch_weapon(
            self.player_id,
            self.weapon_id
        )


class StartThrowCommand(Command):
    def __init__(self, player_id, aim_x, aim_y):
        self.player_id = player_id
        self.aim_x = aim_x
        self.aim_y = aim_y

    def execute(self, game_session):
        game_session.handle_start_throw(
            self.player_id,
            self.aim_x,
            self.aim_y
        )


class ReleaseThrowCommand(Command):
    def __init__(self, player_id, aim_x, aim_y, charge_time):
        self.player_id = player_id
        self.aim_x = aim_x
        self.aim_y = aim_y
        self.charge_time = charge_time

    def execute(self, game_session):
        game_session.handle_release_throw(
            self.player_id,
            self.aim_x,
            self.aim_y,
            self.charge_time
        )