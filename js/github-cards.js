(function() {
    'use strict';

    const CACHE_KEY = 'github_cards_cache';
    const CACHE_DURATION = 10 * 60 * 1000;

    const LANG_COLORS = {
        'JavaScript': '#f1e05a',
        'TypeScript': '#3178c6',
        'Java': '#b07219',
        'Python': '#3572A5',
        'Vue': '#41b883',
        'HTML': '#e34c26',
        'CSS': '#563d7c',
        'Shell': '#89e051',
        'Go': '#00ADD8',
        'Rust': '#dea584',
        'C++': '#f34b7d',
        'C': '#555555',
        'PHP': '#4F5D95',
        'Ruby': '#701516',
        'Swift': '#F05138',
        'Kotlin': '#A97BFF',
        'Dart': '#00B4AB',
        'Lua': '#000080',
        'Scala': '#c22d40',
        'R': '#198CE7',
        'Haskell': '#5e5086',
        'Elixir': '#6e4a7e',
        'default': 'var(--accent-color)'
    };

    function getLangColor(lang) {
        return LANG_COLORS[lang] || LANG_COLORS['default'];
    }

    function getCachedData(repo) {
        try {
            const cache = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');
            const cached = cache[repo];
            if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
                return cached.data;
            }
        } catch (e) {
            console.warn('Cache read error:', e);
        }
        return null;
    }

    function setCachedData(repo, data) {
        try {
            const cache = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');
            cache[repo] = { data, timestamp: Date.now() };
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch (e) {
            console.warn('Cache write error:', e);
        }
    }

    async function fetchRepoData(repo) {
        const cached = getCachedData(repo);
        if (cached) return cached;

        try {
            const headers = { 'Accept': 'application/vnd.github.v3+json' };
            const token = window.__githubToken;
            if (token) headers['Authorization'] = `token ${token}`;

            const response = await fetch(`https://api.github.com/repos/${repo}`, { headers });

            if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

            const data = await response.json();
            const result = {
                description: data.description || '暂无描述',
                stars: data.stargazers_count || 0,
                forks: data.forks_count || 0,
                language: data.language || '-',
                license: data.license ? data.license.spdx_id : '-',
                topics: data.topics || []
            };

            setCachedData(repo, result);
            return result;
        } catch (error) {
            console.error(`Failed to fetch ${repo}:`, error);
            return null;
        }
    }

    function updateCard(card, data) {
        if (!data) {
            const desc = card.querySelector('[data-field="description"]');
            if (desc) desc.textContent = '暂无描述';
            return;
        }

        if (data.language && data.language !== '-') {
            card.setAttribute('data-language', data.language);
            card.style.setProperty('--lang-color', getLangColor(data.language));
        }

        const desc = card.querySelector('[data-field="description"]');
        if (desc) desc.textContent = data.description;

        const topics = card.querySelector('[data-field="topics"]');
        if (topics && data.topics.length > 0) {
            topics.innerHTML = data.topics
                .slice(0, 5)
                .map(topic => `<span class="topic-tag">${topic}</span>`)
                .join('');
        }

        const updateStat = (field, value) => {
            const el = card.querySelector(`[data-field="${field}"] .stat-value`);
            if (el) el.textContent = value;
        };

        updateStat('stars', data.stars.toLocaleString());
        updateStat('forks', data.forks.toLocaleString());
        updateStat('language', data.language);
        updateStat('license', data.license);
    }

    async function initCards() {
        const cards = document.querySelectorAll('.project-card[data-repo]');
        if (cards.length === 0) return;

        const promises = Array.from(cards).map(async (card) => {
            const repo = card.getAttribute('data-repo');
            if (!repo) return;
            const data = await fetchRepoData(repo);
            updateCard(card, data);
        });

        await Promise.allSettled(promises);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCards);
    } else {
        initCards();
    }
})();
