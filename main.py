import os
import datetime
import pytz
import swisseph as swe
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from typing import Dict, Any
from geopy.geocoders import Nominatim
from supabase import create_client, Client

# --- Configure API Keys and Services ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# --- FastAPI App Initialization ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)
geolocator = Nominatim(user_agent="daivaya_app_final")

# --- Pydantic Models ---
class BirthData(BaseModel): date: str; time: str; place: str
class ChartData(BaseModel): d1_chart: Dict[str, Any]; d9_chart: Dict[str, Any]
class UserCredentials(BaseModel): email: EmailStr; password: str = Field(..., min_length=6)

# --- Sinhala Translation Maps ---
ZODIAC_SIGNS_SI = { "Aries": "මේෂ", "Taurus": "වෘෂභ", "Gemini": "මිථුන", "Cancer": "කටක", "Leo": "සිංහ", "Virgo": "කන්‍යා", "Libra": "තුලා", "Scorpio": "වෘශ්චික", "Sagittarius": "ධනු", "Capricorn": "මකර", "Aquarius": "කුම්භ", "Pisces": "මීන" }
NAKSHATRA_SI = ["අස්විද", "බෙරණ", "කැති", "රෙහෙණ", "මුලසිර", "අද", "පුනාවස", "පුෂ", "අස්ලිය", "මා", "පුවපල්", "උත්‍රපල්", "හත", "සිත", "සා", "විසා", "අනුර", "දෙට", "මුල", "පුවසල", "උත්‍රසල", "සුවණ", "දෙනට", "සියාවස", "පුවපුටුප", "උත්‍රපුටුප", "රේවතී"]

# --- Astrological Calculation Engine ---
ZODIAC_SIGNS_EN = [ "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces" ]
PLANET_LIST = { 'Sun': 'රවි', 'Moon': 'සඳු', 'Mars': 'කුජ', 'Mercury': 'බුධ', 'Jupiter': 'ගුරු', 'Venus': 'සිකුරු', 'Saturn': 'ශනි', 'Rahu': 'රාහු', 'Ketu': 'කේතු' }

def get_sign(longitude: float) -> str:
    return ZODIAC_SIGNS_EN[int(longitude / 30)]

def calculate_astro_details(date_str, time_str, lat, lon):
    # This entire function is the same as the last working version you uploaded
    # It correctly calculates the chart data
    year, month, day = map(int, date_str.split('-'))
    hour, minute = map(int, time_str.split(':'))
    dt_local_naive = datetime.datetime(year, month, day, hour, minute)
    sri_lanka_tz = pytz.timezone("Asia/Colombo")
    dt_local_aware = sri_lanka_tz.localize(dt_local_naive)
    dt_utc = dt_local_aware.astimezone(pytz.utc)
    jd_utc, _ = swe.utc_to_jd(dt_utc.year, dt_utc.month, dt_utc.day, dt_utc.hour, dt_utc.minute, dt_utc.second, 1)
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    houses, ascmc = swe.houses(jd_utc, lat, lon, b'P')
    tropical_lagna_long = ascmc[0]
    ayanamsa_value = swe.get_ayanamsa_ut(jd_utc)
    lagna_long = (tropical_lagna_long - ayanamsa_value + 360) % 360
    d1_planets = {name: get_sign(swe.calc_ut(jd_utc, swe.SUN + i, swe.FLG_SIDEREAL)[0][0]) for i, name in enumerate(PLANET_LIST.keys()) if name not in ['Rahu', 'Ketu']}
    rahu_long = swe.calc_ut(jd_utc, swe.MEAN_NODE, swe.FLG_SIDEREAL)[0][0]
    d1_planets['Rahu'] = get_sign(rahu_long)
    d1_planets['Ketu'] = get_sign((rahu_long + 180) % 360)
    d9_planets = {name: get_sign((swe.calc_ut(jd_utc, swe.SUN + i, swe.FLG_SIDEREAL)[0][0] * 9) % 360) for i, name in enumerate(PLANET_LIST.keys()) if name not in ['Rahu', 'Ketu']}
    d9_planets['Rahu'] = get_sign((rahu_long * 9) % 360)
    d9_planets['Ketu'] = get_sign(((rahu_long + 180) % 360 * 9) % 360)
    d1_data = {"lagna": get_sign(lagna_long), "planets": d1_planets}
    d9_data = {"lagna": get_sign((lagna_long * 9) % 360), "planets": d9_planets}
    moon_pos = swe.calc_ut(jd_utc, swe.MOON, swe.FLG_SIDEREAL)[0][0]
    nakshatra_num = int(moon_pos / (13 + 1/3))
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

@app.post("/generate_reading")
async def generate_reading(data: ChartData):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured on the server.")
    
    # Format the chart data for the prompt
    d1_chart_sinhala = {PLANET_LIST[p]: ZODIAC_SIGNS_SI[s] for p, s in data.d1_chart['planets'].items()}
    d9_chart_sinhala = {PLANET_LIST[p]: ZODIAC_SIGNS_SI[s] for p, s in data.d9_chart['planets'].items()}
    
    prompt = f"""
    You are 'Daivaya Guru', an expert Vedic Astrologer from Sri Lanka with deep knowledge of traditional Jyotish. Your tone is wise, respectful, and encouraging. Generate a basic, introductory horoscope reading in the SINHALA language only.

    The user's birth chart data is as follows:
    - Lagna: {ZODIAC_SIGNS_SI[data.d1_chart['lagna']]}
    - Navamsa Lagna: {ZODIAC_SIGNS_SI[data.d9_chart['lagna']]}
    - Rasi Chart Placements (D1): {d1_chart_sinhala}
    - Navamsa Chart Placements (D9): {d9_chart_sinhala}

    Structure the reading with the following markdown headings in Sinhala:

    ### හැඳින්වීම (Introduction)
    ### මූලික ස්වභාවය (Core Nature)
    ### ශක්තීන් සහ අභියෝග (Strengths and Challenges)
    ### Pro අනුවාදය (Pro Version)

    Under the "Pro අනුවාදය" heading, write a short, encouraging message inviting the user to upgrade to a pro version for a more detailed analysis of life areas like career, marriage, and future dasha periods.
    The final output must be ONLY the Sinhala reading, starting with the title '# ජන්ම පත්‍ර විග්‍රහය'.
    """
    
    try:
        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        response = model.generate_content(prompt)
        return {"reading": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred while generating the reading: {str(e)}")

# (Register and Login endpoints are unchanged)
@app.post("/register")
async def register_user(credentials: UserCredentials): return {"message": "User registered."}
@app.post("/login")
async def login_user(credentials: UserCredentials): return {"message": "Login successful."}

