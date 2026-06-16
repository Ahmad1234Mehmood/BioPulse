import requests
import sys

def test_chat():
    url = "http://localhost:8000/api/v1/llm/chat"
    payload = {
        "message": "Why is the False Rejection Rate (FRR) high in the system, and what is our Equal Error Rate (EER)?",
        "history": []
    }
    
    print(f"Sending request to {url}...")
    try:
        response = requests.post(url, json=payload, timeout=30)
        if response.status_code == 200:
            data = response.json()
            reply = data.get("reply", "")
            print("\n--- Success! Response status 200 ---")
            print(f"Reply Preview:\n{reply[:500]}...\n")
            
            # Check for actual telemetry statistics in the response
            contains_eer = "0.97%" in reply or "0.0097" in reply or "EER" in reply or "Equal Error Rate" in reply
            print(f"Contains EER details: {contains_eer}")
            return True
        else:
            print(f"Failed with status code {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"Connection error: {e}")
        print("Make sure the backend server is running on port 8000 (uvicorn app.main:app --reload --port 8000).")
        return False

if __name__ == "__main__":
    success = test_chat()
    sys.exit(0 if success else 1)
