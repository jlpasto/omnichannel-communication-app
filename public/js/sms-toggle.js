// Event listeners for navigation buttons
inboxButton.addEventListener('click', () => showSection('inboxSection'));
newMessageButton.addEventListener('click', () => showSection('newMessageSection'));

// Refresh button click listener
refreshButton.addEventListener('click', fetchMessages);

// Initial load: show inbox section
document.addEventListener('DOMContentLoaded', () => {
    showSection('inboxSection');
});