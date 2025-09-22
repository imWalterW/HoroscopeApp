import os
import datetime
import pytz
import swisseph as swe
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from typing import Dict, Any
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
geolocator = Nominatim(user_agent="daivaya_app_v6")

# --- STABLE ASTROLOGY CALCULATION LOGIC ---
ZODIAC_SIGNS = [ "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces" ]
PLANET_LIST = { 'Sun': swe.SUN, 'Moon': swe.MOON, 'Mars': swe.MARS, 'Mercury': swe.MERCURY, 'Jupiter': swe.JUPITER, 'Venus': swe.VENUS, 'Saturn': swe.SATURN, 'Rahu': swe.MEAN_NODE }

def get_sign(longitude: float) -> str:
    return ZODIAC_SIGNS[int(longitude / 30)]

def calculate_astro_details(date_str, time_str, lat, lon):
    # Convert local time to UTC Julian Day
    year, month, day = map(int, date_str.split('-'))
    hour, minute = map(int, time_str.split(':'))
    dt_local = datetime.datetime(year, month, day, hour, minute)
    tz_str = "Asia/Colombo"
    local_tz = pytz.timezone(tz_str)
    dt_utc = local_tz.localize(dt_local).astimezone(pytz.utc)
    jd_utc = swe.utc_to_jd(dt_utc.year, dt_utc.month, dt_utc.day, dt_utc.hour, dt_utc.minute, dt_utc.second, 1)[1]

    # Set Ayanamsa to Lahiri
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    
    # Calculate house cusps (for Lagna)
    houses, ascmc = swe.houses(jd_utc, lat, lon, b'P')
    lagna_long = ascmc[0]
    
    # Calculate D1 (Rasi) positions
    d1_planets = {}
    for name, planet_id in PLANET_LIST.items():
        pos = swe.calc_ut(jd_utc, planet_id, swe.FLG_SIDEREAL)[0]
        d1_planets[name] = get_sign(pos[0])
    
    rahu_long = swe.calc_ut(jd_utc, swe.MEAN_NODE, swe.FLG_SIDEREAL)[0][0]
    ketu_long = (rahu_long + 180) % 360
    d1_planets['Ketu'] = get_sign(ketu_long)

    # Calculate D9 (Navamsa) positions
    d9_planets = {}
    navamsa_lagna_long = (lagna_long * 9) % 360
    d9_lagna_sign = get_sign(navamsa_lagna_long)
    
    for name, planet_id in PLANET_LIST.items():
        pos_long = swe.calc_ut(jd_utc, planet_id, swe.FLG_SIDEREAL)[0][0]
        navamsa_long = (pos_long * 9) % 360
        d9_planets[name] = get_sign(navamsa_long)
    
    d9_planets['Ketu'] = get_sign((ketu_long * 9) % 360)

    d1_data = {"lagna": get_sign(lagna_long), "planets": d1_planets}
    d9_data = {"lagna": d9_lagna_sign, "planets": d9_planets}
    
    return d1_data, d9_data

# --- Other Endpoints ---
# (The rest of the file is the same as the last full version I sent)
@app.post("/calculate_charts")
async def calculate_charts(data: BirthData):
    try:
        location = geolocator.geocode(data.place)
        if not location: raise HTTPException(status_code=400, detail="Could not find location.")
        d1_chart_data, d9_chart_data = calculate_astro_details(data.date, data.time, location.latitude, location.longitude)
        return {"d1_chart": d1_chart_data, "d9_chart": d9_chart_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
# ... (register, login, and generate_reading endpoints would also be here)
