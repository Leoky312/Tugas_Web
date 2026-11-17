document.addEventListener("DOMContentLoaded", () => {
    const forms = document.querySelectorAll("form");

    forms.forEach(form => {
        form.addEventListener("submit", (e) => {
            let isValid = true;
            
            form.querySelectorAll(".error-message").forEach(el => el.remove());
            form.querySelectorAll("input").forEach(input => {
                input.style.borderColor = "";
                input.style.marginBottom = "";
            });

            const showError = (input, message) => {
                isValid = false;
                input.style.borderColor = "red";
                
                if (input.type !== "checkbox") {
                    input.style.marginBottom = "0";
                }
                
                const error = document.createElement("span");
                error.className = "error-message";
                error.style.color = "red";
                error.style.fontSize = "0.85em";
                error.style.display = "block";
                error.style.marginTop = "5px";
                if (input.type !== "checkbox") {
                    error.style.marginBottom = "13px";
                }
                error.innerText = message;
                input.parentNode.appendChild(error);
            };

            const emailInput = form.querySelector("#email");
            if (emailInput) {
                if (!emailInput.value.trim()) {
                    showError(emailInput, "Email tidak boleh kosong.");
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) {
                    showError(emailInput, "Format email tidak valid.");
                }
            }

            const passwordInput = form.querySelector("#password");
            if (passwordInput) {
                if (!passwordInput.value.trim()) {
                    showError(passwordInput, "Password tidak boleh kosong.");
                } else if (passwordInput.value.length < 8) {
                    showError(passwordInput, "Password minimal 8 karakter.");
                }
            }

            const namaInput = form.querySelector("#nama");
            if (namaInput) {
                if (!namaInput.value.trim()) {
                    showError(namaInput, "Nama tidak boleh kosong.");
                } else if (namaInput.value.trim().length < 3) {
                    showError(namaInput, "Nama minimal 3 karakter.");
                }
            }

            const konfirmasiInput = form.querySelector("#konfirmasi");
            if (konfirmasiInput) {
                if (!konfirmasiInput.value.trim()) {
                    showError(konfirmasiInput, "Konfirmasi password tidak boleh kosong.");
                } else if (konfirmasiInput.value !== passwordInput.value) {
                    showError(konfirmasiInput, "Password tidak cocok.");
                }
            }

            const syaratCheckbox = form.querySelector("#syarat");
            if (syaratCheckbox && !syaratCheckbox.checked) {
                showError(syaratCheckbox, "Anda harus menyetujui syarat dan ketentuan.");
            }

            if (!isValid) {
                e.preventDefault();
            } else {
                e.preventDefault();
                alert(form.querySelector("button").innerText + " Berhasil!");
            }
        });
    });
});
