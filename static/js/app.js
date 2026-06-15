// State management
let allUpdates = [];
let filteredUpdates = [];
let currentTypeFilter = 'all';
let searchQuery = '';
let currentSort = 'newest';
let selectedUpdate = null;

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const typeFilters = document.getElementById('type-filters');
const sortSelect = document.getElementById('sort-select');
const resultsCount = document.getElementById('results-count');
const loadingContainer = document.getElementById('loading-container');
const notesGrid = document.getElementById('notes-grid');
const emptyState = document.getElementById('empty-state');
const cacheTimeSpan = document.getElementById('cache-time');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetTextArea = document.getElementById('tweet-text');
const charCounter = document.getElementById('char-counter');
const refDate = document.getElementById('ref-date');
const refType = document.getElementById('ref-type');
const refContent = document.getElementById('ref-content');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
const submitTweetBtn = document.getElementById('submit-tweet-btn');
const resetTweetBtn = document.getElementById('reset-tweet-btn');

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Refresh button
    refreshBtn.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });

    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        applyFiltersAndSort();
    });

    // Clear search
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        applyFiltersAndSort();
    });

    // Type filter chips
    typeFilters.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;

        // Active state transition
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        currentTypeFilter = chip.dataset.type;
        applyFiltersAndSort();
    });

    // Sort selector
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        applyFiltersAndSort();
    });

    // Modal close events
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelTweetBtn.addEventListener('click', closeTweetModal);
    
    // Close modal when clicking backdrop
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });

    // Submit tweet to Twitter/X
    submitTweetBtn.addEventListener('click', () => {
        const text = tweetTextArea.value;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420,toolbar=0,status=0');
        closeTweetModal();
    });

    // Reset draft button
    resetTweetBtn.addEventListener('click', () => {
        if (selectedUpdate) {
            generateDraftTweet(selectedUpdate);
        }
    });

    // Real-time character counter for textarea
    tweetTextArea.addEventListener('input', () => {
        updateCharCount();
    });
}

// Fetch data from Flask API
async function fetchReleaseNotes(forceRefresh = false) {
    setLoadingState(true);
    
    try {
        const url = forceRefresh ? '/api/release-notes?refresh=true' : '/api/release-notes';
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch release notes from API');
        }
        
        const data = await response.json();
        allUpdates = data.updates || [];
        
        // Format last fetched time
        const fetchTime = new Date(data.last_fetched * 1000);
        cacheTimeSpan.textContent = `Synced: ${fetchTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        
        applyFiltersAndSort();
    } catch (error) {
        console.error('Error:', error);
        alert('Could not sync release notes. Please try again.');
        
        if (allUpdates.length === 0) {
            showEmptyState();
        }
    } finally {
        setLoadingState(false);
    }
}

// UI Loading state controller
function setLoadingState(isLoading) {
    if (isLoading) {
        refreshBtn.classList.add('loading');
        refreshBtn.disabled = true;
        loadingContainer.style.display = 'grid';
        notesGrid.style.display = 'none';
        emptyState.style.display = 'none';
    } else {
        refreshBtn.classList.remove('loading');
        refreshBtn.disabled = false;
        loadingContainer.style.display = 'none';
    }
}

// Apply searches, filters and sorting
function applyFiltersAndSort() {
    // 1. Filter by Type
    filteredUpdates = allUpdates.filter(update => {
        if (currentTypeFilter === 'all') return true;
        return update.type.toLowerCase() === currentTypeFilter.toLowerCase();
    });

    // 2. Filter by Search Query
    if (searchQuery) {
        filteredUpdates = filteredUpdates.filter(update => {
            return (
                update.type.toLowerCase().includes(searchQuery) ||
                update.date.toLowerCase().includes(searchQuery) ||
                update.text_content.toLowerCase().includes(searchQuery)
            );
        });
    }

    // 3. Sort
    filteredUpdates.sort((a, b) => {
        const dateA = new Date(a.updated || a.date);
        const dateB = new Date(b.updated || b.date);
        
        if (currentSort === 'newest') {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });

    // Render counts
    resultsCount.textContent = `Showing ${filteredUpdates.length} update${filteredUpdates.length === 1 ? '' : 's'}`;

    // Render display
    if (filteredUpdates.length === 0) {
        showEmptyState();
    } else {
        renderUpdatesGrid();
    }
}

// Show empty state
function showEmptyState() {
    notesGrid.style.display = 'none';
    emptyState.style.display = 'block';
}

// Render the updates in CSS grid
function renderUpdatesGrid() {
    emptyState.style.display = 'none';
    notesGrid.style.display = 'grid';
    
    notesGrid.innerHTML = '';
    
    filteredUpdates.forEach(update => {
        const card = document.createElement('article');
        card.className = 'note-card';
        
        // Match badge class
        let badgeClass = 'badge-general';
        const typeLower = update.type.toLowerCase();
        if (typeLower.includes('feature')) badgeClass = 'badge-feature';
        else if (typeLower.includes('change')) badgeClass = 'badge-changed';
        else if (typeLower.includes('deprecated')) badgeClass = 'badge-deprecated';
        
        card.innerHTML = `
            <div>
                <div class="note-card-header">
                    <span class="badge ${badgeClass}">${update.type}</span>
                    <time class="note-date" datetime="${update.updated}">${update.date}</time>
                </div>
                <div class="note-card-body">
                    ${update.content_html}
                </div>
            </div>
            <div class="note-card-footer">
                <a href="${update.link}" target="_blank" rel="noopener noreferrer" class="note-source-link">
                    <span>View Docs</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                    </svg>
                </a>
                <button class="btn btn-secondary btn-sm share-tweet-btn" data-id="${update.id}">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>Tweet</span>
                </button>
            </div>
        `;
        
        notesGrid.appendChild(card);
    });

    // Add event listeners to newly created tweet buttons
    document.querySelectorAll('.share-tweet-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const updateId = btn.getAttribute('data-id');
            const update = allUpdates.find(u => u.id === updateId);
            if (update) {
                openTweetModal(update);
            }
        });
    });
}

// Modal functions
function openTweetModal(update) {
    selectedUpdate = update;
    
    // Set reference info
    refDate.textContent = update.date;
    refType.textContent = update.type;
    refContent.innerHTML = update.content_html;
    
    // Generate tweet draft
    generateDraftTweet(update);
    
    // Open modal
    tweetModal.classList.add('active');
    tweetTextArea.focus();
}

function closeTweetModal() {
    tweetModal.classList.remove('active');
    selectedUpdate = null;
}

// Automatically generate a smart draft tweet that fits in 280 characters
function generateDraftTweet(update) {
    const typeLabel = update.type;
    const dateLabel = update.date;
    const link = update.link;
    const rawText = update.text_content.replace(/\s+/g, ' ').trim();
    
    // Building blocks of tweet
    const prefix = `📢 BigQuery ${typeLabel} (${dateLabel}): `;
    const suffix = `\n\nDocs: ${link}\n#BigQuery #GoogleCloud`;
    
    // Twitter/X counts a link as 23 characters regardless of actual length
    const twitterLinkPlaceholder = "https://t.co/xxxxxxxxxx";
    const twitterSuffix = `\n\nDocs: ${twitterLinkPlaceholder}\n#BigQuery #GoogleCloud`;
    
    const fixedLength = prefix.length + twitterSuffix.length;
    const maxTextLength = 280 - fixedLength - 4; // -4 for " ..."
    
    let textToUse = rawText;
    if (rawText.length > maxTextLength) {
        textToUse = rawText.substring(0, maxTextLength) + '...';
    }
    
    const draft = `${prefix}${textToUse}${suffix}`;
    
    tweetTextArea.value = draft;
    updateCharCount();
}

// Update the char counter indicator in real time
function updateCharCount() {
    const text = tweetTextArea.value;
    
    // To accurately check character count, replace URLs with 23 char placeholders
    // Twitter API handles URLs in tweets by wrapping them with t.co which consumes 23 characters
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let countedText = text;
    const matches = text.match(urlRegex);
    
    if (matches) {
        matches.forEach(url => {
            countedText = countedText.replace(url, "12345678901234567890123");
        });
    }
    
    const remaining = 280 - countedText.length;
    charCounter.textContent = remaining;
    
    // Alert styling
    charCounter.className = 'char-counter';
    if (remaining < 0) {
        charCounter.classList.add('danger');
        submitTweetBtn.disabled = true;
    } else {
        submitTweetBtn.disabled = false;
        if (remaining < 40) {
            charCounter.classList.add('warning');
        }
    }

    // Generate live visual preview
    updateLivePreview(text);
}

// Generate the visual mockup for Twitter/X post
function updateLivePreview(text) {
    const tweetPreviewText = document.getElementById('tweet-preview-text');
    if (!tweetPreviewText) return;
    
    // Escape HTML tags to prevent XSS
    let escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
        
    // Format links as blue/clickable (regex searches for URLs)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    escaped = escaped.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
    
    // Format hashtags (#BigQuery, etc.)
    const hashtagRegex = /(#[a-zA-Z0-9_]+)/g;
    escaped = escaped.replace(hashtagRegex, (hashtag) => {
        return `<span class="highlight-hashtag">${hashtag}</span>`;
    });
    
    // Format handles (@BigQueryRadar, etc.)
    const handleRegex = /(@[a-zA-Z0-9_]+)/g;
    escaped = escaped.replace(handleRegex, (handle) => {
        return `<span class="highlight-hashtag">${handle}</span>`;
    });
    
    // Replace linebreaks
    escaped = escaped.replace(/\n/g, '<br>');
    
    tweetPreviewText.innerHTML = escaped;
    
    // Toggle link card display depending on whether link is present
    const linkCard = document.getElementById('tweet-preview-link-card');
    if (linkCard) {
        // Reset regex state (since regex has 'g' flag)
        urlRegex.lastIndex = 0;
        const hasUrl = urlRegex.test(text);
        linkCard.style.display = hasUrl ? 'flex' : 'none';
        
        // Dynamically update the domain in the card if one is found
        if (hasUrl) {
            urlRegex.lastIndex = 0;
            const matches = text.match(urlRegex);
            if (matches && matches.length > 0) {
                try {
                    const parsedUrl = new URL(matches[0]);
                    const domainSpan = linkCard.querySelector('.preview-link-domain');
                    if (domainSpan) {
                        domainSpan.textContent = parsedUrl.hostname;
                    }
                } catch (e) {
                    // Ignore URL parsing errors for incomplete drafts
                }
            }
        }
    }
}
