// KONFIGURASI REST API
const AUTH_API_URL = "http://localhost:3000/users";
// BMKG Public API untuk wilayah Kel/Kec Lowokwaru, Kota Malang (Jawa Timur)
const WEATHER_API_URL = "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=35.73.05.1011";

document.addEventListener("DOMContentLoaded", () => {
    // 1. FITUR AUTO-FILL JIKA SEBELUMNYA MEMILIH "INGAT SAYA"
    const rememberedEmail = localStorage.getItem("remembered_email");
    const loginForm = document.querySelector("form");
    if (loginForm && !loginForm.querySelector("#nama")) {
        const loginEmailInput = loginForm.querySelector("#email");
        const ingatCheckbox = loginForm.querySelector("#ingat");
        if (rememberedEmail && loginEmailInput && ingatCheckbox) {
            loginEmailInput.value = rememberedEmail;
            ingatCheckbox.checked = true;
        }
    }

    // 2. INISIALISASI DASHBOARD & INTEGRASI OPEN-METEO API
    const dashboardProfile = document.getElementById("user-profile");
    if (dashboardProfile) {
        initDashboard();
    }

    // 3. MENANGANI SUBMIT FORM (LOGIN & REGISTER)
    initAuthForms();
});

// LOGIKA DASHBOARD & OPEN-METEO WEATHER API
function initDashboard() {
    // 1. Periksa sesi login pengguna
    const currentUser = JSON.parse(sessionStorage.getItem("current_user"));
    if (!currentUser) {
        alert("Silakan login terlebih dahulu untuk mengakses dashboard!");
        window.location.href = "login.html";
        return;
    }

    // 2. Render data profil pengguna pada header dan welcome card
    const userNameEl = document.getElementById("profile-nama");
    const userEmailEl = document.getElementById("profile-email");
    const welcomeNameEl = document.getElementById("welcome-name");
    const avatarInitialEl = document.getElementById("avatar-initial");

    if (userNameEl) userNameEl.textContent = currentUser.nama;
    if (userEmailEl) userEmailEl.textContent = currentUser.email;
    if (welcomeNameEl) welcomeNameEl.textContent = currentUser.nama;
    if (avatarInitialEl && currentUser.nama) {
        avatarInitialEl.textContent = currentUser.nama.trim().charAt(0).toUpperCase();
    }

    // 3. Pasang aksi tombol logout
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            sessionStorage.removeItem("current_user");
            alert("Anda telah berhasil logout.");
            window.location.href = "login.html";
        });
    }

    // 4. Inisialisasi modul cuaca Open-Meteo
    initWeatherModule();
}

function initWeatherModule() {
    const loadingEl = document.getElementById("weather-loading");
    const errorEl = document.getElementById("weather-error");
    const contentEl = document.getElementById("weather-content");
    const errorMessageEl = document.getElementById("error-message");
    const btnRefresh = document.getElementById("btn-refresh-weather");
    const btnRetry = document.getElementById("btn-retry-weather");

    let weatherData = null;
    let groupedByDate = {};
    let allSlots = [];
    let activeDateStr = null;

    // Fungsi fetch data dari API BMKG
    async function fetchWeather() {
        if (loadingEl) loadingEl.style.display = "block";
        if (errorEl) errorEl.style.display = "none";
        if (contentEl) contentEl.style.display = "none";
        if (btnRefresh) btnRefresh.classList.add("loading");

        try {
            const response = await fetch(WEATHER_API_URL);
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }

            weatherData = await response.json();
            parseAndRenderWeather(weatherData);

            if (loadingEl) loadingEl.style.display = "none";
            if (contentEl) contentEl.style.display = "block";

            // Update waktu refresh
            const lastUpdatedEl = document.getElementById("last-updated");
            if (lastUpdatedEl) {
                const now = new Date();
                lastUpdatedEl.textContent = `Update: ${now.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} WIB`;
            }
        } catch (error) {
            console.error("Gagal mengambil data BMKG:", error);
            if (loadingEl) loadingEl.style.display = "none";
            if (errorEl) errorEl.style.display = "block";
            if (errorMessageEl) {
                errorMessageEl.textContent = `Gagal memuat data cuaca BMKG: ${error.message}`;
            }
        } finally {
            if (btnRefresh) btnRefresh.classList.remove("loading");
        }
    }

    // Memproses data API BMKG dan mengelompokkan berdasarkan tanggal
    function parseAndRenderWeather(result) {
        // 1. Tampilkan informasi lokasi dari API BMKG
        const loc = result.lokasi || (result.data && result.data[0] ? result.data[0].lokasi : {});
        const locationEl = document.getElementById("weather-location");
        if (locationEl) {
            const parts = [];
            if (loc.desa) parts.push(loc.desa);
            if (loc.kecamatan && loc.kecamatan !== loc.desa) parts.push(`Kec. ${loc.kecamatan}`);
            if (loc.kotkab) parts.push(loc.kotkab);
            if (loc.provinsi) parts.push(loc.provinsi);
            locationEl.textContent = parts.join(", ") || "Lowokwaru, Kota Malang (Jawa Timur)";
        }

        const timezoneEl = document.getElementById("weather-timezone");
        if (timezoneEl) {
            timezoneEl.textContent = `${loc.timezone || 'Asia/Jakarta'} (WIB)`;
        }

        // 2. Ekstrak data cuaca berkala
        groupedByDate = {};
        allSlots = [];

        const cuacaDays = (result.data && result.data[0] && Array.isArray(result.data[0].cuaca))
            ? result.data[0].cuaca
            : [];

        cuacaDays.forEach(dayGroup => {
            dayGroup.forEach(slot => {
                const localDt = slot.local_datetime || slot.datetime.replace('T', ' ').replace('Z', '');
                const [datePart, timePart] = localDt.split(" ");
                const hourPart = timePart ? timePart.slice(0, 5) : "00:00";

                const item = {
                    datetime: slot.datetime,
                    local_datetime: localDt,
                    date: datePart,
                    hour: hourPart,
                    temp: typeof slot.t === 'number' ? slot.t : parseFloat(slot.t),
                    humidity: slot.hu,
                    weather_desc: slot.weather_desc || 'Cerah',
                    weather_desc_en: slot.weather_desc_en || 'Sunny',
                    image: slot.image,
                    wind_speed: slot.ws,
                    wind_dir: slot.wd
                };

                if (!groupedByDate[datePart]) {
                    groupedByDate[datePart] = [];
                }
                groupedByDate[datePart].push(item);
                allSlots.push(item);
            });
        });

        // 3. Tentukan suhu saat ini
        renderCurrentTemperature(allSlots);

        // 4. Render tombol pill filter tanggal
        const dateKeys = Object.keys(groupedByDate);
        if (dateKeys.length > 0) {
            if (!activeDateStr || !groupedByDate[activeDateStr]) {
                activeDateStr = dateKeys[0];
            }
            renderDatePills(dateKeys);
            renderSelectedDay(activeDateStr);
        }
    }

    // Mencari slot dengan selisih waktu terdekat ke waktu sekarang
    function getClosestSlot(slots) {
        if (!slots || slots.length === 0) return null;
        const nowTime = new Date().getTime();
        let closest = slots[0];
        let minDiff = Infinity;
        slots.forEach(slot => {
            const slotTime = new Date(slot.datetime).getTime();
            const diff = Math.abs(slotTime - nowTime);
            if (diff < minDiff) {
                minDiff = diff;
                closest = slot;
            }
        });
        return closest;
    }

    // Render suhu dan cuaca terkini
    function renderCurrentTemperature(slots) {
        const currentTempEl = document.getElementById("current-temp");
        const currentTempTimeEl = document.getElementById("current-temp-time");
        const currentIconBox = document.getElementById("current-weather-icon-box");
        if (!currentTempEl || slots.length === 0) return;

        const closest = getClosestSlot(slots);
        if (closest) {
            currentTempEl.textContent = `${closest.temp.toFixed(0)}°C`;
            if (currentTempTimeEl) {
                currentTempTimeEl.textContent = `${closest.weather_desc} • Pukul ${closest.hour} WIB`;
            }
            if (currentIconBox && closest.image) {
                currentIconBox.innerHTML = `<img src="${closest.image}" alt="${closest.weather_desc}" style="width: 34px; height: 34px; object-fit: contain;">`;
            }
        }
    }

    // Render filter tanggal (Pills)
    function renderDatePills(dates) {
        const pillsContainer = document.getElementById("date-pills");
        if (!pillsContainer) return;

        pillsContainer.innerHTML = "";

        dates.forEach((dateStr, index) => {
            const dateObj = new Date(dateStr + "T00:00:00");
            let labelText = "";

            if (index === 0) {
                labelText = "Hari Ini";
            } else if (index === 1) {
                labelText = "Besok";
            } else if (index === 2) {
                labelText = "Lusa";
            } else {
                labelText = dateObj.toLocaleDateString("id-ID", {
                    weekday: "short",
                    day: "numeric",
                    month: "short"
                });
            }

            const pillBtn = document.createElement("button");
            pillBtn.type = "button";
            pillBtn.className = `date-pill ${dateStr === activeDateStr ? "active" : ""}`;
            pillBtn.innerHTML = `<span>${labelText}</span> <small style="opacity:0.8;">(${dateObj.getDate()}/${dateObj.getMonth() + 1})</small>`;

            pillBtn.addEventListener("click", () => {
                activeDateStr = dateStr;
                pillsContainer.querySelectorAll(".date-pill").forEach(p => p.classList.remove("active"));
                pillBtn.classList.add("active");
                renderSelectedDay(dateStr);
            });

            pillsContainer.appendChild(pillBtn);
        });
    }

    // Render statistik & cards untuk tanggal terpilih
    function renderSelectedDay(dateStr) {
        const hourlyItems = groupedByDate[dateStr] || [];
        if (hourlyItems.length === 0) return;

        const temps = hourlyItems.map(item => item.temp);
        const humidities = hourlyItems.map(item => item.humidity).filter(h => typeof h === 'number');

        const maxTemp = Math.max(...temps);
        const minTemp = Math.min(...temps);
        const avgHum = humidities.length > 0 
            ? Math.round(humidities.reduce((a, b) => a + b, 0) / humidities.length) 
            : 0;

        const maxTempEl = document.getElementById("max-temp");
        const minTempEl = document.getElementById("min-temp");
        const avgHumEl = document.getElementById("avg-humidity");
        const selectedDayTitle = document.getElementById("selected-day-title");

        if (maxTempEl) maxTempEl.textContent = `${maxTemp.toFixed(0)}°C`;
        if (minTempEl) minTempEl.textContent = `${minTemp.toFixed(0)}°C`;
        if (avgHumEl) avgHumEl.textContent = `${avgHum}%`;

        const dateObj = new Date(dateStr + "T00:00:00");
        if (selectedDayTitle) {
            selectedDayTitle.textContent = `Prakiraan Cuaca Berkala (${dateObj.toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            })})`;
        }

        renderHourlyCards(hourlyItems, minTemp, maxTemp);
        renderTableBody(hourlyItems, minTemp, maxTemp);
    }

    // Render kartu horisontal perkiraan cuaca
    function renderHourlyCards(items, minTemp, maxTemp) {
        const container = document.getElementById("hourly-cards-container");
        if (!container) return;

        const closestOverall = getClosestSlot(allSlots);
        container.innerHTML = "";

        const tempRange = maxTemp - minTemp || 1;

        items.forEach(item => {
            const isCurrent = closestOverall && (item.datetime === closestOverall.datetime);
            const condition = getTemperatureCondition(item.temp);
            const barPercentage = Math.max(10, Math.min(100, Math.round(((item.temp - minTemp) / tempRange) * 100)));

            const card = document.createElement("div");
            card.className = `hourly-card ${isCurrent ? "current-hour" : ""}`;
            card.innerHTML = `
                <span class="hour-time">${item.hour}</span>
                ${isCurrent ? '<span class="hour-badge">Kini</span>' : ''}
                ${item.image ? `<img src="${item.image}" alt="${item.weather_desc}" class="hour-icon-img">` : `<span class="hour-icon">${condition.icon}</span>`}
                <span class="hour-temp">${item.temp.toFixed(0)}°</span>
                <span class="hour-desc" title="${item.weather_desc}">${item.weather_desc}</span>
                <div class="hour-bar-wrap" title="Suhu: ${item.temp}°C">
                    <div class="hour-bar-fill" style="width: ${barPercentage}%; background-color: ${condition.color};"></div>
                </div>
            `;
            container.appendChild(card);
        });

        // Auto-scroll ke jam saat ini
        setTimeout(() => {
            const currentCard = container.querySelector(".hourly-card.current-hour");
            if (currentCard) {
                currentCard.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
            }
        }, 150);
    }

    // Render baris tabel cuaca
    function renderTableBody(items, minTemp, maxTemp) {
        const tbody = document.getElementById("weather-table-body");
        if (!tbody) return;

        const closestOverall = getClosestSlot(allSlots);
        const tempRange = maxTemp - minTemp || 1;

        tbody.innerHTML = "";

        items.forEach(item => {
            const isCurrent = closestOverall && (item.datetime === closestOverall.datetime);
            const condition = getTemperatureCondition(item.temp);
            const barPercentage = Math.max(10, Math.min(100, Math.round(((item.temp - minTemp) / tempRange) * 100)));

            const tr = document.createElement("tr");
            if (isCurrent) tr.className = "table-current-row";

            tr.innerHTML = `
                <td>
                    <strong>${item.hour}</strong> 
                    ${isCurrent ? '<span class="session-chip" style="padding:2px 6px; font-size:10px; margin-left:6px;">Jam Ini</span>' : ''}
                </td>
                <td>
                    <div class="table-weather-cell">
                        ${item.image ? `<img src="${item.image}" alt="${item.weather_desc}">` : ''}
                        <span class="condition-tag ${condition.tagClass}">${item.weather_desc}</span>
                    </div>
                </td>
                <td><strong style="color: ${condition.color}; font-size:14px;">${item.temp.toFixed(0)} °C</strong></td>
                <td><span style="color:#3b82f6; font-weight:600;">&#9679;</span> ${item.humidity}%</td>
                <td><span style="color:#64748b;">~</span> ${item.wind_speed} km/j (${item.wind_dir})</td>
                <td>
                    <div class="progress-bar-wrap">
                        <div class="progress-bar-fill" style="width: ${barPercentage}%; background-color: ${condition.color};"></div>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Auto-scroll tabel ke baris jam saat ini
        setTimeout(() => {
            const currentRow = tbody.querySelector(".table-current-row");
            if (currentRow) {
                currentRow.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }, 200);
    }

    // Helper klasifikasi suhu dan warna representatif
    function getTemperatureCondition(temp) {
        if (temp < 20) {
            return { label: "Sejuk", icon: "&#9729;", color: "#16a34a", tagClass: "tag-mild" };
        } else if (temp < 28) {
            return { label: "Nyaman / Hangat", icon: "&#9788;", color: "#d97706", tagClass: "tag-warm" };
        } else if (temp < 33) {
            return { label: "Hangat / Cukup Panas", icon: "&#9728;", color: "#ea580c", tagClass: "tag-warm" };
        } else {
            return { label: "Panas Terik", icon: "&#9733;", color: "#dc2626", tagClass: "tag-hot" };
        }
    }

    // Pasang Event Listeners
    if (btnRefresh) {
        btnRefresh.addEventListener("click", () => fetchWeather());
    }

    if (btnRetry) {
        btnRetry.addEventListener("click", () => fetchWeather());
    }

    // Eksekusi pengambilan data cuaca awal
    fetchWeather();
}

// LOGIKA FORM AUTH (LOGIN & REGISTER)
function initAuthForms() {
    const forms = document.querySelectorAll("form");

    forms.forEach(form => {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            let isValid = true;

            // Bersihkan pesan error sebelumnya
            form.querySelectorAll(".error-message").forEach(el => el.remove());
            form.querySelectorAll("input").forEach(input => {
                input.style.borderColor = "";
                input.style.marginBottom = "";
            });

            const showError = (input, message) => {
                isValid = false;
                input.style.borderColor = "#ef4444";

                if (input.type !== "checkbox") {
                    input.style.marginBottom = "0";
                }

                const error = document.createElement("span");
                error.className = "error-message";
                error.style.color = "#ef4444";
                error.style.fontSize = "0.82em";
                error.style.fontWeight = "500";
                error.style.display = "block";
                error.style.marginTop = "4px";
                if (input.type !== "checkbox") {
                    error.style.marginBottom = "14px";
                }
                error.innerText = message;
                input.parentNode.appendChild(error);
            };

            const isRegister = !!form.querySelector("#nama");
            const namaInput = form.querySelector("#nama");
            const emailInput = form.querySelector("#email");
            const passwordInput = form.querySelector("#password");
            const konfirmasiInput = form.querySelector("#konfirmasi");
            const syaratCheckbox = form.querySelector("#syarat");
            const ingatCheckbox = form.querySelector("#ingat");
            const submitBtn = form.querySelector("button[type='submit']");

            // --- VALIDASI INPUT DI SISI CLIENT ---
            if (namaInput) {
                if (!namaInput.value.trim()) {
                    showError(namaInput, "Nama tidak boleh kosong.");
                } else if (namaInput.value.trim().length < 3) {
                    showError(namaInput, "Nama minimal 3 karakter.");
                }
            }

            if (emailInput) {
                if (!emailInput.value.trim()) {
                    showError(emailInput, "Email tidak boleh kosong.");
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) {
                    showError(emailInput, "Format email tidak valid.");
                }
            }

            if (passwordInput) {
                if (!passwordInput.value.trim()) {
                    showError(passwordInput, "Password tidak boleh kosong.");
                } else if (passwordInput.value.length < 8) {
                    showError(passwordInput, "Password minimal 8 karakter.");
                }
            }

            if (konfirmasiInput) {
                if (!konfirmasiInput.value.trim()) {
                    showError(konfirmasiInput, "Konfirmasi password tidak boleh kosong.");
                } else if (konfirmasiInput.value !== passwordInput.value) {
                    showError(konfirmasiInput, "Password tidak cocok.");
                }
            }

            if (syaratCheckbox && !syaratCheckbox.checked) {
                showError(syaratCheckbox, "Anda harus menyetujui syarat dan ketentuan.");
            }

            if (!isValid) return;

            // --- KOMUNIKASI DENGAN REST API (JSON-SERVER) ---
            const emailValue = emailInput.value.trim().toLowerCase();
            const passwordValue = passwordInput.value;

            const originalBtnText = submitBtn.innerText;
            submitBtn.innerText = "Memproses...";
            submitBtn.disabled = true;

            try {
                if (isRegister) {
                    // 1. Cek apakah email sudah terdaftar via API (GET /users?email=...)
                    const checkRes = await fetch(`${AUTH_API_URL}?email=${encodeURIComponent(emailValue)}`);
                    if (!checkRes.ok) throw new Error("Gagal memeriksa email pada API.");

                    const existingUsers = await checkRes.json();
                    if (existingUsers.length > 0) {
                        showError(emailInput, "Email sudah terdaftar. Silakan gunakan email lain atau login.");
                        return;
                    }

                    // 2. Kirim data baru via API (POST /users)
                    const newUser = {
                        nama: namaInput.value.trim(),
                        email: emailValue,
                        password: passwordValue
                    };

                    const postRes = await fetch(AUTH_API_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(newUser)
                    });

                    if (!postRes.ok) throw new Error("Gagal mendaftarkan akun.");

                    alert("Registrasi Berhasil! Silakan login dengan akun baru Anda.");
                    form.reset();
                    window.location.href = "login.html";

                } else {
                    // 1. Ambil data user berdasarkan email via API (GET /users?email=...)
                    const res = await fetch(`${AUTH_API_URL}?email=${encodeURIComponent(emailValue)}`);
                    if (!res.ok) throw new Error("Gagal menghubungi server API.");

                    const users = await res.json();
                    if (users.length === 0) {
                        showError(emailInput, "Email tidak terdaftar.");
                        return;
                    }

                    const user = users[0];

                    // 2. Periksa password
                    if (user.password !== passwordValue) {
                        showError(passwordInput, "Password salah.");
                        return;
                    }

                    // 3. Simpan email jika "Ingat saya" dicentang
                    if (ingatCheckbox && ingatCheckbox.checked) {
                        localStorage.setItem("remembered_email", user.email);
                    } else {
                        localStorage.removeItem("remembered_email");
                    }

                    // 4. Simpan sesi login aktif
                    sessionStorage.setItem("current_user", JSON.stringify({
                        id: user.id,
                        nama: user.nama,
                        email: user.email
                    }));

                    alert(`Login Berhasil! Selamat datang, ${user.nama}.`);
                    window.location.href = "dashboard.html";
                }
            } catch (err) {
                console.error("API Error:", err);
                alert(
                    "Gagal terhubung ke API json-server!\n\n" +
                    "Pastikan server API sudah berjalan dengan perintah:\n" +
                    "npm start\n\n" +
                    "Detail Error: " + err.message
                );
            } finally {
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    });
}
