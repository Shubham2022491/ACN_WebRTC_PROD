from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import json
import os
# from openai import OpenAI
# from google import genai
import google.generativeai as genai
import threading
import time



app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize OpenAI client
# client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
# Set your API Key
genai.configure(api_key="AIzaSyBLZH1GAW3Rs-fhmayphsnXgqOP_6-AbIw")
# client = genai.Client(api_key="AIzaSyBLZH1GAW3Rs-fhmayphsnXgqOP_6-AbIw")
# Load the model
model = genai.GenerativeModel('gemini-2.0-flash')
# Dictionary to store messages
# Format: {timestamp: {userId: str, message: str}, ...}
messages = {}

# System prompt for the LLM
SYSTEM_PROMPT = """You are a meeting assistant. Your task is to analyze the conversation and provide insights about what happened in the meeting. 
Focus on key points, decisions made, action items, and important discussions. 
Be concise but informative in your responses."""

@app.route('/api/speech', methods=['POST'])
def receive_speech():
    try:
        data = request.json
        user_id = data.get('userId')
        message = data.get('message')
        print(user_id, message)  # Debugging line
        timestamp = datetime.now().isoformat()

        if not user_id or not message:
            return jsonify({'error': 'Missing userId or message'}), 400

        # Store message with timestamp as key
        messages[timestamp] = {
            'userId': user_id,
            'message': message
        }
        print(messages)

        return jsonify({
            'status': 'success',
            'message': 'Speech text received and stored',
            'timestamp': timestamp
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/messages/<user_id>', methods=['GET'])
def get_user_messages(user_id):
    try:
        # Filter messages by user ID
        user_messages = {
            timestamp: data 
            for timestamp, data in messages.items() 
            if data['userId'] == user_id
        }
        
        # Convert to list of objects with timestamp
        formatted_messages = [
            {
                'timestamp': timestamp,
                'message': data['message']
            }
            for timestamp, data in user_messages.items()
        ]
        
        # Sort by timestamp
        formatted_messages.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return jsonify({'messages': formatted_messages}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/messages', methods=['GET'])
def get_all_messages():
    try:
        # Convert to list of objects with timestamp
        formatted_messages = [
            {
                'timestamp': timestamp,
                'userId': data['userId'],
                'message': data['message']
            }
            for timestamp, data in messages.items()
        ]
        
        # Sort by timestamp
        formatted_messages.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return jsonify({'messages': formatted_messages}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/summarize', methods=['POST'])
def summarize_meeting():
    try:
        print("in summarize")
        data = request.json
        user_prompt = data.get('prompt', 'What has happened in the meeting so far?')
        
        # Get all messages and format them chronologically
        formatted_messages = [
            f"[{data['userId']} at {timestamp}]: {data['message']}"
            for timestamp, data in sorted(messages.items())
        ]
        
        # Combine messages into a single context
        meeting_context = "\n".join(formatted_messages)
        
        # Prepare the messages for the LLM
        messages_for_llm = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Here is the meeting transcript:\n\n{meeting_context}\n\n{user_prompt}"}
        ]

        # Send a prompt
        print("sending to LLM")
        print(messages_for_llm)
        # put try error
        try:
            response = model.generate_content(str(messages_for_llm))
        except Exception as e:
            print("Error in generating content:", str(e))
            return jsonify({'error': 'Failed to generate content'}), 500

        # Print the response
        print(response.text)
        
        # # Get response from LLM
        # response = client.chat.completions.create(
        #     model="gpt-3.5-turbo",
        #     messages=messages_for_llm,
        #     temperature=0.7,
        #     max_tokens=500
        # )
        
        # summary = response.choices[0].message.content
        summary = response.text
        return jsonify({
            'status': 'success',
            'summary': summary
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def clear_messages_periodically():
    # print("before clearing : ",messages)
    while True:
        # print("before clearing : ",messages)
        time.sleep(600)  # Wait for 10 minutes (600 seconds)
        print("Clearing messages dictionary...")
        messages.clear()
        print("messages: ",messages)

if __name__ == '__main__':

     # Start the background thread for clearing messages
    clearing_thread = threading.Thread(target=clear_messages_periodically)
    clearing_thread.daemon = True  # Daemon thread will close with the main app
    clearing_thread.start()
    app.run(host='0.0.0.0', port=5000, debug=True) 