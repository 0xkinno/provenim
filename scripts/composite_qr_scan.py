from PIL import Image, ImageDraw, ImageFilter
import numpy as np

# Load base image and QR code
base_img = Image.open("video/public/assets/scene_05_qr_scan.jpg").convert("RGBA")
qr_img = Image.open("video/public/assets/real_qr.png").convert("RGBA")

w, h = base_img.size

# 1. Composite QR on desk parchment card
desk_qr = qr_img.resize((190, 190), Image.Resampling.LANCZOS)
desk_qr_rot = desk_qr.rotate(-15, expand=True, resample=Image.Resampling.BICUBIC)
base_img.paste(desk_qr_rot, (int(w * 0.270), int(h * 0.555)), desk_qr_rot)

# 2. Composite QR on phone viewfinder inside the yellow reticle
phone_qr = qr_img.resize((130, 130), Image.Resampling.LANCZOS)
phone_qr_rot = phone_qr.rotate(-18, expand=True, resample=Image.Resampling.BICUBIC)
base_img.paste(phone_qr_rot, (int(w * 0.465), int(h * 0.368)), phone_qr_rot)

# 3. Add glowing laser scan line across phone reticle
overlay = Image.new("RGBA", base_img.size, (255, 255, 255, 0))
draw = ImageDraw.Draw(overlay)

# Laser coordinates in phone viewfinder: across the center of the viewfinder QR
laser_start = (int(w * 0.460), int(h * 0.435))
laser_end = (int(w * 0.545), int(h * 0.400))

# Outer glow
draw.line([laser_start, laser_end], fill=(0, 255, 150, 160), width=10)
# Core glow
draw.line([laser_start, laser_end], fill=(80, 255, 180, 220), width=5)
# Bright laser center
draw.line([laser_start, laser_end], fill=(255, 255, 255, 255), width=2)

base_img = Image.alpha_composite(base_img, overlay)

# Save active scan scene
out_path = "video/public/assets/scene_05_qr_scan_active.jpg"
base_img.convert("RGB").save(out_path, quality=96)
print(f"Saved active QR scan scene with laser beam to {out_path}")

