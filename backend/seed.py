"""
seed.py — Populates the database with demo users, locations, and 60 realistic
feedback entries spread over the last 60 days.

Run from backend/ directory:
    python seed.py
"""
import asyncio
import random
from datetime import datetime, timedelta, timezone

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import AsyncSessionLocal, engine, Base
from app.models import User, Location, Survey, AnalysisResult, IssueTicket
from app.auth import hash_password
from app.nlp.pipeline import analyze


# ─── Initial Accounts ────────────────────────────────────────────────────────

USERS = [
    {"name": "Student",       "email": "student@demo.com",       "password": "demo1234",    "role": "student"},
    {"name": "Student User",  "email": "student@jcboseust.ac.in", "password": "password123", "role": "student"},
    {"name": "Administrator", "email": "admin@demo.com",         "password": "demo1234",    "role": "admin"},
    {"name": "Estate Officer","email": "admin@jcboseust.ac.in",   "password": "password123", "role": "admin"},
    {"name": "Sahil Yadav",   "email": "palhawas8@gmail.com",     "password": "Sahilyadav@palhawas", "role": "admin"},
]

# ─── Campus Locations ────────────────────────────────────────────────────────

LOCATIONS = [
    # Computer Engineering Department
    {"block_name": "Computer Engineering Department", "floor": "Ground Floor", "room_number": "Hardware & IoT Lab"},
    {"block_name": "Computer Engineering Department", "floor": "Ground Floor", "room_number": "Server Room"},
    {"block_name": "Computer Engineering Department", "floor": "First Floor",  "room_number": "Software Engg Lab (CE-101)"},
    {"block_name": "Computer Engineering Department", "floor": "First Floor",  "room_number": "Classroom CE-102"},
    {"block_name": "Computer Engineering Department", "floor": "Second Floor", "room_number": "AI & ML Lab (CE-201)"},
    {"block_name": "Computer Engineering Department", "floor": "Second Floor", "room_number": "Classroom CE-202"},
    {"block_name": "Computer Engineering Department", "floor": "Third Floor",  "room_number": "Cloud Computing Lab (CE-301)"},
    {"block_name": "Computer Engineering Department", "floor": "Third Floor",  "room_number": "Seminar Hall (CE-302)"},

    # Electrical Engineering Department
    {"block_name": "Electrical Engineering Department", "floor": "Ground Floor", "room_number": "High Voltage Lab (EE-001)"},
    {"block_name": "Electrical Engineering Department", "floor": "Ground Floor", "room_number": "Power Systems Lab"},
    {"block_name": "Electrical Engineering Department", "floor": "First Floor",  "room_number": "Electrical Machines Lab (EE-101)"},
    {"block_name": "Electrical Engineering Department", "floor": "First Floor",  "room_number": "Classroom EE-102"},
    {"block_name": "Electrical Engineering Department", "floor": "Second Floor", "room_number": "Power Electronics Lab (EE-201)"},
    {"block_name": "Electrical Engineering Department", "floor": "Second Floor", "room_number": "Department Seminar Room"},

    # Electronics Engineering Department
    {"block_name": "Electronics Engineering Department", "floor": "Ground Floor", "room_number": "Microprocessor Lab (EC-001)"},
    {"block_name": "Electronics Engineering Department", "floor": "Ground Floor", "room_number": "Digital Electronics Lab"},
    {"block_name": "Electronics Engineering Department", "floor": "First Floor",  "room_number": "VLSI Design Lab (EC-101)"},
    {"block_name": "Electronics Engineering Department", "floor": "First Floor",  "room_number": "Classroom EC-102"},
    {"block_name": "Electronics Engineering Department", "floor": "Second Floor", "room_number": "Communication Lab (EC-201)"},
    {"block_name": "Electronics Engineering Department", "floor": "Second Floor", "room_number": "Embedded Systems Lab"},

    # Cafeteria Building
    {"block_name": "Cafeteria Building", "floor": "Ground Floor", "room_number": "Main Dining Hall"},
    {"block_name": "Cafeteria Building", "floor": "Ground Floor", "room_number": "Food Counter A"},
    {"block_name": "Cafeteria Building", "floor": "Ground Floor", "room_number": "Food Counter B"},
    {"block_name": "Cafeteria Building", "floor": "First Floor",  "room_number": "Faculty Dining Lounge"},
    {"block_name": "Cafeteria Building", "floor": "First Floor",  "room_number": "Terrace Seating Area"},

    # CV Raman Block
    {"block_name": "CV Raman Block", "floor": "Ground Floor", "room_number": "Advanced Physics Lab"},
    {"block_name": "CV Raman Block", "floor": "Ground Floor", "room_number": "Chemistry Lab"},
    {"block_name": "CV Raman Block", "floor": "First Floor",  "room_number": "Lecture Theatre 1 (LT-101)"},
    {"block_name": "CV Raman Block", "floor": "First Floor",  "room_number": "Lecture Theatre 2 (LT-102)"},
    {"block_name": "CV Raman Block", "floor": "Second Floor", "room_number": "Lecture Theatre 3 (LT-201)"},
    {"block_name": "CV Raman Block", "floor": "Second Floor", "room_number": "Lecture Theatre 4 (LT-202)"},
    {"block_name": "CV Raman Block", "floor": "Third Floor",  "room_number": "Smart Classroom 301"},
    {"block_name": "CV Raman Block", "floor": "Third Floor",  "room_number": "Conference Room 302"},

    # Auditorium
    {"block_name": "Auditorium", "floor": "Ground Floor", "room_number": "Main Stage"},
    {"block_name": "Auditorium", "floor": "Ground Floor", "room_number": "Main Hall Seating"},
    {"block_name": "Auditorium", "floor": "Ground Floor", "room_number": "Control & Sound Booth"},
    {"block_name": "Auditorium", "floor": "First Floor",  "room_number": "Balcony Seating"},
    {"block_name": "Auditorium", "floor": "First Floor",  "room_number": "Projection Room"},
]

# ─── Realistic Feedback Templates ────────────────────────────────────────────

FEEDBACK_TEMPLATES = [
    # Water / Civil
    "There is water leakage in the ceiling of this room and the floor is very slippery. Students are at risk of falling.",
    "The washroom on this floor is extremely dirty and smells very bad. The drain is completely blocked.",
    "Water is dripping from the ceiling near the main door. The wall paint is peeling off due to dampness.",
    "The toilet in the washroom is broken and water is overflowing. It has been like this for three days.",
    "There is seepage in the wall near the window. The plaster is cracking and falling off.",
    "The drainage pipe outside the building is blocked and water is pooling on the walkway.",
    "The drinking water tap is broken and water is wasting continuously since yesterday.",
    "The floor near the staircase is extremely slippery due to water leakage from above.",
    "The ceiling has developed a large crack and there is water dripping during rain.",
    "There is a foul smell coming from the washroom drain, it seems completely clogged.",
    "The benches in this room are broken and several students have been injured while sitting.",
    "The windows are broken and do not close properly. During rain, water enters the room.",
    "There is garbage piled up near the building entrance and it has not been cleared for days.",
    # Electrical
    "The switchboard near the door has exposed wires and is very dangerous. Someone could get electrocuted.",
    "Exposed wires near the switchboard outside the library, very dangerous for students.",
    "The fan in this classroom is not working. The motor seems burnt and there is a burning smell.",
    "One of the light fixtures has stopped working and the room is very dark for studying.",
    "There is a short circuit in the switchboard on the first floor. Sparks are visible and it is very dangerous.",
    "The electric socket on the left wall is not working. Students cannot charge laptops.",
    "The main power switch is tripping frequently in the lab, disrupting our practical sessions.",
    "The AC in this room is completely broken. The temperature is unbearable especially in afternoon.",
    "There is a loose wire hanging from the ceiling near the fan. It is a safety hazard.",
    "The power supply in the classroom keeps going off every 10 minutes. Very inconvenient.",
    "The switchboard has burns marks on it. It seems there was a short circuit recently.",
    "The tube lights in the corridor are flickering and two of them have stopped working.",
    "The AC unit is leaking water and making a loud noise. It seems to be malfunctioning badly.",
    # IT / Projector / WiFi
    "The projector in this room is not working and the wifi is very slow today.",
    "The projector in room 204 is not working and the wifi is very slow for online research.",
    "The WiFi connection in the library is extremely slow and sometimes disconnects completely.",
    "The computer in seat number 12 is not starting. It shows a blue screen every time.",
    "The internet in the lab is very slow and sometimes completely down. Cannot access resources.",
    "The projector screen is damaged and the display is very blurry and unclear for students.",
    "The WiFi router in this block is not working. No internet connectivity since morning.",
    "Three computers in the lab are not working. They are stuck on startup and do not load.",
    "The LAN cable is broken and the network connection is completely lost in this room.",
    "The printer in the library is out of order and students cannot print their assignments.",
    "Network connection is unstable, keeps dropping every few minutes during online exams.",
    "The smart board display is not connecting to the laptop and classes are being disrupted.",
    # Mixed / AC
    "The AC in the examination hall is not working. It is very hot and students are uncomfortable.",
    "Both the fan and the lights in corridor B are not working. The area is dark and hot.",
    "The air conditioner is leaking water and there are exposed electrical wires below it.",
    "The water cooler near the cafeteria is not working and students have no cold water access.",
    # Critical / Safety
    "There are exposed electrical wires dangling from the ceiling near the switchboard. Very dangerous situation.",
    "Flooding near the electrical panel on ground floor. Water and live electricity together is extremely hazardous.",
    "Gas smell coming from the lab kitchen area. It could be a gas leakage and is very dangerous.",
    "A bench has collapsed and a student has been injured. Immediate attention needed.",
    "Sparks are coming out of the socket near the lab entry. Fire hazard, needs immediate repair.",
    "The external wall near Block C entrance has a large crack and looks like it might collapse.",
    "There is a live bare wire hanging from the ceiling light fixture. Extremely dangerous.",
    "Short circuit in the electrical room caused smoke. Evacuated but no repair team has come.",
    # Additional variety
    "The dustbins in the corridor overflow with garbage and have not been cleared for many days.",
    "The roof of the library reading hall is leaking during rains. Books and study material are getting damaged.",
    "The notice board glass is broken with sharp edges. Students could cut themselves accidentally.",
    "No proper lighting in the parking area. Students feel unsafe in the evening.",
    "The lab air conditioning is set too cold and there is no way to adjust the temperature.",
    "Several ceiling tiles are missing in the classroom and the insulation wires are visible from below.",
    "The washroom mirror is broken with sharp fragments still there. Someone will get hurt.",
    "The main gate locking system is broken and anyone can enter the campus after hours.",
    "Stray dogs have entered the campus through a broken fence and are creating disturbance.",
]

STATUSES = ["Pending", "In Progress", "Resolved"]
STATUS_WEIGHTS = [0.5, 0.3, 0.2]


async def seed():
    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # ── Clear existing data (idempotent re-seed) ──────────────────────────
        from sqlalchemy import text
        for tbl in ["issue_tickets", "analysis_results", "surveys", "locations", "users"]:
            await db.execute(text(f"DELETE FROM {tbl}"))
        await db.commit()

        print("[INFO] Seeding users...")
        users = []
        for u in USERS:
            user = User(
                name=u["name"],
                email=u["email"],
                password_hash=hash_password(u["password"]),
                role=u["role"],
            )
            db.add(user)
            users.append(user)
        await db.commit()
        for u in users:
            await db.refresh(u)
        print(f"   Created {len(users)} users")

        print("[INFO] Seeding locations...")
        locations = []
        for l in LOCATIONS:
            loc = Location(**l)
            db.add(loc)
            locations.append(loc)
        await db.commit()
        for loc in locations:
            await db.refresh(loc)
        print(f"   Created {len(locations)} locations")

        print("[INFO] Seeding 60 feedback entries (NLP pipeline running)...")
        student_user = users[0]
        now = datetime.now(timezone.utc)

        # Pick 60 entries (may repeat templates across different locations/dates)
        entries = random.sample(FEEDBACK_TEMPLATES, min(60, len(FEEDBACK_TEMPLATES)))
        while len(entries) < 60:
            entries.extend(random.sample(FEEDBACK_TEMPLATES, min(60 - len(entries), len(FEEDBACK_TEMPLATES))))
        entries = entries[:60]

        for i, text in enumerate(entries):
            # Spread over last 60 days
            days_ago = random.randint(0, 59)
            hours_ago = random.randint(0, 23)
            ts = now - timedelta(days=days_ago, hours=hours_ago)

            loc = random.choice(locations)
            mode = random.choice(["typed", "voice"])

            # Run NLP pipeline
            try:
                result = analyze(text)
            except Exception as e:
                print(f"   [Warning] NLP failed for entry {i}: {e}")
                result = {
                    "cleaned_text": text.lower(),
                    "keywords": [],
                    "sentiment_compound": -0.3,
                    "urgency_score": 0.6,
                    "urgency_level": "Medium",
                    "assigned_dept": "General Administration",
                }

            survey = Survey(
                user_id=student_user.user_id,
                location_id=loc.location_id,
                raw_text=text,
                input_mode=mode,
                created_at=ts,
            )
            db.add(survey)
            await db.flush()

            analysis = AnalysisResult(
                survey_id=survey.survey_id,
                cleaned_text=result["cleaned_text"],
                extracted_keywords=result["keywords"],
                sentiment_compound=result["sentiment_compound"],
                urgency_score=result["urgency_score"],
                urgency_level=result["urgency_level"],
                assigned_dept=result["assigned_dept"],
            )
            db.add(analysis)
            await db.flush()

            status_choice = random.choices(STATUSES, weights=STATUS_WEIGHTS)[0]
            resolved_at = ts + timedelta(days=random.randint(1, 7)) if status_choice == "Resolved" else None

            ticket = IssueTicket(
                analysis_id=analysis.analysis_id,
                status=status_choice,
                created_at=ts,
                resolved_at=resolved_at,
            )
            db.add(ticket)

            if (i + 1) % 10 == 0:
                print(f"   {i + 1}/60 entries seeded...")

        await db.commit()
        print("[SUCCESS] Seeding complete!")
        print("\nDefault Accounts:")
        print("  Student: student@jcboseust.ac.in (or student@demo.com)")
        print("  Admin:   admin@jcboseust.ac.in   (or admin@demo.com)")


if __name__ == "__main__":
    asyncio.run(seed())
