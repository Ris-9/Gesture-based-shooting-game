from pathlib import Path


TITLE = "Hand Gesture Shooting Game with Computer Vision"

SECTIONS = [
    (
        "Overview",
        [
            "Yes, this is very doable as a small hackathon project.",
            "The cleanest approach is to split it into two parts: a browser game made in Codewisp and a Python computer-vision controller.",
            "Your hand acts like a gun: the index fingertip controls the aim pointer, and thumb motion triggers firing.",
        ],
    ),
    (
        "Recommended Architecture",
        [
            "Game layer: HTML, CSS, JavaScript canvas shooter generated with Codewisp.",
            "Vision layer: Python with OpenCV and MediaPipe Hands.",
            "Bridge layer: WebSocket connection from Python to the browser game.",
            "Data sent from Python to the game: pointer_x, pointer_y, fire, tracking.",
        ],
    ),
    (
        "Gesture Mapping",
        [
            "Index fingertip controls the crosshair.",
            "Gun-shape detection can be defined as: index finger extended, thumb extended, middle-ring-pinky folded.",
            "Fire action can be detected from thumb moving down/up across a threshold.",
            "For a faster MVP, use pinch-to-fire first, then upgrade to thumb-trigger firing.",
        ],
    ),
    (
        "Codewisp Prompt for the Game",
        [
            "Build a small browser-based arcade shooting game with HTML, CSS, and JavaScript.",
            "Make it fullscreen and responsive.",
            "Show a crosshair controlled by external pointer coordinates.",
            "Spawn enemy targets randomly from the top and sides.",
            "On a fire event, shoot from the bottom-center toward the crosshair.",
            "Increase score when bullets hit enemies.",
            "Reduce lives when enemies survive too long or reach the bottom.",
            "Show score, lives, combo, and a game-over screen.",
            "Add hit flashes, particle bursts, screen shake, muzzle flash, and sound hooks.",
            "Expose this JavaScript API:",
            "window.gestureInput = { updatePointer(x, y), triggerFire(), setTracking(active) }",
            "Also support keyboard and mouse fallback controls.",
            "Clamp pointer position inside canvas bounds and keep the code modular.",
        ],
    ),
    (
        "Prompt for the Vision Controller",
        [
            "Build a Python hand-gesture controller using OpenCV and MediaPipe Hands.",
            "Capture webcam video and detect one hand in real time.",
            "Track index fingertip, thumb tip, and the joints needed to identify a gun-shaped pose.",
            "Map the index fingertip to normalized screen coordinates between 0 and 1.",
            "Detect a gun gesture using index extended, thumb extended, and other fingers folded.",
            "Detect fire when the thumb moves down/up across a threshold while the gun gesture is active.",
            "Send JSON over WebSocket like: { x: 0.52, y: 0.31, fire: false, tracking: true }",
            "Smooth pointer movement, add fire cooldown, and draw debug overlays on the webcam feed.",
        ],
    ),
    (
        "Step-by-Step Solution",
        [
            "1. Build the game first in Codewisp with mouse and keyboard fallback.",
            "2. Add a JavaScript input API for updatePointer, triggerFire, and setTracking.",
            "3. Install Python packages: opencv-python, mediapipe, websockets.",
            "4. Read hand landmarks from MediaPipe Hands.",
            "5. Implement gun-pose detection.",
            "6. Map index fingertip coordinates to normalized game coordinates.",
            "7. Smooth the pointer with exponential smoothing.",
            "8. Add fire detection with a cooldown.",
            "9. Send data from Python to the game over WebSocket.",
            "10. Tune thresholds for your camera, lighting, and hand position.",
        ],
    ),
    (
        "Simple Data Flow",
        [
            "Webcam -> OpenCV -> MediaPipe Hands -> Gesture Logic -> WebSocket -> Browser Game",
        ],
    ),
    (
        "Recommended MVP Order",
        [
            "1. Game works with mouse input.",
            "2. WebSocket bridge is connected.",
            "3. Index fingertip controls the crosshair.",
            "4. Pinch gesture fires shots.",
            "5. Replace pinch firing with thumb-trigger gun gesture.",
        ],
    ),
    (
        "Main Risks",
        [
            "Thumb up/down may be noisy depending on webcam angle.",
            "Hand mirroring can affect aiming direction.",
            "Pose detection needs threshold tuning.",
            "Aiming will feel bad without smoothing.",
        ],
    ),
]


def wrap_text(text: str, width: int = 92):
    words = text.split()
    if not words:
        return [""]
    lines = []
    current = words[0]
    for word in words[1:]:
        if len(current) + 1 + len(word) <= width:
            current += " " + word
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def escape_pdf_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def build_lines():
    lines = [TITLE, ""]
    for heading, bullets in SECTIONS:
        lines.append(heading)
        for bullet in bullets:
            prefix = "- " if not bullet[:2].isdigit() else ""
            wrapped = wrap_text(prefix + bullet)
            lines.extend(wrapped)
        lines.append("")
    return lines


def build_pdf_bytes(lines):
    width = 612
    height = 792
    left = 54
    top = 740
    leading = 16

    content = ["BT", "/F1 12 Tf"]
    y = top
    page_started = False

    for raw in lines:
        if y < 60:
            content.extend(["ET", "BT", "/F1 12 Tf"])
            y = top
        content.append(f"1 0 0 1 {left} {y} Tm ({escape_pdf_text(raw)}) Tj")
        y -= leading
        page_started = True

    if page_started:
        content.append("ET")

    stream = "\n".join(content).encode("latin-1", errors="replace")

    objects = []

    def add_object(data: bytes):
        objects.append(data)

    add_object(b"<< /Type /Catalog /Pages 2 0 R >>")
    add_object(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    add_object(
        f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {width} {height}] "
        f"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>".encode("latin-1")
    )
    add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    add_object(
        f"<< /Length {len(stream)} >>\nstream\n".encode("latin-1") + stream + b"\nendstream"
    )

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]

    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("latin-1"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_pos = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))
    pdf.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_pos}\n%%EOF\n"
        ).encode("latin-1")
    )
    return bytes(pdf)


def main():
    lines = build_lines()
    pdf_bytes = build_pdf_bytes(lines)
    out_path = Path("D:/Hackathon/hand_gesture_shooting_game_plan.pdf")
    out_path.write_bytes(pdf_bytes)
    print(out_path)


if __name__ == "__main__":
    main()
