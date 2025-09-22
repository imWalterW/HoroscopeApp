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
PLANET_LIST_SI = { 'Sun': 'රවි', 'Moon': 'සඳු', 'Mars': 'කුජ', 'Mercury': 'බුධ', 'Jupiter': 'ගුරු', 'Venus': 'සිකුරු', 'Saturn': 'ශනි', 'Rahu': 'රාහු', 'Ketu': 'කේතු' }

# --- Astrological Calculation Engine ---
ZODIAC_SIGNS_EN = [ "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces" ]
PLANET_LIST = { 'Sun': swe.SUN, 'Moon': swe.MOON, 'Mars': swe.MARS, 'Mercury': swe.MERCURY, 'Jupiter': swe.JUPITER, 'Venus': swe.VENUS, 'Saturn': swe.SATURN, 'Rahu': swe.MEAN_NODE }

def get_sign(longitude: float) -> str:
    return ZODIAC_SIGNS_EN[int(longitude / 30)]

def calculate_astro_details(date_str, time_str, lat, lon):
    # This entire function is the same as the last working version.
    # It correctly calculates the chart data.
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
    d1_planets = {name: get_sign(swe.calc_ut(jd_utc, planet_id, swe.FLG_SIDEREAL)[0][0]) for name, planet_id in PLANET_LIST.items()}
    rahu_long = swe.calc_ut(jd_utc, swe.MEAN_NODE, swe.FLG_SIDEREAL)[0][0]
    d1_planets['Ketu'] = get_sign((rahu_long + 180) % 360)
    d9_planets = {name: get_sign((swe.calc_ut(jd_utc, planet_id, swe.FLG_SIDEREAL)[0][0] * 9) % 360) for name, planet_id in PLANET_LIST.items()}
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
    
    # Format the chart data into a readable string for the prompt
    d1_chart_sinhala = {PLANET_LIST_SI[p]: ZODIAC_SIGNS_SI[s] for p, s in data.d1_chart['planets'].items()}
    
    # --- NEW, MORE DETAILED PROMPT ---
    prompt = f"""
    You are 'Daivaya Guru', an expert Vedic Astrologer from Sri Lanka with deep knowledge of traditional Jyotish. Your tone is wise, respectful, and encouraging. Generate a comprehensive but introductory horoscope reading in the SINHALA language only.

    The user's birth chart data is as follows:
    - Lagna: {ZODIAC_SIGNS_SI[data.d1_chart['lagna']]}
    - Rasi Chart Placements (D1): {d1_chart_sinhala}

    Based on this data, write a reading with the following markdown headings in Sinhala:

    ### හැඳින්වීම (Introduction)
    Start with a respectful greeting. Mention the user's Lagna as the foundation of their life's journey.

    ### පෞරුෂය සහ මූලික ස්වභාවය (Personality and Core Nature)
    Analyze the core characteristics of the Lagna sign. Consider the placement of the Lagna lord (the planet that rules the Lagna sign) and what its position in a particular house signifies about the user's focus in life. Briefly mention the influence of the Moon's sign (Chandra Rasi) on their mind and emotions.

    ### ප්‍රධාන ජීවන ක්ෂේත්‍ර (Key Life Areas)
    For this basic reading, provide a brief, general overview.
    - Analyze the 10th house for career potential.
    - Analyze the 7th house for partnerships and marriage.
    - Analyze the 2nd house for wealth.
    Mention any planets in these houses and give a simple interpretation of their effect.

    ### ශක්තීන් සහ අභියෝග (Strengths and Challenges)
    Based on the D1 chart, identify one key planetary strength (like a well-placed Jupiter or Venus) and one key challenge (like a difficult Saturn or Mars placement). Explain them simply.

    ### Pro අනුවාදය (Pro Version)
    Conclude with a short, encouraging message inviting the user to upgrade to a pro version for a more detailed analysis, including Dasha periods, Navamsa (D9) chart insights for destiny, specific remedies, and a deeper look into finance and health.

    The final output must be ONLY the Sinhala reading, starting with the title '# ජන්ම පත්‍ර විග්‍රහය'. Do not add any text before or after the reading.
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

