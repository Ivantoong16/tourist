console.log("script.js loaded!"); // Added for debugging: check your browser's console for this message.

document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                event.preventDefault();
                const targetElement = document.querySelector(href);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    // Click "Explore Cebu" header to scroll to top
    const homeLink = document.getElementById('home-link');
    if (homeLink) {
        homeLink.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent any default link behavior if it were an <a> tag
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Contact Form Submission
    const contactForm = document.getElementById('contact-form');
    const formSubmissionMessage = document.getElementById('form-submission-message');

    if (contactForm && formSubmissionMessage) {
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Prevent actual submission for this demo
            formSubmissionMessage.textContent = "Sending your message...";
            formSubmissionMessage.classList.remove('hidden', 'text-green-600', 'text-red-600');
            formSubmissionMessage.classList.add('text-gray-700'); // Use appropriate Tailwind class or custom style

            // Simulate form submission
            setTimeout(() => {
                formSubmissionMessage.textContent = "Thank you for your feedback!";
                formSubmissionMessage.classList.remove('text-gray-700');
                formSubmissionMessage.classList.add('text-green-600'); // Use appropriate Tailwind class or custom style
                contactForm.reset(); // Reset form fields

                // Optionally hide the message after a few seconds
                setTimeout(() => {
                    formSubmissionMessage.classList.add('hidden');
                }, 3000);
            }, 1000);
        });
    }

    // --- Messenger-style Chatbot Logic ---
    const chatbotContainer = document.getElementById('chatbot-container');
    const openChatbotFab = document.getElementById('open-chatbot-fab');
    const chatbotCloseBtn = chatbotContainer.querySelector('.chatbot-close-btn');
    const chatMessages = document.getElementById('chat-messages');
    const expertQuestionInput = document.getElementById('expert-question');
    const askExpertBtn = document.getElementById('ask-expert-btn');
    const expertSpinner = document.getElementById('expert-answer-spinner');

    // Function to toggle chatbot visibility
    function toggleChatbot() {
        chatbotContainer.classList.toggle('visible');
        openChatbotFab.classList.toggle('hidden'); // Hide FAB when chat is open
        if (chatbotContainer.classList.contains('visible')) {
            expertQuestionInput.focus(); // Focus input when chat opens
            chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom
        }
    }

    // Event listeners for chatbot open/close
    if (openChatbotFab) {
        openChatbotFab.addEventListener('click', toggleChatbot);
    }
    if (chatbotCloseBtn) {
        chatbotCloseBtn.addEventListener('click', toggleChatbot);
    }

    // Function to add a message to the chat display
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add(sender + '-message');
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to latest message
    }

    // Chatbot API Call
    if (askExpertBtn && expertQuestionInput && chatMessages && expertSpinner) {
        askExpertBtn.addEventListener('click', async () => {
            const question = expertQuestionInput.value.trim();
            if (!question) {
                return; // Don't send empty messages
            }

            // Add user message to chat
            addMessage(question, 'user');
            expertQuestionInput.value = ''; // Clear input
            expertQuestionInput.style.height = 'auto'; // Reset textarea height

            expertSpinner.style.display = 'block'; // Show spinner

            try {
                // Gemini API call: API key is automatically provided by the Canvas environment when left blank.
                let chatHistory = [{ role: "user", parts: [{ text: "You are a friendly Cebu local expert. Answer the following question about Cebu concisely and helpfully: " + question }] }];
                const payload = { contents: chatHistory };
                const apiKey = "AIzaSyA6OrauzwNsuYqi0qd4VOIXgygzUvYTFhI"; // Leave this blank for Gemini API key to be provided by Canvas.
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
                
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Gemini API Error:', errorData);
                    throw new Error(`API request failed with status ${response.status}. Check console for details.`);
                }
                
                const result = await response.json();

                if (result.candidates && result.candidates.length > 0 &&
                    result.candidates[0].content && result.candidates[0].content.parts &&
                    result.candidates[0].content.parts.length > 0) {
                    const text = result.candidates[0].content.parts[0].text;
                    addMessage(text, 'bot'); // Add bot response to chat
                } else {
                    console.error('Unexpected API response structure:', result);
                    addMessage("Sorry, I couldn't get a response. The API might have returned an unexpected result.", 'bot');
                }
            } catch (error) {
                console.error("Error fetching expert answer:", error);
                addMessage(`Sorry, something went wrong: ${error.message}. Please try again later.`, 'bot');
            } finally {
                expertSpinner.style.display = 'none'; // Hide spinner
            }
        });

        // Allow sending message with Enter key (Shift+Enter for new line)
        expertQuestionInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault(); // Prevent new line
                askExpertBtn.click(); // Trigger send button click
            }
        });

        // Adjust textarea height dynamically
        expertQuestionInput.addEventListener('input', function() {
            this.style.height = 'auto'; // Reset height to auto
            this.style.height = (this.scrollHeight) + 'px'; // Set height to scroll height
        });
    }


    // --- Weather Fetching Logic ---
    const weatherDisplay = document.getElementById('weather-display');
    const weatherTextElement = weatherDisplay.querySelector('.weather-text');
    const weatherSpinner = weatherDisplay.querySelector('.loading-spinner');

    // !!! IMPORTANT: THIS IS YOUR OPENWEATHERMAP API KEY. ENSURE IT IS CORRECT AND ACTIVE. !!!
    // If you continue to get 401 errors, please verify its status on your OpenWeatherMap account page.
    const WEATHER_API_KEY = "9a8fd5ea19b8443def3fd25d4f5fd83b"; 
    // Coordinates for Cebu City, Philippines
    const LATITUDE = 10.3157;
    const LONGITUDE = 123.8854;

    async function fetchCebuWeather() {
        if (!weatherDisplay || !weatherTextElement || !weatherSpinner) {
            console.error("Weather display elements not found.");
            return;
        }

        weatherSpinner.style.display = 'block';
        weatherTextElement.textContent = 'Fetching weather...'; // Initial loading message

        // This check ensures the key is not empty. The actual validity is up to OpenWeatherMap.
        if (!WEATHER_API_KEY || WEATHER_API_KEY.trim() === "") { 
            weatherTextElement.textContent = "OpenWeatherMap API key is empty. Please ensure it's provided.";
            weatherTextElement.classList.add('error-text');
            weatherSpinner.style.display = 'none';
            console.error("OpenWeatherMap API key is empty. Please add it to the WEATHER_API_KEY constant in the script.");
            return;
        }
        weatherTextElement.classList.remove('error-text');


        const weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${LATITUDE}&lon=${LONGITUDE}&appid=${WEATHER_API_KEY}&units=metric`;

        try {
            const response = await fetch(weatherApiUrl);

            if (!response.ok) {
                const errorData = await response.json(); // Try to get error message from API
                let errorMessage = `Error ${response.status}: ${response.statusText}.`;
                if (errorData && errorData.message) {
                    errorMessage += ` Details: ${errorData.message}`;
                }
                 if (response.status === 401) {
                    errorMessage += " This could be due to an invalid API key or an issue with your OpenWeatherMap account.";
                } else if (response.status === 429) {
                    errorMessage += " You might have exceeded the API request limit.";
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();

            if (data && data.weather && data.main) {
                const temperature = data.main.temp;
                const description = data.weather[0].description;
                const iconCode = data.weather[0].icon;
                // const windSpeed = data.wind.speed; // Wind speed in m/s, convert to km/h if needed (multiply by 3.6)

                // For a simple text display:
                weatherTextElement.innerHTML = `Cebu: ${temperature.toFixed(1)}°C, ${description} <img src="https://openweathermap.org/img/wn/${iconCode}.png" alt="${description}" style="width:20px; height:20px; vertical-align:middle;">`;
                // To add wind: ` Wind: ${(windSpeed * 3.6).toFixed(1)} km/h`;
            } else {
                throw new Error("Weather data is incomplete or in an unexpected format.");
            }

        } catch (error) {
            console.error("Failed to fetch Cebu weather:", error);
            weatherTextElement.textContent = "Weather unavailable.";
            weatherTextElement.classList.add('error-text');
        } finally {
            weatherSpinner.style.display = 'none';
        }
    }

    // Fetch weather on page load
    fetchCebuWeather();

    // Update weather every 10 minutes (600000 milliseconds)
    setInterval(fetchCebuWeather, 600000);


    // --- Destination Modal Logic ---
    const destinationModal = document.getElementById('destination-modal');
    const modalCloseBtn = destinationModal.querySelector('.modal-close-btn');
    const modalTitle = document.getElementById('modal-destination-title');
    const modalImage = document.getElementById('modal-destination-image');
    const modalDescription = document.getElementById('modal-destination-description');
    const modalDetails = document.getElementById('modal-destination-details');
    const learnMoreButtons = document.querySelectorAll('.card-link');

    // Detailed destination data (add more as needed)
    const destinationDetails = {
        'bantayan': {
            title: 'Bantayan Island',
            image: 'https://placehold.co/600x400/4CAF50/ffffff?text=Bantayan+Island+Full',
            description: 'Bantayan Island is a tropical paradise located off the northern coast of Cebu. It is famous for its powder-fine white sand beaches, crystal-clear waters, and tranquil environment. Perfect for those seeking a relaxing escape from the hustle and bustle, activities include island hopping to nearby islets like Virgin Island, skydiving, and enjoying fresh seafood. The sunsets here are truly spectacular.',
            details: `
                <h4>Things to Do:</h4>
                <ul>
                    <li>Beach hopping (Sugar Beach, Paradise Beach)</li>
                    <li>Island hopping (Virgin Island, Kinatarkan Island)</li>
                    <li>Skydiving (Bantayan Island Skydive)</li>
                    <li>Enjoying fresh seafood</li>
                    <li>Cycling around the island</li>
                </ul>
                <p><strong>Best Time to Visit:</strong> Dry season (November to May)</p>
                <p><strong>How to Get There:</strong> Take a bus from Cebu North Bus Terminal to Hagnaya Port, then a ferry to Santa Fe Port in Bantayan Island.</p>
            `
        },
        'malapascua': {
            title: 'Malapascua Island',
            image: 'https://placehold.co/600x400/2196F3/ffffff?text=Malapascua+Island+Thresher+Shark',
            description: 'Malapascua is a small island renowned globally as one of the few places where you can consistently see thresher sharks. Its pristine dive sites boast vibrant coral gardens, diverse marine life, and wreck dives. Beyond diving, the island offers stunning beaches, a laid-back atmosphere, and picturesque sunsets. It is a haven for divers and non-divers alike.',
            details: `
                <h4>Highlights:</h4>
                <ul>
                    <li>Thresher shark diving at Monad Shoal</li>
                    <li>Kalanggaman Island day trip</li>
                    <li>Diving and snorkeling at various sites (Gato Island, Kemod Shoal)</li>
                    <li>Relaxing on Bounty Beach</li>
                </ul>
                <p><strong>Best Time to Visit:</strong> Year-round, but November to May offers calmer seas for diving.</p>
                <p><strong>How to Get There:</strong> Take a bus from Cebu North Bus Terminal to Maya Port, then a boat to Malapascua Island.</p>
            `
        },
        'capitancillo': {
            title: 'Capitancillo Islet',
            image: 'https://placehold.co/600x400/FFC107/333333?text=Capitancillo+Islet+Dive',
            description: 'Capitancillo Islet is a tiny, uninhabited island off the coast of Bogo City, a popular destination for snorkeling and diving. It features a lighthouse and is surrounded by thriving coral reefs and abundant marine life, making it an excellent spot for underwater exploration. The islet is a protected marine sanctuary, ensuring its natural beauty is preserved.',
            details: `
                <h4>Activities:</h4>
                <ul>
                    <li>Snorkeling</li>
                    <li>Scuba Diving</li>
                    <li>Freediving</li>
                    <li>Photography</li>
                </ul>
                <p><strong>Access:</strong> Usually visited as part of a boat tour from Bogo City or nearby islands.</p>
            `
        },
        'magellans-cross': {
            title: "Magellan's Cross",
            image: "https://placehold.co/600x400/7c3aed/ffffff?text=Magellan%27s+Cross+Cebu",
            description: "Magellan's Cross is a significant historical landmark in Cebu City, planted by Ferdinand Magellan's expedition in 1521. It symbolizes the arrival of Christianity in the Philippines and is housed in an octagonal chapel. Devotees and tourists visit daily, lighting candles and offering prayers, making it a powerful testament to Cebu's rich religious heritage.",
            details: `
                <h4>Historical Significance:</h4>
                <p>Marks the spot where the first Christian Filipinos were baptized.</p>
                <h4>Location:</h4>
                <p>Adjacent to the Basilica Minore del Santo Niño in Cebu City.</p>
            `
        },
        'fort-san-pedro': {
            title: "Fort San Pedro",
            image: "https://placehold.co/600x400/db2777/ffffff?text=Fort+San+Pedro+Cebu",
            description: "Fuerza de San Pedro, or Fort San Pedro, is a triangular bastion fort in Cebu City, built by Spanish and Cebuano laborers under the command of Miguel López de Legazpi. It is the oldest and smallest fort in the Philippines, dating back to 1565. Today, it serves as a historical park and museum, housing Spanish artifacts, canons, and a beautiful garden.",
            details: `
                <h4>History:</h4>
                <p>Built as a military defense structure against Muslim raiders.</p>
                <h4>Features:</h4>
                <ul>
                    <li>Museum with Spanish artifacts</li>
                    <li>Well-preserved canons</li>
                    <li>Beautiful garden ideal for leisurely strolls</li>
                </ul>
            `
        },
        'basilica-santo-nino': {
            title: "Basilica Minore del Santo Niño",
            image: "https://placehold.co/600x400/9C27B0/ffffff?text=Basilica+Santo+Niño+Cebu",
            description: "The Basilica Minore del Santo Niño is a major basilica in Cebu City, home to the revered Santo Niño de Cebu, a statue of the Child Jesus given by Ferdinand Magellan to Queen Juana in 1521. It is the oldest Roman Catholic church in the Philippines and a significant pilgrimage site, especially during the Sinulog Festival. Its architecture and religious artifacts make it a must-visit.",
            details: `
                <h4>Significance:</h4>
                <p>Houses the oldest religious icon in the Philippines.</p>
                <h4>Activities:</h4>
                <p>Attend mass, pray, admire the architecture, visit the museum.</p>
            `
        },
        'taoist-temple': {
            title: "Cebu Taoist Temple",
            image: "https://placehold.co/600x400/673AB7/ffffff?text=Taoist+Temple+Cebu",
            description: "The Cebu Taoist Temple, located in Beverly Hills Subdivision, Cebu City, is a beautiful and serene place of worship for followers of Taoism. Built in 1972, it features traditional Chinese architecture, ornate dragons, and colorful designs. Visitors can light joss sticks, have their fortune read, and enjoy panoramic views of Cebu City from its elevated position.",
            details: `
                <h4>Features:</h4>
                <ul>
                    <li>Multi-tiered architecture with intricate carvings</li>
                    <li>Dragon statues and vibrant murals</li>
                    <li>Prayer rituals and fortune-telling (for a fee)</li>
                    <li>Panoramic views of Cebu City</li>
                </ul>
                <p><strong>Note:</strong> Observe silence and respect religious practices.</p>
            `
        },
        'temple-of-leah': {
            title: "Temple of Leah",
            image: "https://placehold.co/600x400/E91E63/ffffff?text=Temple+of+Leah+Cebu",
            description: "The Temple of Leah, often dubbed 'Cebu's Taj Mahal,' is a grand Roman-inspired temple built by Teodorico Adarna in memory of his late wife, Leah Villa Albino-Adarna. Located in Busay, Cebu City, it showcases impressive architecture, ancient Roman-style statues, and offers breathtaking panoramic views of the city. It's a testament to undying love and a popular spot for photos.",
            details: `
                <h4>Inspiration:</h4>
                <p>Inspired by ancient Roman architecture, built as a mausoleum and shrine.</p>
                <h4>Views:</h4>
                <p>Offers stunning panoramic views of Cebu City and surrounding areas.</p>
                <h4>Tip:</h4>
                <p>Visit during late afternoon for sunset views or in the evening for city lights.</p>
            `
        },
        'sirao-garden': {
            title: "Sirao Flower Garden",
            image: "https://placehold.co/600x400/8BC34A/ffffff?text=Sirao+Flower+Garden+Cebu",
            description: "The Sirao Flower Garden, affectionately known as 'Little Amsterdam' or 'Mini Holland,' is a vibrant, picturesque destination in Busay, Cebu City. It is famous for its vast fields of celosia flowers and other colorful blooms, meticulously arranged to create stunning backdrops for photos. Visitors can enjoy the cool mountain air and beautiful landscapes.",
            details: `
                <h4>Highlights:</h4>
                <ul>
                    <li>Fields of vibrant celosia flowers</li>
                    <li>Various sculptures and installations for photo opportunities</li>
                    <li>Cool mountain climate</li>
                </ul>
                <p><strong>Best Time to Visit:</strong> Early morning or late afternoon to avoid crowds and harsh sun.</p>
            `
        },
        'tops-lookout': {
            title: "Tops Lookout",
            image: "https://placehold.co/600x400/607D8B/ffffff?text=Tops+Lookout+Cebu",
            description: "Tops Lookout is one of the most iconic viewpoints in Cebu, offering a breathtaking 360-degree panoramic vista of Cebu City, Mactan Island, and the neighboring islands. Located in Busay, it provides a cool escape from the city heat. It's a popular spot for both locals and tourists to relax, enjoy the view, and take stunning photos, especially at sunset or night when the city lights twinkle.",
            details: `
                <h4>Views:</h4>
                <ul>
                    <li>Panoramic views of Cebu City, Mactan Island, and beyond.</li>
                    <li>Spectacular sunset views.</li>
                    <li>Twinkling city lights at night.</li>
                </ul>
                <p><strong>Tip:</strong> Bring a jacket as it can get chilly, especially in the evening.</p>
            `
        },
        'kawasan-falls': {
            title: 'Kawasan Falls',
            image: 'https://placehold.co/600x400/16a34a/ffffff?text=Kawasan+Falls+Badian',
            description: 'Kawasan Falls is a stunning multi-tiered waterfall system located in Badian, Cebu. It is famous for its mesmerizing turquoise waters, lush tropical surroundings, and exciting canyoneering adventures. The journey to the falls involves a scenic trek, and visitors can swim in the natural pools or take a raft ride under the cascades. It is a prime spot for adventure seekers.',
            details: `
                <h4>Main Activities:</h4>
                <ul>
                    <li>Canyoneering from Alegria to Kawasan Falls</li>
                    <li>Swimming in the natural pools</li>
                    <li>Bamboo raft ride under the falls</li>
                    <li>Trekking</li>
                </ul>
                <p><strong>Location:</strong> Badian, Southern Cebu.</p>
                <p><strong>Note:</strong> Hiring a local guide for canyoneering is highly recommended for safety.</p>
            `
        },
        'oslob-whale-sharks': {
            title: 'Oslob Whale Sharks',
            image: 'https://placehold.co/600x400/d97706/ffffff?text=Oslob+Whale+Sharks+Experience',
            description: 'Oslob offers a unique opportunity to interact with whale sharks, the gentle giants of the sea. Visitors can swim or snorkel alongside these magnificent creatures in their natural habitat. While a popular tourist activity, it is important to choose responsible tour operators that adhere to strict guidelines to ensure the welfare of the whale sharks and the sustainability of the interaction.',
            details: `
                <h4>Experience:</h4>
                <ul>
                    <li>Snorkeling or swimming with whale sharks.</li>
                    <li>Observing whale sharks from a boat.</li>
                </ul>
                <p><strong>Location:</strong> Tan-awan, Oslob, Southern Cebu.</p>
                <p><strong>Ethical Considerations:</strong> Research responsible tourism practices and choose operators that prioritize whale shark welfare.</p>
            `
        },
        'moalboal-sardine-run': {
            title: 'Moalboal Sardine Run',
            image: 'https://placehold.co/600x400/00BCD4/ffffff?text=Moalboal+Sardine+Run+Underwater',
            description: 'Moalboal is world-renowned for its incredible sardine run, where millions of sardines form massive, swirling bait balls just a few meters from the shore. This natural phenomenon offers an unparalleled snorkeling and diving experience, attracting marine enthusiasts from around the globe. Beyond the sardines, Moalboal boasts diverse coral reefs and other vibrant marine life.',
            details: `
                <h4>What to Expect:</h4>
                <ul>
                    <li>Millions of sardines forming massive schools.</li>
                    <li>Accessible directly from the shore at Panagsama Beach.</li>
                    <li>Often accompanied by predators like jacks and tuna.</li>
                </ul>
                <p><strong>Location:</strong> Panagsama Beach, Moalboal, Southern Cebu.</p>
                <p><strong>Activity:</strong> Ideal for snorkeling and diving.</p>
            `
        },
        'osmena-peak': {
            title: 'Osmeña Peak',
            image: 'https://placehold.co/600x400/FF9800/ffffff?text=Osmeña+Peak+Cebu+View',
            description: "Osmeña Peak is Cebu's highest point, standing at approximately 1,000 meters above sea level. It is characterized by its unique, jagged hills, often compared to the Chocolate Hills of Bohol but sharper. A relatively easy trek leads to the summit, where you're rewarded with breathtaking 360-degree panoramic views of Cebu's diverse landscape, including distant coastlines and lush mountains.",
            details: `
                <h4>Trekking:</h4>
                <ul>
                    <li>Relatively easy trek, suitable for beginners.</li>
                    <li>Takes about 20-30 minutes to reach the summit from the drop-off point.</li>
                </ul>
                <h4>Views:</h4>
                <p>Stunning panoramic views of jagged hills, coastlines, and clouds.</p>
                <p><strong>Location:</strong> Dalaguete, Southern Cebu.</p>
            `
        },
        'sumilon-island': {
            title: 'Sumilon Island',
            image: 'https://placehold.co/600x400/795548/ffffff?text=Sumilon+Island+Sandbar',
            description: 'Sumilon Island is a small, pristine island located off the coast of Oslob, famous for its dynamic sandbar that shifts shapes depending on the season and tide. It is home to Bluewater Sumilon Island Resort, but day-trippers can also enjoy its crystal-clear waters, vibrant marine sanctuary, and beautiful beaches. Ideal for snorkeling, diving, and simply relaxing on the white sand.',
            details: `
                <h4>Attractions:</h4>
                <ul>
                    <li>Shifting white sandbar</li>
                    <li>Crystal-clear waters for swimming and snorkeling</li>
                    <li>Marine sanctuary with rich marine life</li>
                    <li>Lighthouse and natural lagoon</li>
                </ul>
                <p><strong>Access:</strong> Usually accessed via boat trips from Oslob.</p>
            `
        }
    };

    function openDestinationModal(destinationId) {
        const data = destinationDetails[destinationId];
        if (data) {
            modalTitle.textContent = data.title;
            modalImage.src = data.image;
            modalDescription.textContent = data.description;
            modalDetails.innerHTML = data.details || ''; // Populate additional details
            destinationModal.classList.add('visible');
            document.body.style.overflow = 'hidden'; // Prevent scrolling background
        } else {
            console.error('Destination data not found for ID:', destinationId);
        }
    }

    function closeDestinationModal() {
        destinationModal.classList.remove('visible');
        document.body.style.overflow = ''; // Restore scrolling
        // Clear content to prevent flicker on next open (optional but good practice)
        modalTitle.textContent = '';
        modalImage.src = '';
        modalDescription.textContent = '';
        modalDetails.innerHTML = '';
    }

    // Attach click listeners to all "Learn More" buttons
    learnMoreButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent default link behavior
            const destinationId = this.dataset.destinationId; // Get the ID from data-destination-id
            if (destinationId) {
                openDestinationModal(destinationId);
            }
        });
    });

    // Attach click listener to the close button
    modalCloseBtn.addEventListener('click', closeDestinationModal);

    // Close modal if overlay is clicked (but not the content itself)
    destinationModal.addEventListener('click', function(event) {
        if (event.target === destinationModal) {
            closeDestinationModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && destinationModal.classList.contains('visible')) {
            closeDestinationModal();
        }
    });

    // --- Scroll Animation Logic ---
    const animatedElements = document.querySelectorAll('.animate-on-scroll');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-animated');
                // Optional: Stop observing once animated if it's a one-time animation
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.2, // Trigger when 20% of the element is visible
        rootMargin: '0px 0px -50px 0px' // Adjust the viewport margin for triggering
    });

    animatedElements.forEach(element => {
        observer.observe(element);
    });
});
