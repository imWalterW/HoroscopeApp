document.addEventListener('DOMContentLoaded', () => {
   
    // --- Supabase Client Initialization ---
    const SUPABASE_URL = "https://dxkasafqwbfamtqqtjkj.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4a2FzYWZxd2JmYW10cXF0amtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MjAxODgsImV4cCI6MjA3NDA5NjE4OH0.ws5JRgpeaR5mIvG3NBr7SMGPJ-7ur1eyQqtJl16qliQ";
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // --- Element References ---
    // Header & Menu
    const menuToggle = document.getElementById('menu-toggle');
    const offcanvasMenu = document.getElementById('offcanvas-menu');
    const authButtons = document.getElementById('auth-buttons');
    const userDisplay = document.getElementById('user-display');
    const userIdentifierHeader = document.getElementById('user-identifier-header');
    const logoutBtnHeader = document.getElementById('logout-btn-header');

    // Page Specific Elements
    const porondamForm = document.getElementById('porondam-form');
    const checkCompatibilityBtn = document.getElementById('check-compatibility-btn');
    const confirmGenerateBtn = document.getElementById('confirm-generate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const messageContainer = document.getElementById('message-container');
    const resultsContainer = document.getElementById('results-container');
    const verifyNote = document.getElementById('verify-note');
    const person1Block = document.getElementById('person1-block');
    const person2Block = document.getElementById('person2-block');
    const astroDetailsP1 = document.getElementById('astro-details-p1');
    const astroDetailsP2 = document.getElementById('astro-details-p2');
    const chartsP1 = document.getElementById('charts-p1');
    const chartsP2 = document.getElementById('charts-p2');
    const loadingIndicator = document.getElementById('loading-indicator');
    const loadingText = document.getElementById('loading-text');
    
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

    const resetUI = () => {
        resultsContainer.innerHTML = '';
        person1Block.style.display = 'none';
        astroDetailsP1.style.display = 'none';
        astroDetailsP1.innerHTML = '';
        chartsP1.innerHTML = '';
        person2Block.style.display = 'none';
        astroDetailsP2.style.display = 'none';
        astroDetailsP2.innerHTML = '';
        chartsP2.innerHTML = '';
        verifyNote.style.display = 'none';
        confirmGenerateBtn.style.display = 'none';
        resetBtn.style.display = 'none';
        checkCompatibilityBtn.style.display = 'inline-block';
        checkCompatibilityBtn.disabled = false;
        checkCompatibilityBtn.textContent = 'කේන්ද්‍ර සටහන් බලන්න';
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
    
    const displayAstroDetails = (container, details) => {
        container.innerHTML = '';
        const list = document.createElement('ul');
        const entries = {
            'ලග්නය': details.lagna,
            'නවාංශක ලග්නය': details.navamsa_lagna,
            'නැකත': (details.nakshatra && details.nakshatra.name) || '-',
            'වත්මන් මහදශාව': (details.dasha_info && details.dasha_info.current_mahadasha) || '-',
            'මීළඟ මහදශාව': (details.dasha_info && details.dasha_info.next_mahadasha) || '-',
            'මීළඟ මහදශා ආරම්භ වසර': (details.dasha_info && details.dasha_info.next_mahadasha_start_year) || '-'
        };
        Object.keys(entries).forEach(key => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="detail-key">${key}</span> <span class="detail-value">${entries[key]}</span>`;
            list.appendChild(li);
        });
        container.appendChild(list);
        container.style.display = 'block';
    };

    const showLoading = (message) => {
        loadingText.textContent = message || 'කරුණාකර රැඳී සිටින්න...';
        loadingIndicator.style.display = 'block';
    };

    const hideLoading = () => {
        loadingIndicator.style.display = 'none';
    };
    
   // In porondam.js, replace the entire displayReading function

const displayReading = (text, container) => {
    container.innerHTML = ''; 

    let porondamText = text;
    let summaryText = '';

    // Look for a summary section and split the text
    const summaryKeyword = 'සාරාංශය';
    if (text.includes(summaryKeyword)) {
        const parts = text.split(summaryKeyword);
        porondamText = parts[0];
        summaryText = parts[1];
    }
    
    // --- PART 1: Process the Porondam Cards ---
    const porondamNames = [
        "නැකැත් පොරොන්දම", "ගණ පොරොන්දම", "මහේන්ද්‍ර පොරොන්දම", "ස්ත්‍රී දීර්ඝ පොරොන්දම", "යෝනි පොරොන්දම", 
        "රාශි පොරොන්දම", "රාශ්‍යාධිපති පොරොන්දම", "වශ්‍ය පොරොන්දම", "රජ්ජු පොරොන්දම", "වේධ පොරොන්දම", 
        "වෘක්ෂ පොරොන්දම", "ආයුෂ පොරොන්දම", "පක්ෂි පොරොන්දම", "භූත පොරොන්දම", "ගෝත්‍ර පොරොන්දම", 
        "වර්ණ පොරොන්දම", "ලිංග පොරොන්දම", "නාඩි පොරොන්දම", "දින පොරොන්දම", "ග්‍රහ පොරොන්දම"
    ];

    const titleRegex = new RegExp(`\\*\\*?(${porondamNames.join('|')})[:.\\*\\s]`, 'g');
    const matches = [...porondamText.matchAll(titleRegex)];

    matches.forEach((match, i) => {
        const startIndex = match.index;
        const endIndex = (i + 1 < matches.length) ? matches[i + 1].index : porondamText.length;
        const sectionText = porondamText.substring(startIndex, endIndex);

        if (!sectionText || sectionText.trim() === '') return;

        const card = document.createElement('div');
        card.className = 'report-card';
        const lines = sectionText.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) return;

        const titleLine = lines.shift().trim();
        const cleanTitle = titleLine.replace(/[*:]/g, '').trim();
        
        const titleElement = document.createElement('h3');
        titleElement.textContent = cleanTitle;
        card.appendChild(titleElement);
        
        let matchStatus = '', statusClass = '';
        if (sectionText.includes('නොගැලපේ')) {
            matchStatus = 'නොගැලපේ ✖'; statusClass = 'status-mismatch';
        } else if (sectionText.includes('ගැලපේ')) {
            matchStatus = 'ගැලපේ ✔'; statusClass = 'status-match';
        }

        if (matchStatus) {
            const statusElement = document.createElement('p');
            statusElement.className = `status-badge ${statusClass}`;
            statusElement.textContent = matchStatus;
            card.appendChild(statusElement);
        }

        lines.forEach(line => {
            const cleanLine = line.replace(/[*]/g, '').replace(/\(?(ගැලපේ|නොගැලපේ)\)?/, '').trim();
            if (cleanLine) {
                const p = document.createElement('p');
                p.textContent = cleanLine;
                card.appendChild(p);
            }
        });
        container.appendChild(card);
    });

    // --- PART 2: Process and Append the Summary Card ---
    if (summaryText.trim()) {
        const summaryCard = document.createElement('div');
        summaryCard.className = 'report-card summary-card'; // Add a special class for styling
        
        const titleElement = document.createElement('h3');
        titleElement.textContent = 'සාරාංශය'; // Set the title
        summaryCard.appendChild(titleElement);

        const lines = summaryText.split('\n').filter(line => line.trim() !== '');
        lines.forEach(line => {
            const cleanLine = line.replace(/[*:]/g, '').trim();
            if(cleanLine) {
                const p = document.createElement('p');
                p.textContent = cleanLine;
                summaryCard.appendChild(p);
            }
        });
        container.appendChild(summaryCard);
    }
};

    // --- Main Logic ---
    supabase.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            authButtons.style.display = 'none';
            userDisplay.style.display = 'flex';
            userIdentifierHeader.textContent = session.user.email;
        } else {
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

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            showMessage('කරුණාකර ගැළපීම් පරීක්ෂා කිරීමට පිවිසෙන්න.');
            return;
        }

        const person1Data = {
            date: document.getElementById('p1-birth-date').value,
            time: document.getElementById('p1-birth-time').value,
            place: document.getElementById('p1-birth-place').value.trim(),
        };
        const person2Data = {
            date: document.getElementById('p2-birth-date').value,
            time: document.getElementById('p2-birth-time').value,
            place: document.getElementById('p2-birth-place').value.trim(),
        };

        try {
            checkCompatibilityBtn.disabled = true;
            checkCompatibilityBtn.textContent = 'කේන්ද්‍ර සටහන් සකස් කරමින්...';

            // Step 1: Free prepare call
            const response = await fetch(`${API_BASE_URL}/prepare_porondam`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ person1: person1Data, person2: person2Data })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Preparation failed.');
            }

            const prepared = await response.json();

            // Show charts per person
            chartsP1.innerHTML = '';
            chartsP1.appendChild(createChart(prepared.person1.d1, 'ලග්න කේන්ද්‍රය (D1)'));
            chartsP1.appendChild(createChart(prepared.person1.d9, 'නවාංශකය (D9)'));
            chartsP2.innerHTML = '';
            chartsP2.appendChild(createChart(prepared.person2.d1, 'ලග්න කේන්ද්‍රය (D1)'));
            chartsP2.appendChild(createChart(prepared.person2.d9, 'නවාංශකය (D9)'));
            person1Block.style.display = 'block';
            person2Block.style.display = 'block';

            // Show full astro details for verification
            displayAstroDetails(astroDetailsP1, prepared.person1.details);
            displayAstroDetails(astroDetailsP2, prepared.person2.details);

            // Show confirm/ reset controls
            verifyNote.style.display = 'block';
            confirmGenerateBtn.style.display = 'inline-block';
            resetBtn.style.display = 'inline-block';
            checkCompatibilityBtn.style.display = 'none';

            // Wire confirm click to paid call
            // In porondam.js, replace the entire confirmGenerateBtn.onclick function

// In porondam.js, replace the entire confirmGenerateBtn.onclick function

confirmGenerateBtn.onclick = async () => {
    confirmGenerateBtn.disabled = true;
    confirmGenerateBtn.textContent = 'විස්තරය ලබාගනිමින්...';
    showLoading('ගැළපීම් වාර්තාව සකස් කරමින්...');
    try {
        const paidResp = await fetch(`${API_BASE_URL}/calculate_porondam`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ person1: person1Data, person2: person2Data })
        });
        if (!paidResp.ok) {
            const err = await paidResp.json();
            throw new Error(err.detail || 'Compatibility generation failed.');
        }
        const results = await paidResp.json();

        // --- Start of UI Update ---
        resultsContainer.innerHTML = ''; // Clear everything first
        
        const reportSection = document.createElement('section');
        reportSection.className = 'report-section';

        // Display the reading, which will now handle both porondams and the summary
        displayReading(results.reading, reportSection);

        resultsContainer.appendChild(reportSection);
        
        showMessage('ගැළපීම් වාර්තාව සාර්ථකව සාදන ලදී!', 'info');
        verifyNote.style.display = 'none';
        confirmGenerateBtn.style.display = 'none';

    } catch (err) {
        showMessage(`දෝෂයක් ඇතිවිය: ${err.message}`);
    } finally {
        hideLoading();
        confirmGenerateBtn.disabled = false;
        confirmGenerateBtn.textContent = 'සටහන් නිවැරදියි - ගැළපීම් විස්තරය ලබාගන්න';
    }
};

        } catch (error) {
            showMessage(`දෝෂයක් ඇතිවිය: ${error.message}`);
        } finally {
            checkCompatibilityBtn.disabled = false;
            // Button is hidden after success, but reset text anyway
            checkCompatibilityBtn.textContent = 'කේන්ද්‍ර සටහන් බලන්න';
        }
    });

    resetBtn.addEventListener('click', resetUI);
});