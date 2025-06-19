const inboxButton = document.getElementById('inboxButton');
const newMessageButton = document.getElementById('newMessageButton');
const inboxSection = document.getElementById('inboxSection');
const newMessageSection = document.getElementById('newMessageSection');
const messagesContainer = document.getElementById('messages-container');
const refreshButton = document.getElementById('refreshButton');
const sendMessageForm = document.getElementById('sendMessageForm');
const responseMessage = document.getElementById('responseMessage');

// Function to switch views
function showSection(sectionId) {
    inboxSection.classList.add('hidden');
    newMessageSection.classList.add('hidden');
    document.getElementById(sectionId).classList.remove('hidden');

    // Update button styles
    if (sectionId === 'inboxSection') {
        inboxButton.classList.remove('bg-gray-300', 'text-gray-800');
        inboxButton.classList.add('bg-indigo-600', 'text-white');
        newMessageButton.classList.remove('bg-indigo-600', 'text-white');
        newMessageButton.classList.add('bg-gray-300', 'text-gray-800');
        fetchMessages(); // Refresh inbox when switching to it
    } else {
        newMessageButton.classList.remove('bg-gray-300', 'text-gray-800');
        newMessageButton.classList.add('bg-indigo-600', 'text-white');
        inboxButton.classList.remove('bg-indigo-600', 'text-white');
        inboxButton.classList.add('bg-gray-300', 'text-gray-800');
    }
}

/**
 * Fetches messages from the server and updates the UI.
 */
async function fetchMessages() {
    try {
        messagesContainer.innerHTML = '<p class="text-center text-gray-500">Loading messages...</p>';
        const response = await fetch('/sms/messages');
        const messages = await response.json();

        if (messages.length === 0) {
            messagesContainer.innerHTML = '<p class="text-center text-gray-500">No messages yet. Send an SMS to your Twilio number or send one from here!</p>';
        } else {
            messagesContainer.innerHTML = ''; // Clear loading message
            messages.forEach(message => {
                const cardClass = message.type === 'sent' ? 'sent-message-card' : 'received-message-card';
                const fromOrTo = message.type === 'sent' ? `To: <span class="block sm:inline text-blue-900 break-words">${message.to}</span>` : `From: <span class="block sm:inline text-indigo-900 break-words">${message.from}</span>`;
                const messageCard = `
                    <div class="${cardClass} p-4 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-start space-y-2 sm:space-y-0 sm:space-x-4">
                        <div class="flex-shrink-0 ${message.type === 'sent' ? 'text-blue-700' : 'text-indigo-700'} font-medium text-lg w-full sm:w-auto">
                            ${fromOrTo}
                        </div>
                        <div class="flex-grow">
                            <p class="text-gray-800 text-base leading-relaxed break-words">${message.body}</p>
                            <p class="text-gray-500 text-xs mt-1 italic">${message.timestamp}</p>
                        </div>
                    </div>
                `;
                messagesContainer.innerHTML += messageCard;
            });
        }
    } catch (error) {
        console.error('Error fetching messages:', error);
        messagesContainer.innerHTML = '<p class="text-center text-red-500">Error loading messages. Please try again.</p>';
    }
}