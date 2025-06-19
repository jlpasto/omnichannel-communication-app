// Function to load the navbar content
function loadNavbar() {
    fetch('navbar.html')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            const navbarContainer = document.getElementById('navbar');
            if (navbarContainer) {
                navbarContainer.innerHTML = data;
                updateNavbarBasedOnLogin(); // Call function to update once content is loaded
            } else {
                console.error("Error: Element with ID 'navbar' not found.");
            }
        })
        .catch(error => {
            console.error('Failed to load navbar:', error);
            // Optionally, provide a fallback or error message to the user
        });
}

// Function to update navbar based on login status
function updateNavbarBasedOnLogin() {
    const username = localStorage.getItem('username'); // Get username from localStorage
    const loginLink = document.getElementById('loginLink');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const dashboardLink = document.getElementById('dashboardLink'); // For optional link

    if (loginLink) { // Ensure the element exists after navbar.html is loaded
        if (username) {
            // User is logged in
            loginLink.innerHTML = 'Logout';
            loginLink.href = '#'; // Or a specific logout endpoint if you have one

            // Show username
            if (usernameDisplay) {
                usernameDisplay.textContent = `Welcome, ${username}!`;
                usernameDisplay.classList.remove('hidden');
            }

            // Show dashboard link (if applicable)
            if (dashboardLink) {
                dashboardLink.classList.remove('hidden');
            }

            // Add logout functionality
            loginLink.onclick = function(event) {
                event.preventDefault(); // Prevent default link navigation
                localStorage.removeItem('username'); // Clear username
                // You might also clear an auth token here if you're using one
                alert('You have been logged out!');
                window.location.href = 'index.html'; // Redirect to home or login page
            };

        } else {
            // User is NOT logged in
            loginLink.innerHTML = 'Login';
            loginLink.href = 'index.html'; // Link to your login page

            // Hide username and dashboard link
            if (usernameDisplay) {
                usernameDisplay.classList.add('hidden');
            }
            if (dashboardLink) {
                dashboardLink.classList.add('hidden');
            }

            // Remove previous logout handler if any (important for dynamic content)
            loginLink.onclick = null;
        }
    }
}

// Call loadNavbar when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadNavbar);

// Optional: You might want to call updateNavbarBasedOnLogin on pages that don't load the whole navbar,
// e.g., after a successful login on the login.html page, to instantly update the navbar
// function that handles login success:
// function handleLoginSuccess(loggedInUsername) {
//     localStorage.setItem('username', loggedInUsername);
//     updateNavbarBasedOnLogin(); // Update immediately after login
//     window.location.href = 'home.html'; // Redirect
// }