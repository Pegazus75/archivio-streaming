import json

with open('serie_lista.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

d = {elem['nome_serie']: elem for elem in data}

with open('serie.json', 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=2)
