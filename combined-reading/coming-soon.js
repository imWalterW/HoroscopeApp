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

    // --- Auth State Manager ---
    supabase.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            // User is logged in
            authButtons.style.display = 'none';
            userDisplay.style.display = 'flex';
            userIdentifierHeader.textContent = session.user.email;
        } else {
            // User is logged out
            authButtons.style.display = 'flex';
            userDisplay.style.display = 'none';
            userIdentifierHeader.textContent = '';
        }
    });

    // --- Event Listeners ---
    // Off-Canvas Menu Toggle
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('is-active');
        offcanvasMenu.classList.toggle('is-open');
    });
    
    // Logout Button
    logoutBtnHeader.addEventListener('click', async () => {
        await supabase.auth.signOut();
        // Page will refresh and onAuthStateChange will handle the UI update
        window.location.reload(); 
    });

});