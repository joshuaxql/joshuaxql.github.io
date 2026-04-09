

const content_dir = 'contents/'
const config_file = 'config.yml'
const section_names = ['home', 'publications', 'awards']
const blog_dir = 'contents/blog/'
const blog_index_file = 'index.yml'

let currentBlogPost = null;


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
    }

});


// Blog functions
function loadBlogList() {
    fetch(blog_dir + blog_index_file)
        .then(response => response.text())
        .then(text => {
            const posts = jsyaml.load(text);
            renderBlogList(posts);
        })
        .catch(error => console.log(error));
}

function renderBlogList(posts) {
    const container = document.getElementById('blog-list');
    let html = '<div class="blog-list">';

    posts.forEach(post => {
        html += `
        <article class="blog-item mb-4 p-4 border rounded">
            <h3 class="blog-item-title">
                <a href="#" onclick="loadBlogPost('${post.slug}'); return false;">${post.title}</a>
            </h3>
            <div class="blog-item-meta text-muted">
                <span class="blog-item-date"><i class="bi bi-calendar"></i> ${post.date}</span>
                ${post.tags ? `<span class="blog-item-tags"><i class="bi bi-tags"></i> ${post.tags.join(', ')}</span>` : ''}
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

    blogListContainer.style.display = 'none';
    blogPostContainer.style.display = 'block';

    document.getElementById('blog').scrollIntoView({ behavior: 'smooth' });

    fetch(blog_dir + slug + '/index.md')
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
    document.getElementById('blog-list').style.display = 'block';
    document.getElementById('blog-post').style.display = 'none';
} 
