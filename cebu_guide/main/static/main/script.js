document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded fired: Script started.');

    // --- Helper function to get CSRF token ---
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    const csrftoken = getCookie('csrftoken');
    console.log('CSRF token obtained:', csrftoken ? 'Yes' : 'No (might be fine if not posting yet)');


    // --- Element Selections ---
    const chatbotContainer = document.getElementById('chatbot-container');
    const openChatbotFab = document.getElementById('open-chatbot-fab');
    const chatbotCloseBtn = chatbotContainer?.querySelector('.chatbot-close-btn');
    const chatMessages = document.getElementById('chat-messages');
    const expertQuestionInput = document.getElementById('expert-question');
    const askExpertBtn = document.getElementById('ask-expert-btn');
    const expertSpinner = document.getElementById('expert-answer-spinner');

    const resetChatBtn = document.getElementById('reset-chat-btn');
    const viewHistoryBtn = document.getElementById('view-history-btn');
    const historyModal = document.getElementById('history-modal');
    const historyMessages = document.getElementById('history-messages');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const historyModalCloseBtn = historyModal?.querySelector('.modal-close-btn');

    // LOG ELEMENT EXISTENCE: This is critical for the FAB!
    console.log('Selected Elements:');
    console.log('  chatbotContainer:', chatbotContainer);
    console.log('  openChatbotFab:', openChatbotFab); // THIS MUST NOT BE NULL
    console.log('  chatbotCloseBtn:', chatbotCloseBtn);
    console.log('  historyModal:', historyModal);


    // Smooth scrolling for navigation links (unchanged)
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(event) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                event.preventDefault();
                document.querySelector(href).scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Click "Explore Cebu" header to scroll to top (unchanged)
    document.getElementById('home-link')?.addEventListener('click', function(event) {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Contact Form Submission (unchanged client-side for this demo)
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const formSubmissionMessage = document.getElementById('form-submission-message');
            formSubmissionMessage.textContent = "Thank you for your feedback!";
            formSubmissionMessage.classList.remove('hidden');
            formSubmissionMessage.style.backgroundColor = '#d1fae5';
            formSubmissionMessage.style.color = '#065f46';
            contactForm.reset();
            setTimeout(() => formSubmissionMessage.classList.add('hidden'), 3000);
        });
    }

    // --- Messenger-style Chatbot Logic ---

    // MODIFIED: Function to toggle chatbot visibility
    function toggleChatbot() {
        console.log('toggleChatbot called!'); // Confirm this function is ever triggered

        // Toggle the 'is-open' class on the chatbot container
        chatbotContainer.classList.toggle('is-open');

        // Hide the FAB when the chatbot is open, show it when closed
        if (chatbotContainer.classList.contains('is-open')) {
            openChatbotFab.classList.add('is-hidden'); // Apply the new 'is-hidden' class
            expertQuestionInput.focus();
            loadCurrentChatSession();
        } else {
            openChatbotFab.classList.remove('is-hidden'); // Remove 'is-hidden' when chatbot closes
        }
        console.log('  Chatbot container classes after toggle:', chatbotContainer.classList.value);
        console.log('  FAB classes after toggle:', openChatbotFab.classList.value);
    }

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add(sender + '-message');
        if (sender === 'bot') {
            messageDiv.innerHTML = marked.parse(text);
        } else {
            messageDiv.textContent = text;
        }
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function saveToCurrentSession(text, sender) {
        let currentSession = JSON.parse(localStorage.getItem('currentChatSession') || '[]');
        currentSession.push({ text: text, sender: sender });
        localStorage.setItem('currentChatSession', JSON.stringify(currentSession));
    }

    function loadCurrentChatSession() {
        const currentSession = JSON.parse(localStorage.getItem('currentChatSession') || '[]');
        chatMessages.innerHTML = '';

        if (currentSession.length > 0) {
            currentSession.forEach(msg => {
                addMessage(msg.text, msg.sender);
            });
        } else {
            addMessage("Hello! I'm your Cebu local expert. Ask me anything about Cebu!", "bot");
            saveToCurrentSession("Hello! I'm your Cebu local expert. Ask me anything about Cebu!", "bot");
        }
    }

    function saveChatHistory(userMsg, botMsg) {
        let history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        history.push({ user: userMsg, bot: botMsg, timestamp: new Date().toLocaleString() });
        localStorage.setItem('chatHistory', JSON.stringify(history));
    }

    function loadAndDisplayChatHistory() {
        const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        historyMessages.innerHTML = '';

        if (history.length === 0) {
            historyMessages.innerHTML = '<p class="no-history-message">No chat history found.</p>';
            return;
        }

        history.forEach(entry => {
            const historyEntryDiv = document.createElement('div');
            historyEntryDiv.classList.add('history-entry');
            historyEntryDiv.innerHTML = `
                <p><strong>You:</strong> ${entry.user}</p>
                <p><strong>Cebu Chatbot:</strong> ${marked.parse(entry.bot)}</p>
                <span class="history-timestamp">${entry.timestamp}</span>
                <hr>
            `;
            historyMessages.appendChild(historyEntryDiv);
        });
        historyMessages.scrollTop = historyMessages.scrollHeight;
    }

    function resetChat() {
        chatMessages.innerHTML = '';
        localStorage.removeItem('currentChatSession');
        addMessage("Hello! I'm your Cebu local expert. Ask me anything about Cebu!", "bot");
        saveToCurrentSession("Hello! I'm your Cebu local expert. Ask me anything about Cebu!", "bot");
        console.log('Chat session reset.');
    }

    function clearAllHistory() {
        if (confirm("Are you sure you want to clear ALL chat history? This cannot be undone.")) {
            localStorage.removeItem('chatHistory');
            loadAndDisplayChatHistory();
            console.log('All chat history cleared.');
        }
    }

    async function handleAskExpert() {
        const question = expertQuestionInput.value.trim();
        if (!question) return;

        addMessage(question, 'user');
        saveToCurrentSession(question, 'user');
        expertQuestionInput.value = '';
        expertQuestionInput.style.height = 'auto';
        expertSpinner.style.display = 'block';

        try {
            const apiUrl = '/ask-chatbot/';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify({ question: question })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Request failed with status ${response.status}`);
            }

            const result = await response.json();

            if (result.answer) {
                addMessage(result.answer, 'bot');
                saveToCurrentSession(result.answer, 'bot');
                saveChatHistory(question, result.answer);
            } else {
                throw new Error("Received an empty answer from the server.");
            }

        } catch (error) {
            console.error("Error fetching expert answer:", error);
            addMessage(`I apologize, an error occurred: ${error.message}. Please try again.`, 'bot');
            saveToCurrentSession(`I apologize, an error occurred: ${error.message}. Please try again.`, 'bot');
        } finally {
            expertSpinner.style.display = 'none';
        }
    }

    // Chatbot Event Listeners
    // ADD LISTENERS WITH NULL CHECK BEFOREHAND FOR DIAGNOSIS
    if (openChatbotFab) {
        openChatbotFab.addEventListener('click', toggleChatbot);
        console.log('Listener added to openChatbotFab.');
    } else {
        console.error('ERROR: openChatbotFab element not found. Check HTML ID.');
    }

    if (chatbotCloseBtn) {
        chatbotCloseBtn.addEventListener('click', toggleChatbot);
        console.log('Listener added to chatbotCloseBtn.');
    } else {
        console.warn('WARNING: chatbotCloseBtn element not found. Chatbot close might not work.');
    }

    askExpertBtn?.addEventListener('click', handleAskExpert);
    expertQuestionInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleAskExpert();
        }
    });
    expertQuestionInput?.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // NEW: Reset and History Button Event Listeners
    resetChatBtn?.addEventListener('click', resetChat);

    if (viewHistoryBtn) {
        viewHistoryBtn.addEventListener('click', () => {
            loadAndDisplayChatHistory();
            historyModal?.classList.remove('is-hidden'); // Use is-hidden
            historyModal?.classList.add('is-visible'); // Use is-visible
            console.log('History modal opened.');
        });
    } else {
        console.warn('WARNING: viewHistoryBtn element not found.');
    }

    if (historyModalCloseBtn) {
        historyModalCloseBtn.addEventListener('click', () => {
            historyModal?.classList.add('is-hidden'); // Use is-hidden
            historyModal?.classList.remove('is-visible'); // Use is-visible
            console.log('History modal closed.');
        });
    } else {
        console.warn('WARNING: historyModalCloseBtn element not found.');
    }

    clearHistoryBtn?.addEventListener('click', clearAllHistory);


    // --- Destination Modal Logic ---
    const destinationModal = document.getElementById('destination-modal');
    const modalCloseBtn = destinationModal?.querySelector('.modal-close-btn');
    const modalTitle = document.getElementById('modal-destination-title');
    const modalImage = document.getElementById('modal-destination-image');
    const modalDescription = document.getElementById('modal-destination-description');
    const modalDetails = document.getElementById('modal-destination-details');

    document.querySelectorAll('.card-link').forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const destinationId = this.dataset.destinationId;
            const card = this.closest('.card');
            const title = card.querySelector('.card-title').textContent;
            const description = card.querySelector('.card-description').textContent;
            const imageUrl = card.querySelector('.card-image').src;

            modalTitle.textContent = title;
            modalImage.src = imageUrl;
            modalDescription.textContent = description;
            modalDetails.innerHTML = `<p>${description}</p>`;

            destinationModal?.classList.remove('is-hidden'); // Use is-hidden
            destinationModal?.classList.add('is-visible'); // Use is-visible
            console.log('Destination modal opened.');
        });
    });

    modalCloseBtn?.addEventListener('click', () => {
        destinationModal?.classList.add('is-hidden'); // Use is-hidden
        destinationModal?.classList.remove('is-visible'); // Use is-visible
        console.log('Destination modal closed.');
    });

    // Close modal if user clicks outside of it
    destinationModal?.addEventListener('click', function(event) {
        if (event.target === this) {
            destinationModal?.classList.add('is-hidden'); // Use is-hidden
            destinationModal?.classList.remove('is-visible'); // Use is-visible
        }
    });
    historyModal?.addEventListener('click', function(event) {
        if (event.target === this) {
            historyModal?.classList.add('is-hidden'); // Use is-hidden
            historyModal?.classList.remove('is-visible'); // Use is-visible
        }
    });

    // --- Weather Display Logic ---
    async function fetchWeather() {
        const weatherDisplay = document.getElementById('weather-display');
        const weatherSpinner = weatherDisplay?.querySelector('.loading-spinner');
        const weatherText = weatherDisplay?.querySelector('.weather-text');

        if (!weatherDisplay || !weatherSpinner || !weatherText) return;

        weatherSpinner.style.display = 'block';
        weatherText.textContent = 'Loading weather...';

        try {
            const response = await fetch('/get-weather/'); // Adjust this URL if your weather endpoint is different
            const data = await response.json();

            if (response.ok) {
                weatherText.innerHTML = `<i class="fas fa-cloud-sun"></i> ${data.temperature}°C, ${data.description} in Mandaue`;
            } else {
                weatherText.textContent = `Weather Error: ${data.error || 'Failed to fetch'}`;
            }
        } catch (error) {
            console.error('Error fetching weather:', error);
            weatherText.textContent = 'Weather not available.';
        } finally {
            weatherSpinner.style.display = 'none';
        }
    }
    // Call weather fetch on initial page load
    fetchWeather();
});
document.getElementById('view-history-btn').addEventListener('click', async function() {
    const response = await fetch('/get-chat-history/');
    const data = await response.json();
    const historyMessages = document.getElementById('history-messages');
    historyMessages.innerHTML = '';
    if (data.history.length === 0) {
        historyMessages.innerHTML = '<p class="no-history-message">No chat history found.</p>';
    } else {
        data.history.forEach(msg => {
            const div = document.createElement('div');
            div.className = msg.sender + '-message';
            div.textContent = `[${msg.timestamp}] ${msg.sender === 'user' ? 'You' : 'Bot'}: ${msg.message}`;
            historyMessages.appendChild(div);
        });
    }
    document.getElementById('history-modal').classList.remove('hidden');
});