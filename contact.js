/**
 * Contact Page Scripts
 * Handles Accordion UI and Form Submission to GAS Webhook
 */

// --- Accordion Logic ---
function toggleAccordion(element) {
    const item = element.parentElement;
    const isOpen = item.classList.contains('active');
    
    // Close all other accordions (optional, for cleaner UI)
    document.querySelectorAll('.accordion-item').forEach(el => {
        el.classList.remove('active');
    });

    // Toggle current one
    if (!isOpen) {
        item.classList.add('active');
    }
}

// --- Form Submission Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');
    const spinner = document.getElementById('spinner');
    const successMsg = document.getElementById('successMsg');

    // Replace with your actual GAS Webhook URL
    const GAS_WEBHOOK_URL = 'https://script.google.com/macros/s/XXXXX_YOUR_ID_XXXXX/exec';

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // UI Update: Loading State
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.7';
            spinner.style.display = 'inline-block';
            const originalBtnText = submitBtn.querySelector('span').innerText;
            submitBtn.querySelector('span').innerText = '送信中...';

            // Collect Form Data
            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData.entries());

            try {
                // Fetch request to GAS Webhook
                // Note: Using 'no-cors' is an option if you just want to fire and forget, 
                // but for a successful feedback loop, standard fetch with correct headers is preferred.
                const response = await fetch(GAS_WEBHOOK_URL, {
                    method: 'POST',
                    mode: 'no-cors', // GAS Webhook often requires no-cors or specific handling
                    body: JSON.stringify(data),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                // Since mode: 'no-cors' won't give us a readable response body, 
                // we check if the fetch didn't throw an error as success.
                
                // Success UI Update
                contactForm.style.display = 'none'; // Hide form on success
                successMsg.style.display = 'block';

            } catch (error) {
                console.error('Submission Error:', error);
                alert('エラーが発生しました。ネットワーク状況を確認して再度お試しください。');
                
                // Reset UI State on Failure
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                spinner.style.display = 'none';
                submitBtn.querySelector('span').innerText = originalBtnText;
            }
        });
    }
});