import os
import random
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase = create_client(url, key)

print("Fetching existing events...")
events_res = supabase.table('events').select('id, title').execute()
events = events_res.data

if not events:
    print("No events found to update.")
    exit()

perk_templates = [
    {"title": "2x1 en Cocteles", "description": "Llega antes de las 10 PM y disfruta de 2x1 en toda nuestra coctelería de autor."},
    {"title": "Entrada VIP Gratis", "description": "Si eres de los primeros 50 en llegar, te damos acceso VIP sin fila."},
    {"title": "Shot de Bienvenida", "description": "Reclama un shot de la casa totalmente gratis presentando tu entrada."},
    {"title": "30% OFF en Botellas", "description": "Aprovecha un 30% de descuento en botellas seleccionadas antes de la medianoche."},
    {"title": "Meet & Greet", "description": "Sortearemos 5 accesos al backstage entre los asistentes."}
]

print("Adding perks to events...")
count = 0
for event in events:
    # Check if they already have perks
    existing = supabase.table('event_perks').select('id').eq('event_id', event['id']).execute().data
    if existing:
        continue # skip if already has perks
        
    num_perks = random.randint(1, 3)
    selected = random.sample(perk_templates, num_perks)
    for p in selected:
        perk_data = {
            "event_id": event['id'],
            "title": p["title"],
            "description": p["description"],
            "active": True
        }
        try:
            supabase.table('event_perks').insert(perk_data).execute()
            count += 1
        except Exception as e:
            print(f"Error inserting: {e}")

print(f"✅ Added {count} gangazos (perks) successfully.")
