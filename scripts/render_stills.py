import subprocess
import os

FRAMES = [
    (450, "out/still_scene_02.png"),
    (800, "out/still_scene_03.png"),
    (1400, "out/still_scene_04.png"),
    (1900, "out/still_scene_05.png"),
    (2450, "out/still_scene_06.png"),
    (3100, "out/still_scene_07.png"),
    (3600, "out/still_scene_08.png"),
    (4100, "out/still_scene_09.png"),
    (4480, "out/still_scene_10.png"),
]

CHROME_PATH = r"C:\Users\hp\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe"

for frame, out in FRAMES:
    print(f"Rendering frame {frame} -> {out}...")
    cmd = [
        "node",
        "node_modules/@remotion/cli/remotion-cli.js",
        "still",
        "src/index.ts",
        "ProvenimFilm",
        out,
        f"--frame={frame}",
        f"--browser-executable={CHROME_PATH}"
    ]
    subprocess.run(cmd, cwd="video", check=True)

print("All still frames rendered successfully!")
