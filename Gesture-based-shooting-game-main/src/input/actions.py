from enum import Enum, auto
import time


class ActionType(Enum):
    SHOOT = auto()
    RELOAD = auto()
    SWITCH_WEAPON = auto()
    THROW = auto()
    HOLD = auto()


class Action:
    def __init__(
        self,
        action_type,
        confidence=1.0,
        hand_id=0,
        timestamp=None,
        metadata=None
    ):
        self.type = action_type
        self.confidence = confidence
        self.hand_id = hand_id

        # When action happened (important for event systems)
        self.timestamp = timestamp if timestamp else time.time()

        # Extra data (aim position, velocity, etc.)
        self.metadata = metadata if metadata else {}

    def __repr__(self):
        return (
            f"Action(type={self.type}, "
            f"confidence={self.confidence:.2f}, "
            f"hand_id={self.hand_id}, "
            f"time={self.timestamp:.2f}, "
            f"metadata={self.metadata})"
        )