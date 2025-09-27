document.addEventListener('DOMContentLoaded', () => {
   
    // --- Supabase Client Initialization ---
    const SUPABASE_URL = "https://dxkasafqwbfamtqqtjkj.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4a2FzYWZxd2JmYW10cXF0amtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MjAxODgsImV4cCI6MjA3NDA5NjE4OH0.ws5JRgpeaR5mIvG3NBr7SMGPJ-7ur1eyQqtJl16qliQ";
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // --- Element References ---
    const menuToggle = document.getElementById('menu-toggle');
    const offcanvasMenu = document.getElementById('offcanvas-menu');
    const authButtons = document.getElementById('auth-buttons');
    const userDisplay = document.getElementById('user-display');
    const userIdentifierHeader = document.getElementById('user-identifier-header');
    const logoutBtnHeader = document.getElementById('logout-btn-header');
    const porondamForm = document.getElementById('porondam-form');
    const checkCompatibilityBtn = document.getElementById('check-compatibility-btn');
    const messageContainer = document.getElementById('message-container');
    const resultsContainer = document.getElementById('results-container');
    
    // --- State Management ---
    let currentPorondamData = null;

    // --- Dynamic API URL ---
    const API_BASE_URL = 'http://127.0.0.1:8000';

    // --- Helper Functions ---
    const showMessage = (message, type = 'error') => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        messageDiv.textContent = message;
        messageContainer.innerHTML = '';
        messageContainer.appendChild(messageDiv);
        window.scrollTo(0, 0);
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
        const centerBox = document.createElement('div');
        centerBox.className = 'center-box';
        centerBox.innerHTML = `<span class="center-title">${ZODIAC_SIGNS_SI[chartData.lagna]}</span><span class="center-subtitle">${title.includes('D1') ? 'ලග්නය' : 'නවාංශකය'}</span>`;
        grid.appendChild(centerBox);
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
                planetsDiv.innerHTML = '<span class="lagna-marker planet">ලග්</span>';
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
        chartWrapper.appendChild(grid);
        return chartWrapper;
    };
    
    const displayReading = (text, container) => {
        container.innerHTML = '';
        const sections = text.split('### ').filter(section => section.trim() !== '');
        sections.forEach(sectionText => {
            const card = document.createElement('div');
            card.className = 'report-card';
            const lines = sectionText.split('\n').filter(line => line.trim() !== '');
            const title = lines.shift(); 
            const titleElement = document.createElement('h3');
            titleElement.textContent = title;
            card.appendChild(titleElement);
            lines.forEach(line => {
                const p = document.createElement('p');
                p.innerHTML = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                card.appendChild(p);
            });
            container.appendChild(card);
        });
    };

    // --- Main Logic ---
    supabase.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            authButtons.style.display = 'none';
            userDisplay.style.display = 'flex';
            userIdentifierHeader.textContent = session.user.email;
        } else {
            // User is not logged in, redirect to homepage to log in
            window.location.href = '../index.html';
        }
    });

    // --- Event Listeners ---
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('is-active');
        offcanvasMenu.classList.toggle('is-open');
    });
    
    logoutBtnHeader.addEventListener('click', async () => {
        await supabase.auth.signOut();
    });

    porondamForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageContainer.innerHTML = '';
        resultsContainer.innerHTML = '';

        const person1Data = { date: document.getElementById('p1-birth-date').value, time: document.getElementById('p1-birth-time').value, place: document.getElementById('p1-birth-place').value.trim() };
        const person2Data = { date: document.getElementById('p2-birth-date').value, time: document.getElementById('p2-birth-time').value, place: document.getElementById('p2-birth-place').value.trim() };

        try {
            checkCompatibilityBtn.disabled = true;
            checkCompatibilityBtn.textContent = 'සටහන් ජනනය කරමින්...';
            
            const response = await fetch(`${API_BASE_URL}/calculate_porondam_charts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ person1: person1Data, person2: person2Data })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Chart calculation failed.');
            }

            const data = await response.json();
            currentPorondamData = data; // Save data for the next step

            const chartsSection = document.createElement('section');
            chartsSection.className = 'charts-section';
            chartsSection.appendChild(createChart(data.person1_charts.d1, 'පළමු පුද්ගලයා - ලග්න කේන්ද්‍රය (D1)'));
            chartsSection.appendChild(createChart(data.person1_charts.d9, 'පළමු පුද්ගලයා - නවාංශකය (D9)'));
            chartsSection.appendChild(createChart(data.person2_charts.d1, 'දෙවන පුද්ගලයා - ලග්න කේන්ද්‍රය (D1)'));
            chartsSection.appendChild(createChart(data.person2_charts.d9, 'දෙවන පුද්ගලයා - නවාංශකය (D9)'));
            resultsContainer.appendChild(chartsSection);

            const verificationMessage = document.createElement('p');
            verificationMessage.className = 'verification-text';
            verificationMessage.textContent = 'කරුණාකර ඉහත කේන්ද්‍ර සටහන් නිවැරදි දැයි තහවුරු කරන්න.';
            resultsContainer.appendChild(verificationMessage);
            
            const continuePorondamBtn = document.createElement('button');
            continuePorondamBtn.id = 'continue-porondam-btn';
            continuePorondamBtn.className = 'submit-btn';
            continuePorondamBtn.textContent = 'සටහන් නිවැරදියි - සම්පූර්ණ විස්තරය ලබාගන්න';
            
            const buttonContainer = porondamForm.querySelector('.button-container');
            buttonContainer.innerHTML = ''; // Clear old button
            buttonContainer.appendChild(continuePorondamBtn);

            continuePorondamBtn.addEventListener('click', generatePorondamReading);

        } catch (error) {
            showMessage(`දෝෂයක් ඇතිවිය: ${error.message}`);
            checkCompatibilityBtn.disabled = false;
            checkCompatibilityBtn.textContent = 'ගැළපීම් පරීක්ෂා කරන්න';
        }
    });

    const generatePorondamReading = async () => {
        if (!currentPorondamData) return;

        const continueBtn = document.getElementById('continue-porondam-btn');
        continueBtn.disabled = true;
        continueBtn.textContent = 'විශ්ලේෂණය කරමින්...';

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            // This case should ideally not happen due to page-level auth check, but it's good safety.
            showMessage('කරුණාකර සම්පූර්ණ විස්තරය ලබාගැනීමට පිවිසෙන්න.');
            continueBtn.disabled = false;
            continueBtn.textContent = 'සටහන් නිවැරදියි - සම්පූර්ණ විස්තරය ලබාගන්න';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/generate_porondam_reading`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(currentPorondamData)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Reading generation failed.');
            }

            const results = await response.json();

            // Clear verification message and button
            resultsContainer.querySelector('.verification-text').remove();
            document.getElementById('continue-porondam-btn').remove();

            // Display Score
            const scoreCard = document.createElement('div');
            scoreCard.className = 'report-card';
            scoreCard.innerHTML = `<h3>ගැළපීම් ලකුණු</h3><p style="font-size: 2.5rem; text-align: center; color: var(--primary-gold); font-weight: 700;">${results.score}</p>`;
            resultsContainer.prepend(scoreCard); // Prepend score to the top

            // Display Reading
            const reportSection = document.createElement('section');
            reportSection.className = 'report-section';
            displayReading(results.reading, reportSection);
            resultsContainer.appendChild(reportSection);
            
            showMessage('ගැළපීම් පරීක්ෂාව සාර්ථකයි!', 'info');

        } catch (error) {
            showMessage(`දෝෂයක් ඇතිවිය: ${error.message}`);
            continueBtn.disabled = false;
            continueBtn.textContent = 'සටහන් නිවැරදියි - සම්පූර්ණ විස්තරය ලබාගන්න';
        }
    }
});