document.addEventListener('DOMContentLoaded', () => {
    // Get references to elements
    const inboxNavButton = document.getElementById('inboxNavButton');
    const composeNavButton = document.getElementById('composeNavButton');
    const refreshInboxButton = document.getElementById('refreshInboxButton'); // New refresh button
    const inboxView = document.getElementById('inboxView');
    const composeView = document.getElementById('composeView');
    const contentTitle = document.getElementById('contentTitle');

    // Elements for inbox functionality (reused from previous version)
    const inboxContainer = document.getElementById('inboxContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessageDiv = document.getElementById('errorMessage');
    const initialMessage = document.getElementById('initialMessage');

    // --- View Management Functions ---
    function showView(viewId) {
        // Hide all views
        inboxView.classList.add('hidden');
        composeView.classList.add('hidden');

        // Show the requested view
        if (viewId === 'inbox') {
            inboxView.classList.remove('hidden');
            contentTitle.textContent = 'Inbox';
            // Make Inbox button active and Compose inactive
            inboxNavButton.classList.add('bg-blue-600', 'text-white');
            inboxNavButton.classList.remove('bg-gray-200', 'text-gray-700');
            composeNavButton.classList.remove('bg-blue-600', 'text-white');
            composeNavButton.classList.add('bg-gray-200', 'text-gray-700');
            fetchAndDisplayInbox(); // Auto-refresh inbox when switching to it
        } else if (viewId === 'compose') {
            composeView.classList.remove('hidden');
            contentTitle.textContent = 'Compose Email';
            // Make Compose button active and Inbox inactive
            composeNavButton.classList.add('bg-blue-600', 'text-white');
            composeNavButton.classList.remove('bg-gray-200', 'text-gray-700');
            inboxNavButton.classList.remove('bg-blue-600', 'text-white');
            inboxNavButton.classList.add('bg-gray-200', 'text-gray-700');
            // Optionally clear compose form here:
            document.getElementById('to').value = '';
            document.getElementById('subject').value = '';
            document.getElementById('body').value = '';
            document.getElementById('attachment').value = ''; // Clear attachment input
        }
    }

    // --- Function to display a message to the user ---
    function showMessageBox(message, type = 'error') {
        errorMessageDiv.textContent = message;
        errorMessageDiv.className = `message-box ${type === 'error' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-green-100 border-green-400 text-green-700'} block`;
    }

    // --- Function to hide the message box ---
    function hideMessageBox() {
        errorMessageDiv.textContent = '';
        errorMessageDiv.className = 'message-box hidden';
    }

    // --- Function to fetch and display emails ---
    async function fetchAndDisplayInbox() {
        // Show loading indicator and hide previous content/messages
        loadingIndicator.style.display = 'block';
        inboxContainer.innerHTML = ''; // Clear existing emails
        hideMessageBox();
        initialMessage.style.display = 'none'; // Hide initial message

        try {
            // Make a request to your Node.js server.
            const response = await fetch('http://localhost:3000/email/inbox');
                
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.emails.length > 0) {
                data.emails.forEach(email => {
                    const emailItem = document.createElement('div');
                    emailItem.className = 'email-item';

                    const emailHeader = document.createElement('div');
                    emailHeader.className = 'email-header';

                    const fromSpan = document.createElement('span');
                    fromSpan.className = 'email-from';
                    fromSpan.textContent = email.from;

                    const dateSpan = document.createElement('span');
                    dateSpan.className = 'email-date';
                    const emailDate = new Date(email.date);
                    dateSpan.textContent = emailDate.toLocaleString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: true
                    });

                    emailHeader.appendChild(fromSpan);
                    emailHeader.appendChild(dateSpan);

                    const subjectDiv = document.createElement('div');
                    subjectDiv.className = 'email-subject';
                    subjectDiv.textContent = email.subject;

                    const snippetDiv = document.createElement('p');
                    snippetDiv.className = 'email-snippet';
                    // Show first line of text body, handle potential empty text
                    snippetDiv.textContent = email.text ? email.text.split('\n')[0] : 'No preview available.';

                    emailItem.appendChild(emailHeader);
                    emailItem.appendChild(subjectDiv);
                    emailItem.appendChild(snippetDiv);

                    // --- Attachment display logic ---
                    if (email.attachments && email.attachments.length > 0) {
                        const attachmentsList = document.createElement('div');
                        attachmentsList.className = 'attachment-list space-y-2 mt-3'; // Tailwind for spacing

                        const attachmentsHeader = document.createElement('p');
                        attachmentsHeader.className = 'text-gray-600 font-semibold text-sm';
                        attachmentsHeader.innerHTML = `<span class="inline-block align-middle mr-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13.5" />
                            </svg>
                        </span>Attachments:`;
                        attachmentsList.appendChild(attachmentsHeader);

                        email.attachments.forEach(attachment => {
                            const attachmentItem = document.createElement('div');
                            attachmentItem.className = 'attachment-item';

                            const attachmentName = document.createElement('span');
                            attachmentName.textContent = attachment.filename;
                            attachmentName.className = 'text-gray-800 flex-grow'; // Allow filename to take space

                            const downloadLink = document.createElement('a');
                            // Construct the data URL for download
                            downloadLink.href = `data:${attachment.contentType};base64,${attachment.content}`;
                            downloadLink.download = attachment.filename; // Suggest filename for download
                            downloadLink.textContent = 'Download';
                            downloadLink.className = 'attachment-download-btn'; // Apply button styles

                            attachmentItem.appendChild(attachmentName);
                            attachmentItem.appendChild(downloadLink);
                            attachmentsList.appendChild(attachmentItem);
                        });
                        emailItem.appendChild(attachmentsList);
                    }
                    // --- End Attachment display logic ---

                    inboxContainer.appendChild(emailItem);
                });
            } else if (data.success && data.emails.length === 0) {
                inboxContainer.innerHTML = '<p class="text-center text-gray-500 py-10">Your inbox is empty or no new emails found.</p>';
            } else {
                throw new Error(data.error || 'Failed to retrieve emails from the server.');
            }

        } catch (error) {
            console.error('Error fetching inbox:', error);
            showMessageBox(`Failed to load inbox: ${error.message}. Please ensure the Node.js server is running and configured correctly.`);
            inboxContainer.innerHTML = '<p class="text-center text-red-500 py-10">Could not load inbox.</p>';
        } finally {
            loadingIndicator.style.display = 'none'; // Hide loading indicator
        }
    }

    // --- Event Listeners ---
    inboxNavButton.addEventListener('click', () => showView('inbox'));
    composeNavButton.addEventListener('click', () => showView('compose'));
    refreshInboxButton.addEventListener('click', fetchAndDisplayInbox); // New listener for refresh

    // Initially show the inbox view
    showView('inbox');
});