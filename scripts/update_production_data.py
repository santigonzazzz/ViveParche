import os
import random
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")
if not url or not key:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")

supabase = create_client(url, key)

print("Fetching existing venues...")
venues_res = supabase.table('venues').select('*').execute()
venues = venues_res.data

if not venues:
    print("No venues found to update.")
    exit()

venue_updates = {
    "Bendita Rumba": {
        "description": "Sumérgete en la mejor vibra urbana de Medellín. En Bendita Rumba la noche cobra vida con los ritmos más candentes de reggaeton y electrónica. Un espacio diseñado para la juventud que busca experiencias inolvidables en el corazón de la Zona Rosa.",
        "vibe_tags": ["Urbano", "Reggaeton", "Gente Joven"],
        "image_url": "https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=1470&auto=format&fit=crop",
        "opening_hours": {
            "monday": {"open": "", "close": ""},
            "tuesday": {"open": "", "close": ""},
            "wednesday": {"open": "", "close": ""},
            "thursday": {"open": "21:00", "close": "04:00"},
            "friday": {"open": "21:00", "close": "04:00"},
            "saturday": {"open": "21:00", "close": "04:00"},
            "sunday": {"open": "", "close": ""}
        }
    },
    "La Ruta del Sabor": {
        "description": "Una experiencia culinaria sin igual donde la gastronomía gourmet se encuentra con la música en vivo. Disfruta de nuestras famosas noches de jazz en un ambiente cálido y familiar. El lugar perfecto para paladares exigentes en Laureles.",
        "vibe_tags": ["Gourmet", "Jazz", "Familiar"],
        "image_url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1374&auto=format&fit=crop",
        "opening_hours": {
            "monday": {"open": "", "close": ""},
            "tuesday": {"open": "12:00", "close": "22:00"},
            "wednesday": {"open": "12:00", "close": "22:00"},
            "thursday": {"open": "12:00", "close": "22:00"},
            "friday": {"open": "12:00", "close": "23:00"},
            "saturday": {"open": "12:00", "close": "23:00"},
            "sunday": {"open": "12:00", "close": "18:00"}
        }
    },
    "Club Ámsterdam": {
        "description": "El templo del underground en El Poblado. Una atmósfera exclusiva donde el techno oscuro y los bajos profundos dominan la noche. Sistema de sonido inmersivo y una estética industrial diseñada para los verdaderos amantes de la electrónica.",
        "vibe_tags": ["Underground", "Techno Oscuro", "Exclusivo"],
        "image_url": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1374&auto=format&fit=crop",
        "opening_hours": {
            "monday": {"open": "", "close": ""},
            "tuesday": {"open": "", "close": ""},
            "wednesday": {"open": "", "close": ""},
            "thursday": {"open": "", "close": ""},
            "friday": {"open": "22:00", "close": "06:00"},
            "saturday": {"open": "22:00", "close": "06:00"},
            "sunday": {"open": "", "close": ""}
        }
    },
    "Teatro Lido": {
        "description": "Un viaje en el tiempo a través de la cultura y la elegancia. El histórico Teatro Lido abre sus puertas para ofrecer las más espectaculares noches de salsa y tango. Vive la magia del patrimonio arquitectónico del Centro con shows de talla mundial.",
        "vibe_tags": ["Cultura", "Salsa", "Tango", "Elegancia"],
        "image_url": "https://images.unsplash.com/photo-1507676184212-d0330a1523fe?q=80&w=1470&auto=format&fit=crop",
        "opening_hours": {
            "monday": {"open": "", "close": ""},
            "tuesday": {"open": "", "close": ""},
            "wednesday": {"open": "", "close": ""},
            "thursday": {"open": "18:00", "close": "23:00"},
            "friday": {"open": "18:00", "close": "23:00"},
            "saturday": {"open": "18:00", "close": "23:00"},
            "sunday": {"open": "15:00", "close": "20:00"}
        }
    }
}

event_templates = {
    "Bendita Rumba": [
        {
            "title": "Perreo Intenso Vol. 1",
            "description": "La noche más dura de reggaeton en Medellín. Prepara tus mejores pasos porque la pista se enciende con los DJs más top de la ciudad.",
            "price": 30000,
            "image_url": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1470&auto=format&fit=crop"
        },
        {
            "title": "Neón Party Urbano",
            "description": "Brilla en la oscuridad con los mejores hits urbanos. Dress code: Colores neón. Una experiencia visual y auditiva sin precedentes.",
            "price": 40000,
            "image_url": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1470&auto=format&fit=crop"
        }
    ],
    "La Ruta del Sabor": [
        {
            "title": "Noche de Jazz & Vino",
            "description": "Disfruta de un ensamble en vivo mientras degustas nuestra mejor selección de vinos y tapas. El plan perfecto para una velada relajada.",
            "price": 50000,
            "image_url": "https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=1632&auto=format&fit=crop"
        },
        {
            "title": "Domingo Familiar Gourmet",
            "description": "Un menú especial diseñado para compartir en familia con música suave y el mejor ambiente para cerrar el fin de semana.",
            "price": 0,
            "image_url": "https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=1470&auto=format&fit=crop"
        },
        {
            "title": "Cata de Sabores del Mundo",
            "description": "Un recorrido gastronómico por 5 países en una sola noche. Incluye maridaje guiado por nuestro chef ejecutivo.",
            "price": 80000,
            "image_url": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1470&auto=format&fit=crop"
        }
    ],
    "Club Ámsterdam": [
        {
            "title": "Deep Techno Sessions",
            "description": "Sumérgete en la oscuridad y los bajos profundos con DJs internacionales invitados. Solo verdaderos ravers.",
            "price": 60000,
            "image_url": "https://images.unsplash.com/photo-1558317374-067fb5f30001?q=80&w=1470&auto=format&fit=crop"
        },
        {
            "title": "Underground Boiler",
            "description": "Formato 360 grados, sonido industrial y la atmósfera más exclusiva de El Poblado. Estarás muy cerca del DJ.",
            "price": 80000,
            "image_url": "https://images.unsplash.com/photo-1521337581100-8ca9a73a5f79?q=80&w=1470&auto=format&fit=crop"
        },
        {
            "title": "Rave Hasta el Amanecer",
            "description": "La fiesta no para. 8 horas continuas de música electrónica de vanguardia para perder la noción del tiempo.",
            "price": 50000,
            "image_url": "https://images.unsplash.com/photo-1557088195-231a4c887488?q=80&w=1470&auto=format&fit=crop"
        },
        {
            "title": "Blackout Night",
            "description": "Solo las luces estroboscópicas guiarán tu noche. Una experiencia inmersiva para conectar solo con el sonido.",
            "price": 70000,
            "image_url": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1470&auto=format&fit=crop"
        }
    ],
    "Teatro Lido": [
        {
            "title": "Gala de Salsa Clásica",
            "description": "Vístete de gala y ven a disfrutar de los clásicos de la salsa con una orquesta en vivo espectacular.",
            "price": 100000,
            "image_url": "https://images.unsplash.com/photo-1510511459019-5d55ad51f67f?q=80&w=1470&auto=format&fit=crop"
        },
        {
            "title": "Noches de Tango y Pasión",
            "description": "El espíritu de Buenos Aires llega al corazón de Medellín. Show en vivo y cena en un entorno patrimonial.",
            "price": 120000,
            "image_url": "https://images.unsplash.com/photo-1524117074681-31bd4de22ad3?q=80&w=1470&auto=format&fit=crop"
        },
        {
            "title": "Historia en Escena",
            "description": "Una obra de teatro que recorre la historia de la ciudad en nuestro majestuoso recinto. Ideal para turistas y locales.",
            "price": 40000,
            "image_url": "https://images.unsplash.com/photo-1510511459019-5d55ad51f67f?q=80&w=1470&auto=format&fit=crop"
        },
        {
            "title": "Boleros al Atardecer",
            "description": "Una velada romántica con las voces más hermosas interpretando boleros inolvidables. La cita perfecta.",
            "price": 60000,
            "image_url": "https://images.unsplash.com/photo-1469598614039-ccfeb0a21111?q=80&w=1470&auto=format&fit=crop"
        },
        {
            "title": "Milonga del Centro",
            "description": "Pista abierta para bailarines y aficionados al tango en un ambiente clásico que te transportará de época.",
            "price": 30000,
            "image_url": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1470&auto=format&fit=crop"
        }
    ]
}

report = []

for venue in venues:
    name = venue.get('name')
    if name in venue_updates:
        print(f"Updating Venue: {name}")
        updates = venue_updates[name]
        supabase.table('venues').update(updates).eq('id', venue['id']).execute()
        report.append(f"✅ VENUE ACTUALIZADO: {name}")
        report.append(f"   - Descripción: {updates['description'][:60]}...")
        report.append(f"   - Vibes: {', '.join(updates['vibe_tags'])}")
        
        # Now update events for this venue
        events_res = supabase.table('events').select('*').eq('venue_id', venue['id']).execute()
        events = events_res.data
        templates = event_templates.get(name, [])
        
        for i, event in enumerate(events):
            if i < len(templates):
                t = templates[i]
                # Keep event_date realistic (future)
                new_date = datetime.now(timezone.utc) + timedelta(days=random.randint(2, 28), hours=random.randint(18, 23))
                event_updates = {
                    "title": t["title"],
                    "description": t["description"],
                    "price": t["price"],
                    "image_url": t["image_url"],
                    "vibe_tags": updates["vibe_tags"],
                    "event_date": new_date.isoformat()
                }
                supabase.table('events').update(event_updates).eq('id', event['id']).execute()
                report.append(f"   🎟️  EVENTO ACTUALIZADO: {t['title']}")
                report.append(f"       - Precio: ${t['price']}")
                report.append(f"       - Fecha: {new_date.strftime('%Y-%m-%d %H:%M')}")
            else:
                # If there are more events than templates, just use a generic one
                report.append(f"   ⚠️  Nota: Evento {event['title']} no actualizado (sin template).")
                
print("\n=== REPORTE DE ACTUALIZACIÓN ===")
for r in report:
    print(r)
print("=== FIN DEL REPORTE ===")
