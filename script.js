document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const form = document.getElementById('birth-data-form');
    // ... (other element references are the same)
    const chartsContainer = document.getElementById('charts-container'); 
    
    // NOTE: This should be your live Render URL
    const API_BASE_URL = 'https://horoscopeapp.onrender.com';
    let currentChartData = null;

    // --- Main Form Submission Handler (No changes here) ---
    form.addEventListener('submit', async (event) => {
        // This function's logic remains the same
        event.preventDefault();
        // ...
    });

    // --- Continue Button Handler (No changes here) ---
    continueButton.addEventListener('click', async () => {
        // This function's logic remains the same
    });
    
    // --- Chart Generation Function (UPDATED) ---
    const createChart = (chartData, title) => {
        const ZODIAC_SIGNS_EN = [ 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces' ];
        const ZODIAC_SIGNS_SI = { 'Aries': 'මේෂ', 'Taurus': 'වෘෂභ', 'Gemini': 'මිථුන', 'Cancer': 'කටක', 'Leo': 'සිංහ', 'Virgo': 'කන්‍යා', 'Libra': 'තුලා', 'Scorpio': 'වෘශ්චික', 'Sagittarius': 'ධනු', 'Capricorn': 'මකර', 'Aquarius': 'කුම්භ', 'Pisces': 'මීන' };
        // --- CHANGED: Using Sinhala abbreviations for planets ---
        const PLANET_ABBR_SI = { 'Sun': 'ර', 'Moon': 'ස', 'Mars': 'කු', 'Mercury': 'බු', 'Jupiter': 'ගු', 'Venus': 'සි', 'Saturn': 'ශ', 'Rahu': 'රා', 'Ketu': 'කේ' };

        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'chart-wrapper';

        const chartTitle = document.createElement('h2');
        chartTitle.className = 'chart-title';
        chartTitle.textContent = title;
        chartWrapper.appendChild(chartTitle);

        const grid = document.createElement('div');
        grid.className = 'chart-grid';

        // --- NEW LOGIC: To calculate house numbers ---
        const lagnaSignIndex = ZODIAC_SIGNS_EN.indexOf(chartData.lagna);

        // Create the 12 boxes for the signs
        ZODIAC_SIGNS_EN.forEach((sign, currentSignIndex) => {
            const box = document.createElement('div');
            box.className = `chart-box ${sign.toLowerCase()}`;
            
            const signName = document.createElement('span');
            signName.className = 'sign-name';
            signName.textContent = ZODIAC_SIGNS_SI[sign];
            box.appendChild(signName);

            // --- NEW: Calculate and add house number ---
            const houseNumberValue = ((currentSignIndex - lagnaSignIndex + 12) % 12) + 1;
            const houseNumber = document.createElement('span');
            houseNumber.className = 'house-number';
            houseNumber.textContent = houseNumberValue;
            box.appendChild(houseNumber);

            const planetsDiv = document.createElement('div');
            planetsDiv.className = 'planets';
            
            // Check if this box is the Lagna
            if (chartData.lagna === sign) {
                box.classList.add('lagna-box');
                const lagnaMarker = document.createElement('span');
                lagnaMarker.className = 'lagna-marker planet';
                lagnaMarker.textContent = 'ලග්'; // CHANGED to Sinhala
                planetsDiv.appendChild(lagnaMarker);
            }

            // Place planets in the box
            for (const planet in chartData.planets) {
                if (chartData.planets[planet] === sign) {
                    const planetSpan = document.createElement('span');
                    planetSpan.className = 'planet';
                    planetSpan.textContent = PLANET_ABBR_SI[planet]; // CHANGED to Sinhala
                    planetsDiv.appendChild(planetSpan);
                }
            }
            box.appendChild(planetsDiv);
            grid.appendChild(box);
        });
        
        // Add empty center boxes for layout (This part is unchanged)
        for(let i=1; i<=4; i++) {
             const centerBox = document.createElement('div');
             centerBox.className = `chart-box center-box-${i}`;
             // NEW: Add a central title
             if (i === 1) {
                 const centerTitle = document.createElement('div');
                 centerTitle.className = 'center-title';
                 centerTitle.textContent = title.includes('D1') ? 'රාශි' : 'නවාංශක';
                 centerBox.appendChild(centerTitle);
             }
             grid.appendChild(centerBox);
        }

        chartWrapper.appendChild(grid);
        return chartWrapper;
    };
    
    // All other helper functions (resetUI, showLoading, etc.) remain the same.
    // Make sure to copy the full script.js file I sent you before and just update the createChart function if you prefer.
});
