"""Short local WASAPI output capture for the authorized Electron audio smoke test."""
import sys, json, wave, time
from pathlib import Path
sys.path.insert(0,str(Path('tools/stage31-python').resolve()))
import pyaudiowpatch as pa
import numpy as np
out=Path('artifacts/stage3_1/capture');out.mkdir(parents=True,exist_ok=True)
with pa.PyAudio() as audio:
    device=audio.get_default_wasapi_loopback(); rate=int(device['defaultSampleRate']); channels=device['maxInputChannels']
    stream=audio.open(format=pa.paInt16,channels=channels,rate=rate,input=True,input_device_index=device['index'],frames_per_buffer=1024)
    (out/'loopback-ready.txt').write_text(str(time.time()))
    frames=[]
    for _ in range(int(rate/1024*24)):frames.append(stream.read(1024,exception_on_overflow=False))
    stream.stop_stream();stream.close()
data=b''.join(frames)
with wave.open(str(out/'electron-output-loopback.wav'),'wb') as wav:
    wav.setnchannels(channels);wav.setsampwidth(2);wav.setframerate(rate);wav.writeframes(data)
values=np.frombuffer(data,dtype=np.int16).astype(np.float64)/32768
report={'kind':'ACTUAL WINDOWS WASAPI OUTPUT LOOPBACK','device':device['name'],'rate':rate,'channels':channels,'seconds':len(values)/channels/rate,'peak':float(np.max(np.abs(values))),'rms':float(np.sqrt(np.mean(values**2))),'nonSilent':bool(np.max(np.abs(values))>.001),'clippedSamples':int(np.sum(np.abs(values)>.999))}
(out/'loopback-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report))
