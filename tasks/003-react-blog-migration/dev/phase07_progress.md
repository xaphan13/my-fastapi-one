# Прогресс фазы 7: Удаление Jinja + SPA fallback

- 2026-08-31: __init__.py — удалены старые роутеры (routes_main/users/articles), HTML-обработчики ошибок; остались middleware сессии+current_user, mount /static, обработчик RequestValidationError (JSON {errors} для /api/blog), include router_blog_api — OK
- 2026-08-31: web_utils.py — переписан: остались get_current_user, login_user, logout_user, hash_password, verify_password; Jinja2Templates/_inject_globals/flash/require_login/_ensure_csrf_token/validate_csrf удалены (CSRF-хелперы живут в api_blog.py) — OK
- 2026-08-31: main.py — mount /assets -> frontend/dist/assets (check_dir=False), spa_fallback + Route("/{full_path:path}") в конец router.routes (после всех include/mount); api/* внутри catch-all -> 404 JSON; нет dist/index.html -> 404 JSON с подсказкой npm run build — OK
- 2026-08-31: удаления — git rm routes_main.py, routes_users.py, routes_articles.py (md_articles/), templates/ (рекурсивно), static/art_css/base.css + scripts.js — OK
- 2026-08-31: ruff — All checks passed; len(main_app.routes) == 40 (ожидание 40) — OK
- 2026-08-31: npm run build — BUILD_EXIT=0, dist/index.html есть — OK
- 2026-08-31: uvicorn перезапущен на :8000 (старый процесс 1647565 погашен, PID нового оставлен работать для qa/adversary) — OK
- 2026-08-31: curl smoke (phase07_raw.txt): / 200 + id="root" x1; /art/Max/1787932544 200; /static/profile_pics/default.jpg 200; /api/blog/articles 200; /art_home 200 SPA (id=root x1); /api/blog/nonexistent 404 {"detail":"Not Found"}; /assets/ 404 (не 500); /docs 200; dep_examples c foobar 200; /users/get_all_users 200; /orders/get_all_orders?params=id 200; /register 200 (SPA) — OK
- 2026-08-31: ФАЗА 7 ГОТОВА. Сервер оставлен на :8000 для qa/adversary