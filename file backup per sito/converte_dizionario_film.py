import json
with open('film_lista.json', 'r', encoding='utf-8') as f:
    l = json.load(f)
d = {elem['titolo']: elem for elem in l}
with open('film.json', 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=2)
