from openai import OpenAI
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

OPENAI_ORG_ID = os.environ["OPENAI_ORG_ID"]
OPENAI_PROJECT = os.environ["OPENAI_PROJECT"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

# Initialize OpenAI client
client = OpenAI(
    organization = OPENAI_ORG_ID,
    project = OPENAI_PROJECT,
    api_key = OPENAI_API_KEY
)

chat_history = []

# Function to generate a response from the chatbot
def generate_response(prompt):
    chat_history.append({"role": "user", "content": prompt})
    if len(chat_history) > 10:
        chat_history[:] = chat_history[-10:]    # Keep only the last 10 messages to manage context length
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=chat_history
    )
    assistant_message = response.choices[0].message.content.strip()
    chat_history.append({"role": "assistant", "content": assistant_message}) 
    return assistant_message

# Main loop to interact with the chatbot
if __name__ == "__main__":
    while True:
        user_input = input("You: ")
        if user_input.lower() in ["exit", "quit", "bye"]:
            print("Goodbye!")
            break
        if len(user_input) < 2:
            print("Please enter a valid message.") # Ignoring very short inputs
            continue
        response = generate_response(user_input)
        print(f"Assistant: {response}")
