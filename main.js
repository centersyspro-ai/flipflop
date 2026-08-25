// main.js
const BACKEND_URL = window.APP_CONFIG.BACKEND_URL;
const WELCOME_SHOWN_KEY = 'yourkey';

// ============================================
// DEVICE DETECTION
// ============================================
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
           || window.innerWidth <= 768;
};

// ============================================
// AUTHENTICATION MANAGER - FIXED
// ============================================
class AuthManager {
    constructor() {
        this.user = null;
        this.isAuthenticated = false;
        this.userRatings = {}; // Format: { "chapterId": { rating: 5, timestamp: "..." } }
    }

    async init() {
        console.log('AuthManager init starting...');
        
        try {
            const response = await fetch(BACKEND_URL + '/auth/check', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();

            if (data.success && data.authenticated) {
                console.log('User is authenticated:', data.user);
                this.user = data.user;
                this.isAuthenticated = true;
                this.showUserInfo();
                await this.loadUserRatings(); // CRITICAL: Load ratings before continuing
                return true;
            } else {
                console.log('User not authenticated');
                this.showLoginModal();
                return false;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showLoginModal();
            return false;
        }
    }

    async loadUserRatings() {
        try {
            console.log('Loading user ratings from backend...');
            const response = await fetch(BACKEND_URL + '/getUserRatings', {
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();
            
            if (data.success) {
                // FIXED: Properly structure the ratings object
                this.userRatings = {};
                
                // If backend returns array of ratings
                if (Array.isArray(data.ratings)) {
                    data.ratings.forEach(rating => {
                        if (rating.chapterId && rating.rating > 0) {
                            this.userRatings[rating.chapterId] = {
                                rating: rating.rating,
                                timestamp: rating.timestamp || rating.CREATEDTIME
                            };
                        }
                    });
                }
                // If backend returns object with chapterId keys
                else if (typeof data.ratings === 'object' && data.ratings !== null) {
                    Object.keys(data.ratings).forEach(chapterId => {
                        const rating = data.ratings[chapterId];
                        if (rating && rating.rating > 0) {
                            this.userRatings[chapterId] = {
                                rating: rating.rating,
                                timestamp: rating.timestamp
                            };
                        }
                    });
                }
                
                console.log('User ratings loaded:', this.userRatings);
                console.log('Total rated chapters:', Object.keys(this.userRatings).length);
            } else {
                console.log('Could not load user ratings:', data.message);
                this.userRatings = {};
            }
        } catch (error) {
            console.error('Failed to load user ratings:', error);
            this.userRatings = {};
        }
    }

    // FIXED: More reliable rating check
    isChapterRated(chapterId) {
        const rated = this.userRatings.hasOwnProperty(chapterId) && 
                     this.userRatings[chapterId] && 
                     this.userRatings[chapterId].rating > 0;
        
        console.log(`Checking if chapter ${chapterId} is rated:`, rated, this.userRatings[chapterId]);
        return rated;
    }

    getUserRating(chapterId) {
        if (this.isChapterRated(chapterId)) {
            return this.userRatings[chapterId].rating;
        }
        return null;
    }

    markChapterAsRated(chapterId, rating) {
        this.userRatings[chapterId] = { 
            rating, 
            timestamp: new Date().toISOString() 
        };
        console.log(`Marked chapter ${chapterId} as rated with ${rating} stars`);
    }

    isLoggedIn() {
        return this.isAuthenticated;
    }

    // --- UI and helper methods retained from original file (kept compatible) ---

    showLoginModal() {
        const existingModal = document.getElementById('authModal');
        if (existingModal) {
            existingModal.style.display = 'flex';
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'authModal';
        modal.className = isMobileDevice() ? 'mobile-auth-modal' : 'auth-modal';
        modal.innerHTML = `
            <div class="${isMobileDevice() ? 'mobile-auth-content' : 'auth-modal-content'}">
                <div class="auth-header">
                    <div class="auth-icon">🔐</div>
                    <h2>Welcome Text</h2>
                    <p>Please sign in or create an account to continue</p>
                </div>
                <div class="auth-body">
                    <button class="zoho-login-btn" id="zohoLoginBtn">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                        </svg>
                        Sign In
                    </button>
                    <button class="zoho-signup-btn" id="zohoSignupBtn">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                        </svg>
                        Sign Up
                    </button>
                    <p class="auth-note">You'll be redirected to a secure authentication page</p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('zohoLoginBtn').addEventListener('click', () => {
            window.location.href = window.APP_CONFIG.AUTH_LOGIN_URL;
        });

        document.getElementById('zohoSignupBtn').addEventListener('click', () => {
            window.location.href = window.APP_CONFIG.AUTH_SIGNUP_URL;
        });

        this.addModalStyles();
    }

    async logout() {
    try {
        if (!confirm('Are you sure you want to logout?')) {
            return;
        }
        
        console.log('🚪 Starting logout process...');
        
        // Clear local auth state and storage
        this.clearAuth();
        localStorage.clear();
        
        // Use Catalyst Client SDK for proper logout
        if (typeof catalyst !== 'undefined' && catalyst.auth) {
            console.log('Using Catalyst SDK for logout');
            const redirectURL = window.APP_CONFIG.AUTH_LOGIN_URL;
            const auth = catalyst.auth;
            auth.signOut(redirectURL);
        } else {
            console.warn('Catalyst SDK not available, using fallback redirect');
            window.location.replace(window.APP_CONFIG.AUTH_LOGIN_URL);
        }
        
    } catch (error) {
        console.error('Logout error:', error);
        // Fallback: still clear and redirect
        this.clearAuth();
        localStorage.clear();
        window.location.replace(window.APP_CONFIG.AUTH_LOGIN_URL);
    }
}

    clearAuth() {
        this.user = null;
        this.isAuthenticated = false;
        this.userRatings = {};
        localStorage.removeItem(WELCOME_SHOWN_KEY);
        localStorage.clear();
    }

    showUserInfo() {
        if (isMobileDevice()) {
            this.showUserInfoMobile();
        } else {
            this.showUserInfoDesktop();
        }
    }

    showUserInfoMobile() {
        const sidebar = document.querySelector('.sidebar-content');
        if (!sidebar || !this.user) return;

        const existingUserInfo = sidebar.querySelector('.user-info-mobile');
        if (existingUserInfo) existingUserInfo.remove();

        const userInfoHTML = `
            <div class="user-info-mobile">
                <div class="user-avatar-mobile">${this.getUserInitials()}</div>
                <div class="user-details-mobile">
                    <div class="user-name-mobile">${this.user.name || this.user.email}</div>
                    <div class="user-email-mobile">${this.user.email}</div>
                </div>
                <button class="logout-btn-mobile" id="logoutBtn">Logout</button>
            </div>
        `;

        sidebar.insertAdjacentHTML('afterbegin', userInfoHTML);
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
    }

    showUserInfoDesktop() {
        const sidebarHeader = document.querySelector('.sidebar-header');
        if (!sidebarHeader || !this.user) return;

        const userInfoHTML = `
            <div class="user-info">
                <div class="user-avatar">${this.getUserInitials()}</div>
                <div class="user-details">
                    <div class="user-name">${this.user.name || this.user.email}</div>
                    <div class="user-email">${this.user.email}</div>
                </div>
                <button class="logout-btn" id="logoutBtn" title="Logout">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="currentColor" d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                    </svg>
                </button>
            </div>
        `;

        const existingUserInfo = sidebarHeader.querySelector('.user-info');
        if (existingUserInfo) existingUserInfo.remove();

        sidebarHeader.insertAdjacentHTML('afterend', userInfoHTML);
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
    }

    getUserInitials() {
        if (!this.user) return '?';
        const name = this.user.name || this.user.email;
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    addModalStyles() {
        if (document.getElementById('auth-modal-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'auth-modal-styles';
        styles.textContent = `
            .auth-modal, .mobile-auth-modal {
                display: flex !important;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                z-index: 10000;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            }
            .auth-modal-content, .mobile-auth-content {
                background: white;
                border-radius: 16px;
                padding: 40px 30px;
                max-width: 450px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            .auth-header { text-align: center; margin-bottom: 30px; }
            .auth-icon { font-size: 60px; margin-bottom: 20px; }
            .auth-header h2 { font-size: 24px; color: #0086fa; margin-bottom: 10px; }
            .auth-header p { color: #666; font-size: 15px; }
            .auth-body { display: flex; flex-direction: column; gap: 12px; }
            .zoho-login-btn, .zoho-signup-btn {
                width: 100%;
                padding: 15px 30px;
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                transition: all 0.3s ease;
            }
            .zoho-login-btn { background: #0086fa; }
            .zoho-signup-btn { background: #28a745; }
            .zoho-login-btn:hover { background: #0066cc; }
            .zoho-signup-btn:hover { background: #218838; }
            .auth-note { font-size: 12px; color: #999; text-align: center; margin-top: 8px; }
        `;
        document.head.appendChild(styles);
    }
}

const authManager = new AuthManager();
const ratingSubmissions = new Set();

// ============================================
// DISCUSSION MANAGER
// ============================================
class DiscussionManager {
    constructor() {
        this.currentChapterId = null;
        this.currentChapterTitle = '';
        this.responses = [];
        this.isPanelOpen = false;
    }

    init() {
        console.log('Initializing Discussion Manager...');
        
        // Set up discussion button and panel
        this.setupDiscussionButton();
        this.setupResponseForm();
        
        // Load responses for first chapter
        if (window.bookContent && window.bookContent.chapters.length > 0) {
            const firstChapter = window.bookContent.chapters[0];
            this.loadResponsesForChapter(firstChapter.chapterId, firstChapter.title);
        }
        
        console.log('Discussion Manager initialized');
    }

    setupDiscussionButton() {
        const btn = document.getElementById('floatingDiscussionBtn');
        const panel = document.getElementById('discussionPanel');
        const closeBtn = document.getElementById('discussionClose');

        if (!btn || !panel || !closeBtn) {
            console.warn('Discussion elements not found');
            return;
        }

        // Open panel
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openPanel();
        });

        // Close panel
        closeBtn.addEventListener('click', () => {
            this.closePanel();
        });

        // Close on outside click
        panel.addEventListener('click', (e) => {
            if (e.target === panel) {
                this.closePanel();
            }
        });

        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isPanelOpen) {
                this.closePanel();
            }
        });
    }

    openPanel() {
        const panel = document.getElementById('discussionPanel');
        if (panel) {
            panel.classList.add('show');
            this.isPanelOpen = true;
            document.body.style.overflow = 'hidden';
            console.log('Discussion panel opened');
        }
    }

    closePanel() {
        const panel = document.getElementById('discussionPanel');
        if (panel) {
            panel.classList.remove('show');
            this.isPanelOpen = false;
            document.body.style.overflow = '';
            console.log('Discussion panel closed');
        }
    }

    setupResponseForm() {
        const textarea = document.getElementById('responseTextarea');
        const charCount = document.getElementById('responseCharCount');
        const submitBtn = document.getElementById('btnPostResponse');

        if (!textarea || !charCount || !submitBtn) {
            console.warn('Response form elements not found');
            return;
        }

        textarea.addEventListener('input', () => {
            const length = textarea.value.length;
            charCount.textContent = `${length} / 1000`;
            
            charCount.classList.remove('warning', 'error');
            if (length > 900) charCount.classList.add('warning');
            if (length >= 1000) charCount.classList.add('error');
            
            submitBtn.disabled = length === 0 || length > 1000;
        });

        submitBtn.addEventListener('click', () => this.submitResponse());
        
        textarea.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                if (!submitBtn.disabled) {
                    this.submitResponse();
                }
            }
        });
        
        console.log('Response form setup complete');
    }

    async loadResponsesForChapter(chapterId, chapterTitle) {
        this.currentChapterId = chapterId;
        this.currentChapterTitle = chapterTitle;
        
        console.log('Loading responses for chapter:', chapterId, chapterTitle);
        
        // Update UI
        const titleElement = document.getElementById('discussionTitle');
        const chapterNameElement = document.getElementById('chapterName');
        
        if (titleElement) {
            titleElement.textContent = chapterTitle;
        }
        
        if (chapterNameElement) {
            chapterNameElement.textContent = chapterTitle;
        }
        
        // Update user avatar in form
        if (authManager.user) {
            const avatar = document.getElementById('responseAvatar');
            const userName = document.getElementById('responseUserName');
            
            if (avatar) {
                avatar.textContent = authManager.getUserInitials();
            }
            
            if (userName) {
                userName.textContent = authManager.user.name || authManager.user.email;
            }
        }
        
        this.showLoadingState();
        
        try {
            const response = await fetch(
                `${BACKEND_URL}/getComments?chapterId=${encodeURIComponent(chapterId)}`,
                {
                    method: 'GET',
                    credentials: 'include'
                }
            );
            
            const data = await response.json();
            
            if (data.success) {
                this.responses = data.comments || [];
                console.log('Loaded', this.responses.length, 'responses');
                this.renderResponses();
                this.updateBadge(this.responses.length);
                this.updateResponsesCount(this.responses.length);
            } else {
                console.error('Failed to load responses:', data.message);
                this.showEmptyState();
            }
            
        } catch (error) {
            console.error('Error loading responses:', error);
            this.showEmptyState();
        }
    }

    updateBadge(count) {
        const badge = document.getElementById('discussionBadge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'block' : 'none';
        }
    }

    updateResponsesCount(count) {
        const countElement = document.getElementById('responsesCountDisplay');
        const discussionCount = document.getElementById('discussionCount');
        
        if (countElement) {
            countElement.textContent = count;
        }
        
        if (discussionCount) {
            discussionCount.textContent = `${count} ${count === 1 ? 'response' : 'responses'}`;
        }
    }

    showLoadingState() {
        const responsesList = document.getElementById('responsesList');
        if (!responsesList) return;
        
        responsesList.innerHTML = `
            <div class="comments-loading">
                <div class="spinner"></div>
                <div class="comments-loading-text">Loading responses...</div>
            </div>
        `;
    }

    showEmptyState() {
        const responsesList = document.getElementById('responsesList');
        if (!responsesList) return;
        
        responsesList.innerHTML = `
            <div class="responses-empty">
                <div class="responses-empty-icon">💭</div>
                <div class="responses-empty-text">No responses yet</div>
                <div class="responses-empty-subtext">Be the first to share your thoughts!</div>
            </div>
        `;
        
        this.updateResponsesCount(0);
        this.updateBadge(0);
    }

    renderResponses() {
        const responsesList = document.getElementById('responsesList');
        if (!responsesList) return;
        
        if (this.responses.length === 0) {
            this.showEmptyState();
            return;
        }
        
        const currentUserId = authManager.user ? String(authManager.user.id) : null;
        
        const responsesHTML = this.responses.map(response => {
            const isOwnResponse = currentUserId === String(response.userId);
            const initials = this.getInitials(response.userName);
            const timeAgo = this.getTimeAgo(response.timestamp);
            
            return `
                <div class="response-card" data-response-id="${response.id}">
                    <div class="response-header">
                        <div class="response-author">
                            <div class="response-avatar">${initials}</div>
                            <div class="response-author-info">
                                <h4>${this.escapeHtml(response.userName)}</h4>
                                <div class="response-timestamp">${timeAgo}</div>
                            </div>
                        </div>
                        ${isOwnResponse ? `
                            <div class="response-actions">
                                <button class="btn-delete-response" onclick="discussionManager.deleteResponse('${response.id}')">
                                    Delete
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="response-text">${this.escapeHtml(response.comment)}</div>
                </div>
            `;
        }).join('');
        
        responsesList.innerHTML = responsesHTML;
        this.updateResponsesCount(this.responses.length);
    }

    async submitResponse() {
        if (!authManager.isLoggedIn()) {
            showMessage('Please login to post responses', 'error');
            return;
        }
        
        if (!this.currentChapterId) {
            showMessage('Please select a chapter first', 'error');
            return;
        }
        
        const textarea = document.getElementById('responseTextarea');
        const submitBtn = document.getElementById('btnPostResponse');
        
        if (!textarea || !submitBtn) return;
        
        const response = textarea.value.trim();
        
        if (!response) {
            showMessage('Please enter a response', 'error');
            return;
        }
        
        if (response.length > 1000) {
            showMessage('Response is too long (max 1000 characters)', 'error');
            return;
        }
        
        textarea.disabled = true;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';
        
        try {
            const result = await fetch(BACKEND_URL + '/addComment', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chapterId: this.currentChapterId,
                    comment: response
                })
            });
            
            const data = await result.json();
            
            if (data.success) {
                console.log('Response posted successfully');
                showMessage('Response posted successfully!', 'success');
                
                textarea.value = '';
                document.getElementById('responseCharCount').textContent = '0 / 1000';
                
                await this.loadResponsesForChapter(this.currentChapterId, this.currentChapterTitle);
            } else {
                throw new Error(data.message || 'Failed to post response');
            }
            
        } catch (error) {
            console.error('Error posting response:', error);
            showMessage('Failed to post response. Please try again.', 'error');
        } finally {
            textarea.disabled = false;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post Response';
        }
    }

    async deleteResponse(responseId) {
        if (!confirm('Are you sure you want to delete this response?')) {
            return;
        }
        
        try {
            const response = await fetch(BACKEND_URL + '/deleteComment', {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commentId: responseId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log('Response deleted successfully');
                showMessage('Response deleted successfully', 'success');
                
                await this.loadResponsesForChapter(this.currentChapterId, this.currentChapterTitle);
            } else {
                throw new Error(data.message || 'Failed to delete response');
            }
            
        } catch (error) {
            console.error('Error deleting response:', error);
            showMessage('Failed to delete response. Please try again.', 'error');
        }
    }

    getInitials(name) {
        if (!name) return '?';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    getTimeAgo(timestamp) {
        if (!timestamp) return 'Just now';
        
        const now = new Date();
        const then = new Date(timestamp);
        const seconds = Math.floor((now - then) / 1000);
        
        if (seconds < 60) return 'Just now';
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        
        const weeks = Math.floor(days / 7);
        if (weeks < 4) return `${weeks}w ago`;
        
        const months = Math.floor(days / 30);
        if (months < 12) return `${months}mo ago`;
        
        const years = Math.floor(days / 365);
        return `${years}y ago`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize discussion manager globally
const discussionManager = new DiscussionManager();
window.discussionManager = discussionManager;

// ============================================
// RATING SYSTEM - FIXED
// ============================================
function createRatingHTML(chapterId) {
    const isRated = authManager.isChapterRated(chapterId);
    const userRating = authManager.getUserRating(chapterId);
    
    console.log(`Creating rating widget for chapter ${chapterId}, rated: ${isRated}, rating: ${userRating}`);
    
    const stars = [1, 2, 3, 4, 5].map(i => {
        const filled = isRated && userRating >= i ? 'filled' : '';
        const disabled = isRated ? 'disabled' : '';
        return `<span class="star ${filled} ${disabled}" data-value="${i}" onclick="window.rateChapter('${chapterId}', ${i})">★</span>`;
    }).join('');
    
    const ratedClass = isRated ? 'rated' : '';
    const label = isRated ? `✓ You rated ${userRating} stars` : 'Rate this chapter';
    
    return `
        <div class="rating-container ${ratedClass}" data-chapter="${chapterId}" id="rating-${chapterId}">
            <div class="rating-top">
                <div class="rating-label">${label}</div>
                <div class="star-rating">${stars}</div>
            </div>
            <div class="rating-bottom">
                <div class="rating-info">Avg: <span class="avg-rating" id="avg-${chapterId}">0.0</span> ⭐ (<span id="total-${chapterId}">0</span> ratings)</div>
            </div>
        </div>
    `;
}

window.rateChapter = function(chapterId, rating) {
    console.log(`Rating chapter ${chapterId} with ${rating} stars`);
    
    if (!authManager.isLoggedIn()) {
        showMessage('Please login to rate chapters', 'error');
        return;
    }
    
    // CHECK 1: Is chapter already rated?
    if (authManager.isChapterRated(chapterId)) {
        const existingRating = authManager.getUserRating(chapterId);
        showMessage(`You already rated this chapter ${existingRating} stars!`, 'error');
        console.log(`🚫 Blocking duplicate rating for chapter ${chapterId}`);
        return;
    }
    
    //  CHECK 2: Is a submission already in progress for this chapter?
    if (ratingSubmissions.has(chapterId)) {
        console.log(`🚫 Rating submission already in progress for chapter ${chapterId}`);
        showMessage('Please wait, submitting rating...', 'error');
        return;
    }
    
    const container = document.getElementById(`rating-${chapterId}`);
    if (!container) return;
    
    // Mark this chapter as being submitted
    ratingSubmissions.add(chapterId);
    
    // Visual feedback
    const stars = container.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('filled');
        }
        star.style.pointerEvents = 'none';
        star.classList.add('disabled');
    });
    
    container.classList.add('submitting');
    
    fetch(BACKEND_URL + '/addRating', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            chapterId: chapterId.toString(), 
            rating: rating 
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Rating response:', data);
        
        if (data.success) {
            // CRITICAL: Mark as rated immediately in local state
            authManager.markChapterAsRated(chapterId, rating);
            
            // Update UI
            const avgElement = document.getElementById(`avg-${chapterId}`);
            const totalElement = document.getElementById(`total-${chapterId}`);
            
            if (avgElement && data.averageRating != null) {
                avgElement.textContent = parseFloat(data.averageRating).toFixed(1);
            }
            
            if (totalElement && data.totalRatings != null) {
                totalElement.textContent = data.totalRatings;
            }
            
            container.classList.remove('submitting');
            container.classList.add('rated');
            
            const label = container.querySelector('.rating-label');
            if (label) label.textContent = `✓ You rated ${rating} stars`;
            
            showMessage(`Thank you! Your ${rating}-star rating has been saved!`, 'success');
        } else if (data.alreadyRated) {
            console.log('Backend says already rated');
            
            // Use the rating from backend response
            const existingRating = data.existingRating || rating;
            authManager.markChapterAsRated(chapterId, existingRating);
            
            // Update stars to match existing rating
            stars.forEach((star, index) => {
                star.classList.remove('filled');
                if (index < existingRating) {
                    star.classList.add('filled');
                }
            });
            
            container.classList.remove('submitting');
            container.classList.add('rated');
            
            // Update stats
            if (data.averageRating != null) {
                const avgElement = document.getElementById(`avg-${chapterId}`);
                if (avgElement) avgElement.textContent = parseFloat(data.averageRating).toFixed(1);
            }
            if (data.totalRatings != null) {
                const totalElement = document.getElementById(`total-${chapterId}`);
                if (totalElement) totalElement.textContent = data.totalRatings;
            }
            
            const label = container.querySelector('.rating-label');
            if (label) label.textContent = `✓ You rated ${existingRating} stars`;
            
            showMessage(`You already rated this chapter ${existingRating} stars!`, 'error');
        } else {
            throw new Error(data.message || 'Failed to submit rating');
        }
    })
    .catch(error => {
        console.error('Rating submission failed:', error);
        container.classList.remove('submitting');
        
        // Re-enable stars on error
        stars.forEach(star => {
            star.style.pointerEvents = '';
            star.classList.remove('disabled');
            star.classList.remove('filled');
        });
        
        showMessage('Failed to submit rating. Please try again.', 'error');
    })
    .finally(() => {
        // CRITICAL: Remove the chapter from submission tracking
        ratingSubmissions.delete(chapterId);
        console.log(`🔓 Released rating lock for chapter ${chapterId}`);
    });
};

// ============================================
// Helpers: loadAverageRating, initializeAllRatings, showMessage
// (from original file, unchanged except references kept consistent)
// ============================================
function loadAverageRating(chapterId) {
    fetch(BACKEND_URL + '/getRatings?chapterId=' + chapterId, {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        console.log(`📊 Loaded rating data for ${chapterId}:`, data);
        
        if (data.success) {
            const avgElement = document.getElementById(`avg-${chapterId}`);
            const totalElement = document.getElementById(`total-${chapterId}`);
            
            if (avgElement && data.avgRating != null) {
                avgElement.textContent = parseFloat(data.avgRating).toFixed(1);
            }
            
            if (totalElement && data.totalRatings != null) {
                totalElement.textContent = data.totalRatings;
            }
            
            const container = document.getElementById(`rating-${chapterId}`);
            if (container && authManager.isChapterRated(chapterId)) {
                const userRating = authManager.getUserRating(chapterId);
                const stars = container.querySelectorAll('.star');
                
                stars.forEach((star, index) => {
                    if (index < userRating) {
                        star.classList.add('filled');
                    }
                    star.classList.add('disabled');
                });
                
                const label = container.querySelector('.rating-label');
                if (label) {
                    label.textContent = `✓ You rated ${userRating} stars`;
                }
                
                container.classList.add('rated');
            }
        }
    })
    .catch(error => {
        console.log(`Could not load rating for ${chapterId}:`, error);
    });
}

function initializeAllRatings() {
    console.log('🎯 Initializing all rating widgets...');
    
    const ratingContainers = document.querySelectorAll('.rating-container[data-chapter]');
    console.log(`Found ${ratingContainers.length} rating containers`);
    
    ratingContainers.forEach(container => {
        const chapterId = container.getAttribute('data-chapter');
        if (chapterId) {
            loadAverageRating(chapterId);
            console.log(`Loading rating data for chapter ${chapterId}`);
        }
    });
}

function showMessage(text, type) {
    const existingMessages = document.querySelectorAll('.rating-message');
    existingMessages.forEach(msg => msg.remove());
    
    const message = document.createElement('div');
    message.className = `rating-message ${type}`;
    message.textContent = text;
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.style.opacity = '0';
        setTimeout(() => message.remove(), 300);
    }, 3000);
}

// ============================================
// REPLACE PLACEHOLDERS WITH RATING WIDGETS
// ============================================
function replacePlaceholdersWithRatings() {
    console.log('Replacing rating placeholders with actual widgets...');
    
    const placeholders = document.querySelectorAll('.rating-placeholder[data-chapter]');
    console.log(`Found ${placeholders.length} placeholders to replace`);
    
    placeholders.forEach(placeholder => {
        const chapterId = placeholder.getAttribute('data-chapter');
        console.log(`Replacing placeholder for chapter ${chapterId}`);
        
        const ratingHTML = createRatingHTML(chapterId);
        placeholder.outerHTML = ratingHTML;
    });
    
    console.log('All placeholders replaced with rating widgets');
}

// ============================================
// MOBILE FUNCTIONS - FIXED SIDEBAR
// ============================================
function initMobileFunctions() {
    console.log('Initializing mobile functions...');
    
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');

    if (hamburger && sidebar) {
        const newHamburger = hamburger.cloneNode(true);
        hamburger.parentNode.replaceChild(newHamburger, hamburger);
        
        newHamburger.addEventListener('click', function(e) {
            e.stopPropagation();
            sidebar.classList.toggle('active');
            newHamburger.classList.toggle('open');
            console.log('sidebar active:', sidebar.classList.contains('active'));
        });

        document.addEventListener('click', function(e) {
            const clickedInsideSidebar = sidebar.contains(e.target);
            const clickedHamburger = newHamburger.contains(e.target);
            const clickedWelcome = e.target.closest('.mobile-welcome-overlay');
            const clickedAuth = e.target.closest('.mobile-auth-modal');
            
            if (!clickedInsideSidebar && !clickedHamburger && !clickedWelcome && !clickedAuth) {
                if (sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                    newHamburger.classList.remove('open');
                    console.log('👆 Clicked outside, closing sidebar');
                }
            }
        });

        const navLinks = sidebar.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                sidebar.classList.remove('active');
                newHamburger.classList.remove('open');
                console.log('🔗 Nav link clicked, closing sidebar');
            });
        });
    }

    replacePlaceholdersWithRatings();
    
    setTimeout(() => {
        initializeAllRatings();
    }, 300);

    setTimeout(() => {
        checkAndShowWelcome();
    }, 500);
    
    initScrollToBottom();
    
    console.log('Mobile functions initialized');
    // Initialize comments manager
    discussionManager.init();

    console.log('Mobile functions initialized');
}

function checkAndShowWelcome() {
    if (!isMobileDevice()) return;
    
    const welcomeShown = localStorage.getItem(WELCOME_SHOWN_KEY);
    
    if (!welcomeShown) {
        const overlay = document.getElementById('mobileWelcome');
        if (overlay) {
            overlay.style.display = 'flex';
            
            const gotItBtn = document.getElementById('gotItBtn');
            if (gotItBtn) {
                gotItBtn.addEventListener('click', function() {
                    overlay.style.display = 'none';
                    localStorage.setItem(WELCOME_SHOWN_KEY, 'true');
                    console.log('Welcome message dismissed');
                });
            }
        }
    }
}

function initScrollToBottom() {
    const scrollBtn = document.getElementById('scrollToBottomBtn');
    if (!scrollBtn) return;
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollBtn.classList.add('show');
        } else {
            scrollBtn.classList.remove('show');
        }
    });
    
    scrollBtn.addEventListener('click', () => {
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
    });
}

// ============================================
// DESKTOP FLIPBOOK FUNCTIONS
// ============================================
let generatedPages = [];
let chapterStartPages = {};

function createEmptyPage() {
    return {
        elements: [],
        height: 0,
        maxHeight: 0,
        chapterId: null
    };
}

function measureElement(element) {
    const $magazine = $('#magazine');
    const magazineWidth = $magazine.width() || 1190;
    const pageWidth = magazineWidth / 2;
    
    const tempDiv = $('<div class="page-content"></div>');
    tempDiv.css({
        'position': 'absolute',
        'visibility': 'hidden',
        'width': pageWidth + 'px',
        'height': 'auto',
        'max-height': 'none',
        'padding': '40px 45px 30px 45px',
        'left': '-9999px',
        'overflow': 'visible'
    });
    
    $('body').append(tempDiv);
    tempDiv.append(element);
    
    const height = $(element).outerHeight(true);
    tempDiv.remove();
    return height;
}

function getPageMaxHeight() {
    const magazine = $('#magazine');
    const magazineHeight = magazine.height() || 600;
    // Assuming 90px is the total vertical padding/margin needed for the page
    return magazineHeight - 90; 
}

/**
 * Generates the HTML string for a single content item.
 * This is the modified function to handle inline styles for images.
 */
function createElementHTML(contentItem) {
    switch (contentItem.type) {
        case 'paragraph':
            return `<p>${contentItem.text}</p>`;

        case 'image':
            // Determine if this is a landscape/wide image that needs special handling
            const isLandscape = contentItem.className === 'landscape-image' || 
                          contentItem.style?.includes('aspect-ratio');
    
            const styleAttr = isLandscape 
                ? 'style="width: 100%; height: auto; max-height: none; object-fit: contain;"'
                : contentItem.style ? `style="${contentItem.style}"` : '';
    
            return `<img src="${contentItem.src}" alt="Chapter illustration" ${styleAttr}>`;

        case 'lyrics':
            return `<div class="song-lyrics"><center><i><pre>${contentItem.text}</pre></i></center></div>`;
        case 'metadata':
            return `<div class="post-date"><span class="date">${contentItem.date}</span><span class="author">${contentItem.author}</span></div>`;
        case 'rating':
            // Assuming createRatingHTML is defined elsewhere, likely in main.js
            return createRatingHTML(contentItem.chapterId); 
        default:
            return '';
    }
}

function paginateContent() {
    if (!window.bookContent) {
        console.error('bookContent not loaded');
        return;
    }
    
    console.log('📖 Starting content pagination...');
    
    generatedPages = [];
    chapterStartPages = {};
    
    const maxHeight = getPageMaxHeight();
    
    // Add blank first page to ensure book starts on left side
    generatedPages.push({
        type: 'blank',
        html: `<div class="hard"><div class="cover-content"></div></div>`
    });
    
    // Front cover (will now appear on the left side)
    generatedPages.push({
        type: 'cover',
        html: `<div class="hard"><div class="cover-content"><img src="https://imgs-development.zohostratus.in/Screenshot%202025-10-31%20at%202.34.52%E2%80%AFPM.png"></div></div>`
    });
    
    // Inner cover page
    generatedPages.push({
        type: 'cover-back',
        html: `<div class="hard"><div class="cover-content"><img src="https://imgs-development.zohostratus.in/bk2.jpg"></div></div>`
    });
    
    bookContent.chapters.forEach((chapter) => {
        console.log(`\n📚 Processing ${chapter.title}...`);
        
        chapterStartPages[chapter.id] = generatedPages.length;
        
        let currentPage = createEmptyPage();
        currentPage.maxHeight = maxHeight;
        currentPage.chapterId = chapter.chapterId;
        
        const titleHTML = `<h2>${chapter.title}</h2>`;
        const titleHeight = measureElement($(titleHTML).clone());
        
        currentPage.elements.push(titleHTML);
        currentPage.height += titleHeight;
        
        chapter.content.forEach((contentItem) => {
            const elementHTML = createElementHTML(contentItem);
            if (!elementHTML) return;
            
            const element = $(elementHTML);
            const elementHeight = measureElement(element.clone());
            
            if (currentPage.height + elementHeight > maxHeight - 10) {
                generatedPages.push({
                    type: 'content',
                    html: currentPage.elements.join(''),
                    chapterId: chapter.chapterId
                });
                
                currentPage = createEmptyPage();
                currentPage.maxHeight = maxHeight;
                currentPage.chapterId = chapter.chapterId;
            }
            
            currentPage.elements.push(elementHTML);
            currentPage.height += elementHeight;
        });
        
        if (currentPage.elements.length > 0) {
            generatedPages.push({
                type: 'content',
                html: currentPage.elements.join(''),
                chapterId: chapter.chapterId
            });
        }
    });
    
    // Back cover
    generatedPages.push({
        type: 'back-cover',
        html: `<div class="hard"><div class="cover-content back-cover"><h2>Be sure to leave ratings!!</h2></div></div>`
    });
    
    console.log(`Pagination complete! Generated ${generatedPages.length} pages`);

    // ADD THIS DEBUG LOG
    console.log('Chapter Start Pages Mapping:', chapterStartPages);
    console.log('Chapters Array:', bookContent.chapters.map(ch => ({
    id: ch.id,
    chapterId: ch.chapterId,
    title: ch.title
    })));
}

function buildFlipbook() {
    console.log('Building flipbook...');
    
    const $magazine = $('#magazine');
    
    if ($magazine.data('turned')) {
        $magazine.turn('destroy');
    }
    
    $magazine.empty();
    
    generatedPages.forEach((page) => {
        if (page.type === 'cover' || page.type === 'cover-back' || page.type === 'back-cover' || page.type === 'blank') {
            $magazine.append(page.html);
        } else {
            $magazine.append(`<div><div class="page-content">${page.html}</div></div>`);
        }
    });
    
    const isMobile = $(window).width() <= 768;
    
    $magazine.turn({
        display: isMobile ? 'single' : 'double',
        acceleration: true,
        gradients: true,
        autoCenter: true,
        elevation: 50,
        page: 2, // Start at page 2 (the front cover, left side)
        when: {
            turning: function(e, page) {
                $('#prevBtn').prop('disabled', page <= 2); // Disable prev on cover
                $('#nextBtn').prop('disabled', page === $(this).turn('pages'));
            },
            turned: function(e, page) {
                $('#page-number').html('Page ' + (page - 1) + ' of ' + ($(this).turn('pages') - 1));
                updateActiveChapter(page);
    
                // AUTO-UPDATE COMMENTS WHEN PAGE TURNS
                updateCommentsForCurrentPage(page);
    
                setTimeout(() => {
                initializeAllRatings();
                }, 500);
            }
        }
    });
    
    $('#page-number').html('Page 1 of ' + ($magazine.turn('pages') - 1));
    $('#prevBtn').prop('disabled', true);
    
    console.log('Flipbook built successfully - starting from left side');
    
    setTimeout(() => {
        initializeAllRatings();
    }, 1000);
    
    buildChapterNavigation();
}

function updateActiveChapter(currentPage) {
    $('.nav-link').removeClass('active');
    
    for (let chapterId in chapterStartPages) {
        const startPage = chapterStartPages[chapterId];
        const nextChapterPage = Object.values(chapterStartPages).find(p => p > startPage) || 99999;
        
        if (currentPage >= startPage && currentPage < nextChapterPage) {
            $(`.nav-link[data-chapter="${chapterId}"]`).addClass('active');
            break;
        }
    }
}

function updateCommentsForCurrentPage(currentPage) {
    console.log('🔍 Checking comments for page:', currentPage);
    
    // Find which chapter this page belongs to
    let currentChapter = null;
    
    // Check both the current page AND the next page (for double-page spreads)
    const pagesToCheck = [currentPage, currentPage + 1];
    
    for (let pageToCheck of pagesToCheck) {
        // Loop through all chapters in bookContent
        for (let i = 0; i < bookContent.chapters.length; i++) {
            const chapter = bookContent.chapters[i];
            const startPage = chapterStartPages[chapter.id];
            
            // Find the next chapter's start page (or use a large number if this is the last chapter)
            const nextStartPage = i + 1 < bookContent.chapters.length 
                ? chapterStartPages[bookContent.chapters[i + 1].id] 
                : 99999;
            
            // Check if current page falls within this chapter's range
            if (pageToCheck >= startPage && pageToCheck < nextStartPage) {
                console.log(`📖 Page ${pageToCheck} belongs to: ${chapter.title} (pages ${startPage}-${nextStartPage})`);
                
                // Keep the chapter with the highest start page (most relevant)
                if (!currentChapter || startPage > chapterStartPages[currentChapter.id]) {
                    currentChapter = chapter;
                }
            }
        }
    }
    
    // Update discussion if we found a chapter
    if (currentChapter) {
        console.log('Current chapter:', currentChapter.title, '| ID:', currentChapter.chapterId);
        console.log('Discussion Manager current:', discussionManager.currentChapterId);
        
        // Update discussion if different OR if it's null/undefined
        if (!discussionManager.currentChapterId || currentChapter.chapterId !== discussionManager.currentChapterId) {
            console.log('Updating discussion to:', currentChapter.title);
            discussionManager.loadResponsesForChapter(currentChapter.chapterId, currentChapter.title);
        } else {
            console.log('Already showing correct chapter discussion');
        }
    } else {
        console.warn('No chapter found for page:', currentPage);
        console.warn('Available chapter start pages:', chapterStartPages);
    }
}

function buildChapterNavigation() {
    if (!window.bookContent) return;
    
    const $nav = $('#chapterNav');
    $nav.empty();
    
    bookContent.chapters.forEach((chapter) => {
        const startPage = chapterStartPages[chapter.id];
        const $link = $(`<a href="#" class="nav-link" data-chapter="${chapter.id}" data-page="${startPage}">${chapter.title}</a>`);
        
        $link.click(function(e) {
            e.preventDefault();
            
            // Navigate flipbook
            $('#magazine').turn('page', parseInt($(this).attr('data-page')) + 1);
            
            // Load discussion for this chapter
            discussionManager.loadResponsesForChapter(chapter.chapterId, chapter.title);
            
            // Close sidebar on mobile
            if (window.innerWidth <= 992) {
                $('#sidebar').removeClass('active');
                $('#hamburger').removeClass('open');
            }
        });
        
        $nav.append($link);
    });
    
    $('.nav-link').first().addClass('active');
}

function setupTouchNavigation() {
    const touchZoneLeft = document.getElementById('touchZoneLeft');
    const touchZoneRight = document.getElementById('touchZoneRight');
    
    if (touchZoneLeft) {
        touchZoneLeft.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            $('#magazine').turn('previous');
        });
    }
    
    if (touchZoneRight) {
        touchZoneRight.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            $('#magazine').turn('next');
        });
    }
}

function toggleFullscreen() {
    const elem = document.documentElement;
    
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        }
        document.body.classList.add('fullscreen-mode');
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
        document.body.classList.remove('fullscreen-mode');
    }
}

document.addEventListener('fullscreenchange', () => {
    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
    document.body.classList.toggle('fullscreen-mode', isFullscreen);
});

function initDesktopFunctions() {
    console.log('Initializing desktop functions...');
    
    if (typeof $ === 'undefined' || typeof $.fn.turn === 'undefined') {
        console.error('jQuery or turn.js not loaded');
        return;
    }
    
    if (!window.bookContent) {
        console.error('bookContent not loaded');
        return;
    }
    
    setTimeout(function() {
        paginateContent();
        buildFlipbook();
        
        // Initialize comments manager
        discussionManager.init();

        $('#prevBtn').click(() => $('#magazine').turn('previous'));
        $('#nextBtn').click(() => $('#magazine').turn('next'));
        
        $(document).keydown(function(e) {
            if ($(e.target).is('input, textarea')) return;
            const currentPage = $('#magazine').turn('page');
            
            // Left arrow key - block if on page 1 or 2
            if (e.keyCode === 37) {
                if (currentPage > 3) {
                    $('#magazine').turn('previous');
                }
            }
            
            // Right arrow key
            if (e.keyCode === 39) {
                $('#magazine').turn('next');
            }
        });
        
        setupTouchNavigation();
        
        let resizeTimer;
        $(window).resize(function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                const currentPage = $('#magazine').turn('page');
                paginateContent();
                buildFlipbook();
                
                if (currentPage > 1) {
                    $('#magazine').turn('page', Math.min(currentPage, $('#magazine').turn('pages')));
                }
                
                const isMobile = $(window).width() <= 768;
                $('#magazine').turn('display', isMobile ? 'single' : 'double');
                
            }, 500);
        });
        
        console.log('Desktop initialization complete!');
    }, 100);
}

function initSidebar() {
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    
    if (hamburger && sidebar) {
        hamburger.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            hamburger.classList.toggle('open');
        });
        
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 992) {
                if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
                    sidebar.classList.remove('active');
                    hamburger.classList.remove('open');
                }
            }
        });
    }
}

function initFullscreenButton() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }
}

// ============================================
// INITIALIZATION - FIXED ORDER
// ============================================
async function initializeApp() {
    console.log('Initializing Novel November...');
    console.log('Using Backend URL:', BACKEND_URL);
    
    if (!window.bookContent) {
        console.error('bookContent not loaded!');
    } else {
        console.log('bookContent loaded with', window.bookContent.chapters?.length, 'chapters');
    }
    
    const isAuthenticated = await authManager.init();
    
    if (!isAuthenticated) {
        console.log('User not authenticated - showing login modal');
        return;
    }
    
    console.log('User authenticated and ratings loaded');
    console.log('Loaded ratings:', authManager.userRatings);
    
    initSidebar();
    initFullscreenButton();
    
    if (isMobileDevice()) {
        initMobileFunctions();
    } else {
        initDesktopFunctions();
    }
    
    console.log('🎉 App initialized!');
    checkAndShowAdminButton();
}

// Start the app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

if (typeof $ !== 'undefined') {
    $(document).ready(function() {
        console.log('jQuery ready');
    });
}

window.authManager = authManager;
window.showMessage = showMessage;

// ============================================
// KONAMI CODE EASTER EGG
// ============================================
(function() {
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;

    // Create the hidden overlay (invisible until triggered)
    const overlay = document.createElement('div');
    overlay.id = 'konamiOverlay';
    overlay.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        z-index: 99999;
        justify-content: center;
        align-items: center;
        animation: konamiFadeIn 0.3s ease;
    `;

    overlay.innerHTML = `
        <div style="position: relative; max-width: 90%; max-height: 90%; text-align: center;">
            <img src="https://imgs-development.zohostratus.in/hide.png" 
                 alt="Easter Egg" 
                 style="max-width: 100%; max-height: 90vh; border-radius: 10px; box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5); animation: konamiZoom 0.5s ease-out;">
            <button id="konamiClose" style="
                position: absolute;
                top: -50px;
                right: 0;
                background: white;
                color: #333;
                border: none;
                width: 45px;
                height: 45px;
                border-radius: 50%;
                font-size: 24px;
                cursor: pointer;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                transition: all 0.3s ease;
            ">✕</button>
        </div>
    `;

    document.body.appendChild(overlay);

    // Add animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes konamiFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes konamiZoom {
            from { transform: scale(0.5); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        #konamiClose:hover {
            background: #f44336 !important;
            color: white !important;
            transform: rotate(90deg);
        }
    `;
    document.head.appendChild(style);

    // Close button handler
    document.getElementById('konamiClose').addEventListener('click', function() {
        overlay.style.display = 'none';
        konamiIndex = 0; // Reset so they can trigger it again
    });

    // Close on overlay click (outside image)
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.style.display = 'none';
            konamiIndex = 0;
        }
    });
    // Close on ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlay.style.display === 'flex') {
            overlay.style.display = 'none';
            konamiIndex = 0;
        }
    });
    // Konami code listener
    document.addEventListener('keydown', function(e) {
        // Ignore if typing in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        const key = e.key.toLowerCase(); 
        if (key === konamiCode[konamiIndex] || e.key === konamiCode[konamiIndex]) {
            konamiIndex++;
            console.log('🎮 Konami progress:', konamiIndex + '/' + konamiCode.length);
            
            if (konamiIndex === konamiCode.length) {
                console.log('KONAMI CODE ACTIVATED!');
                overlay.style.display = 'flex';
                konamiIndex = 0; // Reset for next time
            }
        } else {
            konamiIndex = 0; // Reset if wrong key
        }
    });
    console.log('Konami code listener activated! Try: ↑ ↑ ↓ ↓ ← → ← → B A');
})();
// ===== ADMIN NOTIFICATION SYSTEM =====
// Your admin email
const ADMIN_EMAIL = "aathithyanvl.@gmail.com"; // CHANGE THIS TO YOUR EMAIL
// Check if user is admin - USES EXISTING authManager
async function checkAndShowAdminButton() {
  try {
    console.log('🔐 Checking admin access...');
    
    // Use the authManager that already loaded user data
    if (authManager && authManager.isLoggedIn() && authManager.user) {
      const userEmail = authManager.user.email; // CORRECT: use .email not .email_id
      
      console.log('Current user email:', userEmail);
      console.log('Required admin email:', ADMIN_EMAIL);
      console.log('Emails match:', userEmail === ADMIN_EMAIL);
      
      if (userEmail === ADMIN_EMAIL) {
        const button = document.getElementById("notifyNewChapter");
        if (button) {
          button.style.display = "block";
          console.log("Admin access granted! Button is now visible.");
        } else {
          console.error("Button element 'notifyNewChapter' not found in HTML!");
        }
      } else {
        console.log(" User is not admin (emails don't match)");
      }
    } else {
      console.log(" AuthManager not ready or user not logged in");
    }
  } catch (error) {
    console.error("Error checking admin status:", error);
  }
}
// Send notification to Cliq
async function sendCliqNotification(chapterNumber) {
  try {
    console.log(`Sending notification for Chapter ${chapterNumber}...`);
    // Call YOUR backend endpoint instead of Cliq directly
    const response = await fetch(BACKEND_URL + '/sendCliqNotification', {
      method: "POST",
      credentials: 'include', // Important: include auth cookies
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chapterNumber: chapterNumber
      })
    });
    const data = await response.json();
    if (data.success) {
      console.log("Notification sent successfully!");
      alert(`Chapter ${chapterNumber} notification sent to Cliq!`);
    } else {
      console.error("Failed to send notification:", data.message);
      alert(`Failed: ${data.message}`);
    }
  } catch (error) {
    console.error("Error sending notification:", error);
    alert("Error sending notification: " + error.message);
  }
}
// Button click handler
document.addEventListener('click', function(e) {
  if (e.target && e.target.id === 'notifyNewChapter') {
    const chapterNum = prompt("📚 Enter the chapter number to announce:");
    if (chapterNum) {
      sendCliqNotification(chapterNum);
    }
  }
});
