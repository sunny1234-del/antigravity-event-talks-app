from flask import Flask, jsonify, render_template, request
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import time

app = Flask(__name__)

# Simple in-memory cache to avoid spamming the Google Cloud feed endpoint
feed_cache = {
    'data': None,
    'last_fetched': 0
}
CACHE_DURATION = 300  # 5 minutes

def parse_feed_data():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            return None
            
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        root = ET.fromstring(response.content)
        
        updates = []
        
        for entry in root.findall('atom:entry', ns):
            date_str = entry.find('atom:title', ns).text
            entry_id = entry.find('atom:id', ns).text
            updated = entry.find('atom:updated', ns).text
            link_elem = entry.find('atom:link', ns)
            link = link_elem.get('href') if link_elem is not None else "https://cloud.google.com/bigquery/docs/release-notes"
            content_elem = entry.find('atom:content', ns)
            
            if content_elem is None or content_elem.text is None:
                continue
                
            html_content = content_elem.text
            soup = BeautifulSoup(html_content, 'html.parser')
            
            current_type = "Update"
            current_html_parts = []
            
            for child in soup.contents:
                if child.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                    if current_html_parts:
                        content_html = "".join(str(p) for p in current_html_parts).strip()
                        text_content = BeautifulSoup(content_html, 'html.parser').get_text(separator=' ').strip()
                        updates.append({
                            'date': date_str,
                            'id': f"{entry_id}_{len(updates)}",
                            'type': current_type,
                            'content_html': content_html,
                            'text_content': text_content,
                            'link': link,
                            'updated': updated
                        })
                        current_html_parts = []
                    current_type = child.get_text().strip()
                else:
                    current_html_parts.append(child)
                        
            if current_html_parts:
                content_html = "".join(str(p) for p in current_html_parts).strip()
                text_content = BeautifulSoup(content_html, 'html.parser').get_text(separator=' ').strip()
                updates.append({
                    'date': date_str,
                    'id': f"{entry_id}_{len(updates)}",
                    'type': current_type,
                    'content_html': content_html,
                    'text_content': text_content,
                    'link': link,
                    'updated': updated
                })
                
        return updates
    except Exception as e:
        print("Error fetching/parsing feed:", str(e))
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    if force_refresh or not feed_cache['data'] or (now - feed_cache['last_fetched'] > CACHE_DURATION):
        data = parse_feed_data()
        if data is not None:
            feed_cache['data'] = data
            feed_cache['last_fetched'] = now
        elif feed_cache['data'] is not None:
            # Fallback to expired cache if fetch fails
            pass
        else:
            return jsonify({'error': 'Failed to fetch release notes'}), 500
            
    return jsonify({
        'updates': feed_cache['data'],
        'last_fetched': feed_cache['last_fetched']
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
