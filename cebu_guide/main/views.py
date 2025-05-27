import os
import markdown
import requests
import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt  # Use this for simplicity in this example
from django.views.decorators.http import require_GET
from .models import ChatHistory

def index(request):
    """ Renders the main page. """
    return render(request, 'main/index.html')

@csrf_exempt  # You can keep this for testing, but remember to handle CSRF properly in production
def ask_chatbot(request):
    """
    Handles chatbot requests from the frontend.
    Dynamically adjusts the prompt based on the user's question, calls the Gemini API, and returns the answer as HTML.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method.'}, status=405)

    try:
        # Load the question from the JSON request body
        data = json.loads(request.body)
        question = data.get('question')

        if not question:
            return JsonResponse({'error': 'No question provided.'}, status=400)

        # Handle simple greetings
        greetings = ['hello', 'hi', 'hey']
        if question.lower() in greetings:
            return JsonResponse({'answer': 'Hello! How can I assist you with your Cebu travel plans today?'})

        # Get the API key from environment variables
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            return JsonResponse({'error': 'API key is not configured on the server.'}, status=500)

        # Dynamically adjust the prompt based on the user's question
        if "historical" in question.lower() or "culture" in question.lower():
            prompt = f"""
            You are a formal Cebu travel expert. A user is asking about historical and cultural landmarks in Cebu.
            Respond to their question: '{question}'

            Provide a concise and helpful answer, structured in the following formal format:

            * **Location Name:** A brief, formal description of the landmark.
            """
        elif "adventure" in question.lower() or "nature" in question.lower():
            prompt = f"""
            You are a formal Cebu travel expert. A user is asking about natural attractions and adventure activities in Cebu.
            Respond to their question: '{question}'

            Provide a concise and helpful answer, structured in the following formal format:

            * **Location Name:** A brief, formal description of the attraction.
            """
        elif "beach" in question.lower() or "marine" in question.lower():
            prompt = f"""
            You are a formal Cebu travel expert. A user is asking about beaches and marine sanctuaries in Cebu.
            Respond to their question: '{question}'

            Provide a concise and helpful answer, structured in the following formal format:

            * **Location Name:** A brief, formal description of the beach or marine sanctuary.
            """
        else:
            # Default prompt for general questions
            prompt = f"""
            You are a formal Cebu travel expert. A user is asking about Cebu.
            Respond to their question: '{question}'

            Provide a concise and helpful answer, structured in a formal tone. Use headings, bullet points, and Markdown formatting where appropriate.
            """

        # Construct the payload
        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }

        # Make the API request
        gemini_url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={api_key}'
        headers = {'Content-Type': 'application/json'}
        response = requests.post(gemini_url, json=payload, headers=headers)
        response.raise_for_status()  # Raise an exception for HTTP errors

        # Parse the API response
        result = response.json()
        ai_text = result['candidates'][0]['content']['parts'][0]['text']

        # Convert Markdown to HTML before sending back to frontend
        html_answer = markdown.markdown(ai_text)

        # Save user message
        session_key = request.session.session_key or request.session.save() or request.session.session_key
        ChatHistory.objects.create(
            user_session=session_key,
            message=question,
            sender='user'
        )

        # Save bot message
        ChatHistory.objects.create(
            user_session=session_key,
            message=ai_text,
            sender='bot'
        )

        # Return the AI-generated HTML response to the frontend
        return JsonResponse({'answer': html_answer})

    except requests.exceptions.RequestException as e:
        return JsonResponse({'error': f'API request failed: {e}'}, status=500)
    except (KeyError, IndexError) as e:
        return JsonResponse({'error': f'Failed to parse API response: {e}'}, status=500)
    except Exception as e:
        return JsonResponse({'error': f'An unexpected error occurred: {e}'}, status=500)

@require_GET
def get_chat_history(request):
    session_key = request.session.session_key
    if not session_key:
        return JsonResponse({'history': []})
    history = ChatHistory.objects.filter(user_session=session_key).order_by('timestamp')
    data = [
        {'sender': msg.sender, 'message': msg.message, 'timestamp': msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')}
        for msg in history
    ]
    return JsonResponse({'history': data})
