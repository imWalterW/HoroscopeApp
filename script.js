document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const form = document.getElementById('birth-data-form');
    const generateChartsButton = document.getElementById('generate-charts-button');
    const continueButton = document.getElementById('continue-button');
    const verificationMessage = document.getElementById('verification-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    const loadingText = document.getElementById('loading-text');
    const chartsContainer = document.getElementById('charts-container');
    const reportContainer = document.getElementById('report-container');
    const messageContainer = document.getElementById('message-container');
    
    // Your live Render URL
    const API_BASE_URL = 'https://horoscopeapp.onrender.com';
    let currentChartData = null;

    // --- UI Helper Functions ---
    const resetUI = () => {
        chartsContainer.style.display = 'none';
        reportContainer.style.display = 'none';
        continueButton.style.display = 'none';
        verificationMessage.style.display = 'none';
        generateChartsButton.style.display = 'block';
        chartsContainer.innerHTML = '';
        reportContainer.innerHTML = '';
        messageContainer.innerHTML = '';
    };

    const showLoading = (message) => {
        loadingText.textContent = message;
        loadingIndicator.style.display = 'block';
    };

    const hideLoading = () => loadingIndicator.style.display = 'none';

    const showMessage = (message, type = 'error') => {
        const messageDiv = document.createElement('div');
        messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
        messageDiv.textContent = message;
        messageContainer.innerHTML = '';
        messageContainer.appendChild(messageDiv);
    };

    // --- STEP 1: Generate Charts Event Listener ---
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        resetUI();

        const date = document.getElementById('birth-date').value;
        const time = document.getElementById('birth-time').value;
        const place = document.getElementById('birth-place').value.trim();

        if (!date || !time || !place) {
            showMessage('කරුණාකර සියලු ක්ෂේත්‍ර පුරවන්න.');
            return;
        }

        showLoading('කේන්ද්‍ර සටහන් ජනනය කරමින්...');

        try {
            const response = await fetch(`${API_BASE_URL}/calculate_charts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, time, place }),
            });

            if (!response.ok) {
                 const err = await response.json();
                 throw new Error(err.detail || 'Chart calculation failed.');
            }

            const data = await response.json();
            currentChartData = data;

            const d1ChartElement = createChart(data.d1_chart, 'ලග්න කේන්ද්‍රය (D1)');
            const d9ChartElement = createChart(data.d9_chart, 'නවාංශක කේන්ද්‍රය (D9)');
            chartsContainer.appendChild(d1ChartElement);
            chartsContainer.appendChild(d9ChartElement);
            
            chartsContainer.style.display = 'flex';
            verificationMessage.style.display = 'block';
            continueButton.style.display = 'block';
            generateChartsButton.style.display = 'none';

        } catch (error) {
            showMessage(`දෝෂයක් ඇතිවිය: ${error.message}`);
        } finally {
            hideLoading();
        }
    });

    // --- STEP 2: Get Full Reading Event Listener ---
    continueButton.addEventListener('click', async () => {
        if (!currentChartData) return;

        showLoading('සම්පූර්ණ පලාපල විස්තරය ලබාගනිමින්...');
        reportContainer.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE_URL}/generate_reading`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentChartData),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Reading generation failed.');
            }

            const data = await response.json();
            displayReading(data.reading);
            reportContainer.style.display = 'block';
            continueButton.style.display = 'none';
            verificationMessage.style.display = 'none';

        } catch (error) {
             showMessage(`දෝෂයක් ඇතිවිය: ${error.message}`);
        } finally {
            hideLoading();
        }
    });
    
    // --- Helper Functions to Display Content ---
    const displayReading = (text) => {
        const htmlContent = text.replace(/^#\s(.+)/gm, '<h1>$1</h1>').replace(/^###\s(.+)/gm, '<h3>$1</h3>').split('\n').filter(line => line.trim() !== '').map(line => {
            if (line.startsWith('<h1>') || line.startsWith('<h3>')) return line;
            return `<p>${line}</p>`;
        }).join('');
        reportContainer.innerHTML = htmlContent;
    };
    
    const createChart = (chartData, title) => {
        const ZODIAC_SIGNS_EN = [ 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces' ];
        const ZODIAC_SIGNS_SI = { 'Aries': 'මේෂ', 'Taurus': 'වෘෂභ', 'Gemini': 'මිථුන', 'Cancer': 'කටක', 'Leo': 'සිංහ', 'Virgo': 'කන්‍යා', 'Libra': 'තුලා', 'Scorpio': 'වෘශ්චික', 'Sagittarius': 'ධනු', 'Capricorn': 'මකර', 'Aquarius': 'කුම්භ', 'Pisces': 'මීන' };
        const PLANET_ABBR_SI = { 'Sun': 'ර', 'Moon': 'ස', 'Mars': 'කු', 'Mercury': 'බු', 'Jupiter': 'ගු', 'Venus': 'සි', 'Saturn': 'ශ', 'Rahu': 'රා', 'Ketu': 'කේ' };

        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'chart-wrapper';
        const chartTitle = document.createElement('h2');
        chartTitle.className = 'chart-title';
        chartTitle.textContent = title;
        chartWrapper.appendChild(chartTitle);

        const grid = document.createElement('div');
        grid.className = 'chart-grid';
        const lagnaSignIndex = ZODIAC_SIGNS_EN.indexOf(chartData.lagna);

        ZODIAC_SIGNS_EN.forEach((sign, currentSignIndex) => {
            const box = document.createElement('div');
            box.className = `chart-box ${sign.toLowerCase()}`;
            const signName = document.createElement('span');
            signName.className = 'sign-name';
            signName.textContent = ZODIAC_SIGNS_SI[sign];
            box.appendChild(signName);

            const houseNumberValue = ((currentSignIndex - lagnaSignIndex + 12) % 12) + 1;
            const houseNumber = document.createElement('span');
            houseNumber.className = 'house-number';
            houseNumber.textContent = houseNumberValue;
            box.appendChild(houseNumber);

            const planetsDiv = document.createElement('div');
            planetsDiv.className = 'planets';
            
            if (chartData.lagna === sign) {
                box.classList.add('lagna-box');
                const lagnaMarker = document.createElement('span');
                lagnaMarker.className = 'lagna-marker planet';
                lagnaMarker.textContent = 'ලග්';
                planetsDiv.appendChild(lagnaMarker);
            }

            for (const planet in chartData.planets) {
                if (chartData.planets[planet] === sign) {
                    const planetSpan = document.createElement('span');
                    planetSpan.className = 'planet';
                    planetSpan.textContent = PLANET_ABBR_SI[planet];
                    planetsDiv.appendChild(planetSpan);
                }
            }
            box.appendChild(planetsDiv);
            grid.appendChild(box);
        });
        
        for(let i=1; i<=4; i++) {
             const centerBox = document.createElement('div');
             centerBox.className = `chart-box center-box-${i}`;
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
});
