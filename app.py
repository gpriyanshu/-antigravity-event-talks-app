from flask import Flask, render_template, jsonify
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import re

app = Flask(__name__)

# URL of the BigQuery Release Notes Atom Feed
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    """
    Fetches the Atom XML feed from Google Cloud and parses it.
    Segments each entry by its <h3> tags (representing individual updates).
    """
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
    except Exception as e:
        raise RuntimeError(f"Failed to fetch feed: {str(e)}")

    try:
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        root = ET.fromstring(response.content)
        
        parsed_notes = []
        entries = root.findall('atom:entry', ns)
        
        for entry in entries:
            title = entry.find('atom:title', ns).text  # e.g., "June 23, 2026"
            updated = entry.find('atom:updated', ns).text
            
            link_elem = entry.find("atom:link[@rel='alternate']", ns)
            link = link_elem.attrib['href'] if link_elem is not None else ''
            
            content_elem = entry.find('atom:content', ns)
            content_html = content_elem.text if content_elem is not None else ''
            
            # Parse the HTML content to extract individual updates
            soup = BeautifulSoup(content_html, 'html.parser')
            children = [c for c in soup.children if c.name]
            
            has_h3 = any(c.name == 'h3' for c in children)
            updates = []
            
            if not has_h3:
                # Fallback: if there are no <h3> headings, treat the entire block as one update
                text_content = soup.get_text(separator=' ', strip=True)
                text_content = re.sub(r'\s+', ' ', text_content).strip()
                updates.append({
                    "id": f"{title.replace(' ', '_').replace(',', '')}_0",
                    "type": "Update",
                    "html": str(soup),
                    "text": text_content
                })
            else:
                current_type = None
                current_chunks = []
                update_idx = 0
                
                for child in children:
                    if child.name == 'h3':
                        if current_type is not None:
                            html_content = "".join(str(chunk) for chunk in current_chunks)
                            temp_soup = BeautifulSoup(html_content, 'html.parser')
                            text_content = temp_soup.get_text(separator=' ', strip=True)
                            text_content = re.sub(r'\s+', ' ', text_content).strip()
                            updates.append({
                                "id": f"{title.replace(' ', '_').replace(',', '')}_{update_idx}",
                                "type": current_type,
                                "html": html_content,
                                "text": text_content
                            })
                            update_idx += 1
                            current_chunks = []
                        current_type = child.get_text(strip=True)
                    else:
                        current_chunks.append(child)
                
                # Append final block
                if current_type is not None:
                    html_content = "".join(str(chunk) for chunk in current_chunks)
                    temp_soup = BeautifulSoup(html_content, 'html.parser')
                    text_content = temp_soup.get_text(separator=' ', strip=True)
                    text_content = re.sub(r'\s+', ' ', text_content).strip()
                    updates.append({
                        "id": f"{title.replace(' ', '_').replace(',', '')}_{update_idx}",
                        "type": current_type,
                        "html": html_content,
                        "text": text_content
                    })
            
            if updates:
                parsed_notes.append({
                    "date": title,
                    "updated": updated,
                    "link": link,
                    "updates": updates
                })
                
        return parsed_notes
    except Exception as e:
        raise RuntimeError(f"Failed to parse XML content: {str(e)}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    try:
        notes = fetch_and_parse_feed()
        return jsonify({
            "status": "success",
            "data": notes
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
