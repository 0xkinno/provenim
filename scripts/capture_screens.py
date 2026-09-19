import os
import time
import json
from playwright.sync_api import sync_playwright

CHROME_PATH = r"C:\Users\hp\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe"
BASE_URL = "https://provenim.vercel.app"
OUT_DIR = os.path.abspath("video/public/screens")

os.makedirs(OUT_DIR, exist_ok=True)

with open("evidence/receipt.json", "r") as f:
    sample_receipt_str = f.read()

def capture_all():
    print("Launching Chromium at:", CHROME_PATH)
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME_PATH,
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"]
        )
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=2
        )
        page = context.new_page()
        
        # 1. Landing Page Hero
        print("Capturing 01_landing_hero...")
        page.goto(f"{BASE_URL}/", wait_until="networkidle")
        time.sleep(1.5)
        page.screenshot(path=os.path.join(OUT_DIR, "01_landing_hero.png"))
        
        # Invariants section
        print("Capturing 01_landing_invariants...")
        page.evaluate("window.scrollBy(0, 750)")
        time.sleep(1.0)
        page.screenshot(path=os.path.join(OUT_DIR, "01_landing_invariants.png"))
        page.evaluate("window.scrollTo(0, 0)")
        
        # 2. Create Payment Request Screen
        print("Capturing 02_create_request...")
        page.locator("button:has-text('New Order')").click()
        time.sleep(1.0)
        page.screenshot(path=os.path.join(OUT_DIR, "02_create_request.png"))
        
        # Fill amount & ref using input elements
        text_inputs = page.locator("input[type='text']")
        if text_inputs.count() >= 2:
            print("Found inputs, filling orderRef and amount...")
            text_inputs.nth(0).fill("ORD-1048-PARCHMENT")
            text_inputs.nth(1).fill("18.01422")
            time.sleep(0.5)
            page.screenshot(path=os.path.join(OUT_DIR, "02_create_request_filled.png"))
            
            # 3. Generate Request
            print("Capturing 03_payment_request_qr...")
            submit_btn = page.locator("button:has-text('Create payment request')").first
            if submit_btn.is_visible():
                submit_btn.click()
                print("Waiting for QR SVG...")
                page.wait_for_selector("svg rect", timeout=30000)
                time.sleep(2.0)
                page.screenshot(path=os.path.join(OUT_DIR, "03_payment_request_qr.png"))
                qr_svg = page.locator("svg:has(rect)").first
                if qr_svg.is_visible():
                    os.makedirs("video/public/assets", exist_ok=True)
                    qr_svg.screenshot(path="video/public/assets/real_qr_code.png")
                    print("Saved real_qr_code.png!")
        
        # 4. Verify Receipt Screen (Independent Verifier)
        print("Capturing 07_independent_verifier...")
        page.locator("button:has-text('Verify Receipt')").click()
        time.sleep(1.2)
        
        # Check if there is a 'Load Sample' button
        load_sample = page.locator("button:has-text('Load Sample Receipt')").first
        if load_sample.is_visible():
            load_sample.click()
            time.sleep(0.5)
        else:
            textarea = page.locator("textarea").first
            if textarea.is_visible():
                textarea.fill(sample_receipt_str)
                time.sleep(0.5)
        
        verify_btn = page.locator("button:has-text('Re-verify Receipt On-Chain')").first
        if verify_btn.is_visible():
            verify_btn.click()
            time.sleep(2.5)
        
        page.screenshot(path=os.path.join(OUT_DIR, "07_independent_verifier_verified.png"))
        
        # Scroll to see the 14 invariant cards
        page.evaluate("window.scrollBy(0, 500)")
        time.sleep(0.8)
        page.screenshot(path=os.path.join(OUT_DIR, "07_verifier_invariants.png"))
        page.evaluate("window.scrollTo(0, 0)")
        
        # 5. Proof & Chain Evidence Screen
        print("Capturing 08_proof_chain_evidence...")
        page.locator("button:has-text('Proof & Chain')").click()
        time.sleep(1.2)
        page.screenshot(path=os.path.join(OUT_DIR, "08_proof_chain_evidence.png"))
        
        # 6. Ledger Screen
        print("Capturing 06_merchant_ledger...")
        page.locator("button:has-text('Ledger')").first.click()
        time.sleep(1.2)
        page.screenshot(path=os.path.join(OUT_DIR, "06_merchant_ledger.png"))
        
        browser.close()
        print("All screen captures updated successfully!")

if __name__ == "__main__":
    capture_all()
