from aiogram import Bot, Dispatcher
from aiogram.types import (
    Message,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo
)
from aiogram.filters import CommandStart
import asyncio


BOT_TOKEN = "8805917929:AAHrAe_yN32QSeJTFtgkLZj43bsK-WUk8oc"

bot = Bot(BOT_TOKEN)
dp = Dispatcher()


@dp.message(CommandStart())
async def start(message: Message):

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Запустить AR",
                    web_app=WebAppInfo(
                        url="https://roman22022000.github.io/ArGameCam/"
                    )
                )
            ]
        ]
    )

    await message.answer(
        "AR Game\n\n"
        "Нажми кнопку ниже, чтобы открыть AR.",
        reply_markup=keyboard
    )


async def main():
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
