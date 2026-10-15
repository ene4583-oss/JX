"""Prepare the bundled OFL font. Requires fonttools and NotoSansSC[wght].ttf.
Usage: python3 tools/prepare_font.py /path/to/NotoSansSC.ttf
Give aliased Unicode characters separate glyph IDs so PDF text extraction preserves
exact simplified/traditional characters instead of selecting an arbitrary alias.
"""
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from pathlib import Path
import sys,copy
font=TTFont(sys.argv[1]);instantiateVariableFont(font,{'wght':400},inplace=True)
order=font.getGlyphOrder(); seen={}; mapping={}
for code,name in sorted(font.getBestCmap().items()):
 if name in seen:
  replacement=f'{name}.u{code:X}';font['glyf'].glyphs[replacement]=copy.deepcopy(font['glyf'][name]);font['hmtx'].metrics[replacement]=font['hmtx'].metrics[name]
  if 'vmtx' in font:font['vmtx'].metrics[replacement]=font['vmtx'].metrics[name]
  order.append(replacement);mapping[code]=replacement
 else:seen[name]=code
font.setGlyphOrder(order)
for table in font['cmap'].tables:
 if table.isUnicode():
  for code,name in mapping.items():
   if code in table.cmap:table.cmap[code]=name
for record in font['name'].names:
 if record.nameID in [1,2,3,4,6,16,17]:
  value='Regular' if record.nameID in [2,17] else ('JianxuFormSans-Regular' if record.nameID==6 else 'Jianxu Form Sans')
  record.string=value.encode(record.getEncoding())
out=Path(__file__).resolve().parents[1]/'assets/fonts/FormSans-Regular.ttf';font.save(out)
print('Prepared Unicode-preserving form font; duplicated aliases:',len(mapping))
