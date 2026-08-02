# Trivialsite

Чёрно-белая версия сайта Trivial Client со структурой страниц и папок в стиле исходного `rockstar.pub`.

## Запуск

1. Скопируйте `.env.example` в `.env` и укажите `DATABASE_URL`.
2. Выполните `npm install`.
3. Запустите `npm start`.
4. Откройте `http://localhost:3000`.

Фронтенд можно открыть и как статический сайт, но регистрация, вход, профиль и активация требуют API и PostgreSQL.

## База данных

Перед первым запуском выполните SQL из `api/database/schema.sql` в вашей PostgreSQL-базе.

## Структура

Проект использует раздельные папки `css/main`, `api/routes`, `api/database`, `api/utils`, `js`, `img` и `uploads/configs`, как в предоставленном примере. Секретный `.env`, база SQLite, `node_modules` и исполняемый JAR в архив намеренно не включены.
