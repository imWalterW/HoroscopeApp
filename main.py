import os
import datetime
import pytz
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from typing import Dict, Any
from kerykeion import AstrologicalSubject, Kerykeion
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
geolocator = Nominatim(user_agent="daivaya_app_v7")

# --- Pydantic Models for Data Validation ---
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

# --- Main Calculation Endpoint ---
@app.post("/calculate_charts")
async def calculate_charts(data: BirthData):
    try:
        location = geolocator.geocode(data.place)
        if not location: raise HTTPException(status_code=400, detail="Could not find location.")
        
        year, month, day = map(int, data.date.split('-'))
        hour, minute = map(int, data.time.split(':'))
        
        # Use the reliable kerykeion library for calculations
        subject = AstrologicalSubject(
            "User", year, month, day, hour, minute, 
            city=data.place, lat=location.latitude, lon=location.longitude
        )
        chart = Kerykeion(subject, ayanamsa="LAHIRI")
        
        # Extract D1 and D9 Chart Data
        d1_chart_data = {
            "lagna": chart.get_all_houses_degrees()[0]['sign'],
            "planets": {p['name']: p['sign'] for p in chart.get_planets_and_houses()}
        }
        d9_chart_data = {
            "lagna": chart.get_navamsa_lagna()['sign'],
            "planets": {p['name']: p['navamsa_sign'] for p in chart.get_planets_and_houses()}
        }
        
        # Extract NEW Astrological Details
        nakshatra_details = chart.get_moon_nakshatra_details()
        astro_details = {
            "Lagna": d1_chart_data["lagna"],
            "Nawamsa Lagna": d9_chart_data["lagna"],
            "Nekatha": nakshatra_details.get("name"),
            "Gana": nakshatra_details.get("gana"),
            "Yoni": nakshatra_details.get("yoni"),
        }
        
        return {
            "d1_chart": d1_chart_data,
            "d9_chart": d9_chart_data,
            "astro_details": astro_details
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

# --- Other Endpoints ---
@app.post("/generate_reading")
async def generate_reading(data: ChartData):
    # This is a placeholder for the AI reading generation
    return {"reading": "# ජන්ම පත්‍ර විග්‍රහය\n\n### හැඳින්වීම\n\nමෙය ඔබගේ මූලික පලාපල විස්තරයයි. Pro අනුවාදය වෙත පිවිසීමෙන් සම්පූර්ණ විස්තරයක් ලබාගන්න."}

@app.post("/register")
async def register_user(credentials: UserCredentials):
    if not supabase: raise HTTPException(status_code=500, detail="Supabase client not initialized.")
    try:
        user = supabase.auth.sign_up({"email": credentials.email, "password": credentials.password})
        return {"message": "User registered successfully."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/login")
async def login_user(credentials: UserCredentials):
    if not supabase: raise HTTPException(status_code=500, detail="Supabase client not initialized.")
    try:
        session = supabase.auth.sign_in_with_password({"email": credentials.email, "password": credentials.password})
        return {"message": "Login successful."}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid login credentials.")
