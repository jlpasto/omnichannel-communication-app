document.getElementById("loginBtn").addEventListener("click", async () => {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    alert("Login Clicked");
    
    try {
        const res = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        if (res.ok) {
            localStorage.setItem("username", username);
            window.location.href = "/chat.html";
        } else {
            document.getElementById("error").classList.remove("hidden");
        }
    } catch (err) {
        console.error("Login error", err);
    }
});
