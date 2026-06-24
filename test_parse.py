import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import re
import json

def test_parse():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    print(f"Fetching from {url}...")
    response = requests.get(url, timeout=10)
    print(f"Response status: {response.status_code}")
    
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    root = ET.fromstring(response.content)
    
    entries = root.findall('atom:entry', ns)
    print(f"Found {len(entries)} entries.")
    
    first_entry = entries[0]
    title = first_entry.find('atom:title', ns).text
    content_html = first_entry.find('atom:content', ns).text
    
    print(f"\n--- First Entry: {title} ---")
    
    soup = BeautifulSoup(content_html, 'html.parser')
    children = [c for c in soup.children if c.name]
    print(f"Top-level elements count: {len(children)}")
    
    updates = []
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
        
    print(json.dumps(updates, indent=2))

if __name__ == "__main__":
    test_parse()
