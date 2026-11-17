"""Optional online gTTS bridge. Reads one approved utterance through stdin; emits mono PCM16 JSON to stdout.
Requires Python, gTTS and ffmpeg. No filename/username/text is passed in process arguments or printed.
"""
import base64
import json
import subprocess
import sys
import os
import shutil
from pathlib import Path


def read_request_utf8():
    # On Windows, redirected sys.stdin may use the system ANSI code page.
    # Node.js writes JSON to the pipe as UTF-8 bytes, so decode explicitly.
    return json.loads(sys.stdin.buffer.read().decode("utf-8", errors="strict"))


def find_ffmpeg(base):
    explicit = os.environ.get('FFMPEG_PATH')
    if explicit:
        if Path(explicit).is_file():
            return explicit
        raise FileNotFoundError('TTS_FFMPEG_NOT_FOUND')
    candidates = [shutil.which('ffmpeg'), str(base / 'tools/ffmpeg/bin/ffmpeg.exe'), str(base / 'tools/ffmpeg.exe')]
    # Optional installed Windows fallback; never downloads or modifies another application.
    local = os.environ.get('LOCALAPPDATA')
    if local:
        capcut = Path(local) / 'CapCut/Apps'
        if capcut.is_dir():
            candidates.extend(str(p) for p in sorted(capcut.glob('*/ffmpeg.exe'), reverse=True))
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return candidate
    raise FileNotFoundError('TTS_FFMPEG_NOT_FOUND')


def main():
    body = read_request_utf8()
    text = body.get('text')
    if not isinstance(text, str) or not 3 <= len(text) <= 360:
        raise ValueError('Invalid utterance')
    base = Path(__file__).resolve().parents[1]
    ffmpeg = find_ffmpeg(base)
    local_site = base / 'tools' / 'stage31-python'
    if local_site.is_dir():
        sys.path.insert(0, str(local_site))
    from gtts import gTTS
    from tempfile import TemporaryDirectory
    with TemporaryDirectory() as temp:
        mp3 = str(Path(temp) / 'audio.mp3')
        gTTS(text=text, lang='vi', slow=False, timeout=6).save(mp3)
        proc = subprocess.run([ffmpeg, '-nostdin', '-hide_banner', '-loglevel', 'error',
            '-i', mp3, '-ac', '1', '-ar', '24000', '-af', 'atempo=1.5,volume=0.8', '-f', 's16le', 'pipe:1'],
            check=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=5)
        pcm = proc.stdout
        if not (2000 < len(pcm) < 1500000 and len(pcm) % 2 == 0):
            raise ValueError('Invalid PCM')
        print(json.dumps({'sampleRate': 24000, 'channels': 1,
                          'pcm16': base64.b64encode(pcm).decode('ascii')}, separators=(',', ':')))


if __name__ == '__main__':
    try:
        if '--check' in sys.argv:
            base = Path(__file__).resolve().parents[1]
            sys.path.insert(0, str(base / 'tools/stage31-python'))
            import gtts
            ffmpeg = find_ffmpeg(base)
            subprocess.run([ffmpeg, '-version'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5)
            print(json.dumps({'python': True, 'gtts': True, 'ffmpeg': True, 'network': 'NOT TESTED'}))
        else:
            main()
    except Exception as error:
        # Avoid leaking recipient names or external HTTP errors through stderr.
        code = 'TTS_FFMPEG_NOT_FOUND' if str(error) == 'TTS_FFMPEG_NOT_FOUND' else 'TTS_GENERATION_FAILED'
        sys.stderr.write(code)
        sys.exit(1)
