import asyncio
import os
import subprocess
import edge_tts

SECTIONS = [
    {
        "id": "scene_01",
        "target_start": 0.0,
        "target_duration": 8.0,
        "text": "Payments can move in seconds. Knowing exactly what was paid for is harder."
    },
    {
        "id": "scene_02",
        "target_start": 8.0,
        "target_duration": 14.0,
        "text": "A browser can say paid. A database can say paid. But before a merchant fulfils an order, one question matters: can the payment actually be proven?"
    },
    {
        "id": "scene_03",
        "target_start": 22.0,
        "target_duration": 12.0,
        "text": "Provenim turns that question into a verifiable decision. It creates a payment intent, connects it to Nimiq Pay, and verifies the resulting NIM transaction against that exact request."
    },
    {
        "id": "scene_04",
        "target_start": 34.0,
        "target_duration": 16.0,
        "text": "This is not a payment screen wrapped around a database. Nimiq is the settlement rail, and Provenim builds its verification layer around the evidence produced by that rail. Amount, recipient, intent, network, finality, provenance, and uniqueness become explicit rules."
    },
    {
        "id": "scene_05",
        "target_start": 50.0,
        "target_duration": 15.0,
        "text": "The customer receives one payment request and pays through the Nimiq Pay experience. The transaction and payment data are real. Verification begins from chain evidence, not a browser callback."
    },
    {
        "id": "scene_06",
        "target_start": 65.0,
        "target_duration": 22.0,
        "text": "That is where Provenim becomes a real Nimiq Mini App. A merchant presents a request, a customer scans it, approves in Nimiq Pay, and returns to the same experience. The wallet handles signing. Provenim handles the next question: does this transaction satisfy the order?"
    },
    {
        "id": "scene_07",
        "target_start": 87.0,
        "target_duration": 16.0,
        "text": "Provenim resolves the transaction into evidence, checking amount, recipient, network, execution state, intent, finality, and uniqueness, while rejecting incomplete or ambiguous evidence. The principle is simple: paid is not a frontend state. Paid is a verified claim."
    },
    {
        "id": "scene_08",
        "target_start": 103.0,
        "target_duration": 13.0,
        "text": "When the claim passes, Provenim seals the result into a canonical proof receipt. The receipt records the evidence, intent, result, and deterministic digest."
    },
    {
        "id": "scene_09",
        "target_start": 116.0,
        "target_duration": 12.0,
        "text": "And Provenim itself is not the final authority. The receipt can be taken to an independent verifier, which recomputes the result directly from the evidence instead of trusting the application database. The recorder is not the only authority allowed to decide whether the result is true."
    },
    {
        "id": "scene_10",
        "target_start": 128.0,
        "target_duration": 7.0,
        "text": "For the merchant, the decision is simple: prove the payment — then fulfil the order."
    },
    {
        "id": "scene_11",
        "target_start": 135.0,
        "target_duration": 5.0,
        "text": "Provenim. Payment provenance for Nimiq."
    }
]

VOICE = "en-US-ChristopherNeural"
RATE = "-3%"
PITCH = "-1Hz"

async def generate_audio():
    out_dir = os.path.abspath("video/public/audio")
    os.makedirs(out_dir, exist_ok=True)
    
    print(f"Generating studio voiceover with voice={VOICE}, rate={RATE}...")
    
    durations = {}
    
    for sec in SECTIONS:
        filename = f"{sec['id']}.mp3"
        filepath = os.path.join(out_dir, filename)
        
        communicate = edge_tts.Communicate(sec["text"], voice=VOICE, rate=RATE, pitch=PITCH)
        await communicate.save(filepath)
        
        # Probe duration with ffprobe
        res = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filepath],
            capture_output=True,
            text=True
        )
        duration = float(res.stdout.strip()) if res.stdout.strip() else 0.0
        durations[sec["id"]] = duration
        print(f"  [{sec['id']}] Generated: {duration:.2f}s (Target window: {sec['target_duration']}s) -> '{sec['text'][:40]}...'")

    # Build master synchronized audio track matching exact 140.0s timeline
    # Using ffmpeg adelay and amix or concat with silence
    filter_complex = []
    inputs = []
    for i, sec in enumerate(SECTIONS):
        filepath = os.path.join(out_dir, f"{sec['id']}.mp3")
        inputs.extend(["-i", filepath])
        delay_ms = int(sec["target_start"] * 1000)
        filter_complex.append(f"[{i}:a]adelay={delay_ms}|{delay_ms}[a{i}]")
    
    amix_inputs = "".join(f"[a{i}]" for i in range(len(SECTIONS)))
    filter_complex.append(f"{amix_inputs}amix=inputs={len(SECTIONS)}:duration=longest:dropout_transition=0,volume={len(SECTIONS)}[outa]")
    
    master_wav = os.path.join(out_dir, "voiceover_master.wav")
    master_mp3 = os.path.join(out_dir, "voiceover_master.mp3")
    master_aac = os.path.join(out_dir, "voiceover_master.aac")
    
    cmd = [
        "ffmpeg", "-y",
        *inputs,
        "-filter_complex", ";".join(filter_complex),
        "-map", "[outa]",
        "-t", "140",
        "-ar", "48000",
        "-b:a", "192k",
        master_mp3
    ]
    subprocess.run(cmd, check=True)
    
    # Also generate AAC 48kHz version as specified in MASTER_VIDEO_FILM_PROMPT.md
    subprocess.run(["ffmpeg", "-y", "-i", master_mp3, "-c:a", "aac", "-b:a", "192k", "-ar", "48000", master_aac], check=True)
    
    # Check master duration
    res = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", master_mp3],
        capture_output=True,
        text=True
    )
    master_duration = float(res.stdout.strip())
    print(f"\n Master Voiceover Complete: {master_duration:.2f}s / 140.0s")
    print(f" Saved to: {master_mp3} and {master_aac}")

if __name__ == "__main__":
    asyncio.run(generate_audio())
