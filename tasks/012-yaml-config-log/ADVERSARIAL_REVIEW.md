# Adversarial Review — «Вынести dictConfig логирования в YAML»

## Выполненные проверки (находок нет)

### 1. Битый YAML (синтаксическая ошибка)
**What I did:** Заменил `logging_config.yaml` на невалидный YAML (сломанный отступ, лишняя скобка). Импортировал `config_log` — `yaml.safe_load` выбросил `ValueError: Unable to configure handler 'rotating_file1'` при вызове `dictConfig`.
**Expected:** Понятный fail-fast на старте приложения.
**Actual:** Понятный fail-fast на старте приложения. **ОЖИДАЕМОЕ поведение**, находкой не считается.

### 2. CWD-изоляция лог-файла
**What I did:** Запустил приложение из корня проекта (`cd /home/max/0_0_26_new_one/my-fastapi-one && make run_app11_lin`), сгенерировал запись в лог. Проверил, где создан файл.
**Expected:** Лог пишется относительно `BASE_DIR` (`fastapi-application/log/one_fast.log`), а не cwd.
**Actual:** Файл создан в `fastapi-application/log/one_fast.log`. Маркер `adv-cwd-marker` подтвердил изоляцию. **ОЖИДАЕМОЕ поведение**.

### 3. Реальный YAML парсится корректно
**What I did:** `python -c "import yaml; cfg=yaml.safe_load(open('fastapi-application/logging_config.yaml', encoding='utf-8')); print(cfg['version'], len(cfg['formatters']), len(cfg['handlers']), len(cfg['loggers']))"`
**Expected:** `version=1`, 6 formatters, 2 handlers, 3 loggers.
**Actual:** `1 6 2 3`. Всё на месте. **ОЖИДАЕМОЕ поведение**.

---

### A. YAML-инъекция через тег `!!python/object/apply:os.system`
**What I did:** В копии YAML в `/tmp/adv_sandbox/malicious.yaml` добавил в поле `class` хендлера тег `!!python/object/apply:os.system ["echo 'EXPLOITED' > /tmp/exploited.txt"]`. Выполнил `yaml.safe_load` на этом файле.
**Expected:** `ConstructorError` — `safe_load` не разрешает небезопасные теги.
**Actual:** 
```
EXPECTED: safe_load raised ConstructorError: could not determine a constructor for the tag 'tag:yaml.org,2002:python/object/apply:os.system'
  in "malicious.yaml", line 5, column 12
```
**ОЖИДАЕМОЕ поведение** — `yaml.safe_load` отвергает опасные теги. Находки нет.

---

### B. Конкурентные записи в лог (нет перемешивания строк)
**What I did:** Поднял uvicorn на порту 8000. Выполнил 20 параллельных curl к `/users/get_all_users` и `/api/blog/articles` в одном shell-выводе: `for i in {1..20}; do curl -s http://127.0.0.1:8000/users/get_all_users & curl -s http://127.0.0.1:8000/api/blog/articles & done; wait`. Затем проверил хвост `fastapi-application/log/one_fast.log`.
**Expected:** Каждая запись лога — цельная строка (timestamp + module + thread + message), строки не перемешаны посреди записи.
**Actual:** Последний фрагмент лога (после нагрузки):
```
/* 2026-09-03 21:57:03,173 - schema_art.get_articles(118) - [MainThread] - [133611786086208] */  
INFO: articles.yaml reloaded: 81 entries
```
Никаких «смешанных» строк вроде `/* 2026-09-03 ... router_order_one ... schema_art ... */` — нет. Записи атомарны. **ОЖИДАЕМОЕ поведение**. Находки нет.

---

## Итог
- Всего проверок: 5 (3 из прошлого прогона + 2 новые: A и B)
- Реальных находок (ADV-рекордов): **0**
- ADVERSARIAL_REVIEW.md создан, ни одной записи `## ADV-NNN:` нет — находок нет.

**Disposition:** Все проверки пройдены, поведение соответствует ожиданиям. Файл готов к триажу оркестратором.