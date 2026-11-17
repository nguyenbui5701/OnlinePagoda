param(
  [Parameter(Mandatory=$true)][ValidateRange(1,2147483647)][int]$BrowserProcessId,
  [Parameter(Mandatory=$true)][string]$ScreenshotPath
)
$ErrorActionPreference = 'Stop'
# Test only: inspect and screenshot the dedicated capture process. No window mutations.
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class CaptureInspect {
  public delegate bool EnumProc(IntPtr handle, IntPtr parameter);
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr value);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc callback, IntPtr parameter);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr handle, out uint processId);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr handle);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr handle, StringBuilder text, int length);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr handle, out Rect value);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr handle, out Rect value);
  [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr handle, int index);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr handle, IntPtr dc, uint flags);
  public static IntPtr Find(uint processId) {
    IntPtr found = IntPtr.Zero; long largest = 0;
    EnumWindows((handle, parameter) => {
      uint owner; GetWindowThreadProcessId(handle, out owner);
      if (owner == processId && IsWindowVisible(handle)) {
        StringBuilder title = new StringBuilder(512); GetWindowText(handle, title, 512);
        Rect rect; GetWindowRect(handle, out rect);
        long area = (long)(rect.Right - rect.Left) * (rect.Bottom - rect.Top);
        if (title.Length > 0 && area > largest) { found = handle; largest = area; }
      }
      return true;
    }, IntPtr.Zero);
    return found;
  }
}
'@
[void][CaptureInspect]::SetProcessDpiAwarenessContext([IntPtr](-4))
$captureHandle = [CaptureInspect]::Find($BrowserProcessId)
if ($captureHandle -eq [IntPtr]::Zero) { throw 'Owned capture window not found.' }
$windowRect = New-Object CaptureInspect+Rect
$clientRect = New-Object CaptureInspect+Rect
[void][CaptureInspect]::GetWindowRect($captureHandle, [ref]$windowRect)
[void][CaptureInspect]::GetClientRect($captureHandle, [ref]$clientRect)
$width = $windowRect.Right - $windowRect.Left
$height = $windowRect.Bottom - $windowRect.Top
Add-Type -AssemblyName System.Drawing
$bitmap = New-Object Drawing.Bitmap($width, $height)
$graphics = [Drawing.Graphics]::FromImage($bitmap)
$dc = $graphics.GetHdc()
try { $printed = [CaptureInspect]::PrintWindow($captureHandle, $dc, 2) }
finally { $graphics.ReleaseHdc($dc); $graphics.Dispose() }
try {
  if (-not $printed) { throw 'Could not capture owned window.' }
  $bitmap.Save($ScreenshotPath, [Drawing.Imaging.ImageFormat]::Png)
} finally { $bitmap.Dispose() }
[ordered]@{
  width = $width; height = $height
  clientWidth = $clientRect.Right; clientHeight = $clientRect.Bottom
  hasCaption = (([CaptureInspect]::GetWindowLong($captureHandle, -16) -band 0x00C00000) -ne 0)
} | ConvertTo-Json -Compress
