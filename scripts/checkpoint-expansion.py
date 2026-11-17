from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from datetime import datetime
import sys

root = Path(__file__).resolve().parent.parent
target = root / 'checkpoints' / ('before-expansion-' + sys.argv[1] + '-' + datetime.now().strftime('%Y%m%d-%H%M%S') + '.zip')
with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
    for directory in ['apps/server/src', 'apps/overlay/src', 'apps/dashboard/src', 'packages/shared/src', 'scripts', 'tests']:
        for path in (root / directory).rglob('*'):
            if path.is_file() and '__pycache__' not in str(path):
                archive.write(path, path.relative_to(root))
    for name in ['README.md', 'package.json', 'package-lock.json', 'tsconfig.json']:
        archive.write(root / name, name)
print(target)
