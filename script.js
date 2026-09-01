const API_URL = "https://api.araicameragame.party/api/generation";

const generationButton = document.getElementById("generationButton");
const generationScreen = document.getElementById("generationScreen");
const generationBack = document.getElementById("generationBack");
const generationForm = document.getElementById("generationForm");
const generationCode = document.getElementById("generationCode");
const generationResult = document.getElementById("generationResult");


// Открытие окна "Генерация"
if (generationButton && generationScreen) {
    generationButton.addEventListener("click", () => {
        document
            .querySelectorAll(".screen")
            .forEach(screen => screen.classList.remove("active"));

        generationScreen.classList.add("active");

        if (generationCode) {
            generationCode.value = "";
            generationCode.focus();
        }

        if (generationResult) {
            generationResult.textContent = "";
        }
    });
}


// Возврат назад
if (generationBack) {
    generationBack.addEventListener("click", () => {

        document
            .querySelectorAll(".screen")
            .forEach(screen => screen.classList.remove("active"));

        const homeScreen = document.getElementById("homeScreen");

        if (homeScreen) {
            homeScreen.classList.add("active");
        }
    });
}


// Ограничение: только 5 цифр
if (generationCode) {
    generationCode.addEventListener("input", () => {

        generationCode.value =
            generationCode.value
                .replace(/\D/g, "")
                .slice(0, 5);
    });
}


// Отправка данных
if (generationForm) {
    generationForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const code = generationCode
            ? generationCode.value.trim()
            : "";

        // Проверка
        if (!/^\d{5}$/.test(code)) {

            if (generationResult) {
                generationResult.textContent =
                    "Введите 5 цифр";
            }

            return;
        }

        if (generationResult) {
            generationResult.textContent =
                "Отправка...";
        }

        try {

            const response = await fetch(API_URL, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    code: code
                })
            });


            const data = await response.json();


            if (!response.ok || !data.success) {

                throw new Error(
                    data.error || "Ошибка сервера"
                );
            }


            if (generationResult) {
                generationResult.textContent =
                    "Данные отправлены";
            }


            generationCode.value = "";


        } catch (error) {

            console.error(
                "Ошибка отправки:",
                error
            );


            if (generationResult) {
                generationResult.textContent =
                    "Не удалось отправить данные";
            }
        }
    });
}
