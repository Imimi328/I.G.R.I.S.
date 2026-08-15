import urllib.request
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

url = "https://ingres.iith.ac.in/main.a1d99c2ec798f3107044.js"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

try:
    with urllib.request.urlopen(req, timeout=15) as response:
        content = response.read().decode('utf-8', errors='ignore')
        print(f"Downloaded main.js ({len(content)} bytes)")
        
        # Look for API endpoints, URLs, http calls
        endpoints = set(re.findall(r'["\'](https?://[^"\']+|/[a-zA-Z0-9_\-/]+(?:api|gec|gw|assessment|state|district|block)[^"\']*)["\']', content, re.IGNORECASE))
        print(f"Found {len(endpoints)} potential endpoints/URLs:")
        for ep in sorted(endpoints):
            if not any(x in ep for x in ['schema.org', 'w3.org', 'google', 'fontawesome', 'github', 'gstatic']):
                print("  ", ep)
except Exception as e:
    print(f"Error: {e}")
