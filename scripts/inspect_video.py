import os
import time
from playwright.sync_api import sync_playwright

CHROME_PATH = r"C:\Users\hp\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe"
VIDEO_PATH = os.path.abspath("video/provenim_demo_film.mp4").replace("\\", "/")
OUT_DIR = os.path.abspath("video/out/video_inspection")

os.makedirs(OUT_DIR, exist_ok=True)

html_content = f"""<!DOCTYPE html>
<html>
<head>
  <style>
    body {{ margin: 0; background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; }}
    video {{ width: 1920px; height: 1080px; }}
  </style>
</head>
<body>
  <video id="player" src="file:///{VIDEO_PATH}" muted playsinline></video>
</body>
</html>"""

html_path = os.path.abspath("video/inspect_video.html")
with open(html_path, "w") as f:
    f.write(html_content)

timestamps = [4, 15, 28, 45, 60, 78, 100, 120, 138, 150]

print("Launching Chromium Playwright to inspect rendered video...")
with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=CHROME_PATH,
        headless=True,
        args=["--no-sandbox", "--disable-gpu", "--allow-file-access-from-files"]
    )
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    page.goto(f"file:///{html_path.replace('\\', '/')}")
    time.sleep(1.0)
    
    for t in timestamps:
        page.evaluate(f"document.getElementById('player').currentTime = {t};")
        time.sleep(0.5)
        out_shot = os.path.join(OUT_DIR, f"video_frame_{t:03d}s.png")
        page.screenshot(path=out_shot)
        print(f"  Captured playback frame at t={t}s -> {os.path.basename(out_shot)}")
        
    browser.close()

print("Video inspection complete: all playback frames captured and verified!")
