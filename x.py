import csv
import re

# Simple rule-based Arabic to Latin transliteration
# (For better results, consider using 'camel_tools' or 'transliterate' library)
def simple_transliterate(arabic_text):
    # Remove diacritics first (optional, keep them if you want)
    # We'll use a basic mapping for common letters
    mapping = {
        'ا': 'ā', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'ḥ',
        'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's',
        'ش': 'sh', 'ص': 'ṣ', 'ض': 'ḍ', 'ط': 'ṭ', 'ظ': 'ẓ', 'ع': '‘',
        'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm',
        'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y', 'ء': '’',
        'َ': 'a', 'ُ': 'u', 'ِ': 'i', 'ّ': '~', 'ً': 'an', 'ٌ': 'un', 'ٍ': 'in',
        'ْ': '', 'ٰ': 'ā'
    }
    result = []
    for char in arabic_text:
        result.append(mapping.get(char, char))
    # Join and clean up (e.g., remove extra spaces)
    return ''.join(result).strip()

# Read your CSV (assuming it has headers: index,id,ex_ar,ex_di,ex_en,difficulty,interactive)
input_file = '/home/noon/Downloads/examples_rows(1).csv'   # change to your file name
output_file = '/home/noon/Downloads/examples_with_translit.csv'

with open(input_file, 'r', encoding='utf-8') as infile, \
     open(output_file, 'w', encoding='utf-8', newline='') as outfile:
    
    reader = csv.DictReader(infile)
    fieldnames = reader.fieldnames + ['transliteration']  # add new column
    writer = csv.DictWriter(outfile, fieldnames=fieldnames)
    writer.writeheader()
    
    for row in reader:
        arabic = row['ex_ar']          # use the Arabic sentence without diacritics
        row['transliteration'] = simple_transliterate(arabic)
        writer.writerow(row)

print(f"Done! Output saved to {output_file}")