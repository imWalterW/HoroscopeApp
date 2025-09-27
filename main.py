import os
import datetime
import pytz
import swisseph as swe
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List
from geopy.geocoders import Nominatim
from dotenv import load_dotenv
from datetime import timedelta
import json
import google.generativeai as genai
from supabase import create_client, Client

# --- Load Environment Variables ---
load_dotenv()

# --- App Initialization ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)
geolocator = Nominatim(user_agent="daivaya_app_stable")

# --- Supabase Admin Client Initialization ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# --- Set Astrological Standard (Ayanamsa) Globally ---
swe.set_sid_mode(swe.SIDM_LAHIRI)

# --- Gemini API Configuration ---
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# --- Pydantic Models for Data Validation ---
class BirthData(BaseModel):
    date: str
    time: str
    place: str

class PorondamRequest(BaseModel):
    person1: BirthData
    person2: BirthData

# (All your existing Sinhala Translation Maps & Astrological Constants remain here...)
ZODIAC_SIGNS_SI = { "Aries": "මේෂ", "Taurus": "වෘෂභ", "Gemini": "මිථුන", "Cancer": "කටක", "Leo": "සිංහ", "Virgo": "කන්‍යා", "Libra": "තුලා", "Scorpio": "වෘශ්චික", "Sagittarius": "ධනු", "Capricorn": "මකර", "Aquarius": "කුම්භ", "Pisces": "මීන" }
PLANET_SI = {'Ketu': 'කේතු', 'Venus': 'ශුක්‍ර', 'Sun': 'රවි', 'Moon': 'චන්ද්‍ර', 'Mars': 'කුජ', 'Rahu': 'රාහු', 'Jupiter': 'ගුරු', 'Saturn': 'ශනි', 'Mercury': 'බුධ'}
ZODIAC_SIGNS_EN = [ "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces" ]
PLANET_LIST = { 'Sun': swe.SUN, 'Moon': swe.MOON, 'Mars': swe.MARS, 'Mercury': swe.MERCURY, 'Jupiter': swe.JUPITER, 'Venus': swe.VENUS, 'Saturn': swe.SATURN, 'Rahu': swe.MEAN_NODE, 'Ketu': swe.TRUE_NODE }
NAKSHATRA_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury']
DASHA_YEARS = {'Ketu': 7, 'Venus': 20, 'Sun': 6, 'Moon': 10, 'Mars': 7, 'Rahu': 18, 'Jupiter': 16, 'Saturn': 19, 'Mercury': 17}
DASHA_SEQUENCE = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury']
NAKSHATRA_SPAN = 13.333333333333333
SOLAR_YEAR_IN_DAYS = 365.2425
READING_COST = 100
PORONDAM_COST = 200

# (All your existing Core Astrology Calculation Logic functions remain here...)
def calculate_vimshottari_dasha_sequence(jd_utc: float, birth_datetime: datetime.datetime) -> List[Dict[str, Any]]:
    moon_pos = swe.calc_ut(jd_utc, swe.MOON, swe.FLG_SIDEREAL)[0][0]
    moon_pos = moon_pos % 360
    nakshatra_num = int(moon_pos / NAKSHATRA_SPAN)
    nakshatra_lord_index = nakshatra_num % len(NAKSHATRA_LORDS)
    birth_dasha_lord = NAKSHATRA_LORDS[nakshatra_lord_index]
    moon_travelled_in_nakshatra = moon_pos % NAKSHATRA_SPAN
    proportion_remaining = (NAKSHATRA_SPAN - moon_travelled_in_nakshatra) / NAKSHATRA_SPAN
    total_years_for_lord = DASHA_YEARS[birth_dasha_lord]
    balance_in_days = proportion_remaining * total_years_for_lord * SOLAR_YEAR_IN_DAYS
    first_dasha_end_date = birth_datetime + timedelta(days=balance_in_days)
    dasha_periods = [{"lord": birth_dasha_lord, "start_date": birth_datetime.date(), "end_date": first_dasha_end_date.date()}]
    current_end_date = first_dasha_end_date
    start_lord_index = DASHA_SEQUENCE.index(birth_dasha_lord)
    for i in range(1, len(DASHA_SEQUENCE) * 2):
        next_lord_index = (start_lord_index + i) % len(DASHA_SEQUENCE)
        next_lord = DASHA_SEQUENCE[next_lord_index]
        duration_in_days = DASHA_YEARS[next_lord] * SOLAR_YEAR_IN_DAYS
        start_date = current_end_date
        end_date = start_date + timedelta(days=duration_in_days)
        dasha_periods.append({"lord": next_lord, "start_date": start_date.date(), "end_date": end_date.date()})
        current_end_date = end_date
    return dasha_periods

def get_house_placements(d1_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    placements = []
    lagna_sign_index = ZODIAC_SIGNS_EN.index(d1_data['lagna'])
    for planet, sign in d1_data['planets'].items():
        if planet == 'Ketu': continue
        planet_sign_index = ZODIAC_SIGNS_EN.index(sign)
        house = ((planet_sign_index - lagna_sign_index + 12) % 12) + 1
        placements.append({"graha": PLANET_SI[planet], "house": house})
    return placements

def identify_special_yogas(d1_data: Dict[str, Any]) -> List[str]:
    yogas = []
    return yogas

def calculate_astro_details(date_str, time_str, lat, lon):
    year, month, day = map(int, date_str.split('-'))
    hour, minute = map(int, time_str.split(':'))
    dt_local_naive = datetime.datetime(year, month, day, hour, minute)
    sri_lanka_tz = pytz.timezone("Asia/Colombo")
    dt_local_aware = sri_lanka_tz.localize(dt_local_naive)
    dt_utc = dt_local_aware.astimezone(pytz.utc)
    jd_utc, _ = swe.utc_to_jd(dt_utc.year, dt_utc.month, dt_utc.day, dt_utc.hour, dt_utc.minute, dt_utc.second, 1)
    
    today = datetime.date.today()
    age = today.year - dt_local_naive.year - ((today.month, today.day) < (dt_local_naive.month, dt_local_naive.day))

    houses, ascmc = swe.houses(jd_utc, lat, lon, b'P')
    tropical_lagna_long = ascmc[0]
    ayanamsa_value = swe.get_ayanamsa_ut(jd_utc)
    lagna_long = (tropical_lagna_long - ayanamsa_value + 360) % 360
    
    d1_planets_raw = {name: swe.calc_ut(jd_utc, planet_id, swe.FLG_SIDEREAL)[0][0] for name, planet_id in PLANET_LIST.items()}
    d1_planets = {name: ZODIAC_SIGNS_EN[int(pos / 30)] for name, pos in d1_planets_raw.items()}
    
    d9_planets = {name: ZODIAC_SIGNS_EN[int(((pos * 9) % 360) / 30)] for name, pos in d1_planets_raw.items()}

    d1_data = {"lagna": ZODIAC_SIGNS_EN[int(lagna_long / 30)], "planets": d1_planets}
    d9_data = {"lagna": ZODIAC_SIGNS_EN[int(((lagna_long * 9) % 360) / 30)], "planets": d9_planets}
    
    dasha_sequence = calculate_vimshottari_dasha_sequence(jd_utc, dt_local_naive)
    
    current_dasha, next_dasha = None, None
    for i, period in enumerate(dasha_sequence):
        if period['start_date'] <= today <= period['end_date']:
            current_dasha = period
            if i + 1 < len(dasha_sequence): next_dasha = dasha_sequence[i+1]
            break

    astro_details_for_prompt = {
        "age": age,
        "lagna": ZODIAC_SIGNS_SI[d1_data["lagna"]],
        "navamsa_lagna": ZODIAC_SIGNS_SI[d9_data["lagna"]],
        "chandra_rasi": ZODIAC_SIGNS_SI[d1_planets['Moon']],
        "dasha_info": {
            "current_mahadasha": PLANET_SI[current_dasha['lord']] if current_dasha else "N/A",
            "next_mahadasha": PLANET_SI[next_dasha['lord']] if next_dasha else "N/A",
            "next_mahadasha_start_year": next_dasha['start_date'].year if next_dasha else "N/A"
        },
        "d1_chart_placements": get_house_placements(d1_data),
        "d9_chart_placements": [{"graha": PLANET_SI[p], "sign": ZODIAC_SIGNS_SI[s]} for p, s in d9_planets.items()],
        "special_yogas": identify_special_yogas(d1_data)
    }
    
    return d1_data, d9_data, astro_details_for_prompt, dasha_sequence

# --- API Endpoints ---
@app.post("/calculate_charts")
async def calculate_charts_endpoint(data: BirthData):
    """ This is a FREE endpoint. It only calculates and returns chart data for verification. """
    try:
        location = geolocator.geocode(data.place)
        if not location:
            raise HTTPException(status_code=400, detail="Could not find location.")
            
        d1_data, d9_data, astro_details_for_prompt, dasha_sequence = calculate_astro_details(data.date, data.time, location.latitude, location.longitude)
        
        today = datetime.date.today()
        birth_dasha = dasha_sequence[0]
        current_dasha, next_dasha = None, None
        for i, period in enumerate(dasha_sequence):
            if period['start_date'] <= today <= period['end_date']:
                current_dasha = period
                if i + 1 < len(dasha_sequence):
                    next_dasha = dasha_sequence[i + 1]
                break
        
        ui_details = {
            "ලග්නය": astro_details_for_prompt['lagna'],
            "නවාංශක ලග්නය": astro_details_for_prompt['navamsa_lagna'],
            "උපන් දශාව": f"{PLANET_SI[birth_dasha['lord']]} ({birth_dasha['end_date'].strftime('%Y-%m-%d')} දක්වා)",
            "වත්මන් දශාව": f"{PLANET_SI[current_dasha['lord']]} ({current_dasha['end_date'].strftime('%Y-%m-%d')} දක්වා)" if current_dasha else "N/A",
            "මීළඟ දශාව": f"{PLANET_SI[next_dasha['lord']]} ({next_dasha['start_date'].strftime('%Y-%m-%d')} සිට)" if next_dasha else "N/A"
        }
        
        return {"d1_chart": d1_data, "d9_chart": d9_data, "astro_details": ui_details, "prompt_data": astro_details_for_prompt}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during chart calculation: {str(e)}")

@app.post("/generate_reading")
async def generate_reading_endpoint(chart_data: Dict[str, Any], authorization: str = Header(None)):
    """ This is the PAID endpoint for a single reading. """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token.")
    
    token = authorization.split("Bearer ")[1]

    try:
        user_response = supabase.auth.get_user(token)
        user_id = user_response.user.id

        profile_response = supabase.table('profiles').select('credits', 'is_vip').eq('id', user_id).single().execute()
        profile = profile_response.data
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found.")

        is_vip = profile.get('is_vip', False)
        user_credits = profile.get('credits', 0)
        if not is_vip and user_credits < READING_COST:
            raise HTTPException(status_code=402, detail="Insufficient credits. Please purchase a credit pack.")

        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured.")
        model = genai.GenerativeModel('gemini-2.5-flash')
        prompt_data = chart_data.get("prompt_data", {})
        prompt = f"""
        You are 'Daivaya Guru', an expert Vedic Astrologer from Sri Lanka. Your tone must be wise, formal, respectful, and deeply insightful, like a personal consultation. The entire response must be in the SINHALA language. Your goal is to provide a comprehensive, positive, and empowering horoscope reading ('ජන්ම පත්‍ර විග්‍රහය') that leaves the user feeling understood, optimistic, and 100% satisfied.

        **CRITICAL ANALYSIS & FORMATTING RULES:**
        1.  **DEEP, DETAILED, PERSONALIZED ANALYSIS:** For every single section, provide a detailed, multi-paragraph analysis (at least 3-5 sentences). You MUST explain the 'why' behind every conclusion by referencing specific planets, houses, and signs from the user's data.
        2.  **HANDLE EMPTY HOUSES CORRECTLY:** If a key house is empty, **DO NOT** state it as a negative or an uncertainty. Instead, you MUST perform a detailed analysis of the **house's lord**: its sign, its house placement, its strength, and any aspects it receives. This reveals the true, nuanced nature of that area of life.
        3.  **BOLD KEY TERMS:** Use markdown `**` to bold key astrological terms like planet names (**ශනි**, **ගුරු**), house numbers (**දසවැන්න**, **හත්වැන්න**), and rasi names (**මේෂ**, **තුලා**) for emphasis and clarity.
        4.  **AGE-APPROPRIATE READING:** The user's age is {prompt_data.get('age', 'N/A')}. If under 18, frame the entire reading as **guidance for the parents** (e.g., "ඔබගේ දරුවාගේ අධ්‍යාපනයට..."). Otherwise, address the user directly (e.g., "ඔබගේ අධ්‍යාපනය...").
        5.  **ACCURATE DASHA SYNTHESIS:** This is the most critical part. You MUST synthesize the Dasha's meaning in a non-generic way. For the current and next Mahadasha, you must analyze the Dasha lord's house rulership, its placement, and its condition in **both the D1 and D9 charts** to give a concrete, personalized prediction about the user's life during that specific period. Explain the pros and cons of the period based on this deep analysis.
        6.  **POSITIVE & CAUTIOUS TONE:** Always highlight strengths and positive potentials. When discussing challenges (like health), be gentle, cautious, and provide constructive, preventative advice. AVOID creating fear.
        7.  **STRUCTURED HEADINGS:** Start each new section with '### ' followed by the title.

        **Astrological Data:**
        {json.dumps(prompt_data, indent=2, ensure_ascii=False)}

        ---
        **GENERATE THE READING USING THIS EXACT STRUCTURE:**

        ### ජන්ම පත්‍ර විග්‍රහය: {prompt_data.get('lagna', '')} ලග්නය
        (A wise, multi-sentence introduction explaining the significance of the Lagna and Navamsa Lagna, tailored to the user's age.)

        ### පෞරුෂය සහ මූලික ස්වභාවය
        (Provide a deep analysis of personality. Synthesize insights from the Lagna, its lord's placement, planets in the 1st house, and the Chandra Rasi. Explain how the Navamsa Lagna reveals their inner, core self, discussing the pros and cons of these placements.)

        ### ධනය, පවුල සහ කථාව (දෙවැන්න)
        (Provide a detailed, multi-paragraph analysis of the 2nd house. If it is empty, analyze its lord in detail. Discuss wealth potential, family life, and communication style, linking them to specific Dasha periods where finances might change.)

        ### පවුල් ජීවිතය සහ ඥාතීන්
        (Provide a detailed, multi-paragraph analysis of family matters. Analyze the 4th house and Moon for mother, 9th house and Sun for father, 3rd house for siblings, and 5th house for children. Explain the nature of these relationships based on the planets.)

        ### වෘත්තීය ජීවිතය සහ රැකියාව (දසවැන්න)
        (Provide a deep, multi-paragraph analysis of career. If the 10th house in D1 is empty, analyze its lord's placement and strength in detail. Critically, analyze the D9 chart for career, as it reveals true professional destiny. Explain *why* the chart indicates a tendency for business, technology, or a stable job. Connect career changes to Dasha periods.)

        ### විවාහය සහ සබඳතා (හත්වැන්න)
        (Provide a detailed, multi-paragraph analysis of relationships. Analyze the 7th house in D1 and its lord. Most importantly, use the Navamsa Lagna and the D9 chart to give detailed insight into the nature of the spouse and the timing and quality of the marital relationship. Mention relevant Dasha periods for marriage.)

        ### සෞඛ්‍යය
        (Provide a gentle, multi-paragraph analysis of health. Analyze Lagna lord for vitality, the 6th house for diseases, and the 8th house for chronic issues. Offer constructive, preventative advice. Connect potential periods of concern to specific Dasha timelines.)

        ### දශා පද්ධතියට අනුව අනාගත දැක්ම
        (CRITICAL SECTION: Provide a very detailed, multi-paragraph forecast.
        - Analyze the **current Mahadasha lord ({prompt_data.get('dasha_info', {}).get('current_mahadasha')})**. Explain its nature, its house rulership, and its placement in **both D1 and D9 charts** to describe the specific positive and negative experiences of the current period.
        - Analyze the **next Mahadasha lord ({prompt_data.get('dasha_info', {}).get('next_mahadasha')})**. Explain in detail what specific changes, opportunities (pros), and challenges (cons) to expect starting around **{prompt_data.get('dasha_info', {}).get('next_mahadasha_start_year')}**, based on its strength and placement in **both D1 and D9 charts**.)

        ### අවසාන විග්‍රහය
        (A final, empowering multi-sentence summary of the overall destiny and life path, highlighting the chart's greatest strengths.)

        ### තෙරුවන් සරණයි!
        (Just the blessing.)
        """
        ai_response = model.generate_content(prompt)
        reading_text = ai_response.text

        if not is_vip:
            new_credits = user_credits - READING_COST
            supabase.table('profiles').update({'credits': new_credits}).eq('id', user_id).execute()
        
        return {"reading": reading_text}

    except Exception as e:
        if isinstance(e, HTTPException): raise e
        import traceback
        print(traceback.format_exc())
        if "Invalid JWT" in str(e): raise HTTPException(status_code=401, detail="Invalid session.")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

# --- NEW: Porondam Endpoints ---
@app.post("/calculate_porondam_charts")
async def calculate_porondam_charts_endpoint(data: PorondamRequest):
    """ FREE endpoint to calculate and return chart data for two people for verification. """
    try:
        # Person 1
        location1 = geolocator.geocode(data.person1.place)
        if not location1: raise HTTPException(status_code=400, detail=f"Could not find location for Person 1: {data.person1.place}")
        d1_p1, d9_p1, prompt_p1, _ = calculate_astro_details(data.person1.date, data.person1.time, location1.latitude, location1.longitude)

        # Person 2
        location2 = geolocator.geocode(data.person2.place)
        if not location2: raise HTTPException(status_code=400, detail=f"Could not find location for Person 2: {data.person2.place}")
        d1_p2, d9_p2, prompt_p2, _ = calculate_astro_details(data.person2.date, data.person2.time, location2.latitude, location2.longitude)
        
        # Combine the data needed for the final prompt
        porondam_prompt_data = {
            "person1": prompt_p1,
            "person2": prompt_p2
        }

        return {
            "person1_charts": {"d1": d1_p1, "d9": d9_p1},
            "person2_charts": {"d1": d1_p2, "d9": d9_p2},
            "prompt_data": porondam_prompt_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during chart calculation: {str(e)}")


@app.post("/generate_porondam_reading")
async def generate_porondam_reading_endpoint(chart_data: Dict[str, Any], authorization: str = Header(None)):
    """ PAID endpoint for Porondam. Checks credits, generates the reading, then deducts credits. """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token.")
    
    token = authorization.split("Bearer ")[1]

    try:
        user_response = supabase.auth.get_user(token)
        user_id = user_response.user.id

        profile_response = supabase.table('profiles').select('credits', 'is_vip').eq('id', user_id).single().execute()
        profile = profile_response.data
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found.")

        is_vip = profile.get('is_vip', False)
        user_credits = profile.get('credits', 0)
        if not is_vip and user_credits < PORONDAM_COST:
            raise HTTPException(status_code=402, detail="Insufficient credits for Porondam check.")

        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured.")
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt_p1 = chart_data.get("prompt_data", {}).get("person1", {})
        prompt_p2 = chart_data.get("prompt_data", {}).get("person2", {})

        prompt = f"""
        You are 'Daivaya Guru', an expert Vedic Astrologer from Sri Lanka specializing in Porondam (marriage compatibility). Your tone must be formal, wise, and deeply insightful. The entire response must be in the SINHALA language.

        **CRITICAL ANALYSIS & FORMATTING RULES:**
        1.  **START WITH THE SCORE:** The VERY FIRST LINE of your response MUST be the compatibility score in the format `SCORE: X/20`. Base this on the 20 core "Wisi Porondam".
        2.  **SEPARATOR:** After the score, you MUST include a line with only `---`.
        3.  **DETAILED BREAKDOWN (Wisi Porondam):** After the separator, provide a detailed, paragraph-by-paragraph analysis for each of the **20 main Porondam ('Wisi Porondam')**. You must cover the 10 core Dasa Porondam first, and then the remaining 10 sub-porondams. For each one, you MUST state if it matches ('ගැලපේ') or does not match ('නොගැලපේ') and then explain *why* based on the provided astrological data.
        4.  **SYNTHESIZE, DON'T JUST LIST:** Explain what each match (or mismatch) means for the relationship in practical terms (e.g., harmony, prosperity, health, longevity, children).
        5.  **BOLD KEY TERMS:** Use markdown `**` for emphasis on key terms.
        6.  **CONCLUDING SUMMARY:** End with a final summary paragraph that gives an overall, balanced recommendation based on the score and the nature of the matches. Be encouraging but realistic.

        **Astrological Data for Person 1 (e.g., Bride):**
        {json.dumps(prompt_p1, indent=2, ensure_ascii=False)}

        **Astrological Data for Person 2 (e.g., Groom):**
        {json.dumps(prompt_p2, indent=2, ensure_ascii=False)}

        ---
        **GENERATE THE REPORT NOW**
        """
        
        ai_response = model.generate_content(prompt)
        
        if not is_vip:
            new_credits = user_credits - PORONDAM_COST
            supabase.table('profiles').update({'credits': new_credits}).eq('id', user_id).execute()
        
        try:
            score_part, reading_part = ai_response.text.split('---', 1)
            score = score_part.replace('SCORE:', '').strip()
            reading = reading_part.strip()
        except ValueError:
            score = "Analysis Generated"
            reading = ai_response.text

        return {"score": score, "reading": reading}

    except Exception as e:
        if isinstance(e, HTTPException): raise e
        import traceback
        print(traceback.format_exc())
        if "Invalid JWT" in str(e): raise HTTPException(status_code=401, detail="Invalid session.")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")