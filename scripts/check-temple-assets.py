from pathlib import Path
from PIL import Image
import json

root=Path(__file__).resolve().parent.parent
out=root/'artifacts/temple-experience-v2'; out.mkdir(parents=True,exist_ok=True)
rows=[]
for view in ['left','right','wide']:
    path=root/(f'stage4_assets/incoming/hall-{view}-clean.png' if view=='wide' else f'stage4_assets/incoming/hall-{view}.png')
    row={'view':view,'path':str(path),'exists':path.is_file()}
    if path.is_file():
        try:
            with Image.open(path) as im:
                im.load()
                portrait=im.format=='PNG' and abs(im.width/im.height-9/16)<.005
                row.update(size=list(im.size),format=im.format,valid=portrait and im.width>=1080 and im.height>=1920,
                           previewUsable=portrait and im.width>=720 and im.height>=1280)
                if row['previewUsable'] and not row['valid']:
                    row['warning']='Usable for layout review; below requested 1080x1920. Original retained, not upscaled.'
        except Exception as e:row.update(valid=False,error=str(e))
    rows.append(row)
report={'files':rows,'technicalPass':all(r.get('valid') for r in rows),'previewPass':all(r.get('previewUsable') for r in rows),'visualApproval':'PENDING','appliedToLive':False}
(out/'asset-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
for r in rows: print(r['view']+': '+('OK dimensions' if r.get('valid') else 'PREVIEW ONLY - below 1080x1920' if r.get('previewUsable') else 'MISSING / needs inspection'))
print('Report: artifacts/temple-experience-v2/asset-check.json. No LIVE files changed.')
raise SystemExit(0 if report['previewPass'] else 1)
