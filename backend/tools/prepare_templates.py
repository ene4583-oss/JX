"""Build redacted, flattened templates and field coordinates from the supplied originals.
Requires pymupdf and Pillow. The Node.js runtime does not require Python.
All coordinates are PDF points measured from the top-left of a 540 x 780 page.
"""
import fitz, json, pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCE=ROOT/'templates'
DEST=ROOT/'assets/templates'
DEST.mkdir(parents=True,exist_ok=True)
TYPES=['ATN','ATS','ATP','ATE','SLL','SLC','ATL','BTU','ATP (M)']
layouts={}
def layout(company,kind,fields,checks=None):
    layouts[company+'/'+kind]={'fields':fields,'checks':checks or []}
def box(key, options):return {'key':key,'options':options}
def common(usage,condition):
    return [box('usage',{'Perdagangan':usage[0],'Bukan Perdagangan':usage[1]}),box('condition',{'Baru':condition[0],'Lama':condition[1]})]
# x,y,width,height. Field rectangles replace blank dotted writing areas only.
layout('DE','ATN',{'date':[171,138,68,12],'owner':[30,291,154,68],'brand':[251,167,240,65],'manufacturer':[251,258,240,33],'capacity':[330,510,150,13],'interval':[330,551,150,13],'last_date':[85,601,100,12],'last_branch':[95,616,90,12],'old_reg':[135,631,50,12]},common([[144,199,34,14],[144,225,34,14]],[[342,611,39,14],[420,611,40,14]])+[box('instrument_kind',{'Pedestal':[342,326,38,28],'Suspended':[458,326,42,28]}),box('tray',{'Mangkuk':[343,442,38,20],'Rata':[460,442,40,20]})])
layout('DE','ATS',{'date':[173,152,85,14],'owner':[63,273,152,38],'brand':[284,182,204,58],'manufacturer':[285,266,204,18],'instrument_kind':[351,292,135,13],'model':[353,314,125,12],'serial_no':[333,334,145,13],'capacity':[390,354,99,14],'interval':[390,389,99,13],'last_date':[340,470,70,12],'last_branch':[356,490,54,12],'old_reg':[383,509,40,12]},common([[159,199,38,13],[159,224,38,13]],[[332,430,38,10],[409,430,38,10]]))
layout('DE','ATP',{'date':[179,129,86,14],'owner':[45,237,191,56],'brand':[358,151,80,13],'manufacturer':[392,173,85,13],'model':[372,196,105,13],'serial_no':[354,219,123,13],'capacity':[378,248,99,13],'interval':[386,280,91,13],'last_date':[360,411,117,13],'last_branch':[375,433,102,13],'old_reg':[407,455,70,13]},common([[180,170,40,12],[180,192,40,12]],[[354,371,36,11],[443,371,30,11]])+[box('indicator',{'Digital':[370,314,44,12],'Dail':[452,314,30,12]})])
layout('DE','ATE',{'date':[178,200,98,14],'owner':[51,326,180,55],'brand':[355,222,122,13],'manufacturer':[389,246,88,13],'model':[367,296,110,13],'serial_no':[348,323,129,13],'capacity':[375,404,102,13],'interval':[380,429,97,13],'last_date':[352,516,125,13],'last_branch':[372,533,105,13],'old_reg':[408,554,69,13]},common([[179,242,37,13],[179,268,37,13]],[[337,474,36,12],[438,474,36,12]]))
layout('DE','SLL',{'owner':[23,193,447,28],'model':[97,247,103,13],'capacity':[96,267,104,13],'manufacturer':[106,286,94,13],'last_date':[65,324,50,12],'last_branch':[218,324,66,12],'old_reg':[424,321,65,12]},[box('condition',{'Baru':[361,226,38,10],'Lama':[439,226,37,10]}),box('material',{'Kayu Keras':[361,246,38,11],'Logam':[439,246,37,11]})])
layout('DE','SLC',{'owner':[37,169,439,39],'model':[118,343,146,14],'capacity':[171,367,93,14],'last_date':[101,544,150,13],'last_branch':[117,569,134,13],'old_reg':[164,593,87,13]},[box('usage',{'Perdagangan':[430,313,45,13],'Bukan Perdagangan':[430,338,45,13]}),box('material',{'Keluli':[161,412,46,12],'Tembaga':[161,435,46,12],'Besi Berlapis':[161,458,46,12],'Besi Berkilat':[161,482,46,12]}),box('shape',{'Tirus':[431,412,47,12],'Tembikar':[431,435,47,12],'Kotak':[431,458,47,12]})])
layout('DE','ATL',{'owner':[230,167,160,17],'manufacturer':[133,211,254,13],'last_date':[138,238,93,10],'last_branch':[157,247,74,10],'old_reg':[191,257,196,10]},[box('condition',{'Baru':[285,190,32,14],'Lama':[349,190,37,14]})])
layout('DE','BTU',{'date':[174,174,81,14],'owner':[55,334,189,70],'brand':[324,195,161,13],'manufacturer':[356,224,129,13],'capacity':[336,417,149,13],'last_date':[340,545,145,13],'last_branch':[358,565,127,13],'old_reg':[415,584,70,13]},common([[208,249,28,13],[208,280,28,13]],[[318,472,43,13],[418,472,43,13]])+[box('material',{'Besi Tuangan':[420,282,42,13],'Tembaga':[420,312,42,13],'Zamrud':[420,343,42,13],'Lain-lain':[420,374,42,13]})])
layout('DE','ATP (M)',{'date':[169,143,77,17],'owner':[64,260,172,83],'brand':[319,157,140,19],'manufacturer':[367,187,105,13],'model':[333,210,139,13],'serial_no':[316,231,156,13],'capacity':[327,246,145,15],'steelyard_capacity':[399,274,46,13],'interval':[357,295,115,13],'counterpoise_count':[401,317,48,13],'counterpoise_weights':[300,357,80,93],'last_date':[333,526,139,13],'last_branch':[350,547,122,13],'old_reg':[359,558,113,19]},common([[160,188,18,21],[160,210,18,21]],[[363,462,21,20],[425,462,21,20]]))
layout('MCM','ATN',{'date':[181,192,37,12],'owner':[54,299,141,66],'brand':[282,212,198,13],'manufacturer':[324,232,156,16],'capacity':[293,518,69,11],'interval':[433,518,49,11],'last_date':[276,598,74,11],'last_branch':[435,598,48,11],'old_reg':[329,608,151,12]},common([[185,228,20,20],[185,248,20,20]],[[284,551,41,21],[429,551,43,21]])+[box('instrument_kind',{'Pedestal':[355,328,29,26],'Suspended':[450,328,25,26]}),box('tray',{'Mangkuk':[322,488,16,16],'Rata':[443,488,16,16]})])
layout('MCM','ATS',{'date':[190,196,96,13],'owner':[63,306,201,40],'brand':[368,219,130,13],'manufacturer':[404,241,94,13],'model':[375,311,123,13],'serial_no':[351,380,147,13],'capacity':[378,402,120,13],'interval':[389,425,109,13],'last_date':[362,529,136,13],'last_branch':[380,552,118,13],'old_reg':[421,575,77,13]},common([[186,239,21,12],[186,261,21,12]],[[355,471,22,12],[441,471,22,12]]))
layout('MCM','ATP',{'date':[180,158,48,12],'owner':[45,254,171,44],'brand':[293,178,170,13],'manufacturer':[346,197,117,13],'model':[320,256,128,13],'serial_no':[303,276,145,13],'capacity':[307,295,141,13],'interval':[318,315,130,13],'last_date':[303,508,145,12],'last_branch':[322,527,126,12],'old_reg':[365,547,83,13]},common([[188,198,19,9],[188,217,19,9]],[[279,454,18,14],[340,454,20,14]])+[box('indicator',{'Digital':[279,354,18,14],'Dail':[340,354,18,14]})])
layout('MCM','ATE',{'date':[173,185,119,13],'owner':[45,282,205,67],'brand':[357,204,149,13],'manufacturer':[396,224,110,13],'model':[367,284,139,13],'serial_no':[350,304,156,13],'capacity':[368,422,138,13],'interval':[363,442,143,13],'last_date':[350,520,156,13],'last_branch':[369,540,137,13],'old_reg':[414,560,92,13]},common([[169,225,20,11],[169,244,20,11]],[[367,470,30,12],[447,470,30,12]]))
layout('MCM','SLL',{'owner':[141,162,290,30],'model':[88,274,174,12],'capacity':[287,285,113,12],'manufacturer':[101,293,205,12],'last_date':[73,331,52,12],'last_branch':[193,331,76,12],'old_reg':[383,331,85,12]},[box('condition',{'Baru':[337,236,33,10],'Lama':[447,236,28,10]}),box('material',{'Kayu Keras':[337,254,33,10],'Logam':[447,254,28,10]})])
layout('MCM','SLC',{'owner':[43,167,434,39],'model':[128,339,141,13],'capacity':[181,364,88,13],'last_date':[108,536,150,13],'last_branch':[128,560,130,13],'old_reg':[173,584,85,13]},[box('usage',{'Perdagangan':[433,310,44,13],'Bukan Perdagangan':[433,334,44,13]}),box('material',{'Keluli':[167,407,44,12],'Tembaga':[167,431,44,12],'Besi Berlapis':[167,454,44,12],'Besi Berkilat':[167,478,44,12]}),box('shape',{'Tirus':[432,407,46,12],'Tembikar':[432,431,46,12],'Kotak':[432,454,46,12]})])
for kind in ['ATL','BTU','ATP (M)']:
 layouts['MCM/'+kind]=json.loads(json.dumps(layouts['DE/'+kind]))
# Each inspection answer is blank by default; never assume a passed inspection.
for company in ['DE','MCM']:
 for kind in ['SLL','ATL']:
  spec=layouts[company+'/'+kind]
  if kind=='SLL':
   ys=[363,414,434,465,525,585,615,665] if company=='DE' else [384,414,434,461,516,545,574,603]
   for i,y in enumerate(ys):spec['checks'].append(box('check_'+str(i+1),{'Ya':[362 if company=='DE' else 430,y,37 if company=='DE' else 10,12],'Tidak':[439 if company=='DE' else 477,y,37 if company=='DE' else 10,12]}))
  else:
   for i,y in enumerate([298,316,342,359,383,403,424,442]):spec['checks'].append(box('check_'+str(i+1),{'Ya':[365,y,16,10],'Tidak':[391,y,16,10]}))
OWNER_LINE_HEIGHTS = {'DE/ATN': 15, 'DE/ATS': 10, 'DE/ATP': 16, 'MCM/ATN': 10, 'MCM/ATS': 12}
for key, height in OWNER_LINE_HEIGHTS.items():layouts[key]['owner_line_height']=height
# Writing areas calibrated to the actual dotted lines in the original scans.
FIELD_CORRECTIONS = {'DE/ATN': {'owner': [29.3, 286, 155.3, 68], 'last_date': [64.7, 600, 122.0, 12], 'last_branch': [82.7, 614, 106.3, 12], 'old_reg': [111.3, 629, 76.3, 12]}, 'DE/ATS': {'owner': [63.7, 270, 150.7, 38], 'model': [333.3, 312, 145.7, 12], 'serial_no': [323.0, 332, 155.0, 13], 'last_date': [320.7, 468, 89.0, 12], 'last_branch': [336.7, 488, 73.0, 12], 'old_reg': [365.0, 508, 49.0, 12]}, 'DE/ATP': {'owner': [49.3, 233, 163.0, 56], 'brand': [342.7, 150, 100.0, 13], 'manufacturer': [372.0, 172, 70.3, 13], 'model': [348.7, 194, 91.0, 13], 'serial_no': [337.3, 217, 104.7, 13], 'capacity': [357.3, 246, 74.7, 13], 'interval': [363.3, 278, 74.0, 13], 'last_date': [333.0, 409, 96.3, 13], 'last_branch': [350.3, 432, 79.0, 13], 'old_reg': [381.0, 454, 52.7, 13]}, 'DE/ATE': {'brand': [334.7, 220, 131.3, 13], 'manufacturer': [361.3, 244, 104.7, 13], 'model': [342.3, 295, 123.7, 13], 'serial_no': [332.0, 321, 98.3, 13], 'capacity': [347.7, 403, 69.0, 13], 'last_date': [328.7, 514, 128.0, 13], 'last_branch': [344.0, 531, 112.3, 13]}, 'DE/SLL': {'model': [85.0, 245, 115.7, 13], 'capacity': [90.7, 265, 93.7, 13], 'manufacturer': [92.7, 286, 107.3, 13], 'last_date': [56.7, 322, 58.3, 12], 'last_branch': [212.3, 322, 74.3, 12], 'old_reg': [425.0, 322, 64.7, 12]}, 'DE/SLC': {'model': [106.3, 343, 100.0, 14], 'last_date': [86.7, 544, 102.7, 13], 'old_reg': [140.7, 592, 90.0, 13]}, 'DE/ATL': {'manufacturer': [110.0, 209, 182.3, 13], 'last_date': [145.7, 235, 70.7, 10], 'last_branch': [145.7, 245, 72.7, 10]}, 'DE/BTU': {'brand': [311.7, 192, 165.3, 13], 'manufacturer': [338.0, 221, 140.0, 13], 'last_branch': [357.0, 563, 84.0, 13]}, 'DE/ATP (M)': {}, 'MCM/ATN': {'owner': [51.0, 299, 143.3, 66], 'brand': [266.3, 210, 168.3, 13], 'capacity': [278.7, 516, 66.0, 11], 'interval': [421.0, 516, 41.3, 11], 'last_date': [260.0, 595, 87.0, 11], 'last_branch': [422.3, 595, 41.7, 11], 'old_reg': [301.7, 605, 117.3, 12]}, 'MCM/ATS': {'owner': [75.3, 309, 180.3, 40], 'brand': [339.3, 217, 130.0, 13], 'manufacturer': [403.7, 240, 65.7, 13], 'model': [347.7, 309, 122.0, 13], 'capacity': [355.3, 400, 96.0, 13], 'interval': [361.0, 423, 99.7, 13], 'last_date': [334.3, 527, 136.3, 13]}, 'MCM/ATP': {'brand': [290.0, 176, 172.3, 13], 'manufacturer': [317.7, 196, 144.3, 13], 'serial_no': [285.3, 274, 159.7, 13], 'capacity': [303.7, 294, 136.0, 13], 'interval': [309.7, 313, 134.0, 13], 'last_date': [282.3, 506, 180.3, 12], 'last_branch': [298.7, 525, 161.0, 12]}, 'MCM/ATE': {'brand': [336.3, 203, 169.0, 13], 'manufacturer': [366.3, 223, 139.0, 13], 'model': [344.7, 282, 166.7, 13], 'serial_no': [333.7, 302, 175.0, 13], 'capacity': [353.7, 421, 136.7, 13], 'interval': [350.0, 441, 140.3, 13], 'last_date': [330.3, 518, 175.7, 13], 'last_branch': [347.3, 538, 160.0, 13]}, 'MCM/SLL': {'model': [88.0, 271, 174.0, 12], 'capacity': [282.3, 281, 117.3, 12], 'manufacturer': [84.7, 290, 221.0, 12], 'last_date': [69.0, 328, 56.3, 12], 'last_branch': [196.3, 328, 72.0, 12], 'old_reg': [381.0, 328, 87.3, 12]}, 'MCM/SLC': {'model': [111.7, 339, 99.0, 13], 'last_date': [90.7, 535, 102.0, 13], 'last_branch': [110.0, 559, 87.7, 13], 'old_reg': [144.3, 583, 89.0, 13]}, 'MCM/ATL': {'manufacturer': [110.0, 209, 182.3, 13], 'last_date': [145.7, 235, 70.7, 10], 'last_branch': [145.7, 245, 72.7, 10]}, 'MCM/BTU': {'brand': [311.7, 192, 165.3, 13], 'manufacturer': [338.0, 221, 140.0, 13], 'last_branch': [357.0, 563, 84.0, 13]}, 'MCM/ATP (M)': {}}
for key, fields in FIELD_CORRECTIONS.items():layouts[key]['fields'].update(fields)
# Writing baselines recalibrated for ATN, ATS and BTU (2026-10-16).
BASELINE_CORRECTIONS = {'DE/ATN': {'last_date': [70, 599.7, 117, 12], 'last_branch': [86, 613.9, 103, 12], 'old_reg': [118, 628.7, 70, 12]}, 'DE/ATS': {'model': [339, 312, 140, 12], 'serial_no': [329, 332, 149, 13], 'last_date': [324, 468, 86, 12], 'last_branch': [342, 488, 68, 12]}, 'MCM/ATN': {'date': [181, 189, 37, 12], 'manufacturer': [297, 229, 183, 16], 'capacity': [285, 516.2, 60, 11], 'interval': [427, 516.2, 36, 11], 'old_reg': [307, 605, 112, 12]}, 'MCM/ATS': {'owner': [75.3, 297.2, 180.3, 46], 'manufacturer': [374, 237.7, 95.7, 13], 'instrument_kind': [352, 283.7, 117, 13], 'model': [350, 308.7, 119.7, 13], 'serial_no': [341, 331.7, 128.7, 13], 'last_branch': [353, 549.7, 117, 13], 'old_reg': [381, 572.7, 88.7, 13]}, 'DE/BTU': {'date': [55, 192.5, 169, 14], 'capacity': [330, 432.7, 113, 13], 'old_reg': [282, 591.7, 160, 13]}, 'MCM/BTU': {'date': [55, 192.5, 169, 14], 'capacity': [330, 432.7, 113, 13], 'old_reg': [282, 591.7, 160, 13]}}
for key, fields in BASELINE_CORRECTIONS.items():
 layouts[key]['fields'].update(fields)
 layouts[key]['baseline_size']=9
layouts['MCM/ATS']['owner_line_height']=11.5
# Coordinates calibrated against the supplied scans, preserving the original boxes.
CHECK_CORRECTIONS = {'DE/ATP': {'usage': {'Perdagangan': [179.5, 172.5, 41, 11.5], 'Bukan Perdagangan': [179.5, 195, 41, 12]}, 'indicator': {'Digital': [348, 326, 41.5, 11], 'Dail': [430.5, 326, 41.5, 11]}, 'condition': {'Baru': [348, 370, 41.5, 11], 'Lama': [430.5, 370, 41.5, 11]}}, 'DE/ATE': {'condition': {'Baru': [340, 475, 44, 9], 'Lama': [423, 475, 43, 9]}}, 'MCM/ATN': {'usage': {'Perdagangan': [183.5, 222, 21, 19.5], 'Bukan Perdagangan': [183.5, 251.5, 21, 19.5]}, 'instrument_kind': {'Pedestal': [324, 350.5, 23.5, 19.5], 'Suspended': [441, 350.5, 23, 19.5]}, 'tray': {'Mangkuk': [324, 488.5, 23, 19.5], 'Rata': [440.5, 488.5, 23.5, 19.5]}, 'condition': {'Baru': [324, 548, 23.5, 19.5], 'Lama': [440.5, 548, 23.5, 19.5]}}, 'MCM/ATS': {'usage': {'Perdagangan': [164.5, 241, 21, 11], 'Bukan Perdagangan': [164.5, 263.5, 21, 11.5]}, 'condition': {'Baru': [310.5, 468, 24.5, 14], 'Lama': [416.5, 468, 24, 14]}}, 'MCM/ATP': {'usage': {'Perdagangan': [187.5, 196.5, 20, 10], 'Bukan Perdagangan': [187.5, 217, 20, 10]}, 'indicator': {'Digital': [278, 354, 18.5, 14.5], 'Dail': [338.5, 354, 20, 14.5]}, 'condition': {'Baru': [278, 454, 18.5, 14.5], 'Lama': [339.5, 454, 20, 14.5]}}, 'MCM/ATE': {'usage': {'Perdagangan': [168, 224.5, 23, 9.5], 'Bukan Perdagangan': [168, 244.5, 23, 9.5]}, 'condition': {'Baru': [377.5, 460.5, 20, 19.5], 'Lama': [456, 460.5, 21, 19.5]}}, 'DE/BTU': {'usage': {'Perdagangan': [222, 244, 24.5, 19.5], 'Bukan Perdagangan': [222, 275, 24.5, 20]}, 'condition': {'Baru': [325, 475, 30, 10], 'Lama': [414.5, 475, 36.5, 10]}, 'material': {'Besi Tuangan': [414, 285.5, 36.5, 9.5], 'Tembaga': [414, 316, 36.5, 9.5], 'Zamrud': [414, 346.5, 36.5, 9.5], 'Lain-lain': [414, 377, 36.5, 10]}}, 'DE/ATL': {'check_1': {'Ya': [362, 301, 17, 9], 'Tidak': [402.5, 301, 19.5, 9]}, 'check_2': {'Ya': [362, 319, 17, 9], 'Tidak': [402.5, 319, 19.5, 9]}, 'check_3': {'Ya': [362, 337.5, 17, 9], 'Tidak': [402.5, 337.5, 19.5, 9]}, 'check_4': {'Ya': [362, 355.5, 17, 9], 'Tidak': [402.5, 355.5, 19.5, 9]}, 'check_5': {'Ya': [362, 371, 17, 9], 'Tidak': [402.5, 371, 19.5, 9]}, 'check_6': {'Ya': [362, 398.5, 17, 9], 'Tidak': [402.5, 398.5, 19.5, 9]}, 'check_7': {'Ya': [362, 425.5, 17, 9], 'Tidak': [402.5, 425.5, 19.5, 9]}, 'check_8': {'Ya': [362, 443.5, 17, 9], 'Tidak': [402.5, 443.5, 19.5, 9]}}, 'DE/SLC': {'usage': {'Perdagangan': [427.5, 318, 47, 12], 'Bukan Perdagangan': [427.5, 342.5, 47, 12]}, 'material': {'Keluli': [149, 415, 46, 12], 'Tembaga': [149, 439, 46, 12], 'Besi Berlapis': [149, 463.5, 46, 12], 'Besi Berkilat': [149, 488.5, 46, 12]}, 'shape': {'Tirus': [427.5, 415, 47, 12], 'Tembikar': [427.5, 439, 47, 12], 'Kotak': [427.5, 463.5, 47, 12]}}, 'MCM/BTU': {'usage': {'Perdagangan': [222, 244, 24.5, 19.5], 'Bukan Perdagangan': [222, 275, 24.5, 20]}, 'condition': {'Baru': [325, 475, 30, 10], 'Lama': [414.5, 475, 36.5, 10]}, 'material': {'Besi Tuangan': [414, 285.5, 36.5, 9.5], 'Tembaga': [414, 316, 36.5, 9.5], 'Zamrud': [414, 346.5, 36.5, 9.5], 'Lain-lain': [414, 377, 36.5, 10]}}, 'MCM/ATL': {'check_1': {'Ya': [362, 301, 17, 9], 'Tidak': [402.5, 301, 19.5, 9]}, 'check_2': {'Ya': [362, 319, 17, 9], 'Tidak': [402.5, 319, 19.5, 9]}, 'check_3': {'Ya': [362, 337.5, 17, 9], 'Tidak': [402.5, 337.5, 19.5, 9]}, 'check_4': {'Ya': [362, 355.5, 17, 9], 'Tidak': [402.5, 355.5, 19.5, 9]}, 'check_5': {'Ya': [362, 371, 17, 9], 'Tidak': [402.5, 371, 19.5, 9]}, 'check_6': {'Ya': [362, 398.5, 17, 9], 'Tidak': [402.5, 398.5, 19.5, 9]}, 'check_7': {'Ya': [362, 425.5, 17, 9], 'Tidak': [402.5, 425.5, 19.5, 9]}, 'check_8': {'Ya': [362, 443.5, 17, 9], 'Tidak': [402.5, 443.5, 19.5, 9]}}}
for key, corrections in CHECK_CORRECTIONS.items():
 for check in layouts[key]['checks']:
  if check['key'] in corrections:check['options']=corrections[check['key']]
for company in ['DE','MCM']:
 source=fitz.open(SOURCE/(company+'.pdf'));output=fitz.open()
 for index,page in enumerate(source):
  # Company/type headings were supplied only to identify the templates.
  for block in page.get_text('blocks'):
   if block[4].strip()==company+' '+TYPES[index]:page.add_redact_annot(fitz.Rect(block[:4]),fill=(1,1,1))
  page.apply_redactions(images=0,graphics=0)
  # Remove real sample text, not just visually cover it. Images contain the fixed form.
  if index==8:
   for block in page.get_text('blocks'):
    if block[1]>60:page.add_redact_annot(fitz.Rect(block[:4]),fill=(1,1,1))
   page.apply_redactions(images=0,graphics=0)
  kind=TYPES[index];spec=layouts[company+'/'+kind]
  # Preserve the original writing lines. Only the baked-in ATL example branch
  # needs removal; page 9's sample text has already been redacted above.
  if index==6:
   page.draw_rect(fitz.Rect(157,247,190,257),fill=(1,1,1),color=None,overlay=True)
  if company=='MCM' and kind=='SLL':
   for check in spec['checks']:
    if check['key'].startswith('check_'):
     y=check['options']['Ya'][1]
     page.draw_rect(fitz.Rect(415,y-6,495,y+18),fill=(1,1,1),color=None,overlay=True)
     page.insert_text((416,y+9),'Ya',fontsize=6)
     page.insert_text((445,y+9),'Tidak',fontsize=6)
  # Restore complete blank boxes; source scans have some partially erased borders.
  for check in spec['checks']:
   for value,coords in check['options'].items():
    x,y,w,h=coords
    page.draw_rect(fitz.Rect(x-1.5,y-3,x+w+1.5,y+h+2),fill=(1,1,1),color=None,overlay=True)
    page.draw_rect(fitz.Rect(x,y,x+w,y+h),fill=None,color=(0,0,0),width=.7,overlay=True)
  if company=='DE' and index==8:
   page.draw_rect(fitz.Rect(77,623,188,636),fill=(1,1,1),color=None,overlay=True)
   page.insert_text((79,632),'Kegunaan DMSB',fontsize=8)
  # Flatten redactions and original images so example text cannot be recovered.
  pix=page.get_pixmap(matrix=fitz.Matrix(2,2),alpha=False)
  p=output.new_page(width=540,height=780);p.insert_image(p.rect,stream=pix.tobytes('png'))
 output.save(DEST/(company+'-blank.pdf'),garbage=4,deflate=True)
(DEST/'layouts.json').write_text(json.dumps(layouts,indent=2,ensure_ascii=False))
print('Prepared 18 flattened blank forms and layout maps')

source=fitz.open(SOURCE/'List.pdf')
source[0].get_pixmap(matrix=fitz.Matrix(3,3),clip=fitz.Rect(0,0,792,110),alpha=False).save(DEST/'list-header.png')
