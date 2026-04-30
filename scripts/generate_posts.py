#!/usr/bin/env python3
import os
import json
import re

blog_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'contents', 'blog')
posts = []

for name in os.listdir(blog_dir):
    dir_path = os.path.join(blog_dir, name)
    if not os.path.isdir(dir_path):
        continue

    index_path = os.path.join(dir_path, 'index.md')
    if not os.path.exists(index_path):
        continue

    with open(index_path, 'r', encoding='utf-8') as f:
        content = f.read()

    match = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if not match:
        continue

    yaml_text = match.group(1)
    post = {'slug': name}

    title_match = re.search(r'title:\s*["\']?(.*?)["\']?\s*$', yaml_text, re.MULTILINE)
    if title_match:
        post['title'] = title_match[1]

    date_match = re.search(r'date:\s*["\']?(.*?)["\']?\s*$', yaml_text, re.MULTILINE)
    if date_match:
        post['date'] = date_match[1]

    summary_match = re.search(r'summary:\s*["\']?(.*?)["\']?\s*$', yaml_text, re.MULTILINE)
    if summary_match:
        post['summary'] = summary_match[1]

    # tags: ["tag1", "tag2"] inline format
    tags_inline = re.search(r'tags:\s*\[(.*?)\]', yaml_text)
    if tags_inline:
        tags = [t.strip().strip('"').strip("'") for t in tags_inline[1].split(',')]
        post['tags'] = [t for t in tags if t]
    else:
        # tags:\n  - tag1\n  - tag2 list format
        tags_list = re.search(r'tags:\s*\n((?:\s*-\s*.*\n?)*)', yaml_text)
        if tags_list:
            tags = [line.strip().lstrip('-').strip().strip('"').strip("'")
                    for line in tags_list[1].split('\n') if line.strip()]
            post['tags'] = [t for t in tags if t]

    posts.append(post)

# date descending, then title ascending
posts.sort(key=lambda p: (-int(p.get('date', '0000-00-00').replace('-', '')),
                           p.get('title', '')))

output_path = os.path.join(blog_dir, 'posts.json')
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(posts, f, ensure_ascii=False, indent=2)

print(f'Generated {len(posts)} posts -> {output_path}')
