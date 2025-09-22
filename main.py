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

# --- Supabase & App Initialization ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)
geolocator = Nominatim(user_agent="daivaya_app_final_fix")

# --- Pydantic Models for Data Validation ---
class BirthData(BaseModel): date: str; time: str; place: str
class ChartData(BaseModel): d1_chart: Dict[str, Any]; d9_chart: Dict[str, Any]
class UserCredentials(BaseModel): email: EmailStr; password: str = Field(..., min_length=6)

# --- Sinhala Translation Maps ---
ZODIAC_SIGNS_SI = { "Aries": "මේෂ", "Taurus": "වෘෂභ", "Gemini": "මිථුන", "Cancer": "කටක", "Leo": "සිංහ", "Virgo": "කන්‍යා", "Libra": "තුලා", "Scorpio": "වෘශ්චික", "Sagittarius": "ධනු", "Capricorn": "මකර", "Aquarius": "කුම්භ", "Pisces": "මීන" }
NAKSHATRA_SI = ["අස්විද", "බෙරණ", "කැති", "රෙහෙණ", "මුලසිර", "අද", "පුනාවස", "පුෂ", "අස්ලිය", "මා", "පුවපල්", "උත්‍රපල්", "හත", "සිත", "සා", "විසා", "අනුර", "දෙට", "මුල", "පුවසල", "උත්‍රසල", "සුවණ", "දෙනට", "සියාවස", "පුවපුටුප", "උත්‍රපුටුප", "රේවතී"]

# --- WORKING ASTROLOGY CALCULATION LOGIC ---
ZODIAC_SIGNS_EN = [ "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces" ]
PLANET_LIST = { 'Sun': swe.SUN, 'Moon': swe.MOON, 'Mars': swe.MARS, 'Mercury': swe.MERCURY, 'Jupiter': swe.JUPITER, 'Venus': swe.VENUS, 'Saturn': swe.SATURN, 'Rahu': swe.MEAN_NODE }

def get_sign(longitude: float) -> str:
    return ZODIAC_SIGNS_EN[int(longitude / 30)]

def calculate_astro_details(date_str, time_str, lat, lon):
    # Create a timezone-aware UTC datetime object
    year, month, day = map(int, date_str.split('-'))
    hour, minute = map(int, time_str.split(':'))
    dt_local_naive = datetime.datetime(year, month, day, hour, minute)
    sri_lanka_tz = pytz.timezone("Asia/Colombo")
    dt_local_aware = sri_lanka_tz.localize(dt_local_naive)
    dt_utc = dt_local_aware.astimezone(pytz.utc)
    jd_utc, _ = swe.utc_to_jd(dt_utc.year, dt_utc.month, dt_utc.day, dt_utc.hour, dt_utc.minute, dt_utc.second, 1)

    # Set Ayanamsa to Lahiri
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    
    # Correctly calculate the Sidereal Lagna
    houses, ascmc = swe.houses(jd_utc, lat, lon, b'P')
    tropical_lagna_long = ascmc[0]
    ayanamsa_value = swe.get_ayanamsa_ut(jd_utc)
    lagna_long = (tropical_lagna_long - ayanamsa_value + 360) % 360
    
    # Calculate D1 (Rasi) positions
    d1_planets = {name: get_sign(swe.calc_ut(jd_utc, planet_id, swe.FLG_SIDEREAL)[0][0]) for name, planet_id in PLANET_LIST.items()}
    rahu_long = swe.calc_ut(jd_utc, swe.MEAN_NODE, swe.FLG_SIDEREAL)[0][0]
    d1_planets['Ketu'] = get_sign((rahu_long + 180) % 360)
    
    # Calculate D9 (Navamsa) positions
    d9_planets = {name: get_sign((swe.calc_ut(jd_utc, planet_id, swe.FLG_SIDEREAL)[0][0] * 9) % 360) for name, planet_id in PLANET_LIST.items()}
    d9_planets['Ketu'] = get_sign(((rahu_long + 180) % 360 * 9) % 360)
    
    d1_data = {"lagna": get_sign(lagna_long), "planets": d1_planets}
    d9_data = {"lagna": get_sign((lagna_long * 9) % 360), "planets": d9_planets}
    
    # Nakshatra calculation
    moon_pos = swe.calc_ut(jd_utc, swe.MOON, swe.FLG_SIDEREAL)[0][0]
    nakshatra_num = int(moon_pos / (13 + 1/3))
    
    # Final details dictionary with Sinhala translations
    astro_details = {
        "ලග්නය": ZODIAC_SIGNS_SI.get(d1_data["lagna"], d1_data["lagna"]),
        "නවාංශක ලග්නය": ZODIAC_SIGNS_SI.get(d9_data["lagna"], d9_data["lagna"]),
        "නැකත": NAKSHATRA_SI[nakshatra_num] if 0 <= nakshatra_num < 27 else "-",
    }

    return d1_data, d9_data, astro_details

# --- API Endpoints ---
@app.post("/calculate_charts")
async def calculate_charts(data: BirthData):
    try:
        location = geolocator.geocode(data.place)
        if not location: raise HTTPException(status_code=400, detail="Could not find location.")
        d1_chart, d9_chart, astro_details = calculate_astro_details(data.date, data.time, location.latitude, location.longitude)
        return {"d1_chart": d1_chart, "d9_chart": d9_chart, "astro_details": astro_details}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during calculation: {str(e)}")

# (Other endpoints are included for future use)
@app.post("/generate_reading")
async def generate_reading(data: ChartData): return {"reading": "# Reading..."}
@app.post("/register")
async def register_user(credentials: UserCredentials): return {"message": "User registered."}
@app.post("/login")
async def login_user(credentials: UserCredentials): return {"message": "Login successful."}

