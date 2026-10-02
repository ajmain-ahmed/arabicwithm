import csv, json
from pathlib import Path
import pymupdf as fitz
base = Path('.next/review-export-qa')
with (base/'suggestions.csv').open(encoding='utf-8-sig', newline='') as stream:
    rows = list(csv.reader(stream))
assert len(rows) == 2 and len(rows[0]) == len(rows[1]) == 16
assert rows[1][3] == '1' and rows[1][6] == ''
assert json.loads(rows[1][14])['tokens'][0]['dictionary_entry_id'] == 'retained'
assert rows[1][7] == 'Hello, "friend"!\nWelcome.'
for name in ['suggestions', 'long-suggestions']:
    pdf = fitz.open(base/(name+'.pdf'))
    text = '\n'.join(page.get_text() for page in pdf)
    assert 'Arabic Reader' in text and 'Chapter 03' in text
    assert 'Peace be upon you.' in text
    for page in pdf:
        assert not [b for b in page.get_text('blocks') if b[0] < 0 or b[1] < 0 or b[2] > page.rect.width+1 or b[3] > page.rect.height+1]
    if name == 'suggestions':
        pdf[0].get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(base/'preview.png')
        (base/'extracted.txt').write_text(text,encoding='utf-8')
    print(name, 'pages:',len(pdf), 'text characters:',len(text))
print('CSV and PDF files verified')
for name in ['live-suggestions','mixed-suggestions']:
    pdf = fitz.open(base/(name+'.pdf'))
    text = '\n'.join(page.get_text() for page in pdf)
    assert 'Original Arabic' in text and 'Line ' in text
    if name == 'mixed-suggestions':
        assert 'Hello friend' in text and '12' in text
    pdf[0].get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(base/(name+'-preview.png'))
    print(name, 'pages:',len(pdf), 'characters:',len(text))
