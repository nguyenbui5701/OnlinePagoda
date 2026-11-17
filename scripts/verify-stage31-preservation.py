"""Read-only comparison with the checkpoint; writes evidence, never restores live files."""
import json, hashlib, zipfile
from pathlib import Path
checkpoint=Path('checkpoints/stage3-before-stage3_1-20261101-135922.zip')
protected=['data/settings.json','apps/server/src/sources.ts','apps/server/src/tiktok/provider.ts','apps/server/src/tiktok/transport.ts','apps/server/src/tiktok/worker.ts','apps/server/src/tiktok/options.ts','apps/server/src/tiktok/errors.ts','package-lock.json']
with zipfile.ZipFile(checkpoint) as z:
    checks=[{'path':p,'unchanged':z.read(p)==Path(p).read_bytes()} for p in protected]
    changed=[p for p in z.namelist() if Path(p).is_file() and z.read(p)!=Path(p).read_bytes()]
report={'checkpoint':str(checkpoint),'sha256':hashlib.sha256(checkpoint.read_bytes()).hexdigest(),'checks':checks,'changedExistingFiles':changed,'passed':all(c['unchanged'] for c in checks)}
Path('artifacts/stage3_1/preservation-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
if not report['passed']:raise SystemExit(1)
