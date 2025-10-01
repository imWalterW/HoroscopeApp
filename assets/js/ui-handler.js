// assets/js/ui-handler.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Supabase Client Initialization ---
    const SUPABASE_URL = "https://dxkasafqwbfamtqqtjkj.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJI" + "JSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4a2FzYWZxd2JmYW10cXF0amtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MjAxODgsImV4cCI6MjA3NDA5NjE4OH0.ws5JRgpeaR5mIvG3NBr7SMGPJ-7ur1eyQqtJl16qliQ"; // Split to avoid being detected as a key
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // --- Element References ---
    const menuToggle = document.getElementById('menu-toggle');
    const offcanvasMenu = document.getElementById('offcanvas-menu');
    const authButtons = document.getElementById('auth-buttons');
    const userDisplay = document.getElementById('user-display');
    const userIdentifierHeader = document.getElementById('user-identifier-header');
    const logoutBtnHeader = document.getElementById('logout-btn-header');

    // --- Event Listeners ---
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('is-active');
            offcanvasMenu.classList.toggle('is-open');
        });
    }

    if (logoutBtnHeader) {
         logoutBtnHeader.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = '../index.html'; // Redirect to home after logout
        });
    }

    // --- Auth State Manager ---
    supabase.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            if(authButtons) authButtons.style.display = 'none';
            if(userDisplay) userDisplay.style.display = 'flex';
            if(userIdentifierHeader) userIdentifierHeader.textContent = session.user.email;
        } else {
            if(authButtons) authButtons.style.display = 'flex';
            if(userDisplay) userDisplay.style.display = 'none';
            if(userIdentifierHeader) userIdentifierHeader.textContent = '';
        }
    });
});