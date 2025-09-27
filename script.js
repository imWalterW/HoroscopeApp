document.addEventListener('DOMContentLoaded', () => {
   
    // --- Supabase Client Initialization ---
    const SUPABASE_URL = "https://dxkasafqwbfamtqqtjkj.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4a2FzYWZxd2JmYW10cXF0amtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MjAxODgsImV4cCI6MjA3NDA5NjE4OH0.ws5JRgpeaR5mIvG3NBr7SMGPJ-7ur1eyQqtJl16qliQ";
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // --- Element References ---
    const form = document.getElementById('birth-data-form');
    const generateChartsButton = document.getElementById('generate-charts-button');
    const continueButton = document.getElementById('continue-button');
    const resetButton = document.getElementById('reset-button');
    const verificationMessage = document.getElementById('verification-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    const loadingText = document.getElementById('loading-text');
    const chartsContainer = document.getElementById('charts-container');
    const reportContainer = document.getElementById('report-container');
    const messageContainer = document.getElementById('message-container');
    const astroDetailsContainer = document.getElementById('astro-details-container');
    const formSection = document.querySelector('.form-section');
    const menuToggle = document.getElementById('menu-toggle');
    const offcanvasMenu = document.getElementById('offcanvas-menu');
    const authMessageContainer = document.getElementById('auth-message-container');
    const authModal = document.getElementById('auth-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignupLink = document.getElementById('show-signup');
    const showLoginLink = document.getElementById('show-login');
    const authButtons = document.getElementById('auth-buttons');
    const userDisplay = document.getElementById('user-display');
    const userIdentifierHeader = document.getElementById('user-identifier-header');
    const logoutBtnHeader = document.getElementById('logout-btn-header');
    const signupPasswordConfirm = document.getElementById('signup-password-confirm');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const loginPasswordInput = document.querySelector('#login-password').parentElement;
    const loginSubmitBtn = document.getElementById('login-submit-btn');
    const sendResetBtn = document.getElementById('send-reset-btn');
    const authToggleP = document.getElementById('auth-toggle-p');
    const backToLoginP = document.getElementById('back-to-login-p');
    const loginTitle = document.querySelector('#login-form h3');

    // --- State Management ---
    let currentChartData = null;
    
    // --- Dynamic API URL ---
    const API_BASE_URL = 'http://127.0.0.1:8000';

    // --- UI Helper Functions ---
    const resetUI = () => {
        form.reset();
        chartsContainer.style.display = 'none';
        reportContainer.style.display = 'none';
        astroDetailsContainer.style.display = 'none';
        continueButton.style.display = 'none';
        resetButton.style.display = 'none';
        verificationMessage.style.display = 'none';
        generateChartsButton.style.display = 'block';
        chartsContainer.innerHTML = '';
        reportContainer.innerHTML = '';
        messageContainer.innerHTML = '';
        astroDetailsContainer.innerHTML = '';
        currentChartData = null;
    };

    const showLoading = (message) => {
        loadingText.textContent = message;
        loadingIndicator.style.display = 'block';
        chartsContainer.style.display = 'none';
        reportContainer.style.display = 'none';
        astroDetailsContainer.style.display = 'none';
    };

    const hideLoading = () => {
        loadingIndicator.style.display = 'none';
    };

    const showMessage = (message, type = 'error') => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`; 
        messageDiv.textContent = message;
        messageContainer.innerHTML = '';
        messageContainer.appendChild(messageDiv);
        window.scrollTo(0, 0);
    };

    const showAuthMessage = (message, type = 'error') => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        messageDiv.textContent = message;
        authMessageContainer.innerHTML = '';
        authMessageContainer.appendChild(messageDiv);
    };

    const displayAstroDetails = (details) => {
        astroDetailsContainer.innerHTML = '';
        const list = document.createElement('ul');
        for (const key in details) {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<span class="detail-key">${key}:</span> <span class="detail-value">${details[key] || '-'}</span>`;
            list.appendChild(listItem);
        }
        astroDetailsContainer.appendChild(list);
        astroDetailsContainer.style.display = 'block';
    };

    const displayReading = (text) => {
        reportContainer.innerHTML = '';
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
            reportContainer.appendChild(card);
        });
        reportContainer.style.display = 'block';
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
        chartWrapper.appendChild(grid);
        return chartWrapper;
    };

    // --- Event Listeners ---
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // This is a free check, so no session logic is needed here.
        messageContainer.innerHTML = '';
        reportContainer.innerHTML = ''; // Also clear previous readings
        chartsContainer.innerHTML = ''; // Clear previous charts
        astroDetailsContainer.innerHTML = ''; // Clear previous details

        showLoading('කේන්ද්‍ර සටහන් ජනනය කරමින්...');
        try {
            const response = await fetch(`${API_BASE_URL}/calculate_charts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: document.getElementById('birth-date').value,
                    time: document.getElementById('birth-time').value,
                    place: document.getElementById('birth-place').value.trim(),
                }),
            });
            if (!response.ok) {
                 const err = await response.json();
                 throw new Error(err.detail || 'Chart calculation failed.');
            }
            const data = await response.json();
            currentChartData = data; // Store data for the next step
            
            hideLoading();
            
            // Display charts and verification message
            displayAstroDetails(data.astro_details);
            const d1ChartElement = createChart(data.d1_chart, 'ලග්න කේන්ද්‍රය (D1)');
            const d9ChartElement = createChart(data.d9_chart, 'නවාංශක කේන්ද්‍රය (D9)');
            chartsContainer.innerHTML = '';
            chartsContainer.appendChild(d1ChartElement);
            chartsContainer.appendChild(d9ChartElement);
            chartsContainer.style.display = 'flex';
            
            // Show the continue/reset buttons
            verificationMessage.style.display = 'block';
            continueButton.style.display = 'block';
            resetButton.style.display = 'block';
            generateChartsButton.style.display = 'none';

        } catch (error) {
            hideLoading();
            showMessage(`දෝෂයක් ඇතිවිය: ${error.message}`);
        }
    });

    continueButton.addEventListener('click', async () => {
        if (!currentChartData) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            showAuthMessage('කරුණාකර සම්පූර්ණ පලාපල විස්තරය ලබාගැනීමට පිවිසෙන්න.', 'info');
            openModal();
            return;
        }
        
        continueButton.disabled = true;
        continueButton.textContent = "පලාපල ලබාගනිමින්...";
        showLoading('සම්පූර්ණ පලාපල විස්තරය ලබාගනිමින්...');

        try {
            const response = await fetch(`${API_BASE_URL}/generate_reading`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(currentChartData),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Reading generation failed.');
            }
            const data = await response.json();
            
            hideLoading();
            displayReading(data.reading);
            verificationMessage.style.display = 'none';
            continueButton.style.display = 'none';

        } catch (error) {
             hideLoading();
             showMessage(`දෝෂයක් ඇතිවිය: ${error.message}`);
        } finally {
             continueButton.disabled = false;
             continueButton.textContent = "සටහන් නිවැරදියි - පලාපල විස්තරය ලබාගන්න";
        }
    });

    resetButton.addEventListener('click', resetUI);

    // --- Authentication and Menu Logic ---
    const openModal = () => authModal.style.display = 'flex';
    const closeModal = () => authModal.style.display = 'none';

    loginBtn.addEventListener('click', () => {
        authMessageContainer.innerHTML = '';
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
        openModal();
    });

    signupBtn.addEventListener('click', () => {
        authMessageContainer.innerHTML = '';
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        openModal();
    });

    closeModalBtn.addEventListener('click', closeModal);
    authModal.addEventListener('click', (event) => {
        if (event.target === authModal) {
            closeModal();
        }
    });

    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        authMessageContainer.innerHTML = '';
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        authMessageContainer.innerHTML = '';
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-password-confirm').value;
        if (password !== confirmPassword) {
            showAuthMessage('Passwords do not match. Please try again.');
            return;
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
            showAuthMessage(`Signup Error: ${error.message}`);
        } else {
            showAuthMessage('Success! Please check your email for a confirmation link.', 'info');
        }
    });

   loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            showAuthMessage(`Login Error: ${error.message}`);
        } else {
            authMessageContainer.innerHTML = '';
            closeModal();
        }
    });

    logoutBtnHeader.addEventListener('click', async () => {
        await supabase.auth.signOut();
    });

    supabase.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            authButtons.style.display = 'none';
            userDisplay.style.display = 'flex';
            userIdentifierHeader.textContent = session.user.email;
        } else {
            authButtons.style.display = 'flex';
            userDisplay.style.display = 'none';
            userIdentifierHeader.textContent = '';
            if (window.location.pathname.includes('account.html') || window.location.pathname.includes('porondam.html')) {
                window.location.href = '/index.html';
            } else {
                resetUI();
            }
        }
    });

    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginPasswordInput.style.display = 'none';
        loginSubmitBtn.style.display = 'none';
        authToggleP.style.display = 'none';
        sendResetBtn.style.display = 'block';
        backToLoginP.style.display = 'block';
        loginTitle.textContent = 'Reset Password';
        showAuthMessage('Enter your email address to receive a reset link.', 'info');
    });

    backToLoginP.addEventListener('click', (e) => {
        e.preventDefault();
        sendResetBtn.style.display = 'none';
        backToLoginP.style.display = 'none';
        loginPasswordInput.style.display = 'block';
        loginSubmitBtn.style.display = 'block';
        authToggleP.style.display = 'block';
        loginTitle.textContent = 'පිවිසෙන්න (Login)';
        authMessageContainer.innerHTML = '';
    });

    sendResetBtn.addEventListener('click', async () => {
        const email = document.getElementById('login-email').value;
        if (!email) {
            showAuthMessage('Please enter your email address.');
            return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });
        if (error) {
            showAuthMessage(`Error: ${error.message}`);
        } else {
            showAuthMessage('Password reset link sent. Please check your email inbox.', 'info');
        }
    });

    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('is-active');
        offcanvasMenu.classList.toggle('is-open');
    });

    // --- Initial Setup ---
    resetUI();
});