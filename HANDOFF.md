# Marina Cashier — handoff для продовження роботи на іншому компі

> Цей файл — точка входу для нового Claude (або для тебе) на новому компі.
> Прочитай зверху вниз — після цього маєш весь контекст.

---

## 1. Що це і де воно

**Marina Cashier** — POS PWA для мережі квіткових магазинів.
Greenfield, single-tenant, без РРО, на власному VPS.

- **Репо:** https://github.com/oleksandr-ivanovich/flowers (гілка `main`)
- **Прод:** https://kasa.oleksandr.fun (VPS 173.242.59.60, Ubuntu)
- **Локально на старому компі:** `C:\Users\Oleksandr\Desktop\marina`
- **На VPS:** `/srv/marina`

---

## 2. Стек

**Backend:** Python 3.12, FastAPI, SQLAlchemy 2.x, Pydantic v2, Alembic, PostgreSQL 16, JWT auth, RBAC.
**Frontend:** React 18 + Vite + TypeScript + Tailwind, TanStack Query, React Router.
**Інфра:** Docker Compose (db + api + web), nginx на хості (НЕ Caddy — конфліктував з іншим сайтом), Let's Encrypt cert.
**Тести:** pytest у контейнері api.

---

## 3. Структура

```
marina/
├── backend/
│   ├── app/
│   │   ├── api/         # роути FastAPI (auth, customers, transactions, ...)
│   │   ├── core/        # config, deps, audit
│   │   ├── db/          # base, models
│   │   ├── schemas/     # Pydantic
│   │   ├── services/    # бізнес-логіка (shifts, reports)
│   │   ├── alembic/     # міграції
│   │   └── main.py
│   ├── tests/
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── features/
│   │   │   ├── auth/         # LoginPage
│   │   │   ├── cashier/      # AddSalePage, CashierHome, CloseShiftPage, Deposit/Withdrawal
│   │   │   ├── owner/        # CustomersPage, StoresPage, UsersPage, OwnerPanel, *ReportPage
│   │   │   └── home/         # HomePage (диспатч за роллю)
│   │   ├── lib/              # api, auth, types
│   │   └── router.tsx
│   ├── package.json
│   └── Dockerfile
├── scripts/deploy.sh
├── docker-compose.yml
├── .env.example
├── ІНСТРУКЦІЯ.md             # юзерська інструкція (касир + власник)
└── HANDOFF.md                # цей файл
```

---

## 4. Поточний стан (станом на коміт `8334537`)

**Реалізовано і в проді:**
- Логін / RBAC (cashier, store_admin, owner)
- Магазини (CRUD, активація/деактивація, test-only delete)
- Користувачі (CRUD, активація/деактивація, test-only delete)
- Зміни (відкриття/закриття, Z-звіт)
- Транзакції (продаж / внесення / вилучення)
- Звіти по магазинах і по мережі (XLSX/CSV експорт)
- Список «Операції зміни» на головній касира
- **Програма лояльності (бонуси):**
  - Таблиця `customers` (name, phone унікальний, bonus_balance, is_active)
  - `payment_methods.is_bonus` — окремий метод «Бонуси»
  - `transactions.customer_id` (FK ON DELETE SET NULL)
  - +7% автоматично на не-бонусні продажі (ставка з `BONUS_RATE_PERCENT`)
  - Оплата бонусами зменшує баланс, перевірка достатності
  - Owner: сторінка «Клієнти» — CRUD + ручна корекція балансу
  - Cashier: селектор клієнта + інлайн-форма «+ Новий клієнт» на сторінці продажу
  - 8 тестів `test_bonuses.py` — усі зелені

**Поза обсягом / на потім:**
- Окремий звіт «Оборот по клієнту за період»
- SMS / push клієнтам
- Картки лояльності з QR
- Рівневі знижки
- Термін придатності бонусів
- Прибрати тестові DELETE-кнопки (магазини/користувачі/клієнти) перед продакшеном для реальних даних

---

## 5. Налаштування на новому компі (5 хв)

```bash
git clone https://github.com/oleksandr-ivanovich/flowers.git marina
cd marina

# Python 3.12+ для бекенду (опційно — все одно тести у docker)
# Node 20+ для фронту
# Docker Desktop — обовʼязково для локального стека

cp .env.example .env
# відредагуй .env: SECRET_KEY (рандом), POSTGRES_PASSWORD, etc.

docker compose up -d --build
docker compose exec api alembic upgrade head

# Створити першого власника:
docker compose exec api python -c "
from app.db.base import SessionLocal
from app.db.models import User, UserRole
from app.core.security import hash_password
db = SessionLocal()
db.add(User(email='owner@example.com', password_hash=hash_password('CHANGE_ME'), full_name='Власник', role=UserRole.owner.value, store_id=None))
db.commit()
"

# Тести (потрібен pytest у контейнері — не входить у прод-образ):
docker compose exec api pip install pytest pytest-asyncio httpx
docker compose exec api python -m pytest tests/ -v
```

Фронт у Docker зробить production build і віддасть через nginx на 127.0.0.1:8080. Для dev-режиму (HMR):
```bash
cd frontend && npm install && npm run dev
```
(api візьме з http://localhost:8000)

---

## 6. Деплой на VPS

```bash
ssh root@173.242.59.60
cd /srv/marina
git pull
./scripts/deploy.sh   # build + up + migrate + healthcheck
```

`deploy.sh` сам застосовує alembic-міграції. Хост-nginx уже налаштований на проксі до 127.0.0.1:8000 (api) і 127.0.0.1:8080 (web), cert від Let's Encrypt автооновлюється certbot-ом.

**Якщо переналаштовуєш nginx з нуля** — конфіг у `/etc/nginx/sites-available/kasa.oleksandr.fun`:
- `location /api/ { proxy_pass http://127.0.0.1:8000; }`
- `location / { proxy_pass http://127.0.0.1:8080; }`
- HTTPS на 443, HTTP редірект на HTTPS.

---

## 7. Відомі особливості / decisions

- **Бонусна оплата = окремий `payment_method` з `is_bonus=true`.** Не нова сутність. Звіти `_sales_by_payment` групують по payment_method_id і автоматично показують «Бонуси» рядком. `cash_in_register` фільтрує по `name == "Готівка"` — бонусні платежі не йдуть у касу. Це навмисно правильно.
- **Часткова оплата (готівка + бонуси)** = дві окремі транзакції в межах одного продажу. Касир натискає «Зберегти продаж» двічі.
- **Нарахування 7% тільки на не-бонусні продажі** з `customer_id`. Оплата бонусами не дає нових бонусів.
- **POST /api/customers** — будь-який авторизований користувач (касир теж може створити нового клієнта прямо на сторінці продажу).
- **DELETE-ендпоінти для stores/users/customers** — test-only, треба прибрати або обнести роллю до релізу реальним магазинам.
- **`customer_id` ON DELETE SET NULL** — історія транзакцій залишається, навіть якщо клієнта видалили.
- **Pytest НЕ входить у прод-образ** (тільки у `[project.optional-dependencies].dev`). Для тестів встановлюється тимчасово через `pip install`.
- **Caddy прибрано** — на VPS уже був host-nginx з іншим сайтом (OLX парсер) на портах 80/443. Зараз тільки docker-сервіси на 127.0.0.1, а нагору проксі через системний nginx.

---

## 8. Корисні команди

**Локально / на VPS:**
```bash
docker compose logs -f api          # логи бекенду
docker compose exec db psql -U marina -d marina   # SQL шелл
docker compose exec api alembic revision --autogenerate -m "msg"   # нова міграція
docker compose exec api alembic upgrade head
docker compose exec api alembic downgrade -1
docker compose exec api python -m pytest tests/ -v
docker compose down && docker compose up -d --build   # повний рестарт
```

**Створити нову міграцію вручну:**
файли в `backend/app/alembic/versions/000N_*.py`, формат як у `0001_initial.py` і `0002_customers_and_bonuses.py`. `revision`, `down_revision` — рядки.

---

## 9. Як продовжити роботу з Claude на новому компі

1. Клонуй репо.
2. Відкрий папку проєкту в Claude Code (`claude code` у тій теці, або через IDE-плагін).
3. Перше повідомлення Claude:
   > «Прочитай `HANDOFF.md` і `ІНСТРУКЦІЯ.md`. Скажи що робив попередній Claude і які пункти з "Поза обсягом" варто розглянути далі.»
4. План попереднього Claude (програма лояльності) лежав у `~/.claude/plans/17-04-2026-0-04-marina-kharina-atomic-ullman.md` на старому компі — він **уже виконаний**, переносити не треба.
5. Памʼять про проєкт була в `~/.claude/projects/C--Users-Oleksandr-Desktop-marina/memory/MEMORY.md`. На новому компі вона зʼявиться сама після кількох сесій, або скажи Claude явно: «занотуй в памʼять, що це проєкт Marina Cashier — POS PWA, FastAPI+React+Postgres, single-tenant, прод на kasa.oleksandr.fun».

---

## 10. Кредитки / секрети

**Не в репо!** На VPS вони лежать у `/srv/marina/.env`. Скопіюй файл собі у безпечне місце (1Password, KeePass), щоб мати при потребі.

Ключові поля:
- `POSTGRES_PASSWORD` — пароль бази
- `SECRET_KEY` — для JWT (32+ випадкових байтів, base64)
- `DATABASE_URL` — з тим самим паролем
- `CORS_ORIGINS` — `https://kasa.oleksandr.fun`

---

**Готово.** Цього файлу + git clone достатньо щоб продовжити роботу будь-де.
