import json

# Metti i percorsi corretti dove hai salvato i file scaricati
file_film = "film.json"
file_serie = "serie.json"
output = "database.json"

# Carica film
with open(file_film, encoding="utf-8") as f:
    film = json.load(f)

# Carica serie
with open(file_serie, encoding="utf-8") as f:
    serie = json.load(f)

def genera_id(idx, tipo):
    return f"{tipo}_{idx}"

# Prepara dati film
film_unificati = []
for i, f in enumerate(film):
    film_unificati.append({
      "id": genera_id(i, "film"),
      "tipo": "film",
      "titolo": f.get("titolo"),
      "anno": f.get("anno_csv") or f.get("anno"),
      "anno_tmdb": f.get("anno_tmdb"),
      "generi": f.get("generi", []),
      "rating": f.get("rating"),
      "locandina": f.get("locandina"),
      "trama": f.get("trama"),
      "tmdb_id": f.get("tmdb_id"),
      "telegram_code": f.get("telegram_code"),
      "data_inserimento": f.get("data_inserimento"),
      "controllato": f.get("controllato"),
    })

# Prepara dati serie
serie_unificate = []
for i, s in enumerate(serie):
    serie_unificate.append({
      "id": genera_id(i, "serie"),
      "tipo": "serie",
      "titolo": s.get("nome_serie") or s.get("titolo"),
      "anno": s.get("anno"),
      "anno_tmdb": s.get("anno_tmdb"),
      "generi": s.get("generi", []),
      "rating": s.get("rating"),
      "locandina": s.get("locandina"),
      "trama": s.get("trama"),
      "tmdb_id": s.get("tmdb_id"),
      "stagioni": s.get("stagioni", {}),
      "data_inserimento": s.get("data_inserimento"),
      "controllato": s.get("controllato"),
    })

# Combina
database = film_unificati + serie_unificate

# Salva su file
with open(output, "w", encoding="utf-8") as f:
    json.dump(database, f, indent=2, ensure_ascii=False)

print(f"Creato {output} con {len(database)} elementi.")
