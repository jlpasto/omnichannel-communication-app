

/**
 * Handles the form submission for sending an SMS.
 */
sendMessageForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent default form submission

    responseMessage.classList.add('hidden'); // Hide previous messages
    responseMessage.classList.remove('bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800'); // Clean styles

    const to = document.getElementById('to').value;
    const body = document.getElementById('body').value;

    try {
        // Show a loading indicator
        responseMessage.classList.remove('hidden');
        responseMessage.classList.add('bg-yellow-100', 'text-yellow-800');
        responseMessage.textContent = 'Sending message...';

        const response = await fetch('/sms/send-sms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ to, body })
        });

        const result = await response.json();

        responseMessage.classList.remove('bg-yellow-100', 'text-yellow-800'); // Remove loading styles

        if (result.success) {
            responseMessage.classList.add('bg-green-100', 'text-green-800');
            responseMessage.textContent = 'Message sent successfully!';
            sendMessageForm.reset(); // Clear the form
            // Optionally, switch to inbox view after sending
            // showSection('inboxSection');
        } else {
            responseMessage.classList.add('bg-red-100', 'text-red-800');
            responseMessage.textContent = `Error: ${result.message}`;
        }
    } catch (error) {
        console.error('Error sending message:', error);
        responseMessage.classList.remove('bg-yellow-100', 'text-yellow-800');
        responseMessage.classList.add('bg-red-100', 'text-red-800');
        responseMessage.textContent = 'Network error. Could not send message.';
    }
});