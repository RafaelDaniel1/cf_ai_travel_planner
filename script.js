// script.js

const WORKER_API_URL = 'https://22527da8.smart-travel-planner.pages.dev/'; 

let sessionId = localStorage.getItem('travel_session_id') || `session-${Date.now()}`;
let userPreferences = {};

const chatWindow = document.getElementById('chat-window');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const loadingIndicator = document.getElementById('loading-indicator');

function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-msg`;
    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';
    contentDiv.innerText = content;
    messageDiv.appendChild(contentDiv);
    chatWindow.appendChild(messageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function updatePreferencesDisplay(prefs) {
    let display = 'Current Preferences: ';
    const parts = [];
    if (prefs.destination) parts.push(`📍 ${prefs.destination}`);
    if (prefs.duration) parts.push(`🗓️ ${prefs.duration}`);
    if (prefs.budget) parts.push(`💰 ${prefs.budget}`);
    if (parts.length > 0) {
        display = `<div class="preferences">Context: ${parts.join(' | ')}</div>`;
        const existingPrefs = document.querySelector('.preferences');
        if (existingPrefs) {
            existingPrefs.outerHTML = display;
        } else {
            chatWindow.insertAdjacentHTML('afterbegin', display);
        }
    }
}

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    addMessage('user', message);
    chatInput.value = '';
    sendButton.disabled = true;
    loadingIndicator.style.display = 'block';

    try {
        let endpoint = '/chat';
        let body = { message, session_id: sessionId };

        // Simple heuristic to detect if user wants a full itinerary
        if (message.toLowerCase().includes('create itinerary') || message.toLowerCase().includes('generate plan')) {
             // If key preferences are set, call the /itinerary endpoint
             if (userPreferences.destination && userPreferences.duration) {
                endpoint = '/itinerary';
                body = {
                    destination: userPreferences.destination,
                    duration: userPreferences.duration,
                    interests: userPreferences.interests,
                    budget: userPreferences.budget,
                    session_id: sessionId
                };
             }
        }
        
        const response = await fetch(`${WORKER_API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (response.ok) {
            if (endpoint === '/itinerary') {
                // Display structured itinerary response
                const itinerary = data.itinerary;
                let aiResponseText = `**ITINERARY GENERATED for ${itinerary.destination}**\n\nSummary: ${itinerary.summary}\n\n`;
                itinerary.dailyItinerary.forEach(day => {
                    aiResponseText += `--- Day ${day.day}: ${day.theme} ---\n`;
                    day.activities.forEach(activity => {
                        aiResponseText += `- ${activity}\n`;
                    });
                });
                aiResponseText += `\nTips: ${itinerary.travelTips.join(', ')}`;
                addMessage('ai', aiResponseText);
            } else {
                // Display simple chat response
                addMessage('ai', data.response);
                userPreferences = data.preferences || userPreferences;
                updatePreferencesDisplay(userPreferences);
            }
            
            // Update session ID if it was 'default'
            if (data.session_id) {
                sessionId = data.session_id;
                localStorage.setItem('travel_session_id', sessionId);
            }
        } else {
            addMessage('ai', `Error: ${data.error || 'Could not get response from AI worker.'}`);
        }

    } catch (error) {
        console.error('Fetch error:', error);
        addMessage('ai', 'A network error occurred. Please check your worker URL.');
    } finally {
        sendButton.disabled = false;
        loadingIndicator.style.display = 'none';
    }
}

sendButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

if (sessionId) {
    console.log(`Loaded session ID: ${sessionId}`);
}
