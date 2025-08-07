
        let currentPeriod = 'today';
        let chartData = [];
        let chartRefreshInterval;
        let weatherData = {
            weather_desc: 'Berawan', // Default value from image
            temperature: '24.6', // Default value from image
            humidity: '79', // Default value from image
            windspeed: '3.4' // Default value from image
        };

        function toggleTheme() {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            const sunIcon = document.querySelector('.sun-icon');
            const moonIcon = document.querySelector('.moon-icon');
            
            if (newTheme === 'dark') {
                sunIcon.style.display = 'none';
                moonIcon.style.display = 'block';
            } else {
                sunIcon.style.display = 'block';
                moonIcon.style.display = 'none';
            }
        }

        function showSystemInfo() {
            document.getElementById('dashboardContent').style.display = 'none';
            document.getElementById('systemInfoPage').classList.add('active');
        }

        function showDashboard() {
            document.getElementById('dashboardContent').style.display = 'block';
            document.getElementById('systemInfoPage').classList.remove('active');
        }

        // function logout() {
        //     if (confirm('Apakah Anda yakin ingin logout?')) {
        //         // Replace with your actual logout logic
        //         alert('Logged out!');
        //         // window.location.href = 'login'; 
        //     }
        // }

        function logout() {
            if (confirm('Apakah Anda yakin ingin logout?')) {
                // Redirect ke route logout Flask
                window.location.href = '/logout';
            }
}

        function updateTime() {
            const now = new Date();
            const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateString = now.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
            
            document.getElementById('currentTime').textContent = timeString;
            document.getElementById('currentDate').textContent = dateString;
        }

        function updateTrafficLight(lightStatus) {
            // Reset all lights
            document.getElementById('redLight').classList.remove('active');
            document.getElementById('greenLight').classList.remove('active');
            
            // Activate the current light
            switch(lightStatus) {
                case 'STOP':
                    document.getElementById('redLight').classList.add('active');
                    document.getElementById('trafficStatus').textContent = 'Merah';
                    document.getElementById('trafficStatus').style.color = 'var(--danger-color)';
                    document.getElementById('lightStatus').textContent = 'Jalan'; // Assuming "Jalan" for red light
                    break;
                case 'WALK':
                    document.getElementById('greenLight').classList.add('active');
                    document.getElementById('trafficStatus').textContent = 'Hijau';
                    document.getElementById('trafficStatus').style.color = 'var(--success-color)';
                    document.getElementById('lightStatus').textContent = 'Berhenti'; // Assuming "Berhenti" for green light
                    break;
            }
        }

        // Update fungsi generateChartData untuk menggunakan API
        async function generateChartData(period) {
            try {
                let apiUrl = `/api/grafik-periode?mode=${period}`;
                
                // Tambahkan parameter tanggal untuk custom period
                if (period === 'custom') {
                    const startDate = document.getElementById('startDate').value;
                    const endDate = document.getElementById('endDate').value;
                    
                    if (!startDate || !endDate) {
                        console.warn('Custom period selected but dates not provided');
                        return;
                    }
                    
                    apiUrl += `&start=${startDate}&end=${endDate}`;
                }
                
                const response = await fetch(apiUrl);
                const data = await response.json();
                
                if (!data.success) {
                    console.error('API Error:', data.error);
                    generateDummyChartData(period);
                    return;
                }
                
                // Reset chartData
                chartData = [];
                
                // Populate chartData dengan data dari API
                for (let i = 0; i < data.labels.length; i++) {
                    const label = data.labels[i];
                    const crossingValue = data.data_crossings[i] || 0;
                    const durationValue = data.data_durations[i] || 0;
                    
                    // Tentukan apakah ini peak period
                    const isPeak = (data.jam_sibuk === label);
                    
                    chartData.push({
                        label: label,
                        value: crossingValue,
                        duration: durationValue,
                        isPeak: isPeak,
                        details: {
                            date: label,
                            totalCrossings: crossingValue,
                            avgDuration: `${durationValue}s`,
                            peakHour: data.jam_sibuk || 'N/A',
                            systemUptime: '98%', // Static for now
                            detectionAccuracy: '95%', // Static for now
                            responseTime: '150ms', // Static for now
                            maintenanceStatus: 'Normal',
                            avgWaitTime: `${Math.floor(durationValue * 0.8)}s`,
                            peakTrafficDuration: '45 menit'
                        }
                    });
                }
                
                console.log(`✅ Chart data loaded for ${period}:`, chartData);
                
            } catch (error) {
                console.error('❌ Error fetching chart data:', error);
                
                // Fallback ke data dummy jika API gagal
                generateDummyChartData(period);
            }
        }

        // Fungsi fallback untuk data dummy
        function generateDummyChartData(period) {
            chartData = [];
            let dataPoints, labels;
            
            switch(period) {
                case 'today':
                    labels = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
                    dataPoints = [45, 120, 85, 95, 110, 180, 220, 90];
                    break;
                case 'week':
                    labels = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
                    dataPoints = [280, 320, 290, 310, 350, 180, 150];
                    break;
                case 'month':
                    labels = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'];
                    dataPoints = [1850, 2100, 1950, 2200];
                    break;
                default:
                    labels = ['Data 1', 'Data 2', 'Data 3', 'Data 4', 'Data 5'];
                    dataPoints = [150, 200, 180, 220, 190];
            }
            
            for (let i = 0; i < labels.length; i++) {
                const isPeak = dataPoints[i] === Math.max(...dataPoints);
                chartData.push({
                    label: labels[i],
                    value: dataPoints[i],
                    duration: Math.floor(Math.random() * 20) + 25,
                    isPeak: isPeak,
                    details: generateDetailData(labels[i], dataPoints[i], period)
                });
            }
            
            console.log('⚠️ Using dummy data for', period);
        }

        function generateDetailData(label, value, period) {
            return {
                date: label,
                totalCrossings: value,
                peakHour: `${Math.floor(Math.random() * 4) + 16}:${(Math.floor(Math.random() * 6) * 10).toString().padStart(2, '0')}`,
                avgDuration: `${Math.floor(Math.random() * 20) + 25}s`,
                systemUptime: `${Math.floor(Math.random() * 5) + 95}%`,
                detectionAccuracy: `${Math.floor(Math.random() * 8) + 92}%`,
                responseTime: `${Math.floor(Math.random() * 500) + 100}ms`,
                maintenanceStatus: ['Normal', 'Perlu Perhatian', 'Optimal'][Math.floor(Math.random() * 3)],
                avgWaitTime: `${Math.floor(Math.random() * 30) + 20}s`,
                peakTrafficDuration: `${Math.floor(Math.random() * 60) + 30} menit`
            };
        }

        function updateChart() {
            const chartSvg = document.getElementById('chartSvg');
            const chartXAxis = document.getElementById('chartXAxis');
            
            // Clear existing content
            chartSvg.innerHTML = `
                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:var(--primary-color);stop-opacity:0.3" />
                        <stop offset="100%" style="stop-color:var(--primary-color);stop-opacity:0" />
                    </linearGradient>
                </defs>
            `;
            chartXAxis.innerHTML = '';
            
            if (chartData.length === 0) return;
            
            const maxValue = Math.max(...chartData.map(d => d.value));
            const svgRect = chartSvg.getBoundingClientRect();
            const width = svgRect.width;
            const height = svgRect.height;
            
            // Calculate points for the line
            const points = chartData.map((data, index) => {
                const x = (index / (chartData.length - 1)) * width;
                const y = height - (data.value / maxValue) * height;
                return { x, y, data };
            });
            
            // Create path for line
            let pathD = `M ${points[0].x} ${points[0].y}`;
            for (let i = 1; i < points.length; i++) {
                pathD += ` L ${points[i].x} ${points[i].y}`;
            }
            
            // Create area path
            let areaD = pathD + ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
            
            // Add area
            const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            area.setAttribute('d', areaD);
            area.setAttribute('class', 'chart-area');
            chartSvg.appendChild(area);
            
            // Add line
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            line.setAttribute('d', pathD);
            line.setAttribute('class', 'chart-line');
            chartSvg.appendChild(line);
            
            // Add points
            points.forEach((point, index) => {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', point.x);
                circle.setAttribute('cy', point.y);
                circle.setAttribute('r', '6');
                circle.setAttribute('class', `chart-point ${point.data.isPeak ? 'peak' : ''}`);
                circle.setAttribute('data-index', index);
                
                // Add click event
                circle.addEventListener('click', () => showDetailModal(point.data));
                
                // Add hover events for tooltip
                circle.addEventListener('mouseenter', (e) => showTooltip(e, point.data));
                circle.addEventListener('mouseleave', hideTooltip);
                
                chartSvg.appendChild(circle);
            });
            
            // Create x-axis labels
            chartData.forEach((data, index) => {
                const label = document.createElement('div');
                label.className = 'x-axis-label';
                label.textContent = data.label;
                chartXAxis.appendChild(label);
            });
        }

        function showTooltip(event, data) {
            const tooltip = document.getElementById('chartTooltip');
            tooltip.textContent = `${data.label}: ${data.value} pejalan kaki`;
            tooltip.style.opacity = '1';
            tooltip.style.left = event.pageX - tooltip.offsetWidth / 2 + 'px';
            tooltip.style.top = event.pageY - tooltip.offsetHeight - 10 + 'px';
        }

        function hideTooltip() {
            const tooltip = document.getElementById('chartTooltip');
            tooltip.style.opacity = '0';
        }

        // Update fungsi setPeriod untuk menggunakan async/await
        async function setPeriod(period, event) {
            currentPeriod = period;
            
            // Update active button
            document.querySelectorAll('.period-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            if (event && event.target) {
                event.target.classList.add('active');
            }
            
            // Show/hide date picker
            const dateRangePicker = document.getElementById('dateRangePicker');
            if (period === 'custom') {
                dateRangePicker.style.display = 'flex';
            } else {
                dateRangePicker.style.display = 'none';
            }
            
            // Update table title and header based on period
            updateTableTitleAndHeader(period);
            
            // Show loading state
            showChartLoading(true);
            
            try {
                // Update chart and table with real data
                await generateChartData(period);
                updateChart();
                await updateHistoryTable(period);
            } catch (error) {
                console.error('Error updating period:', error);
            } finally {
                showChartLoading(false);
            }
        }

        function updateTableTitleAndHeader(period) {
            const tableTitle = document.getElementById('tableTitle');
            const tableHeader = document.getElementById('tableHeader');
            
            switch(period) {
                case 'today':
                    tableTitle.textContent = 'Detail Per Jam';
                    tableHeader.innerHTML = `
                        <div class="table-cell"><strong>Jam</strong></div>
                        <div class="table-cell"><strong>Total Crossing</strong></div>
                        <div class="table-cell"><strong>Peak Period</strong></div>
                        <div class="table-cell"><strong>Total Duration</strong></div>
                    `;
                    break;
                case 'week':
                    tableTitle.textContent = 'Detail Harian';
                    tableHeader.innerHTML = `
                        <div class="table-cell"><strong>Hari</strong></div>
                        <div class="table-cell"><strong>Avg Crossing</strong></div>
                        <div class="table-cell"><strong>Peak Hour</strong></div>
                        <div class="table-cell"><strong>Avg Duration</strong></div>
                    `;
                    break;
                case 'month':
                    tableTitle.textContent = 'Detail Harian';
                    tableHeader.innerHTML = `
                        <div class="table-cell"><strong>Tanggal</strong></div>
                        <div class="table-cell"><strong>Avg Crossing</strong></div>
                        <div class="table-cell"><strong>Peak Hour</strong></div>
                        <div class="table-cell"><strong>Avg Duration</strong></div>
                    `;
                    break;
                case 'custom':
                    tableTitle.textContent = 'Detail Periode';
                    tableHeader.innerHTML = `
                        <div class="table-cell"><strong>Periode</strong></div>
                        <div class="table-cell"><strong>Avg Crossing</strong></div>
                        <div class="table-cell"><strong>Peak Hour</strong></div>
                        <div class="table-cell"><strong>Avg Duration</strong></div>
                    `;
                    break;
            }
        }

        // Update fungsi updateCustomPeriod untuk menggunakan async/await
        async function updateCustomPeriod() {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            
            if (startDate && endDate) {
                showChartLoading(true);
                
                try {
                    await generateChartData('custom');
                    updateChart();
                    await updateHistoryTable('custom');
                } catch (error) {
                    console.error('Error updating custom period:', error);
                } finally {
                    showChartLoading(false);
                }
            }
        }

        // Fungsi untuk menampilkan loading state
        function showChartLoading(isLoading) {
            const chartContainer = document.querySelector('.chart-container');
            
            if (isLoading) {
                chartContainer.style.opacity = '0.5';
                chartContainer.style.pointerEvents = 'none';
                
                // Tambahkan loading indicator jika belum ada
                if (!document.getElementById('chartLoading')) {
                    const loadingDiv = document.createElement('div');
                    loadingDiv.id = 'chartLoading';
                    loadingDiv.style.cssText = `
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background: var(--surface-color);
                        padding: 1rem 2rem;
                        border-radius: 8px;
                        box-shadow: var(--shadow-md);
                        z-index: 10;
                        font-weight: 600;
                        color: var(--text-primary);
                    `;
                    loadingDiv.textContent = 'Memuat data...';
                    chartContainer.appendChild(loadingDiv);
                }
            } else {
                chartContainer.style.opacity = '1';
                chartContainer.style.pointerEvents = 'auto';
                
                // Hapus loading indicator
                const loadingDiv = document.getElementById('chartLoading');
                if (loadingDiv) {
                    loadingDiv.remove();
                }
            }
        }

        // Update fungsi updateHistoryTable untuk menggunakan data real
        async function updateHistoryTable(period) {
            const tableData = document.getElementById('historyTableData');
            let rows = '';
            
            try {
                // Gunakan data dari chartData yang sudah di-load
                if (chartData && chartData.length > 0) {
                    chartData.forEach((data) => {
                        const detailDataStr = JSON.stringify(data).replace(/"/g, '&quot;');
                        
                        rows += `
                            <div class="table-row" onclick="showDetailModal(${detailDataStr})">
                                <div class="table-cell">${data.label}</div>
                                <div class="table-cell">${data.value}</div>
                                <div class="table-cell">${data.details.peakHour}</div>
                                <div class="table-cell">${data.details.avgDuration}</div>
                            </div>
                        `;
                    });
                } else {
                    // Jika tidak ada data, tampilkan pesan
                    rows = `
                        <div class="table-row">
                            <div class="table-cell" style="grid-column: 1 / -1; text-align: center; color: var(--text-muted);">
                                Tidak ada data untuk periode ini
                            </div>
                        </div>
                    `;
                }
                
                tableData.innerHTML = rows;
                
            } catch (error) {
                console.error('Error updating history table:', error);
                tableData.innerHTML = `
                    <div class="table-row">
                        <div class="table-cell" style="grid-column: 1 / -1; text-align: center; color: var(--danger-color);">
                            Error memuat data
                        </div>
                    </div>
                `;
            }
        }

        // Update fungsi showDetailModal untuk menampilkan detail dari API
        async function showDetailModal(data) {
            const modal = document.getElementById('detailModal');
            const modalTitle = document.getElementById('modalTitle');
            const modalSummary = document.getElementById('modalSummary');
            const trafficAnalysis = document.getElementById('trafficAnalysis');
            
            // Set modal title
            modalTitle.textContent = `Detail Analisis - ${data.label}`;
            
            // Show loading state
            modalSummary.innerHTML = '<div style="text-align: center; padding: 2rem;">Memuat detail...</div>';
            trafficAnalysis.innerHTML = '<li>Memuat data...</li>';
            
            // Show modal
            modal.classList.add('active');
            
            try {
                // Fetch detail data dari API
                const response = await fetch(`/api/detail-periode?mode=${currentPeriod}&periode=${encodeURIComponent(data.label)}`);
                const detailData = await response.json();
                
                if (detailData.success) {
                    // Update summary cards dengan data real
                    modalSummary.innerHTML = `
                        <div class="modal-card">
                            <div class="modal-card-title">Total Penyeberangan</div>
                            <div class="modal-card-value">${detailData.total_crossings}</div>
                            <div class="modal-card-description">Jumlah total pejalan kaki yang menyeberang</div>
                        </div>
                        <div class="modal-card">
                            <div class="modal-card-title">Durasi Rata-rata</div>
                            <div class="modal-card-value">${detailData.avg_duration}s</div>
                            <div class="modal-card-description">Waktu rata-rata penyeberangan</div>
                        </div>
                        <div class="modal-card">
                            <div class="modal-card-title">Total Records</div>
                            <div class="modal-card-value">${detailData.total_records}</div>
                            <div class="modal-card-description">Jumlah aktivitas tercatat</div>
                        </div>
                    `;
                    
                    // Update traffic analysis dengan data real
                    trafficAnalysis.innerHTML = `
                        <li><span class="detail-label">Periode</span><span class="detail-value">${detailData.periode}</span></li>
                        <li><span class="detail-label">Waktu Mulai</span><span class="detail-value">${detailData.period_start}</span></li>
                        <li><span class="detail-label">Waktu Selesai</span><span class="detail-value">${detailData.period_end}</span></li>
                        <li><span class="detail-label">Total Penyeberangan</span><span class="detail-value">${detailData.total_crossings}</span></li>
                        <li><span class="detail-label">Durasi Rata-rata</span><span class="detail-value">${detailData.avg_duration}s</span></li>
                        <li><span class="detail-label">Tingkat Aktivitas</span><span class="detail-value">${detailData.total_crossings > 100 ? 'Tinggi' : detailData.total_crossings > 50 ? 'Sedang' : 'Rendah'}</span></li>
                    `;
                } else {
                    throw new Error(detailData.error || 'Failed to fetch detail data');
                }
                
            } catch (error) {
                console.error('Error fetching detail data:', error);
                
                // Fallback ke data yang ada
                modalSummary.innerHTML = `
                    <div class="modal-card">
                        <div class="modal-card-title">Total Penyeberangan</div>
                        <div class="modal-card-value">${data.value}</div>
                        <div class="modal-card-description">Jumlah total pejalan kaki yang menyeberang</div>
                    </div>
                    <div class="modal-card">
                        <div class="modal-card-title">Durasi Rata-rata</div>
                        <div class="modal-card-value">${data.duration}s</div>
                        <div class="modal-card-description">Waktu rata-rata penyeberangan</div>
                    </div>
                    <div class="modal-card">
                        <div class="modal-card-title">Status</div>
                        <div class="modal-card-value">Error</div>
                        <div class="modal-card-description">Gagal memuat detail</div>
                    </div>
                `;
                
                trafficAnalysis.innerHTML = `
                    <li><span class="detail-label">Error</span><span class="detail-value">Gagal memuat data detail</span></li>
                `;
            }
        }

        function closeModal() {
            const modal = document.getElementById('detailModal');
            modal.classList.remove('active');
        }

        // Close modal when clicking outside
        document.getElementById('detailModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
        
        // Fetch real-time weather data
        async function updateWeatherData() {
            try {
                const response = await fetch('/api/weather');
                if (response.ok) {
                    const data = await response.json();
                    document.getElementById('weatherCondition').textContent = data.weather.weather_desc;
                    document.getElementById('temperature').textContent = data.weather.temperature + '°C';
                    document.getElementById('humidity').textContent = data.weather.humidity + '%';
                    document.getElementById('windSpeed').textContent = data.weather.windspeed + ' km/h';
                }
            } catch (error) {
                console.error('❌ Gagal ambil data cuaca:', error);
            }
        }

        function simulateData() {
            // This function can be used for any additional simulation if needed
            // Most real-time data is now handled by the API calls below
        }

        // Tambahkan auto-refresh untuk chart
        function startChartAutoRefresh() {
            // Clear existing interval
            if (chartRefreshInterval) {
                clearInterval(chartRefreshInterval);
            }
            
            // Set new interval untuk refresh setiap 30 detik
            chartRefreshInterval = setInterval(async () => {
                try {
                    console.log('🔄 Auto-refreshing chart data...');
                    await generateChartData(currentPeriod);
                    updateChart();
                    await updateHistoryTable(currentPeriod);
                    console.log('✅ Chart auto-refresh completed');
                } catch (error) {
                    console.error('❌ Chart auto-refresh failed:', error);
                }
            }, 30000); // 30 seconds
        }

        // Load saved theme and initialize
        document.addEventListener('DOMContentLoaded', async function() {
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            
            const sunIcon = document.querySelector('.sun-icon');
            const moonIcon = document.querySelector('.moon-icon');
            
            if (savedTheme === 'dark') {
                sunIcon.style.display = 'none';
                moonIcon.style.display = 'block';
            }

            // Initialize chart and table dengan data real
            // try {
            //     await generateChartData('today');
            //     updateChart();
            //     updateTableTitleAndHeader('today');
            //     await updateHistoryTable('today');
            //     console.log('✅ Dashboard initialized with real data');
            // } catch (error) {
            //     console.error('❌ Error initializing dashboard:', error);
            //     // Fallback ke data dummy
            //     generateDummyChartData('today');
            //     updateChart();
            //     updateTableTitleAndHeader('today');
            //     updateHistoryTable('today');
            // }
            
            // Start time updates
            updateTime();
            setInterval(updateTime, 1000);
            
            // Start data simulation untuk status real-time
            simulateData();
            setInterval(simulateData, 5000);
            
            // Update weather data every 10 minutes
            updateWeatherData();
            setInterval(updateWeatherData, 600000);
            
            // Real-time status updates
            setInterval(() => {
                fetch('/get_status')
                    .then(res => res.json())
                    .then(data => {
                        updateTrafficLight(data.status);
                        document.getElementById('peopleCount').innerText = data.count_middle;
                        // The original code had a bug here, assuming data.status is 'STOP' or 'WALK'
                        // and mapping it to an index. I'll keep the original logic but note it.
                        // The image shows "Jalan" for Status Penyebrangan, which is not directly 'STOP' or 'WALK'.
                        // I've adjusted updateTrafficLight to set 'Jalan'/'Berhenti' based on light status.
                        // The original line: const lightColors = ['status-red', 'status-green'];
                        // The original line: lightElement.className = 'status-value ' + lightColors[data.status === 'STOP' ? 0 : 1];
                        // This is now handled within updateTrafficLight.
                        document.getElementById('waitTime').innerText = data.crossing_duration + ' detik';
                    })
                    .catch(error => console.error('❌ Error fetching status:', error));
                    
                fetch('/today_crossing')
                    .then(res => res.json())
                    .then(data => {
                        document.getElementById('todayCrossings').innerText = data.total_crossing_today + ' Orang'; // Added "Orang"
                    })
                    .catch(error => console.error('❌ Error fetching today crossings:', error));
                    
                fetch('/Tcrossing_day')
                    .then(res => res.json())
                    .then(data => {
                        document.getElementById('avgDuration').innerText = data.average_crossing_duration + ' Detik'; // Added "Detik"
                    })
                    .catch(error => console.error('❌ Error fetching avg duration:', error));
                    
                fetch('/jamSibuk')
                    .then(res => res.json())
                    .then(data => {
                        document.getElementById('peakHour').innerText = data.busiest_hour;
                    })
                    .catch(error => console.error('❌ Error fetching peak hour:', error));
            }, 1000);
            
            // Set default dates for custom period
            const today = new Date();
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            document.getElementById('startDate').value = weekAgo.toISOString().split('T')[0];
            document.getElementById('endDate').value = today.toISOString().split('T')[0];

            // Handle chart resize
            window.addEventListener('resize', () => {
                setTimeout(updateChart, 100);
            });

            // WebSocket connection untuk live camera
            try {
                // Note: This WebSocket connection will only work if the IP address is accessible from the client's browser.
                // In a sandboxed environment or if the IP is internal, it might not connect.
                const ws = new WebSocket("ws://192.168.202.168:8765"); 
                ws.onmessage = (event) => {
                    const frameBase64 = event.data;
                    // Assuming there's an <img> tag with id="livecam" for the video stream
                    const liveCamImg = document.getElementById("livecam");
                    if (liveCamImg) {
                        liveCamImg.src = "data:image/jpeg;base64," + frameBase64;
                    }
                };
                ws.onerror = (error) => {
                    console.error('❌ WebSocket error:', error);
                };
            } catch (error) {
                console.error('❌ WebSocket connection failed:', error);
            }

            // Start chart auto-refresh
            startChartAutoRefresh();
        });

        function exportData() {
            // Placeholder for export logic
            alert('Export data functionality not implemented in this example.');
            const exportSuccess = document.getElementById('exportSuccess');
            exportSuccess.classList.add('active');
            setTimeout(() => {
                exportSuccess.classList.remove('active');
            }, 3000);
        }