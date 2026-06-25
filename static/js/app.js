// App State
let allNotes = [];
let selectedNote = null;
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const feedLoader = document.getElementById('feed-loader');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const retryBtn = document.getElementById('retry-btn');
const timeline = document.getElementById('timeline');

const filterChips = document.getElementById('filter-chips');
const searchInput = document.getElementById('search-input');
const exportCsvBtn = document.getElementById('export-csv-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIconDark = document.getElementById('theme-icon-dark');
const themeIconLight = document.getElementById('theme-icon-light');

const composerPlaceholder = document.getElementById('composer-placeholder');
const composerActive = document.getElementById('composer-active');
const closeComposer = document.getElementById('close-composer');

const xTweetPreviewText = document.getElementById('x-tweet-preview-text');
const xTweetTime = document.getElementById('x-tweet-time');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const charProgress = document.getElementById('char-progress');
const tweetBtn = document.getElementById('tweet-btn');
const autoFitBtn = document.getElementById('auto-fit-btn');

// Constants
const TWITTER_CHAR_LIMIT = 280;
const T_CO_URL_LENGTH = 23; // Twitter wraps all URLs, making them count as exactly 23 chars

// Progress Ring Settings
const circleRadius = 9;
const circleCircumference = 2 * Math.PI * circleRadius; // ~56.54

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Set up progress ring
    charProgress.style.strokeDasharray = `${circleCircumference} ${circleCircumference}`;
    charProgress.style.strokeDashoffset = circleCircumference;
    
    // Theme Setup & Persistent Check
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeIconDark.classList.add('hidden');
        themeIconLight.classList.remove('hidden');
    }

    // Bind Event Listeners
    refreshBtn.addEventListener('click', fetchReleaseNotes);
    retryBtn.addEventListener('click', fetchReleaseNotes);
    searchInput.addEventListener('input', handleSearch);
    filterChips.addEventListener('click', handleFilter);
    closeComposer.addEventListener('click', deselectNote);
    tweetTextarea.addEventListener('input', handleTweetTextChange);
    tweetBtn.addEventListener('click', publishTweet);
    exportCsvBtn.addEventListener('click', exportToCSV);
    autoFitBtn.addEventListener('click', autoFitTweet);

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        if (isLight) {
            localStorage.setItem('theme', 'light');
            themeIconDark.classList.add('hidden');
            themeIconLight.classList.remove('hidden');
        } else {
            localStorage.setItem('theme', 'dark');
            themeIconDark.classList.remove('hidden');
            themeIconLight.classList.add('hidden');
        }
    });

    // Initial Fetch
    fetchReleaseNotes();
});

// Fetch Release Notes from Flask API
async function fetchReleaseNotes() {
    setLoading(true);
    deselectNote();
    
    try {
        const response = await fetch('/api/release-notes');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        if (result.status === 'success') {
            allNotes = result.data;
            renderTimeline();
            errorMessage.classList.add('hidden');
        } else {
            throw new Error(result.message || 'Unknown error occurred while parsing.');
        }
    } catch (err) {
        console.error('Error fetching release notes:', err);
        errorText.textContent = `Could not fetch release notes: ${err.message}. Please check your connection or try again.`;
        errorMessage.classList.remove('hidden');
        timeline.innerHTML = '';
    } finally {
        setLoading(false);
    }
}

// Toggle loading state spinner & animations
function setLoading(isLoading) {
    if (isLoading) {
        feedLoader.classList.remove('hidden');
        refreshIcon.classList.add('spinning');
        refreshBtn.disabled = true;
        errorMessage.classList.add('hidden');
    } else {
        feedLoader.classList.add('hidden');
        refreshIcon.classList.remove('spinning');
        refreshBtn.disabled = false;
    }
}

// Handle Search Inputs
function handleSearch(e) {
    searchQuery = e.target.value.toLowerCase().trim();
    renderTimeline();
}

// Handle Category Filter Chips
function handleFilter(e) {
    const clickedChip = e.target.closest('.chip');
    if (!clickedChip) return;

    // Toggle Active Class
    const activeChip = filterChips.querySelector('.chip.active');
    if (activeChip) activeChip.classList.remove('active');
    clickedChip.classList.add('active');

    currentFilter = clickedChip.dataset.filter;
    renderTimeline();
}

// Render Timeline Feed with Current Filters/Search Applied
function renderTimeline() {
    timeline.innerHTML = '';
    
    if (allNotes.length === 0) {
        timeline.innerHTML = '<div class="feed-loader"><p>No release notes found.</p></div>';
        return;
    }

    let renderedNodesCount = 0;

    allNotes.forEach(entry => {
        // Filter the updates in this entry
        const filteredUpdates = entry.updates.filter(update => {
            // Category Filter
            const matchesCategory = currentFilter === 'all' || 
                update.type.toLowerCase() === currentFilter.toLowerCase();
            
            // Search Query Filter (searches inside note type, body text, or date)
            const matchesSearch = searchQuery === '' || 
                update.type.toLowerCase().includes(searchQuery) ||
                update.text.toLowerCase().includes(searchQuery) ||
                entry.date.toLowerCase().includes(searchQuery);

            return matchesCategory && matchesSearch;
        });

        // Skip rendering this date node if it has no matching updates
        if (filteredUpdates.length === 0) return;

        renderedNodesCount++;

        // Create Timeline Node
        const node = document.createElement('div');
        node.className = 'timeline-node';

        // Date Marker
        const marker = document.createElement('div');
        marker.className = 'timeline-date-marker';
        marker.innerHTML = `
            <span class="date-bullet"></span>
            <span class="date-text">${entry.date}</span>
        `;
        node.appendChild(marker);

        // Cards list
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'timeline-cards';

        filteredUpdates.forEach(update => {
            const card = document.createElement('div');
            card.className = 'note-card';
            card.dataset.id = update.id;
            
            // Highlight selected card
            if (selectedNote && selectedNote.id === update.id) {
                card.classList.add('selected');
            }

            // Keyboard accessibility attributes
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', `BigQuery release update: ${update.type} on ${entry.date}`);

            // Map type to css badge class
            const badgeClass = getBadgeClass(update.type);

            card.innerHTML = `
                <div class="card-header">
                    <span class="badge ${badgeClass}">${update.type}</span>
                    <div class="card-header-actions">
                        <button class="btn-card-action btn-copy" title="Copy plain text to clipboard">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                            </svg>
                            <span class="action-text">Copy</span>
                        </button>
                        <div class="card-actions-hint">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            <span>${selectedNote && selectedNote.id === update.id ? 'Selected' : 'Select to Tweet'}</span>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    ${update.html}
                </div>
            `;

            // Bind clipboard copy button action
            const copyBtn = card.querySelector('.btn-copy');
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card selection triggering
                copyTextToClipboard(update, entry, copyBtn);
            });

            // Card click behavior
            card.addEventListener('click', (e) => {
                // Prevent selection if clicking direct links or copy buttons within the card
                if (e.target.tagName === 'A' || e.target.closest('.btn-copy')) return;
                
                selectNote(update, entry);
            });

            // Keyboard accessibility navigation handler
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault(); // Stop page scrolling on space
                    selectNote(update, entry);
                }
            });

            cardsContainer.appendChild(card);
        });

        node.appendChild(cardsContainer);
        timeline.appendChild(node);
    });

    if (renderedNodesCount === 0) {
        timeline.innerHTML = `
            <div class="feed-loader">
                <svg viewBox="0 0 24 24" width="36" height="36" style="color: var(--text-dark); margin-bottom: 0.5rem;">
                    <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                <p>No results match your search or filter criteria.</p>
                <button id="reset-filters-btn" class="btn btn-secondary btn-sm" style="margin-top: 0.75rem;">Clear Search & Filters</button>
            </div>
        `;
        document.getElementById('reset-filters-btn').addEventListener('click', resetFilters);
    }
}

// Helpers for badges
function getBadgeClass(type) {
    const t = type.toLowerCase();
    if (t.includes('feature')) return 'badge-feature';
    if (t.includes('issue')) return 'badge-issue';
    if (t.includes('announcement')) return 'badge-announcement';
    if (t.includes('deprecation')) return 'badge-deprecation';
    return 'badge-update';
}

// Select an update to compose tweet
function selectNote(update, entry) {
    selectedNote = update;
    
    // Highlight Card
    document.querySelectorAll('.note-card').forEach(c => {
        if (c.dataset.id === update.id) {
            c.classList.add('selected');
            c.querySelector('.card-actions-hint span').textContent = 'Selected';
        } else {
            c.classList.remove('selected');
            const hint = c.querySelector('.card-actions-hint span');
            if (hint) hint.textContent = 'Select to Tweet';
        }
    });

    // Toggle Panels
    composerPlaceholder.classList.add('hidden');
    composerActive.classList.remove('hidden');

    // Populate Mockup Timestamp
    const publishDate = new Date(entry.updated);
    const options = { hour: '2-digit', minute: '2-digit', hour12: true };
    const dateStr = publishDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = publishDate.toLocaleTimeString('en-US', options);
    xTweetTime.textContent = `${timeStr} · ${dateStr}`;

    // Auto-generate Tweet Draft
    const tweetDraft = autoGenerateTweetDraft(entry.date, update.type, update.text, entry.link);
    tweetTextarea.value = tweetDraft;

    // Update Counter & UI
    updateTweetUI(tweetDraft);

    // Smooth scroll to composer on smaller screens (collapses vertically)
    if (window.innerWidth <= 1024) {
        composerActive.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Deselect selected card
function deselectNote() {
    selectedNote = null;
    document.querySelectorAll('.note-card').forEach(c => {
        c.classList.remove('selected');
        const hint = c.querySelector('.card-actions-hint span');
        if (hint) hint.textContent = 'Select to Tweet';
    });

    composerPlaceholder.classList.remove('hidden');
    composerActive.classList.add('hidden');
}

// Generate the smart tweet template, keeping within 280 character constraints
function autoGenerateTweetDraft(date, type, text, link) {
    const prefix = `🚀 BigQuery Update (${date}) | ${type}: `;
    
    // If the link is empty, we don't count it. Otherwise, Twitter counts all links as exactly 23 characters
    const urlReplacementLength = link ? T_CO_URL_LENGTH : 0;
    
    // Standard template syntax
    const prefixLen = prefix.length;
    const spacingAndLinkLen = link ? (1 + urlReplacementLength) : 0; // Space before link + url length
    
    const maxContentLen = TWITTER_CHAR_LIMIT - prefixLen - spacingAndLinkLen;
    
    let processedText = text;
    if (text.length > maxContentLen) {
        // We need to truncate the text and append '...'
        const truncationEllipsis = '...';
        const adjustContentLen = maxContentLen - truncationEllipsis.length;
        processedText = text.slice(0, adjustContentLen).trim() + truncationEllipsis;
    }
    
    return link ? `${prefix}${processedText} ${link}` : `${prefix}${processedText}`;
}

// Handle typing in composer text area
function handleTweetTextChange(e) {
    updateTweetUI(e.target.value);
}

// Calculate the precise character count for X (accounting for link wraps)
function calculateTweetLength(text) {
    // Regex for http/https URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    let computedText = text;
    
    // Replace all URLs with a placeholder of exact length 23
    computedText = computedText.replace(urlRegex, "a".repeat(T_CO_URL_LENGTH));
    
    return computedText.length;
}

// Update character counting, circular progress bar, and preview text
function updateTweetUI(text) {
    const length = calculateTweetLength(text);
    
    // Update live mockup preview
    // Format hashtags and links for high-fidelity looks
    xTweetPreviewText.innerHTML = formatTweetText(text);

    // Update Text Counter
    charCounter.textContent = `${length} / ${TWITTER_CHAR_LIMIT}`;
    
    // Manage classes & buttons based on character count thresholds
    if (length > TWITTER_CHAR_LIMIT) {
        charCounter.className = 'char-counter error';
        tweetBtn.disabled = true;
        autoFitBtn.classList.remove('hidden');
    } else if (length >= TWITTER_CHAR_LIMIT - 20) {
        charCounter.className = 'char-counter warning';
        tweetBtn.disabled = false;
        autoFitBtn.classList.add('hidden');
    } else {
        charCounter.className = 'char-counter';
        tweetBtn.disabled = false;
        autoFitBtn.classList.add('hidden');
    }

    // Update SVG Progress Ring
    setProgressRing(length);
}

// Format the preview text (colorize hashtags, handles, and URLs blue)
function formatTweetText(text) {
    // Escape HTML special characters to prevent HTML injection in preview
    let escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // Replace hashtags with styled spans
    escaped = escaped.replace(/(#[a-zA-Z0-9_]+)/g, '<span class="highlight-link">$1</span>');
    // Replace mentions with styled spans
    escaped = escaped.replace(/(@[a-zA-Z0-9_]+)/g, '<span class="highlight-link">$1</span>');
    // Replace URLs with styled spans
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    escaped = escaped.replace(urlRegex, '<span class="highlight-link">$1</span>');

    return escaped;
}

// Update Circular Progress Bar
function setProgressRing(length) {
    let percentage = Math.min(length / TWITTER_CHAR_LIMIT, 1);
    
    // Circumference minus visual percentage offset
    const offset = circleCircumference - (percentage * circleCircumference);
    charProgress.style.strokeDashoffset = offset;

    // Change circle color
    if (length > TWITTER_CHAR_LIMIT) {
        charProgress.className.baseVal = 'progress-ring__circle error';
    } else if (length >= TWITTER_CHAR_LIMIT - 20) {
        charProgress.className.baseVal = 'progress-ring__circle warning';
    } else {
        charProgress.className.baseVal = 'progress-ring__circle';
    }
}

// Publish Tweet: Open Twitter Intent Share window
function publishTweet() {
    const text = tweetTextarea.value;
    const tweetLength = calculateTweetLength(text);
    
    if (tweetLength > TWITTER_CHAR_LIMIT) return;

    // Build standard Web Intent URL
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    
    // Open in a new tab/window
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
}

// Copy single release note plain text representation to clipboard
function copyTextToClipboard(update, entry, button) {
    const textToCopy = `🚀 BigQuery Release Note (${entry.date})\nType: ${update.type}\n\nUpdate:\n${update.text}\n\nSource: ${entry.link}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        const textSpan = button.querySelector('.action-text');
        const originalText = textSpan.textContent;
        textSpan.textContent = 'Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
            textSpan.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Could not copy to clipboard. Please check browser permissions.');
    });
}

// Export the currently filtered set of release notes to a CSV file
function exportToCSV() {
    let csvData = [];
    
    allNotes.forEach(entry => {
        entry.updates.forEach(update => {
            const matchesCategory = currentFilter === 'all' || 
                update.type.toLowerCase() === currentFilter.toLowerCase();
            
            const matchesSearch = searchQuery === '' || 
                update.type.toLowerCase().includes(searchQuery) ||
                update.text.toLowerCase().includes(searchQuery) ||
                entry.date.toLowerCase().includes(searchQuery);
                
            if (matchesCategory && matchesSearch) {
                csvData.push({
                    date: entry.date,
                    type: update.type,
                    text: update.text,
                    link: entry.link
                });
            }
        });
    });
    
    if (csvData.length === 0) {
        alert('No release notes found to export.');
        return;
    }
    
    // Generate CSV contents
    let csvString = 'Date,Type,Text,Link\n';
    
    csvData.forEach(row => {
        // Escape quotes by doubling them
        const dateVal = `"${row.date.replace(/"/g, '""')}"`;
        const typeVal = `"${row.type.replace(/"/g, '""')}"`;
        const textVal = `"${row.text.replace(/"/g, '""')}"`;
        const linkVal = `"${row.link.replace(/"/g, '""')}"`;
        
        csvString += `${dateVal},${typeVal},${textVal},${linkVal}\n`;
    });
    
    // Create download element
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    // Dynamic descriptive file name
    let filename = 'bigquery_release_notes';
    if (currentFilter !== 'all') {
        filename += `_${currentFilter.toLowerCase()}`;
    }
    if (searchQuery) {
        filename += `_search_${searchQuery.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    }
    filename += '.csv';
    
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Reset filters to default state (triggered by empty search states)
function resetFilters() {
    searchInput.value = '';
    searchQuery = '';
    
    const activeChip = filterChips.querySelector('.chip.active');
    if (activeChip) activeChip.classList.remove('active');
    filterChips.querySelector('[data-filter="all"]').classList.add('active');
    currentFilter = 'all';
    
    renderTimeline();
}

// Auto-Fit tweet contents: trims user text down so it fits under the 280-char limit
function autoFitTweet() {
    if (!selectedNote) return;
    const text = tweetTextarea.value;
    
    // Find links in the draft (t.co wrap counts as exactly 23 characters)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    
    if (urls && urls.length > 0) {
        const primaryUrl = urls[0];
        // Split the draft, removing primary URL
        let plainText = text.replace(primaryUrl, '').trim();
        
        // Allowed length: limit - link length - space - ellipsis
        const maxPlainLength = TWITTER_CHAR_LIMIT - T_CO_URL_LENGTH - 2; // (1 space + 1 ellipsis dot gap)
        
        if (plainText.length > maxPlainLength) {
            plainText = plainText.slice(0, maxPlainLength - 3).trim() + '...';
        }
        tweetTextarea.value = `${plainText} ${primaryUrl}`;
    } else {
        // Simple string slice
        tweetTextarea.value = text.slice(0, TWITTER_CHAR_LIMIT);
    }
    
    updateTweetUI(tweetTextarea.value);
}
