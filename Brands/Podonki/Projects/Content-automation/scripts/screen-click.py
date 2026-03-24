"""Скриншот экрана + клик по координатам через Windows API"""
import sys
import time
import ctypes
from ctypes import wintypes
from pathlib import Path

# Скриншот через PowerShell (не требует pip install)
import subprocess

def screenshot(path='screen.png'):
    ps = f'''
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
$bitmap.Save("{path}")
$graphics.Dispose()
$bitmap.Dispose()
'''
    subprocess.run(['powershell', '-Command', ps], capture_output=True)
    print(f'Screenshot saved: {path}')

def click(x, y):
    """Клик мышкой по экранным координатам"""
    ctypes.windll.user32.SetCursorPos(int(x), int(y))
    time.sleep(0.1 + 0.2 * __import__('random').random())
    # Left click down + up
    ctypes.windll.user32.mouse_event(0x0002, 0, 0, 0, 0)  # MOUSEEVENTF_LEFTDOWN
    time.sleep(0.05 + 0.1 * __import__('random').random())
    ctypes.windll.user32.mouse_event(0x0004, 0, 0, 0, 0)  # MOUSEEVENTF_LEFTUP
    time.sleep(0.3 + 0.3 * __import__('random').random())
    print(f'Clicked at ({x}, {y})')

def move_human(x, y, steps=15):
    """Двигаем мышь плавно к точке"""
    pos = wintypes.POINT()
    ctypes.windll.user32.GetCursorPos(ctypes.byref(pos))
    start_x, start_y = pos.x, pos.y
    for i in range(1, steps + 1):
        nx = start_x + (x - start_x) * i // steps
        ny = start_y + (y - start_y) * i // steps
        ctypes.windll.user32.SetCursorPos(nx, ny)
        time.sleep(0.01 + 0.02 * __import__('random').random())

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage:')
        print('  python screen-click.py screenshot [path]')
        print('  python screen-click.py click X Y')
        print('  python screen-click.py clicks X1,Y1 X2,Y2 X3,Y3 ...')
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == 'screenshot':
        path = sys.argv[2] if len(sys.argv) > 2 else 'screen.png'
        screenshot(path)

    elif cmd == 'click':
        x, y = int(sys.argv[2]), int(sys.argv[3])
        move_human(x, y)
        click(x, y)

    elif cmd == 'clicks':
        for arg in sys.argv[2:]:
            x, y = map(int, arg.split(','))
            move_human(x, y)
            click(x, y)
            time.sleep(0.5 + 0.5 * __import__('random').random())
