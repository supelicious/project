document.addEventListener('DOMContentLoaded', function() {
    const transactionForm = document.getElementById('transactionForm');
    const totalIncomeDisplay = document.getElementById('totalIncome');
    const totalExpensesDisplay = document.getElementById('totalExpenses');
    const currentBalanceDisplay = document.getElementById('currentBalance');
    const transactionsList = document.getElementById('transactions');
    const chartCanvas = document.getElementById('chartCanvas').getContext('2d');
    let chart;
    let filterCategory = null;

    // Category suggestion lists (used to seed the datalist)
    const incomeCategories = ['Salary', 'Bonus', 'Interest', 'Investment', 'Refund', 'Other'];
    const expenseCategories = ['Groceries', 'Rent', 'Utilities', 'Transport', 'Entertainment', 'Dining', 'Healthcare', 'Shopping', 'Bills', 'Other'];

    function populateCategoryList(forType) {
        const list = document.getElementById('category-list');
        if (!list) return;
        // clear old options
        list.innerHTML = '';
        const opts = forType === 'income' ? incomeCategories : expenseCategories;
        opts.forEach(o => {
            const option = document.createElement('option');
            option.value = o;
            list.appendChild(option);
        });
    }

    // Load data from local storage
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    let totalIncome = parseFloat(localStorage.getItem('totalIncome')) || 0;
    let totalExpenses = parseFloat(localStorage.getItem('totalExpenses')) || 0;
    let currentBalance = parseFloat(localStorage.getItem('currentBalance')) || 0;

    // Smooth number animation for visual polish
    function animateValue(element, start, end, duration = 600) {
        const range = end - start;
        const startTime = performance.now();

        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const value = start + range * progress;
            element.textContent = `$${value.toFixed(2)}`;
            if (progress < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }

    // Function to update the summary (with animation)
    function updateSummary() {
        const displayedIncome = parseFloat((totalIncomeDisplay.textContent || '$0').replace(/[^0-9.-]+/g, '')) || 0;
        const displayedExpenses = parseFloat((totalExpensesDisplay.textContent || '$0').replace(/[^0-9.-]+/g, '')) || 0;
        const displayedBalance = parseFloat((currentBalanceDisplay.textContent || '$0').replace(/[^0-9.-]+/g, '')) || 0;

        animateValue(totalIncomeDisplay, displayedIncome, totalIncome);
        animateValue(totalExpensesDisplay, displayedExpenses, totalExpenses);
        animateValue(currentBalanceDisplay, displayedBalance, currentBalance);
    }

    // Function to display transactions (with delete controls and simple layout)
    function displayTransactions() {
        transactionsList.innerHTML = ''; // Clear the list

        transactions.forEach((transaction, index) => {
            // apply filter if present
            if (filterCategory && transaction.category !== filterCategory) return;

            const listItem = document.createElement('li');
            listItem.classList.add('fade-in');

            const left = document.createElement('div');
            left.className = 'tx-left';

            const meta = document.createElement('div');
            meta.className = 'tx-meta';
            const dateDiv = document.createElement('div');
            dateDiv.className = 'tx-date';
            dateDiv.textContent = transaction.date || '';
            const catDiv = document.createElement('div');
            catDiv.className = 'tx-cat';
            catDiv.textContent = `${transaction.category} • ${transaction.description || ''}`;
            meta.appendChild(dateDiv);
            meta.appendChild(catDiv);

            left.appendChild(meta);

            const right = document.createElement('div');
            right.className = 'tx-right';
            const amountDiv = document.createElement('div');
            amountDiv.className = 'tx-amount';
            const sign = transaction.type === 'income' ? '' : '-';
            amountDiv.textContent = `${sign}$${parseFloat(transaction.amount).toFixed(2)}`;

            const del = document.createElement('button');
            del.className = 'tx-delete';
            // store original index in the full transactions array
            const originalIndex = transactions.indexOf(transaction);
            del.setAttribute('data-index', originalIndex);
            del.title = 'Delete transaction';
            del.textContent = '✕';

            right.appendChild(amountDiv);
            right.appendChild(del);

            listItem.appendChild(left);
            listItem.appendChild(right);

            transactionsList.appendChild(listItem);
        });
    }

    function updateChart() {
        const categoryTotals = {};

        transactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                const category = transaction.category;
                const amount = parseFloat(transaction.amount);
                categoryTotals[category] = (categoryTotals[category] || 0) + amount;
            }
        });

        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);

        if (chart) {
            chart.destroy();
        }

        chart = new Chart(chartCanvas, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Spending by Category',
                    data: data,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12 } },
                    title: { display: true, text: 'Spending by Category' },
                    tooltip: { mode: 'index', intersect: false }
                },
                onClick: function(evt) {
                    // 'this' is the chart instance
                    const points = this.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, false);
                    if (points && points.length) {
                        const idx = points[0].index;
                        const selected = this.data.labels[idx];
                        filterCategory = filterCategory === selected ? null : selected;
                        updateFilterInfo();
                        displayTransactions();
                    }
                }
            }
        });
    }

    function updateFilterInfo() {
        const info = document.getElementById('filterInfo');
        if (!info) return;
        if (filterCategory) {
            info.textContent = `Filtering: ${filterCategory} — click slice or this message to clear.`;
            info.style.cursor = 'pointer';
            info.onclick = () => { filterCategory = null; updateFilterInfo(); displayTransactions(); };
        } else {
            info.textContent = '';
            info.style.cursor = 'default';
            info.onclick = null;
        }
    }


    // Initial display
    updateSummary();
    displayTransactions();
    updateChart();

    // Populate category suggestions based on selected type
    const typeSelect = document.getElementById('type');
    if (typeSelect) {
        populateCategoryList(typeSelect.value);
        typeSelect.addEventListener('change', (e) => populateCategoryList(e.target.value));
    }

    // Description character counter
    const descInput = document.getElementById('description');
    const descCountEl = document.getElementById('descCharCount');
    if (descInput && descCountEl) {
        const max = parseInt(descInput.getAttribute('maxlength'), 10) || 100;
        descCountEl.textContent = `0/${max}`;
        descInput.addEventListener('input', () => {
            const len = descInput.value.length;
            descCountEl.textContent = `${len}/${max}`;
        });
    }

    // Delete transaction via event delegation
    transactionsList.addEventListener('click', function(e) {
        const btn = e.target.closest('.tx-delete');
        if (!btn) return;
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        if (Number.isNaN(idx)) return;

        // remove and update totals
        const removed = transactions.splice(idx, 1)[0];
        if (removed) {
            if (removed.type === 'income') {
                totalIncome -= parseFloat(removed.amount);
                currentBalance -= parseFloat(removed.amount);
            } else {
                totalExpenses -= parseFloat(removed.amount);
                currentBalance += parseFloat(removed.amount);
            }

            // persist
            localStorage.setItem('transactions', JSON.stringify(transactions));
            localStorage.setItem('totalIncome', totalIncome);
            localStorage.setItem('totalExpenses', totalExpenses);
            localStorage.setItem('currentBalance', currentBalance);

            updateSummary();
            displayTransactions();
            updateChart();
        }
    });

    // Clear all data
    const clearBtn = document.getElementById('clearData');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            if (!confirm('Clear all transactions and reset totals?')) return;
            transactions = [];
            totalIncome = 0; totalExpenses = 0; currentBalance = 0;
            localStorage.removeItem('transactions');
            localStorage.removeItem('totalIncome');
            localStorage.removeItem('totalExpenses');
            localStorage.removeItem('currentBalance');
            updateSummary();
            displayTransactions();
            updateChart();
        });
    }


    // Form submission
    transactionForm.addEventListener('submit', function(event) {
        event.preventDefault();

    const type = document.getElementById('type').value;
    const category = document.getElementById('category').value.trim();
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);

    // Basic validation
    if (!category) { alert('Please enter a category.'); return; }
    if (Number.isNaN(amount) || amount <= 0) { alert('Please enter an amount greater than 0.'); return; }

        const transaction = {
            type,
            category,
            date,
            description,
            amount
        };

        transactions.push(transaction);

        if (type === 'income') {
            totalIncome += amount;
            currentBalance += amount;
        } else {
            totalExpenses += amount;
            currentBalance -= amount;
        }

        // Update local storage
        localStorage.setItem('transactions', JSON.stringify(transactions));
        localStorage.setItem('totalIncome', totalIncome);
        localStorage.setItem('totalExpenses', totalExpenses);
        localStorage.setItem('currentBalance', currentBalance);

        // Update display with a little micro-interaction
        localStorage.setItem('transactions', JSON.stringify(transactions));
        localStorage.setItem('totalIncome', totalIncome);
        localStorage.setItem('totalExpenses', totalExpenses);
        localStorage.setItem('currentBalance', currentBalance);

        updateSummary();
        displayTransactions();
        updateChart();

        // small visual feedback
        transactionForm.classList.add('pulse');
        setTimeout(() => transactionForm.classList.remove('pulse'), 300);

        transactionForm.reset();
    });
});
