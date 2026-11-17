import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('tts', Path(__file__).resolve().parents[1] / 'scripts/synthesize-stage32.py')
tts = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tts)

class TtsEnvironmentTests(unittest.TestCase):
    def test_explicit_path_wins_and_missing_explicit_path_fails(self):
        with tempfile.TemporaryDirectory() as root:
            exe = Path(root) / 'ffmpeg.exe'
            exe.touch()
            with patch.dict(os.environ, {'FFMPEG_PATH': str(exe)}):
                self.assertEqual(tts.find_ffmpeg(Path(root)), str(exe))
            with patch.dict(os.environ, {'FFMPEG_PATH': str(exe) + '.missing'}):
                with self.assertRaisesRegex(FileNotFoundError, 'TTS_FFMPEG_NOT_FOUND'):
                    tts.find_ffmpeg(Path(root))

    def test_local_binary_works_when_path_is_missing(self):
        with tempfile.TemporaryDirectory() as root:
            exe = Path(root) / 'tools/ffmpeg.exe'
            exe.parent.mkdir()
            exe.touch()
            with patch.dict(os.environ, {}, clear=True), patch.object(tts.shutil, 'which', return_value=None):
                self.assertEqual(tts.find_ffmpeg(Path(root)), str(exe))

    def test_installed_windows_fallback_and_no_candidate(self):
        with tempfile.TemporaryDirectory() as root:
            with patch.dict(os.environ, {'LOCALAPPDATA': root}, clear=True), patch.object(tts.shutil, 'which', return_value=None):
                with self.assertRaisesRegex(FileNotFoundError, 'TTS_FFMPEG_NOT_FOUND'):
                    tts.find_ffmpeg(Path(root))
                exe = Path(root) / 'CapCut/Apps/9.7.0/ffmpeg.exe'
                exe.parent.mkdir(parents=True)
                exe.touch()
                self.assertEqual(tts.find_ffmpeg(Path(root)), str(exe))

if __name__ == '__main__':
    unittest.main()
