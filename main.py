import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from typing import Dict, Any
# --- UPDATED KERYKEION IMPORT ---
from kerykeion import KrInstance, MakeSubject
# ----------------------------------
from geopy.geocoders import Nominatim
from supabase import create_client, Client

# --- Supabase Connection ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("WARNING: Supabase URL or Key not found in environment variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# --- Pydantic Models ---
class BirthData(BaseModel):
    date: str
    time: str
    place: str

class ChartData(BaseModel):
    d1_chart: Dict[str, Any]
    d9_chart: Dict[str, Any]
    
class UserCredentials(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)

# --- FastAPI App Initialization ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)
geolocator = Nominatim(user_agent="daivaya_app_v3")

# --- LLM Helper Function ---
def get_reading_from_llm(chart_data: ChartData, is_pro: bool = False) -> str:
    horoscope_data = {
        "lagna": chart_data.d1_chart['lagna'],
        "d1_chart_details": str(chart_data.d1_chart['planets']),
        "d9_chart_details": str(chart_data.d9_chart['planets'])
    }
    return f"""
# ජන්ම පත්‍ර විග්‍රහය
### හැඳින්වීම
ඔබගේ ජන්ම පත්‍රයට අනුව, ලග්නය {horoscope_data['lagna']} වේ. 
ඔබගේ ලග්න කේන්ද්‍රයේ (D1) ග්‍රහ පිහිටීම මෙසේය: {horoscope_data['d1_chart_details']}.
ඔබගේ නවාංශක කේන්ද්‍රයේ (D9) ග්‍රහ පිහිටීම මෙසේය: {horoscope_data['d9_chart_details']}.
"""

# --- User Authentication Endpoints ---
@app.post("/register")
async def register_user(credentials: UserCredentials):
    if not supabase: raise HTTPException(status_code=500, detail="Supabase client not initialized.")
    # ... (rest of the function is the same)
    try:
        user = supabase.auth.sign_up({"email": credentials.email, "password": credentials.password})
        return {"message": "User registered successfully.", "user": user.user.dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/login")
async def login_user(credentials: UserCredentials):
    if not supabase: raise HTTPException(status_code=500, detail="Supabase client not initialized.")
    # ... (rest of the function is the same)
    try:
        session = supabase.auth.sign_in_with_password({"email": credentials.email, "password": credentials.password})
        return {"message": "Login successful.", "session": session.dict()}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid login credentials.")


# --- Astrology Endpoints ---
@app.post("/calculate_charts")
async def calculate_charts(data: BirthData):
    try:
        location = geolocator.geocode(data.place)
        if not location: raise HTTPException(status_code=400, detail="Could not find the location specified.")
        
        year, month, day = map(int, data.date.split('-'))
        hour, minute = map(int, data.time.split(':'))
        
        # --- UPDATED KERYKEION LOGIC ---
        subject = MakeSubject("User", year, month, day, hour, minute, city=data.place, lat=location.latitude, lon=location.longitude)
        k_instance = KrInstance(subject, ayanamsa="LAHIRI")
        
        d1_chart_data = {
            "lagna": k_instance.lagna['sign'],
            "planets": {p['name']: p['sign'] for p in k_instance.planets}
        }
        d9_chart_data = {
            "lagna": k_instance.navamsa_lagna['sign'],
            "planets": {p['name']: p['navamsa_sign'] for p in k_instance.planets}
        }
        # ----------------------------------
        
        return {"d1_chart": d1_chart_data, "d9_chart": d9_chart_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@app.post("/generate_reading")
async def generate_reading(data: ChartData):
    try:
        reading_text = get_reading_from_llm(data, is_pro=False)
        return {"reading": reading_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
