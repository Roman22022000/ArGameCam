const API_URL =
    "https://api.araicameragame.party/api/generation";


const generationButton =
    document.getElementById("generationButton");

const generationScreen =
    document.getElementById("generationScreen");

const generationBack =
    document.getElementById("generationBack");

const generationForm =
    document.getElementById("generationForm");

const generationCode =
    document.getElementById("generationCode");

const generationResult =
    document.getElementById("generationResult");


/*
    TON-кошелёк пользователя.

    Этот адрес должен быть установлен
    основным TON Connect кодом сайта.
*/
let currentWallet = null;


/* =========================================================
   ПОЛУЧЕНИЕ КОШЕЛЬКА
========================================================= */

function setGenerationWallet(wallet) {

    if (!wallet) {
        currentWallet = null;
        return;
    }

    currentWallet =
        wallet.account.address;

    console.log(
        "Generation wallet:",
        currentWallet
    );
}


/*
    Если TON Connect уже создан
    в основном index.html:

        tonConnectUI

    подписываемся на его изменения.
*/

if (
    typeof tonConnectUI !== "undefined"
) {

    tonConnectUI.onStatusChange(
        wallet => {

            setGenerationWallet(
                wallet
            );

        }
    );


    /*
        Если кошелёк уже был подключён
        до загрузки этого файла.
    */

    if (
        tonConnectUI.wallet
    ) {

        setGenerationWallet(
            tonConnectUI.wallet
        );

    }
}


/* =========================================================
   ОТКРЫТИЕ ГЕНЕРАЦИИ
========================================================= */

if (
    generationButton &&
    generationScreen
) {

    generationButton.addEventListener(
        "click",
        () => {

            document
                .querySelectorAll(".screen")
                .forEach(
                    screen => {
                        screen.classList.remove(
                            "active"
                        );
                    }
                );


            generationScreen.classList.add(
                "active"
            );


            if (generationCode) {

                generationCode.value = "";

                setTimeout(
                    () => {
                        generationCode.focus();
                    },
                    100
                );

            }


            if (generationResult) {

                generationResult.textContent =
                    "";

            }

        }
    );

}


/* =========================================================
   НАЗАД
========================================================= */

if (generationBack) {

    generationBack.addEventListener(
        "click",
        () => {

            document
                .querySelectorAll(".screen")
                .forEach(
                    screen => {
                        screen.classList.remove(
                            "active"
                        );
                    }
                );


            const homeScreen =
                document.getElementById(
                    "homeScreen"
                );


            if (homeScreen) {

                homeScreen.classList.add(
                    "active"
                );

            }

        }
    );

}


/* =========================================================
   ТОЛЬКО 5 ЦИФР
========================================================= */

if (generationCode) {

    generationCode.addEventListener(
        "input",
        () => {

            generationCode.value =
                generationCode.value
                    .replace(/\D/g, "")
                    .slice(0, 5);

        }
    );

}


/* =========================================================
   ОТПРАВКА
========================================================= */

if (generationForm) {

    generationForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const code =
                generationCode
                    ? generationCode.value.trim()
                    : "";


            /* -----------------------------------------
               ПРОВЕРКА НОМЕРА
            ----------------------------------------- */

            if (
                !/^\d{5}$/.test(code)
            ) {

                if (generationResult) {

                    generationResult.textContent =
                        "Введите 5 цифр";

                }

                return;

            }


            /* -----------------------------------------
               ПРОВЕРКА КОШЕЛЬКА
            ----------------------------------------- */

            if (!currentWallet) {

                if (generationResult) {

                    generationResult.textContent =
                        "Кошелёк не подключён";

                }

                return;

            }


            if (generationResult) {

                generationResult.textContent =
                    "Отправка...";

            }


            /*
                ВОТ ЭТИ ДВА ПОЛЯ
                УХОДЯТ НА ТВОЙ ПК:

                    code
                    wallet
            */

            const payload = {

                code: code,

                wallet: currentWallet

            };


            console.log(
                "SEND TO PC:",
                payload
            );


            try {

                const response =
                    await fetch(
                        API_URL,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.error ||
                        "Ошибка сервера"
                    );

                }


                if (generationResult) {

                    generationResult.textContent =
                        "Данные отправлены";

                }


                generationCode.value =
                    "";


            } catch (error) {

                console.error(
                    "Ошибка отправки:",
                    error
                );


                if (generationResult) {

                    generationResult.textContent =
                        "Ошибка соединения с сервером";

                }

            }

        }
    );

}
