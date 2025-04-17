document.addEventListener('DOMContentLoaded', () => {
    const codeInput = document.getElementById('codeInput');
    const textInput = document.getElementById('textInput');
    const searchByCodeBtn = document.getElementById('searchByCodeBtn');
    const searchByTextBtn = document.getElementById('searchByTextBtn');
    const codeResult = document.getElementById('codeResult');
    const textResult = document.getElementById('textResult');
    const histogramContainer = document.createElement('div');
    histogramContainer.id = 'histogramContainer';
    
   
    const clearStatsBtn = document.createElement('button');
    clearStatsBtn.id = 'clearStatsBtn';
    clearStatsBtn.textContent = 'Очистить статистику';
    clearStatsBtn.className = 'clear-stats-btn';
    histogramContainer.appendChild(clearStatsBtn);
    
    document.querySelector('.container').appendChild(histogramContainer);

    let okvedData = null;
    let searchHistory = JSON.parse(localStorage.getItem('okvedSearchHistory')) || {};

    async function loadOkvedData() {
        try {
            const response = await fetch('okved.json');
            if (!response.ok) {
                throw new Error('Не удалось загрузить данные ОКВЭД');
            }
            okvedData = await response.json();
            enableSearch();
            updateLoadingStatus('Данные ОКВЭД успешно загружены');
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
            updateLoadingStatus('Ошибка при загрузке данных ОКВЭД');
        }
    }

    function updateLoadingStatus(message) {
        codeResult.innerHTML = `<p class="placeholder">${message}</p>`;
        textResult.innerHTML = `<p class="placeholder">${message}</p>`;
    }

    function enableSearch() {
        searchByCodeBtn.disabled = false;
        searchByTextBtn.disabled = false;
        codeInput.disabled = false;
        textInput.disabled = false;
    }

    function findByCode(items, searchCode) {
        for (const item of items) {
            if (item.code === searchCode) {
                return item;
            }
            if (item.items && item.items.length > 0) {
                const found = findByCode(item.items, searchCode);
                if (found) return found;
            }
        }
        return null;
    }

    function saveToHistory(code, name) {
        if (!searchHistory[code]) {
            searchHistory[code] = {
                name: name,
                count: 0
            };
        }
        searchHistory[code].count++;
        localStorage.setItem('okvedSearchHistory', JSON.stringify(searchHistory));
        updateHistogram();
    }

    function clearStatistics() {
        searchHistory = {};
        localStorage.removeItem('okvedSearchHistory');
        updateHistogram();
        codeResult.innerHTML = '<p class="placeholder">Статистика очищена</p>';
    }

    function createHistogram() {
        const width = 800;
        const height = 400;
        const padding = 40;
        const barWidth = 30;
        const barSpacing = 10;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);

        const entries = Object.entries(searchHistory);
        const maxCount = Math.max(...entries.map(([_, data]) => data.count));

        entries.forEach(([code, data], index) => {
            const x = padding + (index * (barWidth + barSpacing));
            const barHeight = ((data.count / maxCount) * (height - 2 * padding));
            const y = height - padding - barHeight;

            const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bar.setAttribute('x', x);
            bar.setAttribute('y', y);
            bar.setAttribute('width', barWidth);
            bar.setAttribute('height', barHeight);
            bar.setAttribute('fill', '#4CAF50');
            bar.setAttribute('class', 'histogram-bar');

            
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', x + barWidth/2);
            label.setAttribute('y', height - padding + 20);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('class', 'histogram-label');
            label.textContent = code;

           
            const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            tooltip.textContent = `ОКВЭД: ${code}\nНазвание: ${data.name}\nПоисков: ${data.count}`;
            bar.appendChild(tooltip);

            bar.addEventListener('mouseover', () => {
                bar.setAttribute('fill', '#45a049');
            });

            bar.addEventListener('mouseout', () => {
                bar.setAttribute('fill', '#4CAF50');
            });

            svg.appendChild(bar);
            svg.appendChild(label);
        });

        histogramContainer.innerHTML = '';
        histogramContainer.appendChild(clearStatsBtn);
        histogramContainer.appendChild(svg);
    }

    function updateHistogram() {
        createHistogram();
    }

    function searchByCode() {
        if (!okvedData) {
            updateLoadingStatus('Данные ОКВЭД еще не загружены');
            return;
        }

        const code = codeInput.value.trim();
        if (!code) {
            codeResult.innerHTML = '<p class="error">Пожалуйста, введите код ОКВЭД</p>';
            return;
        }

        const result = findByCode(okvedData, code);
        if (result) {
            saveToHistory(code, result.name);
            codeResult.innerHTML = `
                <div class="result-item">
                    <h3>${result.name}</h3>
                    ${result.description ? `<p>${result.description}</p>` : ''}
                </div>
            `;
        } else {
            codeResult.innerHTML = '<p class="error">Код ОКВЭД не найден</p>';
        }
    }

    function findByText(items, searchText) {
        let results = [];
        for (const item of items) {
            if (item.name.toLowerCase().includes(searchText)) {
                results.push({
                    code: item.code,
                    name: item.name,
                    description: item.description
                });
            }
            if (item.items && item.items.length > 0) {
                results = results.concat(findByText(item.items, searchText));
            }
        }
        return results;
    }

    function searchByText() {
        if (!okvedData) {
            updateLoadingStatus('Данные ОКВЭД еще не загружены');
            return;
        }

        const searchText = textInput.value.trim().toLowerCase();
        if (!searchText) {
            textResult.innerHTML = '<p class="error">Пожалуйста, введите текст для поиска</p>';
            return;
        }

        const results = findByText(okvedData, searchText);
        if (results.length > 0) {
            const resultsHtml = results.map(item => `
                <div class="result-item">
                    <h3>${item.code}</h3>
                    ${item.description ? `<p>${item.description}</p>` : ''}
                </div>
            `).join('');
            textResult.innerHTML = resultsHtml;
        } else {
            textResult.innerHTML = '<p class="error">Ничего не найдено</p>';
        }
    }

    searchByCodeBtn.disabled = true;
    searchByTextBtn.disabled = true;
    codeInput.disabled = true;
    textInput.disabled = true;
    
    searchByCodeBtn.addEventListener('click', searchByCode);
    searchByTextBtn.addEventListener('click', searchByText);
    
    codeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchByCode();
        }
    });
    
    textInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchByText();
        }
    });

    clearStatsBtn.addEventListener('click', clearStatistics);

    loadOkvedData();
    updateHistogram();
}); 