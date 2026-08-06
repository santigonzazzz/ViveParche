import os
import uuid
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

print("Starting DB Seed...")
created_counts = {
    'users': 0, 'profiles': 0, 'venues': 0, 'subscriptions': 0,
    'events': 0, 'venue_perks': 0, 'venue_reviews': 0,
    'ticket_reservations': 0, 'tickets': 0, 'experience_stamps': 0
}

B2B_CREDENTIALS = []
B2C_CREDENTIALS = []

def get_or_create_municipality():
    res = supabase.table('municipalities').select('*').eq('name', 'Medellín').execute()
    if res.data:
        return res.data[0]['id']
    m_id = str(uuid.uuid4())
    supabase.table('municipalities').insert({
        'id': m_id,
        'name': 'Medellín',
        'department': 'Antioquia'
    }).execute()
    return m_id

municipality_id = get_or_create_municipality()

def create_user(email, password, full_name, role, phone=None):
    try:
        user = supabase.auth.admin.create_user({
            'email': email,
            'password': password,
            'email_confirm': True,
            'user_metadata': {'full_name': full_name}
        })
        user_id = user.user.id
        created_counts['users'] += 1
        
        # update profile
        profile_data = {
            'full_name': full_name,
            'role': role
        }
        if phone:
            profile_data['phone_number'] = phone
        if role == 'customer':
            profile_data['vibecoins'] = random.randint(100, 1000)
            
        supabase.table('profiles').update(profile_data).eq('id', user_id).execute()
        created_counts['profiles'] += 1
        return user_id
    except Exception as e:
        print(f"Error creating user {email}: {e}")
        # user might exist
        res = supabase.table('profiles').select('id').eq('email', email).execute()
        if res.data:
            return res.data[0]['id']
        raise e

# B2B Setup
b2b_users_data = [
    {
        "email": "carlos@benditarumba.com", "name": "Carlos Martínez", "store_name": "Bendita Rumba",
        "plan_type": "basic", "tier": "FREE", "address": "Calle 10 # 43-25, El Poblado",
        "vibes": ["Electrónica", "Reggaeton", "Cocktails"], "events_count": 2, "price_range": 2,
        "image": "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?q=80&w=1470&auto=format&fit=crop"
    },
    {
        "email": "maria@larutadelsabor.com", "name": "María Gómez", "store_name": "La Ruta del Sabor",
        "plan_type": "pro", "tier": "ARRANQUE", "address": "Carrera 70 # 44-55, Laureles",
        "vibes": ["Gastronomía", "Jazz", "Familiar"], "events_count": 3, "price_range": 2,
        "image": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1470&auto=format&fit=crop"
    },
    {
        "email": "diego@clubamsterdam.com", "name": "Diego Restrepo", "store_name": "Club Ámsterdam",
        "plan_type": "premium", "tier": "EL_PARCHE", "address": "Avenida El Poblado # 25-40",
        "vibes": ["Techno", "House", "Underground"], "events_count": 4, "price_range": 3,
        "image": "https://images.unsplash.com/photo-1574096079513-d8259312b785?q=80&w=1470&auto=format&fit=crop"
    },
    {
        "email": "valentina@teatrolido.com", "name": "Valentina Torres", "store_name": "Teatro Lido",
        "plan_type": "premium", "tier": "DUENO_DEL_PARCHE", "address": "El Centro, Medellín",
        "vibes": ["Salsa", "Tango", "Cultura"], "events_count": 5, "price_range": 4,
        "image": "https://images.unsplash.com/photo-1507676184212-d0330a1523fe?q=80&w=1470&auto=format&fit=crop"
    }
]

venues_map = {} # owner_id -> venue_id
all_venues = []

event_images = [
    "https://images.unsplash.com/photo-1540039155732-68b32943715c?q=80&w=1470&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1470229722913-7c090be5f524?q=80&w=1470&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1470&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1374&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1470&auto=format&fit=crop"
]

all_events = []

for b in b2b_users_data:
    pwd = "Password123!"
    u_id = create_user(b['email'], pwd, b['name'], 'owner')
    B2B_CREDENTIALS.append({"email": b['email'], "password": pwd, "plan": b['tier']})
    
    # create subscription
    supabase.table('subscriptions').insert({
        'user_id': u_id,
        'plan_type': b['plan_type'],
        'status': 'active',
        'price': 0 if b['tier'] == 'FREE' else 40000 if b['tier'] == 'ARRANQUE' else 110000 if b['tier'] == 'EL_PARCHE' else 450000
    }).execute()
    created_counts['subscriptions'] += 1
    
    # create venue
    venue_id = str(uuid.uuid4())
    supabase.table('venues').insert({
        'id': venue_id,
        'owner_id': u_id,
        'municipality_id': municipality_id,
        'name': b['store_name'],
        'description': f"El mejor ambiente en Medellín. {b['store_name']} te espera.",
        'address': b['address'],
        'vibe_tags': b['vibes'],
        'price_range': b['price_range'],
        'image_url': b['image'],
        'subscription_tier': b['tier'],
        'plan_type': b['plan_type'],
        'status': 'active'
    }).execute()
    created_counts['venues'] += 1
    venues_map[u_id] = venue_id
    all_venues.append(venue_id)
    
    # Create Events
    for i in range(b['events_count']):
        is_free = (i % 2 == 0) and (b['events_count'] > 1)
        event_id = str(uuid.uuid4())
        date = datetime.now(timezone.utc) + timedelta(days=random.randint(1, 30))
        supabase.table('events').insert({
            'id': event_id,
            'owner_id': u_id,
            'municipality_id': municipality_id,
            'venue_id': venue_id,
            'title': f"Evento {i+1} en {b['store_name']}",
            'description': f"No te pierdas este espectacular evento en {b['store_name']}. {'Entrada libre!' if is_free else 'Compra tus entradas ya.'}",
            'vibe_tags': b['vibes'],
            'event_date': date.isoformat(),
            'location_address': b['address'],
            'price': 0 if is_free else random.choice([20000, 50000, 100000]),
            'image_url': random.choice(event_images),
            'total_tickets': 100
        }).execute()
        created_counts['events'] += 1
        all_events.append(event_id)
        
    # Venue Perks
    for i in range(random.randint(2, 3)):
        supabase.table('venue_perks').insert({
            'venue_id': venue_id,
            'title': f"Recompensa {i+1} - {b['store_name']}",
            'description': "Canjea tus Vibecoins por este beneficio exclusivo.",
            'coin_price': random.choice([50, 100, 200, 500]),
            'type': 'custom'
        }).execute()
        created_counts['venue_perks'] += 1

# B2C Setup
b2c_users_data = [
    {"email": "alejandro@gmail.com", "name": "Alejandro Jaramillo"},
    {"email": "carolina@hotmail.com", "name": "Carolina Vélez"},
    {"email": "santiago@yahoo.com", "name": "Santiago Muñoz"},
    {"email": "mariana@gmail.com", "name": "Mariana Palacio"},
    {"email": "daniel@outlook.com", "name": "Daniel Londoño"}
]

all_customers = []
for c in b2c_users_data:
    pwd = "Password123!"
    u_id = create_user(c['email'], pwd, c['name'], 'customer')
    B2C_CREDENTIALS.append({"email": c['email'], "password": pwd})
    all_customers.append(u_id)

# Simulate activity (Tickets, Stamps, Reviews)
for c_id in all_customers:
    # Reviews
    for v_id in random.sample(all_venues, k=random.randint(2, 4)):
        supabase.table('venue_reviews').insert({
            'venue_id': v_id,
            'user_id': c_id,
            'rating': random.randint(4, 5),
            'comment': random.choice([
                "¡Qué chimba de parche!",
                "Muy buen ambiente, súper recomendado.",
                "Excelente música y la atención 10/10.",
                "Fui con mis amigos y la pasamos brutal."
            ])
        }).execute()
        created_counts['venue_reviews'] += 1
        
    # Tickets and Stamps
    for e_id in random.sample(all_events, k=random.randint(2, 5)):
        # ticket reservation
        res_id = str(uuid.uuid4())
        supabase.table('ticket_reservations').insert({
            'id': res_id,
            'user_id': c_id,
            'event_id': e_id,
            'quantity': 1,
            'status': 'confirmed',
            'expires_at': (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        }).execute()
        created_counts['ticket_reservations'] += 1
        
        # ticket
        supabase.table('tickets').insert({
            'reservation_id': res_id,
            'user_id': c_id,
            'event_id': e_id,
            'qr_code_token': str(uuid.uuid4()),
            'text_code': str(uuid.uuid4())[:8],
            'attended': True
        }).execute()
        created_counts['tickets'] += 1
        
        # experience stamp (if attended)
        # Need to find store_id for event
        event_data = supabase.table('events').select('venue_id').eq('id', e_id).execute()
        if event_data.data:
            v_id = event_data.data[0]['venue_id']
            # Now we need store_id which in 'experience_stamps' is store_id = owner_id or venue_id?
            # the schema says store_id: uuid. we will map venue_id -> store_id or it means venue_id
            # Let's use venue_id as store_id, wait! In business_schema, store_id references profiles(id).
            # So store_id is owner_id
            venue_res = supabase.table('venues').select('owner_id').eq('id', v_id).execute()
            if venue_res.data:
                owner_id = venue_res.data[0]['owner_id']
                supabase.table('experience_stamps').insert({
                    'user_id': c_id,
                    'store_id': owner_id,
                    'event_id': e_id
                }).execute()
                created_counts['experience_stamps'] += 1

print("\n--- SEED COMPLETE ---")
print("Inserted Rows:")
for k, v in created_counts.items():
    print(f" - {k}: {v}")

print("\n--- B2B CREDENTIALS ---")
for cred in B2B_CREDENTIALS:
    print(f"Plan: {cred['plan']} | Email: {cred['email']} | Pass: {cred['password']}")

print("\n--- B2C CREDENTIALS ---")
for cred in B2C_CREDENTIALS:
    print(f"Email: {cred['email']} | Pass: {cred['password']}")
