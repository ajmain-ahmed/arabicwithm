import csv
import json

input_file = "/home/noon/Downloads/vocab_rows(2).csv"   # change if needed
output_file = "/home/noon/Downloads/vocab_rows_clean.csv"

with open(input_file, "r", encoding="utf-8") as infile, \
     open(output_file, "w", encoding="utf-8", newline="") as outfile:

    reader = csv.DictReader(infile)
    # preserve all columns except ex_ar, ex_di, ex_en
    fieldnames = [f for f in reader.fieldnames if f not in ("ex_ar", "ex_di", "ex_en")]
    # add the new JSONB column
    fieldnames.append("ex")
    writer = csv.DictWriter(outfile, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
    writer.writeheader()

    for row in reader:
        # get the three example strings
        ex_ar = row.get("ex_ar", "").strip()
        ex_di = row.get("ex_di", "").strip()
        ex_en = row.get("ex_en", "").strip()

        examples = []
        # split each by "; " (the original separator between two examples)
        ar_parts = ex_ar.split("; ") if ex_ar else []
        di_parts = ex_di.split("; ") if ex_di else []
        en_parts = ex_en.split("; ") if ex_en else []

        # zip them together (only as many as the smallest list, but they should match)
        for ar, di, en in zip(ar_parts, di_parts, en_parts):
            examples.append({
                "ar": ar.strip(),
                "di": di.strip(),
                "en": en.strip()
            })

        # build new row without the old example columns
        new_row = {k: row[k] for k in fieldnames if k != "ex"}
        new_row["ex"] = json.dumps(examples, ensure_ascii=False)  # JSON string for CSV

        writer.writerow(new_row)

print(f"Done! Output written to {output_file}")