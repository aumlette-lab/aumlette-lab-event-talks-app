import os
import hashlib
import xml.etree.ElementTree as ET
import requests
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for release notes
_releases_cache = []

def parse_html_content(date, html_content, alternate_link):
    """Parses entry HTML content and splits it into individual update items by h3 tags."""
    if not html_content:
        return []
    
    soup = BeautifulSoup(html_content, 'html.parser')
    releases = []
    
    current_type = "Update"
    current_elements = []
    
    for child in soup.contents:
        # Check if it's a heading tag (e.g. h3)
        if child.name == 'h3':
            if current_elements:
                releases.append(create_release_item(date, current_type, current_elements, alternate_link))
                current_elements = []
            current_type = child.get_text().strip()
        elif child.name is not None:
            current_elements.append(child)
            
    # Add the last block
    if current_elements:
        releases.append(create_release_item(date, current_type, current_elements, alternate_link))
        
    return releases

def create_release_item(date, update_type, elements, alternate_link):
    # Reconstruct HTML and clean up paths to absolute Google Cloud Docs links if needed
    html_str = ""
    for el in elements:
        # Find all links and update relative links to absolute
        for a in el.find_all('a', href=True):
            if a['href'].startswith('/'):
                a['href'] = 'https://docs.cloud.google.com' + a['href']
            elif a['href'].startswith('cloud.google.com'):
                a['href'] = 'https://' + a['href']
        html_str += str(el)
        
    text_str = "".join(el.get_text() for el in elements).strip()
    
    # Generate unique ID
    content_hash = hashlib.md5((date + update_type + text_str).encode('utf-8')).hexdigest()
    
    # Extract anchor link if available from alternate link
    anchor = f"#{date.replace(' ', '_').replace(',', '')}"
    full_link = alternate_link if alternate_link else "https://docs.cloud.google.com/bigquery/docs/release-notes"
    
    # Detect secondary categories
    categories = [update_type]
    text_lower = text_str.lower()
    
    keywords = {
        "gemini": "Gemini",
        "generative ai": "AI",
        "genai": "AI",
        "ai functions": "AI",
        "udf": "UDF",
        "vector": "Vector Index",
        "continuous queries": "Continuous Queries",
        "continuous query": "Continuous Queries",
        "iam": "Security",
        "deny policies": "Security",
        "organization policy": "Security",
        "security": "Security",
        "billing": "Cost",
        "costs": "Cost",
        "quotas": "Cost",
        "autoscaling": "Scaling",
        "jdbc": "Driver",
        "odbc": "Driver",
        "transfer": "Data Transfer",
        "connector": "Data Transfer",
        "graph": "Graphs",
        "iceberg": "Apache Iceberg",
        "dataform": "Dataform",
        "alloydb": "AlloyDB",
        "colab": "Colab"
    }
    
    for kw, val in keywords.items():
        if kw in text_lower:
            if val not in categories:
                categories.append(val)
                
    # Limit to maximum 3 categories to keep layout clean
    categories = categories[:3]
    
    return {
        "id": content_hash,
        "date": date,
        "type": update_type,
        "categories": categories,
        "content_html": html_str,
        "content_text": text_str,
        "link": full_link
    }


def fetch_releases(force_refresh=False):
    global _releases_cache
    if _releases_cache and not force_refresh:
        return _releases_cache
        
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        xml_data = response.content
        
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        all_releases = []
        
        for entry in root.findall('atom:entry', ns):
            date = entry.find('atom:title', ns).text.strip()
            link_elem = entry.find("atom:link[@rel='alternate']", ns)
            alternate_link = link_elem.get('href') if link_elem is not None else ""
            content_elem = entry.find('atom:content', ns)
            
            if content_elem is not None:
                html_content = content_elem.text
                items = parse_html_content(date, html_content, alternate_link)
                all_releases.extend(items)
                
        _releases_cache = all_releases
        return _releases_cache
    except Exception as e:
        print(f"Error fetching releases: {e}")
        # If fetch fails but we have cached data, return cached data
        if _releases_cache:
            return _releases_cache
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        data = fetch_releases(force_refresh=force_refresh)
        return jsonify({
            "status": "success",
            "count": len(data),
            "releases": data
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    # Default to port 5000 or whatever is set in environment
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
