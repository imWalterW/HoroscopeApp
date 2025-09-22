document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const form = document.getElementById('birth-data-form');
    const continueButton = document.getElementById('continue-button');
    // (Other element references are the same)
    const astroDetailsContainer = document.getElementById('astro-details-container');
    const chartsContainer = document.getElementById('charts-container');
    const reportContainer = document.getElementById('report-container');
    const messageContainer = document.getElementById('message-container');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    let currentChartData = null; // Store chart data

    // --- Geocoding Function (gets coordinates from a place name) ---
    const getCoordinates = async (placeName) => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}&limit=1`);
            const data = await response.json();
            if (data && data.length > 0) {
                return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
            }
            throw new Error('Location not found');
        } catch (error) {
            throw new Error('Geocoding failed. Check your connection or the location name.');
        }
    };

    // --- Main Form Submission Handler ---
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        // Reset the UI
        astroDetailsContainer.style.display = 'none';
        chartsContainer.style.display = 'none';
        reportContainer.style.display = 'none';
        continueButton.style.display = 'none';
        
        const date = document.getElementById('birth-date').value;
        const time = document.getElementById('birth-time').value;
        const place = document.getElementById('birth-place').value.trim();

        if (!date || !time || !place) return;

        loadingIndicator.style.display = 'block';

        try {
            // 1. Get Coordinates
            const coordinates = await getCoordinates(place);

            // 2. Perform Astrology Calculations in the Browser
            const birthDate = new Date(`${date}T${time}`);
            const kosmos = new Kosmos({
                ayanamsa: "LAHIRI",
                utc: birthDate,
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
            });

            const d1 = kosmos.getChart();
            const d9 = kosmos.getChart('D9');

            // 3. Format the data for our display functions
            const formatPlanets = (chart) => {
                const planets = {};
                for (const planetName in chart.planets) {
                    planets[planetName] = chart.planets[planetName].sign.name;
                }
                return planets;
            };

            const d1_chart = { lagna: d1.ascendant.sign.name, planets: formatPlanets(d1) };
            const d9_chart = { lagna: d9.ascendant.sign.name, planets: formatPlanets(d9) };
            
            const astro_details = {
                "Lagna": d1.ascendant.sign.name,
                "Nawamsa Lagna": d9.ascendant.sign.name,
                "Nekatha": d1.planets.Moon.nakshatra.name,
                "Gana": d1.planets.Moon.nakshatra.gana,
                "Yoni": d1.planets.Moon.nakshatra.yoni,
            };
            
            currentChartData = { d1_chart, d9_chart, astro_details }; // Save for the next step

            // 4. Display the results
            displayAstroDetails(astro_details);
            chartsContainer.innerHTML = '';
            chartsContainer.appendChild(createChart(d1_chart, 'ලග්න කේන්ද්‍රය (D1)'));
            chartsContainer.appendChild(createChart(d9_chart, 'නවාංශක කේන්ද්‍රය (D9)'));
            
            chartsContainer.style.display = 'flex';
            continueButton.style.display = 'block';

        } catch (error) {
            messageContainer.textContent = `Error: ${error.message}`;
        } finally {
            loadingIndicator.style.display = 'none';
        }
    });

    // --- Continue Button for reading ---
    continueButton.addEventListener('click', () => {
        // This is now much simpler. It just displays a placeholder.
        // In the future, this could call a Netlify/Supabase Function for an AI reading.
        reportContainer.innerHTML = `<h1>ජන්ම පත්‍ර විග්‍රහය</h1><p>මෙය ඔබගේ මූලික පලාපල විස්තරයයි. Pro අනුවාදය වෙත පිවිසීමෙන් සම්පූර්ණ විස්තරයක් ලබාගන්න.</p>`;
        reportContainer.style.display = 'block';
        continueButton.style.display = 'none';
    });

    // The createChart and displayAstroDetails functions are the same as the last complete version I sent.
    const displayAstroDetails = (details) => { /* ... same as before ... */ };
    const createChart = (chartData, title) => { /* ... same as before ... */ };
});
