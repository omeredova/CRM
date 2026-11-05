# CRM

Мини-CRM для строительной компании: объекты, задачи, роли постановщика и исполнителя, история статусов. Права доступа и переходы статусов проверяются в базе через RLS и функции Supabase.

[Открыть приложение](https://crm-two-theta-51.vercel.app/login). Доступы к демонстрационным аккаунтам передаются отдельно.

**Стек:** React, TypeScript, Vite, shadcn/ui, Tailwind CSS, Supabase.

## Запуск

Нужны Node.js 24, npm и настроенный проект Supabase.

```bash
git clone https://github.com/omeredova/CRM.git
cd CRM
npm ci
cp .env.example .env
```

Заполните `.env` значениями своего проекта:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Используйте публичный ключ, не `service_role` или secret key. Затем запустите:

```bash
npm run dev
```

Откройте адрес из вывода Vite.

## База данных

Миграции находятся в `supabase/migrations/`. Для нового проекта (Supabase CLI 3.0.0):

```bash
npx supabase@3.0.0 login
npx supabase@3.0.0 link --project-ref YOUR_PROJECT_REF
npx supabase@3.0.0 migration list --remote
npx supabase@3.0.0 db push --dry-run --remote
```

Проверьте целевой проект и список миграций, затем выполните `npx supabase@3.0.0 db push --remote`.

В облачном Supabase Auth отключите открытую регистрацию и создайте пользователей через Authentication → Users. Триггер создаёт профиль с ролью `executor`; администратор назначает постановщику `role = manager` в `public.profiles`. Имя и фамилию пользователи заполняют в приложении. Учётные записи и демоданные в миграции не включены.

## Проверки и публикация

```bash
npm run build
npm run lint
npm test
npm run preview
```

Для Vercel: ветка `main`, пресет Vite, команда сборки `npm run build`, каталог `dist`. Добавьте обе переменные из `.env` в настройки окружения Vercel. Внутренние маршруты настроены в `vercel.json`.
