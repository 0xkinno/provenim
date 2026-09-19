import os
from playwright.sync_api import sync_playwright

svg_path = os.path.abspath("video/public/assets/real_qr.svg")
with open(svg_path, "r", encoding="utf-8") as f:
    svg_data = f.read()

html_content = f"""
<!DOCTYPE html>
<html>
<head>
<style>
body {{ margin: 0; padding: 24px; background: #ffffff; display: flex; align-items: center; justify-content: center; }}
svg {{ width: 464px; height: 464px; }}
</style>
</head>
<body>
{svg_data}
</body>
</html>
"""

html_path = os.path.abspath("video/public/assets/qr_render.html")
with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

CHROME_PATH = r"C:\Users\hp\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe"
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
    page = browser.new_page(viewport={"width": 512, "height": 512})
    page.goto(f"file:///{html_path.replace(os.sep, '/')}")
    page.wait_for_selector("svg")
    page.screenshot(path="video/public/assets/provenim_qr_code.png")
    page.screenshot(path="video/public/assets/real_qr.png")
    browser.close()

print("Successfully rendered provenim_qr_code.png and real_qr.png!")

