// const SPEECH_SERVER_URL = 'http://localhost:5000/api';

// const SPEECH_SERVER_URL = 'http://127.0.0.1:4098/api'; // pythonanyhere
const SPEECH_SERVER_URL = 'https://acn-webrtc-prod-1.onrender.com/api';  // Render.com
// Function to send speech text to server
export const sendSpeechText = async (userId, message) => {
    try {
        const response = await fetch(`${SPEECH_SERVER_URL}/speech`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                message
            })
        });

        if (!response.ok) {
            throw new Error('Failed to send speech text');
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending speech text:', error);
        throw error;
    }
};

// Function to get messages for a specific user
export const getUserMessages = async (userId) => {
    try {
        const response = await fetch(`${SPEECH_SERVER_URL}/messages/${userId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch user messages');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching user messages:', error);
        throw error;
    }
};

// Function to get all messages
export const getAllMessages = async () => {
    try {
        const response = await fetch(`${SPEECH_SERVER_URL}/messages`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch all messages');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching all messages:', error);
        throw error;
    }
};

// Function to format timestamp
export const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString();
};

// Function to generate a random user ID
export const generateUserId = () => {
    return 'user_' + Math.random().toString(36).substr(2, 9);
}; 

/**
 * Function to get a meeting summary from the server
 * @param {string} prompt - The custom prompt to summarize the meeting (e.g., "What decisions were made?")
 * @returns {Promise} - Promise containing the summary response
 */
export const getMeetingSummary = async (prompt = "What has happened in the meeting so far?") => {
    try {
        const response = await fetch(`${SPEECH_SERVER_URL}/summarize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get meeting summary');
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting meeting summary:', error);
        throw error;
    }
};