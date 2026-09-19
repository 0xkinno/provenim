import subprocess
import sys
import os
import time

CHROME_PATH = r"C:\Users\hp\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe"
OUTPUT_FILE = "provenim_demo_film.mp4"

print(f"[{time.strftime('%X')}] Starting full Remotion render for ProvenimFilm...")
print(f"Target: video/{OUTPUT_FILE}")
print(f"Browser: {CHROME_PATH}")

cmd = [
    "node",
    "node_modules/@remotion/cli/remotion-cli.js",
    "render",
    "src/index.ts",
    "ProvenimFilm",
    OUTPUT_FILE,
    f"--browser-executable={CHROME_PATH}",
    "--concurrency=6",
    "--jpeg-quality=90",
]

start_time = time.time()
try:
    subprocess.run(cmd, cwd="video", check=True)
    elapsed = time.time() - start_time
    print(f"[{time.strftime('%X')}] Render completed successfully in {elapsed:.1f}s ({elapsed/60:.2f} min)!")
except subprocess.CalledProcessError as e:
    print(f"Render failed with code {e.returncode}", file=sys.stderr)
    sys.exit(e.returncode)
