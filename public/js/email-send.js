const form = document.getElementById('emailForm');
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    

    console.log("Email Send Click");
    const formData = new FormData(form);
    // Replace with your actual send email endpoint
    const response = await fetch('api/email/send', {
        method: 'POST',
        body: formData
    });

    alert("Email sent successfully!");

    // Manually reset each field
    document.getElementById("to").value = "";
    document.getElementById("subject").value = "";
    document.getElementById("body").value = "";
    document.getElementById("attachment").value = null; // Use null for file inputs


    /*** 
    // Replace alert with showMessageBox for consistent UI
    if (response.ok) {
        showMessageBox("Email sent successfully!", 'success');
        // Optionally switch back to inbox view or clear form
        // showView('inbox');
    } else {
        const errorText = await response.text();
        showMessageBox(`Failed to send email: ${errorText}`, 'error');
    }
    */
});

form.reset();