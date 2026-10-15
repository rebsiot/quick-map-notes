from pathlib import Path
out=Path(__file__).resolve().parents[1]/'icons'
# Original monochrome vector illustrations. Native Foundry texture tint multiplies white artwork.
body={
  'pin': '<path d="M24 43s13-15 13-24a13 13 0 1 0-26 0c0 9 13 24 13 24Z"/><circle cx="24" cy="19" r="5"/>',
  'building': '<path d="M9 42V9h30v33M5 42h38M17 15h3m8 0h3M17 23h3m8 0h3M17 31h3m8 0h3M22 42v-7h6v7"/>',
  'house': '<path d="m5 23 19-16 19 16M10 20v22h28V20M20 42V29h8v13"/>',
  'warehouse': '<path d="M5 42V19L24 8l19 11v23H5ZM5 25h38M16 42V30h16v12M16 35h16"/>',
  'car': '<path d="M6 31 11 17h26l5 14v10H6V31ZM6 31h36M14 17l-4 14m28 0-4-14M12 41v3m24-3v3"/><circle cx="14" cy="35" r="2"/><circle cx="34" cy="35" r="2"/>',
  'person': '<circle cx="24" cy="15" r="8"/><path d="M10 42v-5c0-8 6-14 14-14s14 6 14 14v5H10Z"/>',
  'eye': '<path d="M4 24s8-12 20-12 20 12 20 12-8 12-20 12S4 24 4 24Z"/><circle cx="24" cy="24" r="6"/>',
  'alert': '<path d="m24 6 20 36H4L24 6Z"/><path d="M24 19v11"/><circle cx="24" cy="36" r="1.5" fill="white" stroke="none"/>',
  'key': '<circle cx="17" cy="18" r="9"/><path d="m23 24 18 18m-6-6 5-5m-10 0 5-5"/>',
  'lock': '<rect x="9" y="21" width="30" height="22" rx="3"/><path d="M15 21v-8a9 9 0 0 1 18 0v8"/><circle cx="24" cy="31" r="2"/><path d="M24 33v4"/>',
  'medical': '<path d="M18 5h12v13h13v12H30v13H18V30H5V18h13V5Z"/>',
  'star': '<path d="m24 4 6.3 13.3L45 19l-10.8 10.4L36.9 44 24 36.9 11.1 44l2.7-14.6L3 19l14.7-1.7L24 4Z"/>'
}
for name,path in body.items():
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" role="img" aria-label="{name}"><g stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none">{path}</g></svg>'''
    (out/(name+'.svg')).write_text(svg,encoding='utf-8')
print('Generated',len(body),'original icons')
