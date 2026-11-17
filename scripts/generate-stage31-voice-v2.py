"""Static Vietnamese fallback assets only; no names or chat sent to TTS."""
import json, sys, subprocess, wave, base64
from pathlib import Path
sys.path.insert(0,str(Path('tools/stage31-python').resolve()))
from gtts import gTTS
source=json.loads(Path('scripts/voice-phrases.json').read_text(encoding='utf-8'))
out=Path('apps/overlay/public/audio/vi-v2');out.mkdir(parents=True,exist_ok=True)
phrases=source['phrases'] if '--all' in sys.argv else {'rose':source['phrases']['rose']}
for key,text in phrases.items():
    mp3=out/f'{key}.mp3';wav=out/f'{key}.wav'
    if not mp3.exists():gTTS(text=text,lang='vi',slow=False).save(str(mp3))
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(mp3),'-ac','1','-ar','24000','-af','volume=0.8',str(wav)],check=True)
    with wave.open(str(wav),'rb') as audio:
        payload={'sampleRate':audio.getframerate(),'channels':audio.getnchannels(),'pcm16':base64.b64encode(audio.readframes(audio.getnframes())).decode('ascii')}
    (out/f'{key}.voice.json').write_text(json.dumps(payload),encoding='utf-8')
    print(key,wav.stat().st_size,flush=True)
(out/'manifest.json').write_text(json.dumps({'voice':'Google Translate Vietnamese via gTTS','source':'https://gtts.readthedocs.io/','phrases':phrases,'usage':'Fixed phrases generated at build time; no runtime network'},ensure_ascii=False,indent=2),encoding='utf-8')
