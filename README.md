# TrivialSite fixed v10

Исправлен runtime HTTP 500 на `/api/login` и других API-маршрутах: `api-handler.js` находился в корне проекта, но импортировал серверные модули через `../server/...`, то есть из родительской директории. На Vercel это приводило к падению Serverless Function до выполнения обработчика. Импорты исправлены на `./server/...`.

# Trivial Client Site 5.0 — исправленная сборка

## Исправление v5: HTML вместо ответа API

Если браузер показывал в ошибке текст, начинающийся с `<!doctype html>...404`, запрос `/api/...` попадал на HTML-страницу 404 вместо Vercel Function. В v5:

- для каждого используемого API-маршрута добавлен отдельный entrypoint в `api/`;
- центральный `/api/index.js` оставлен как fallback;
- маршрутизация чистых URL больше не зависит от `cleanUrls` вместе с `.html` destination;
- прямые `/profile.html`, `/signin.html` и другие адреса перенаправляются на `/profile`, `/signin` и т. д.;
- фронтенд больше не выводит сырой HTML 404 как текст ошибки.


Сайт, API авторизации, лицензии, профиль, админ-панель и защищённая загрузка лаунчера.

## Что исправлено в этой сборке

- исправлена ошибка `500` на `POST /api/activate` при старой структуре поля подписки;
- срок подписки теперь хранится в каноническом поле `users.subscription_until TIMESTAMPTZ`;
- миграция v4 переносит совместимые значения из старого `users.subscription`, не удаляя старое поле;
- миграция умеет нормализовать старые несовместимые типы `licenses.license_key`, `licenses.status` и `licenses.duration_days`;
- активация ключа выполняется атомарно и проверяет, что ключ действительно помечен использованным;
- добавлены понятные ответы для ошибок несовместимой/устаревшей схемы БД;
- на Vercel чистые URL реализованы явной маршрутизацией: `/profile`, `/signin`, `/signup`, `/purchase`, `/admin-panel`, `/public-offer`, `/payment-success`;
- все внутренние ссылки и редиректы переведены с `.html` на чистые URL;
- локальный Express также перенаправляет `/profile.html` → `/profile` и `/index.html` → `/`;
- добавлен отсутствовавший `.env.example`;
- обновлена проверка проекта `npm run check` под чистые URL и прямые API entrypoint-файлы.

## Развёртывание на Vercel

Добавьте в Environment Variables проекта:

```text
DATABASE_URL=postgresql://...
SESSION_SECRET=<длинная случайная строка>
AUTO_MIGRATE=true
DATABASE_SSL=true
DATABASE_POOL_SIZE=1
ALLOWED_ORIGINS=https://trivialclient.vercel.app
```

После изменения переменных сделайте **Redeploy**.

Проверьте:

- `/api/health` — `databaseConfigured` должен быть `true`;
- `/api/status` — должен вернуть `database: "ok"` и `schema: "ok"`.

При первом обращении к API с `AUTO_MIGRATE=true` схема v4 применится автоматически. Если у пользователя БД нет прав на DDL, выполните содержимое `database/schema.sql` вручную в SQL Editor и затем задайте `AUTO_MIGRATE=false`.

## Локальный запуск

1. Установите Node.js 20+ и PostgreSQL.
2. Скопируйте `.env.example` в `.env` и заполните параметры.
3. Выполните:

```bash
npm install
npm run migrate
npm run check
npm start
```

4. Откройте `http://localhost:3000`.

## Назначение администратора

```sql
UPDATE users
SET role='admin'
WHERE LOWER(username)=LOWER('your_username');
```

Допустимые роли для создания ключей: `creator` и `admin`.

## Проверка активации

1. Войдите администратором и откройте `/admin-panel`.
2. Создайте ключ, например `TRIV-XXXX-XXXX-XXXX-30D`.
3. Войдите обычным пользователем и откройте `/profile`.
4. Активируйте ключ. API должен вернуть `200`, а дата подписки обновиться.
5. Повторная активация того же ключа должна вернуть сообщение, что ключ уже использован.

Старые ключи продолжают приниматься после миграции, если их можно сопоставить с таблицей `licenses`.

## Защищённая загрузка лаунчера

По умолчанию используется `storage/launcher/TrivialLauncher.zip`. Прямой `/storage` закрыт, загрузка выполняется через `/api/download/launcher` после проверки активной подписки. Вместо файла можно задать `LAUNCHER_DOWNLOAD_URL`.

## Публикация клиента

Опциональные переменные окружения:

- `CLIENT_DOWNLOAD_URL` — HTTPS URL загрузки JAR;
- `CLIENT_SHA256` — SHA-256 JAR;
- `MINECRAFT_VERSION`;
- `FABRIC_LOADER_VERSION`.

Без `CLIENT_DOWNLOAD_URL` лаунчер может авторизоваться и получить профиль, но запуск клиента будет недоступен.

## V7: Vercel Hobby / Node.js 24

- `package.json` is pinned to `node: 24.x` so Vercel uses the current supported runtime.
- All API endpoints are dispatched by a **single** `api/index.js` Vercel Function. This keeps the deployment below the Hobby plan limit of 12 Serverless Functions.
- `/api/activate`, `/api/login`, `/api/profile`, `/api/subscription/check`, `/api/download/launcher` and the other endpoints still keep the same public URLs; `vercel.json` routes them internally to the single dispatcher.
- Clean page URLs remain enabled through routing: `/profile`, `/signin`, `/signup`, `/purchase`, etc.

## v9: исправление загрузки стилей на Vercel

В `vercel.json` добавлен `handle: filesystem` до catch-all 404. Без него запросы к `/css/*`, `/js/*` и `/img/*` перехватывались маршрутом 404, поэтому сайт отображался как голый HTML без дизайна. Все локальные asset-ссылки также сделаны абсолютными (`/css/...`, `/js/...`, `/img/...`).

## Vercel Hobby: important for repositories updated through GitHub Upload files

Version 8 uses one explicit Vercel Node build (`api-handler.js`) instead of automatic `/api/*.js` discovery. This is intentional: GitHub's web **Upload files** action does not delete old files that are no longer present in an uploaded archive. Old files left under `/api` can otherwise continue to count as separate Vercel Functions.

The `vercel.json` in this package explicitly builds only `api-handler.js` as the backend function, so leftover historical `/api/*.js` files are not build targets. For a clean repository, delete the old `/api` directory entirely after uploading this version.
