

const content_dir = 'contents/'
const config_file = 'config.yml'
const section_names = ['home', 'publications', 'awards']
const blog_dir = 'contents/blog/'
const blog_index_file = 'index.yml'

let currentBlogPost = null;
let allBlogPosts = [];  // Store all posts for filtering
let selectedTags = [];  // Selected tags for filtering (multi-select)
let currentSearchQuery = '';  // Current search query


window.addEventListener('DOMContentLoaded', event => {

    // Activate Bootstrap scrollspy on the main nav element
    const mainNav = document.body.querySelector('#mainNav');
    if (mainNav) {
        new bootstrap.ScrollSpy(document.body, {
            target: '#mainNav',
            offset: 74,
        });
    };

    // Collapse responsive navbar when toggler is visible
    const navbarToggler = document.body.querySelector('.navbar-toggler');
    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link')
    );
    responsiveNavItems.map(function (responsiveNavItem) {
        responsiveNavItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none') {
                navbarToggler.click();
            }
        });
    });


    // Yaml
    fetch(content_dir + config_file)
        .then(response => response.text())
        .then(text => {
            const yml = jsyaml.load(text);
            Object.keys(yml).forEach(key => {
                try {
                    document.getElementById(key).innerHTML = yml[key];
                } catch {
                    console.log("Unknown id and value: " + key + "," + yml[key].toString())
                }

            })
        })
        .catch(error => console.log(error));


    // Marked
    marked.use({ mangle: false, headerIds: false })
    section_names.forEach((name, idx) => {
        fetch(content_dir + name + '.md')
            .then(response => response.text())
            .then(markdown => {
                const html = marked.parse(markdown);
                document.getElementById(name + '-md').innerHTML = html;
            }).then(() => {
                // MathJax
                MathJax.typeset();
            })
            .catch(error => console.log(error));
    })

    // Blog - only load if blog-list element exists
    if (document.getElementById('blog-list')) {
        loadBlogList();

        // Bind search input
        const searchInput = document.getElementById('blog-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentSearchQuery = e.target.value;
                filterAndRenderPosts();
            });
        }
    }

});


// Blog functions
async function loadBlogList() {
    try {
        const response = await fetch(blog_dir + blog_index_file);
        if (!response.ok) throw new Error('index.yml not found');
        const text = await response.text();
        const posts = jsyaml.load(text);

        // Sort by date descending
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));

        allBlogPosts = posts;
        renderTagFilter(posts);
        renderBlogList(posts);
    } catch (error) {
        console.error('Failed to load blog posts:', error);
    }
}

function parseFrontMatter(text) {
    const match = text.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!match) return {};

    const yaml = match[1];
    const result = {};

    // Parse title
    const titleMatch = yaml.match(/title:\s*["']?(.*?)["']?\s*$/m);
    if (titleMatch) result.title = titleMatch[1];

    // Parse date
    const dateMatch = yaml.match(/date:\s*["']?(.*?)["']?\s*$/m);
    if (dateMatch) result.date = dateMatch[1];

    // Parse summary
    const summaryMatch = yaml.match(/summary:\s*["']?(.*?)["']?\s*$/m);
    if (summaryMatch) result.summary = summaryMatch[1];

    // Parse tags (array)
    const tagsMatch = yaml.match(/tags:\s*\n((?:\s*-\s*.*\n)*)/);
    if (tagsMatch) {
        result.tags = tagsMatch[1].split('\n')
            .map(line => line.replace(/^\s*-\s*/, '').replace(/["']/g, '').trim())
            .filter(t => t);
    }

    return result;
}

function renderTagFilter(posts) {
    // Collect all unique tags
    const tags = new Set();
    posts.forEach(post => {
        if (post.tags) {
            post.tags.forEach(tag => tags.add(tag));
        }
    });

    const tagsContainer = document.getElementById('blog-tags');
    if (tags.size === 0) {
        tagsContainer.innerHTML = '';
        return;
    }

    let html = '<div class="tag-filter">';
    html += `<span class="tag-label">Tags:</span> `;
    html += `<button class="tag-btn tag-btn-all ${selectedTags.length === 0 ? 'active' : ''}" onclick="clearAllTags()">All</button>`;

    Array.from(tags).sort().forEach(tag => {
        const isSelected = selectedTags.includes(tag);
        html += `<button class="tag-btn ${isSelected ? 'active' : ''}" onclick="toggleTag('${tag}')">${tag}</button>`;
    });

    html += '</div>';
    tagsContainer.innerHTML = html;
}

function toggleTag(tag) {
    const index = selectedTags.indexOf(tag);
    if (index === -1) {
        selectedTags.push(tag);
    } else {
        selectedTags.splice(index, 1);
    }
    filterAndRenderPosts();
    renderTagFilter(allBlogPosts);
}

function clearAllTags() {
    selectedTags = [];
    filterAndRenderPosts();
    renderTagFilter(allBlogPosts);
}

function filterAndRenderPosts() {
    let filtered = allBlogPosts;

    // Filter by tags (multi-select: OR logic - match any selected tag)
    if (selectedTags.length > 0) {
        filtered = filtered.filter(post => post.tags && selectedTags.some(tag => post.tags.includes(tag)));
    }

    // Filter by search query
    if (currentSearchQuery) {
        const query = currentSearchQuery.toLowerCase();
        filtered = filtered.filter(post =>
            post.title.toLowerCase().includes(query) ||
            (post.summary && post.summary.toLowerCase().includes(query)) ||
            (post.tags && post.tags.some(t => t.toLowerCase().includes(query)))
        );
    }

    renderBlogList(filtered, true);

    // Update search info
    const searchInfo = document.getElementById('blog-search-info');
    if (selectedTags.length > 0 || currentSearchQuery) {
        searchInfo.style.display = 'block';
        let infoText = '';
        if (selectedTags.length > 0) infoText += `Tags: ${selectedTags.join(', ')}`;
        if (currentSearchQuery) {
            if (infoText) infoText += ' | ';
            infoText += `Search: "${currentSearchQuery}"`;
        }
        infoText += ` (${filtered.length} result${filtered.length !== 1 ? 's' : ''})`;
        searchInfo.innerHTML = `<span class="text-muted">${infoText}</span>`;
    } else {
        searchInfo.style.display = 'none';
    }
}

function renderBlogList(posts, isFiltered = false) {
    const container = document.getElementById('blog-list');

    if (posts.length === 0) {
        container.innerHTML = '<p class="text-muted">No articles found.</p>';
        return;
    }

    let html = '<div class="blog-list">';

    posts.forEach(post => {
        html += `
        <article class="blog-item mb-4 p-4 border rounded">
            <h3 class="blog-item-title">
                <a href="#" onclick="loadBlogPost('${post.slug}'); return false;">${post.title}</a>
            </h3>
            <div class="blog-item-meta text-muted">
                <span class="blog-item-date"><i class="bi bi-calendar"></i> ${post.date}</span>
                ${post.tags ? `<span class="blog-item-tags"><i class="bi bi-tags"></i> ${post.tags.map(t => `<span class="tag-chip" onclick="toggleTag('${t}'); return false;">${t}</span>`).join(', ')}</span>` : ''}
            </div>
            <p class="blog-item-summary mt-2">${post.summary}</p>
        </article>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function loadBlogPost(slug) {
    const blogListContainer = document.getElementById('blog-list');
    const blogPostContainer = document.getElementById('blog-post');

    currentBlogPost = slug;
    const encodedSlug = encodeURIComponent(slug);

    blogListContainer.style.display = 'none';
    blogPostContainer.style.display = 'block';

    document.getElementById('blog').scrollIntoView({ behavior: 'smooth' });

    fetch(blog_dir + encodedSlug + '/index.md')
        .then(response => response.text())
        .then(markdown => {
            const content = markdown.replace(/^---[\s\S]*?---\n/, '');
            const html = marked.parse(content);
            blogPostContainer.innerHTML = `
                <div class="blog-post">
                    <div class="blog-post-header mb-4">
                        <a href="#" onclick="backToBlogList(); return false;" class="blog-back-link">
                            <i class="bi bi-arrow-left"></i> Back to Blog
                        </a>
                    </div>
                    <div class="blog-post-content">${html}</div>
                </div>
            `;
        })
        .then(() => {
            MathJax.typesetPromise([blogPostContainer]);
        })
        .catch(error => {
            blogPostContainer.innerHTML = '<p>Article not found.</p>';
        });
}

function backToBlogList() {
    currentBlogPost = null;
    selectedTags = [];
    currentSearchQuery = '';
    document.getElementById('blog-list').style.display = 'block';
    document.getElementById('blog-post').style.display = 'none';
    document.getElementById('blog-search-input').value = '';
    document.getElementById('blog-search-info').style.display = 'none';
    renderTagFilter(allBlogPosts);
    renderBlogList(allBlogPosts);
} 
