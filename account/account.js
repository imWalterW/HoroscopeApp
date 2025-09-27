document.addEventListener('DOMContentLoaded', () => {

    // --- Supabase Client Initialization ---
    const SUPABASE_URL = "https://dxkasafqwbfamtqqtjkj.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4a2FzYWZxd2JmYW10cXF0amtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MjAxODgsImV4cCI6MjA3NDA5NjE4OH0.ws5JRgpeaR5mIvG3NBr7SMGPJ-7ur1eyQqtJl16qliQ";
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // --- Element References ---
    // Header elements
    const authButtons = document.getElementById('auth-buttons');
    const userDisplay = document.getElementById('user-display');
    const userIdentifierHeader = document.getElementById('user-identifier-header');
    const logoutBtnHeader = document.getElementById('logout-btn-header');
    const menuToggle = document.getElementById('menu-toggle');
    const offcanvasMenu = document.getElementById('offcanvas-menu');
    
    // Account page specific elements
    const userEmailDisplay = document.getElementById('user-email-display');
    const creditBalanceDisplay = document.getElementById('credit-balance-display');
    const pricingCards = document.querySelectorAll('.pricing-card');


    // --- Main Logic ---

    const fetchUserProfile = async (user) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('credits, is_vip')
                .eq('id', user.id)
                .single(); // .single() expects one row and simplifies the result

            if (error) throw error;
            
            if (data) {
                // Update the UI with the fetched data
                creditBalanceDisplay.textContent = data.is_vip ? 'Unlimited' : data.credits;

                if(data.is_vip) {
                    // If user is VIP, you might want to disable purchase buttons
                    pricingCards.forEach(card => {
                        card.querySelector('button').disabled = true;
                        card.querySelector('button').textContent = 'Subscribed';
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching user profile:', error.message);
            creditBalanceDisplay.textContent = 'Error';
        }
    };

    // --- Auth State Manager ---
    // Checks the user's login state as soon as the page loads.
    supabase.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            // USER IS LOGGED IN
            const user = session.user;
            
            // Update header
            authButtons.style.display = 'none';
            userDisplay.style.display = 'flex';
            userIdentifierHeader.textContent = user.email;

            // Update account details section
            userEmailDisplay.textContent = user.email;

            // Fetch and display the rest of the profile info (credits, VIP status)
            fetchUserProfile(user);

        } else {
            // USER IS NOT LOGGED IN
            // Redirect them to the homepage because they shouldn't be here.
            window.location.href = '../index.html';
        }
    });

    // --- Event Listeners ---
    logoutBtnHeader.addEventListener('click', async () => {
        await supabase.auth.signOut();
        // After signing out, the onAuthStateChange listener above will trigger
        // and redirect the user to the homepage.
    });

    // --- Off-Canvas Menu Toggle ---
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('is-active');
        offcanvasMenu.classList.toggle('is-open');
    });

});