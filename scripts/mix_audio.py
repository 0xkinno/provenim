import json
import subprocess

with open('video/public/scene_manifest.json') as f:
    data = json.load(f)

scenes = data['scenes']
inputs = []
filters = []

for i, s in enumerate(scenes):
    audio_path = f"video/public/audio/{s['audio_file']}"
    inputs.extend(['-i', audio_path])
    delay_ms = int(s['start_time'] * 1000)
    filters.append(f'[{i}:a]adelay={delay_ms}|{delay_ms}[a{i}]')

amix_ins = ''.join(f'[a{i}]' for i in range(len(scenes)))
filters.append(f'{amix_ins}amix=inputs={len(scenes)}:duration=longest:dropout_transition=0,volume={len(scenes)}[outa]')

cmd = [
    'ffmpeg', '-y',
    *inputs,
    '-filter_complex', ';'.join(filters),
    '-map', '[outa]',
    '-t', str(data['total_seconds']),
    '-ar', '48000',
    '-b:a', '192k',
    'video/public/audio/voiceover_master.mp3'
]
subprocess.run(cmd, check=True)
subprocess.run(['ffmpeg', '-y', '-i', 'video/public/audio/voiceover_master.mp3', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', 'video/public/audio/voiceover_master.aac'], check=True)
print('Master audio track synchronized to 160.0s')
