import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Try calling parse.bot endpoint
url = "https://api.parse.bot/scraper/193cf43e-4028-48b5-ad4b-45df7e18386f/get_assessment_years"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

try:
    with urllib.request.urlopen(req, timeout=10) as response:
        print("Status Code:", response.status)
        data = response.read().decode('utf-8')
        print("Response:", data[:500])
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code} - {e.reason}")
    print(e.read().decode('utf-8', errors='ignore')[:500])
except Exception as e:
    print(f"Error: {e}")
