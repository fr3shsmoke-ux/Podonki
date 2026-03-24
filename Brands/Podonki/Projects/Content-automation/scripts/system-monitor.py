import sys
import os

if sys.platform == 'win32':
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import psutil
import time
from datetime import datetime
from rich.live import Live
from rich.table import Table
from rich.console import Console
from rich.panel import Panel
from rich.text import Text

console = Console(force_terminal=True, force_jupyter=False)

def get_bar(percent, width=20):
    filled = int(width * percent / 100)
    bar = '#' * filled + '-' * (width - filled)
    if percent > 90:
        color = 'red'
    elif percent > 70:
        color = 'yellow'
    else:
        color = 'green'
    return f'[{color}]{bar}[/{color}] {percent:.1f}%'

def build_table():
    cpu_percent = psutil.cpu_percent(interval=1, percpu=True)
    cpu_total = psutil.cpu_percent()
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    cpu_freq = psutil.cpu_freq()

    table = Table(title=f"System Monitor — {datetime.now().strftime('%H:%M:%S')}", border_style='cyan')
    table.add_column('Metric', style='bold white', min_width=12)
    table.add_column('Value', min_width=35)
    table.add_column('Details', style='dim')

    table.add_row('CPU Total', get_bar(cpu_total), f'{psutil.cpu_count()} cores @ {cpu_freq.current:.0f} MHz' if cpu_freq else '')
    for i, pct in enumerate(cpu_percent):
        table.add_row(f'  Core {i}', get_bar(pct), '')

    table.add_row('', '', '')
    table.add_row('RAM', get_bar(mem.percent), f'{mem.used / (1024**3):.1f} / {mem.total / (1024**3):.1f} GB')
    table.add_row('Swap', get_bar(swap.percent), f'{swap.used / (1024**3):.1f} / {swap.total / (1024**3):.1f} GB')

    top = sorted(psutil.process_iter(['name', 'cpu_percent', 'memory_percent']),
                 key=lambda p: (p.info.get('cpu_percent') or 0), reverse=True)[:5]

    table.add_row('', '', '')
    table.add_row('[bold cyan]Top Processes[/]', '[bold cyan]CPU %[/]', '[bold cyan]RAM %[/]')
    for p in top:
        name = (p.info.get('name') or '?')[:25]
        cpu = p.info.get('cpu_percent') or 0
        ram = p.info.get('memory_percent') or 0
        table.add_row(f'  {name}', f'{cpu:.1f}%', f'{ram:.1f}%')

    return table

def main():
    console.print('[bold cyan]System Monitor[/] — Ctrl+C to stop\n')
    with Live(build_table(), refresh_per_second=0.2, console=console) as live:
        while True:
            time.sleep(5)
            live.update(build_table())

if __name__ == '__main__':
    main()
