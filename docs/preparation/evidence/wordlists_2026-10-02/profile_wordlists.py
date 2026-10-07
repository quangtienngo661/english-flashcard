# Thống kê các danh sách từ đã tải ngày 02/10/2026.
# Chạy: PYTHONIOENCODING=utf-8 python profile_wordlists.py  (trong thư mục này)
# Nguồn tải:
#   https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master/cefrj-vocabulary-profile-1.5.csv
#   https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master/octanove-vocabulary-profile-c1c2-1.0.csv
#   https://raw.githubusercontent.com/ittuann/The-Oxford-5000-Word-Lists/main/The%20Oxford%205000.txt
import csv, collections

cj = list(csv.DictReader(open("cefrj-vocabulary-profile-1.5.csv", encoding="utf-8-sig")))
oc = list(csv.DictReader(open("octanove-vocabulary-profile-c1c2-1.0.csv", encoding="utf-8-sig")))
ox = set(w.strip().lower() for w in open("oxford5000-mirror.txt", encoding="utf-8") if w.strip())
ox53 = set(w.strip().lower() for w in open("oxford5000-excluding-3000-mirror.txt", encoding="utf-8") if w.strip())

for name, rows in [("CEFR-J 1.5", cj), ("Octanove C1/C2 1.0", oc)]:
    print(f"== {name}: {len(rows)} dòng; cột: {list(rows[0].keys())}")
    print("   level:", dict(sorted(collections.Counter(r["CEFR"] for r in rows).items())))

for col in ["CoreInventory 1", "Threshold"]:
    filled = [r[col] for r in cj if r[col].strip()]
    print(f"   CEFR-J cột {col}: {len(filled)}/{len(cj)} có topic; top:", collections.Counter(filled).most_common(6))
print("   CEFR-J topic chứa 'Techn':", sum(1 for r in cj if "Techn" in r["CoreInventory 1"] + r["CoreInventory 2"] + r["Threshold"]))
print("   Octanove POS lỗi:", [(r["headword"], r["pos"]) for r in oc if r["pos"] in ("", "vern")])

cjw = set(h.strip().lower() for r in cj for h in r["headword"].split("/"))
ocw = set(r["headword"].strip().lower() for r in oc)
print("Trùng CEFR-J & Octanove:", len(cjw & ocw))
print("Tổng headword duy nhất CEFR-J + Octanove:", len(cjw | ocw))
print("Oxford 5000 (mirror) dòng:", len(ox), "; không có trong CEFR-J/Octanove:", len(ox - cjw - ocw))

def find(w):
    out = [f"CEFR-J {r['CEFR']} {r['pos']}" for r in cj if w in [h.strip().lower() for h in r["headword"].split("/")]]
    out += [f"Octanove {r['CEFR']} {r['pos']}" for r in oc if w == r["headword"].strip().lower()]
    if w in ox:
        out.append("Oxford5000" + ("(phần ngoài 3000)" if w in ox53 else "(trong 3000)"))
    return "; ".join(out) or "không có trong list nào"

words = ["deploy", "software", "algorithm", "database", "bandwidth", "debug", "encrypt", "revenue",
         "stakeholder", "leverage", "marketing", "brand", "campaign", "entrepreneur", "negotiate",
         "invoice", "recipe", "cuisine", "ingredient", "ubiquitous", "meticulous", "resilience",
         "mitigate", "scrutiny", "bank", "commute", "deadline", "feedback", "api"]
for w in words:
    print(f"  {w:13} {find(w)}")
