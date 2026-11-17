"""Archived rejected Piper experiment. Not used by the application; approved voice is vi-v2."""
import json, sys, wave, urllib.request
from pathlib import Path
sys.path.insert(0,str(Path('tools/stage31-python').resolve()))
from piper import PiperVoice, SynthesisConfig

PHRASES = {
    'rose': 'Cảm ơn bạn đã gửi hoa hồng. Xin chúc bạn bình an.',
    'heart': 'Cảm ơn bạn đã thắp ánh đèn yêu thương.',
    'bouquet': 'Xin cảm ơn bạn đã dâng hoa sen. Chúc gia đình an lành.',
    'donut': 'Cảm ơn bạn. Một tiếng chuông bình an xin được ngân lên.',
    'offering': 'Cảm ơn bạn đã gửi tấm lòng thành. Chúc mọi điều tốt đẹp.',
    'corgi': 'Xin cảm ơn bạn. Chúc bạn luôn bình an và nhiều niềm vui.',
    'lantern': 'Cảm ơn bạn đã thả hoa đăng. Mong lời chúc tốt lành lan tỏa.',
    'lion': 'Xin cảm ơn bạn với món quà đặc biệt. Chúc bạn và gia đình an lành.',
    'generic': 'Xin cảm ơn bạn đã gửi quà. Chúc bạn bình an.'
}
def main():
    out = Path('artifacts/stage3_1/rejected-voice-piper'); out.mkdir(parents=True, exist_ok=True)
    models=Path('tools/stage31-models'); models.mkdir(parents=True,exist_ok=True)
    base='https://huggingface.co/rhasspy/piper-voices/resolve/main/vi/vi_VN/vais1000/medium/'
    for name in ['vi_VN-vais1000-medium.onnx','vi_VN-vais1000-medium.onnx.json','MODEL_CARD']:
        target=models/name
        if not target.exists(): urllib.request.urlretrieve(base+name,target)
    voice=PiperVoice.load(str(models/'vi_VN-vais1000-medium.onnx'))
    for key, text in PHRASES.items():
        target = out / f'{key}.wav'
        if target.exists() and target.stat().st_size > 1000: continue
        with wave.open(str(target),'wb') as wav:
            voice.synthesize_wav(text,wav,syn_config=SynthesisConfig(length_scale=1.05,volume=.7))
        print(key, target.stat().st_size, flush=True)
    (out/'manifest.json').write_text(json.dumps({'voice':'vi_VN-vais1000-medium','source':base,'engine':'Piper 1.8.0, local build-time synthesis','phrases':PHRASES},ensure_ascii=False,indent=2),encoding='utf-8')
    (out/'MODEL_CARD.txt').write_bytes((models/'MODEL_CARD').read_bytes())
main()
