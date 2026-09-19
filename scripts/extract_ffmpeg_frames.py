import subprocess
import os

os.makedirs("video/out/ffmpeg_frames", exist_ok=True)

timestamps = [
    ("004", 4, "Scene 01 Mark"),
    ("015", 15, "Scene 02 Problem"),
    ("028", 28, "Scene 03 Idea"),
    ("045", 45, "Scene 04 Architecture"),
    ("068", 68, "Scene 05 Barcode Scan"),
    ("080", 80, "Scene 06 Mobile Phone"),
    ("105", 105, "Scene 07 Evidence Invariants"),
    ("122", 122, "Scene 08 Sealed Receipt"),
    ("135", 135, "Scene 09 Verifier"),
    ("150", 150, "Scene 10 Ledger"),
    ("156", 156, "Scene 11 Outro"),
]

for tag, secs, name in timestamps:
    out_file = f"video/out/ffmpeg_frames/frame_{tag}_{name.replace(' ', '_').lower()}.png"
    cmd = [
        "ffmpeg", "-y",
        "-ss", str(secs),
        "-i", "video/provenim_demo_film.mp4",
        "-frames:v", "1",
        "-update", "1",
        out_file
    ]
    subprocess.run(cmd, check=True)
    print(f"Extracted {tag} (t={secs}s) - {name} -> {out_file}")

print("All FFmpeg verification frames extracted successfully!")
