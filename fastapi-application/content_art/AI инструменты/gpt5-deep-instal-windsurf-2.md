# Windsurf: установка и использование для Python-разработки

## Системные требования

-   **Операционная система:** Для Windows требуется 64-битная версия (не ниже Windows 10)[windsurf.com](https://windsurf.com/download/editor?os=linux#:~:text=Minimum%20Requirements%3A). Для Linux необходима современная система с библиотеками glibc >= 2.28 и glibcxx >= 3.4.25 (например, Ubuntu 20.04+, Debian 10+ и т.п.)[windsurf.com](https://windsurf.com/download/editor?os=linux#:~:text=Minimum%20Requirements%3A). Минимум 2 ГБ свободного диска и 8 ГБ оперативной памяти (рекомендуется 16 ГБ)[apidog.com](https://apidog.com/blog/download-install-windsurf/#:~:text=,2%20GB%20free%20disk%20space). Для доступа к AI-функциям требуется стабильное интернет-соединение[apidog.com](https://apidog.com/blog/download-install-windsurf/#:~:text=,for%20downloading%20and%20syncing%20plugins).
    
-   **Дополнительное ПО:** Для разработки на Python на компьютере должен быть установлен Python (желательно версии 3.7 или выше)[github.com](https://github.com/Exafunction/windsurf-demo#:~:text=,js%20and%20npm). При создании проектов на Python также понадобятся менеджер пакетов `pip` и соответствующие библиотеки.
    

## Установка Windsurf

1.  **Скачайте дистрибутив:**
    
    -   Для Windows перейдите на официальный сайт Windsurf и скачайте установщик для Windows (доступны варианты x64 и ARM64)[windsurf.com](https://windsurf.com/download/editor?os=linux#:~:text=Minimum%20Requirements%3A).
        
    -   Для Linux на той же странице выберите загрузку для Linux. Windsurf предоставляет **AppImage** для x64 и Arm64 (совместимо с Ubuntu 20.04 и новее)[apidog.com](https://apidog.com/blog/download-install-windsurf/#:~:text=Step%201%3A%20Download%20the%20Windsurf,Installer).
        
2.  **Установка на Windows:** Откройте скачанный `.exe`-файл и следуйте мастеру установки: выберите папку установки (по умолчанию `C:\Program Files\Windsurf`), подтвердите создание ярлыков и т.д. По завершении установки установите флажок «Запустить Windsurf» и нажмите «Завершить». При первом запуске возможно потребуется войти в учётную запись или создать новую (это бесплатно)[docs.windsurf.com](https://docs.windsurf.com/windsurf/getting-started#:~:text=3,in).
    
3.  **Установка на Linux:** Откройте терминал и перейдите в папку со скачанным AppImage. Сделайте его исполняемым командой `chmod +x Windsurf-*.AppImage`[apidog.com](https://apidog.com/blog/download-install-windsurf/#:~:text=Step%202%3A%20Make%20the%20AppImage,Executable). Затем запустите Windsurf командой `./Windsurf-*.AppImage`[apidog.com](https://apidog.com/blog/download-install-windsurf/#:~:text=Execute%20the%20AppImage%20by%20typing%3A). Windsurf запустится без традиционной установки; при желании можно переместить AppImage в `/usr/local/bin` для системного доступа.
    
4.  **Проверка установки:** После запуска убедитесь, что Windsurf запускается без ошибок и предлагает форму логина. Если приложение не запускается, проверьте соответствие системных библиотек (glibc) и дайте права на выполнение (особенно для Linux)[docs.windsurf.com](https://docs.windsurf.com/troubleshooting/windsurf-common-issues#:~:text=This%20is%20usually%20due%20to,is%20to%20run%20the%20following)[apidog.com](https://apidog.com/blog/download-install-windsurf/#:~:text=Step%202%3A%20Make%20the%20AppImage,Executable).
    

## Первоначальная настройка после установки

1.  **Импорт настроек (опционально):** При первом запуске Windsurf предложит вариант «Import from VS Code/Cursor» или «Start fresh». Если вы переходите с VS Code или Cursor, можно импортировать ваши прежние настройки и расширения[docs.windsurf.com](https://docs.windsurf.com/windsurf/getting-started#:~:text=1). Иначе выберите «Start fresh». Рекомендуется также установить Windsurf CLI в PATH, чтобы запускать командой `windsurf` из терминала[docs.windsurf.com](https://docs.windsurf.com/windsurf/getting-started#:~:text=1).
    
2.  **Выбор сочетаний клавиш и темы:** На следующем шаге выберите раскладку клавиш (стандартную VS Code или Vim) и цветовую тему редактора. Эти параметры всегда можно изменить позже в настройках.
    
3.  **Авторизация:** Для работы с AI-агентом Windsurf требуется учётная запись Codeium/Windsurf. Создайте учётку или войдите в существующую (бесплатно)[docs.windsurf.com](https://docs.windsurf.com/windsurf/getting-started#:~:text=3,in). После авторизации нажмите «Open Windsurf», чтобы открыть сам редактор[docs.windsurf.com](https://docs.windsurf.com/windsurf/getting-started#:~:text=3,in).
    
4.  **Дополнительные настройки:** Откройте боковую панель «Windsurf – Settings» (значок в правом нижнем углу), чтобы при необходимости поменять подробные настройки. Через палитру команд (`Ctrl+Shift+P`) можно найти команду импорта конфигураций от VS Code или Cursor[docs.windsurf.com](https://docs.windsurf.com/windsurf/getting-started#:~:text=Forgot%20to%20Import%20VS%20Code,Configurations).
    

## Интеграция Windsurf с Python

-   **Расширения для Python:** Windsurf поддерживает расширения из Open VSX Registry. Рекомендуется установить плагин **ms-python.python** (основная поддержка Python: IntelliSense, линтинг, отладка, управление виртуальными окружениями)[docs.windsurf.com](https://docs.windsurf.com/windsurf/recommended-plugins#:~:text=%2A%20ms,Debugging%20support%20for%20Python%20applications) и **Windsurf Pyright** (быстрый языковой сервер для проверки типов и автодополнений)[docs.windsurf.com](https://docs.windsurf.com/windsurf/recommended-plugins#:~:text=%2A%20ms,Debugging%20support%20for%20Python%20applications). Также могут пригодиться **Ruff** (линтер/форматтер) и расширение **Python Debugger** для удобного пошагового отладки[docs.windsurf.com](https://docs.windsurf.com/windsurf/recommended-plugins#:~:text=Python).
    
-   **Настройка интерпретатора:** После установки расширения Python укажите интерпретатор (virtualenv/venv) для проекта через палитру команд. Как в VS Code, можно активировать виртуальную среду или выбрать системный Python.
    
-   **Запуск кода:** Для запуска скриптов Python воспользуйтесь встроенным терминалом Windsurf. Откройте терминал (`View > Terminal` или `Ctrl+\``) и запустите` python script.py`или`pip install`по надобности. Можно также использовать функцию **Command**: нажмите`Ctrl+I` в терминале, чтобы по запросу на натуральном языке получить нужную команду[docs.windsurf.com](https://docs.windsurf.com/windsurf/terminal#:~:text=Command%20in%20the%20terminal) (например, “Установи Flask”).
    
-   **Контроль версий:** Windsurf интегрируется с Git: из редактора видны панели исходного контроля. Для удобства установите расширения GitLens и GitHub/GitLab Workflow из Open VSX[docs.windsurf.com](https://docs.windsurf.com/windsurf/recommended-plugins#:~:text=General). Windsurf может даже генерировать подсказки к сообщениям коммитов.
    

## Ключевые функции Windsurf

-   **Редактирование кода:** Интерфейс Windsurf похож на VS Code: есть подсветка синтаксиса, Intellisense и статический анализ через установленные LSP. Дополнительно доступны _кодовые линзы_ (code lenses) над функциями и классами. Например, при нажатии «Docstring» будет автоматически сгенерирована документация для Python-функции[docs.windsurf.com](https://docs.windsurf.com/command/windsurf-related-features#:~:text=write%20your%20own,generated%20underneath%20the%20function%20header), кнопка «Explain» вызовет ИИ-ассистента Cascade с объяснением кода, «Refactor» предложит варианты рефакторинга.
    
-   **Управление проектом:** Из стартового экрана или меню можно **создавать новые проекты** при помощи Cascade («New Project»)[docs.windsurf.com](https://docs.windsurf.com/windsurf/getting-started#:~:text=Generate%20a%20project%20with%20Cascade) или **открывать существующие папки**. Поддерживается удалённый доступ: можно подключаться по SSH или запускать локальные Dev-контейнеры (аналогично Remote Development в VS Code)[docs.windsurf.com](https://docs.windsurf.com/windsurf/getting-started#:~:text=Open%20Folder%20%2F%20Connect%20to,Remote%20Server).
    
-   **Интеграция с системами разработки:** Windsurf унаследовал возможности VS Code. Для Git доступны встроенные панели коммитов и работы с ветками (например, через плагин GitLens)[docs.windsurf.com](https://docs.windsurf.com/windsurf/recommended-plugins#:~:text=General). В редакторе есть поддержка Pull Request для GitHub/GitLab, просмотр истории и диффов. Кроме того, Windsurf имеет **AI-подсказки для сообщений коммитов** и помощь в написании релизов.
    
-   **Просмотр веб-приложений в реальном времени:** С помощью функции _Previews (Beta)_ можно открывать локально развёрнутое веб-приложение прямо в редакторе или браузере[docs.windsurf.com](https://docs.windsurf.com/windsurf/previews#:~:text=Previews%20in%20Windsurf%20allow%20you,prompt%20to%20enter%20the%20proxy). Такие превью рассчитаны на Chrome/Chromium: вы видите сайт и можете кликом «Send element» отправить выбранный элемент в чат Cascade для анализа[docs.windsurf.com](https://docs.windsurf.com/windsurf/previews#:~:text=In%20the%20Preview%2C%20you%20can,you%20want%20in%20the%20prompt). Встроенный веб-просмотр синхронизирован с консолью и полноценно передаёт ошибки и DOM-элементы в Cascade.
    
-   **Коллаборация с AI-агентом (Cascade):** В Windsurf встроен мощный ИИ-ассистент **Cascade** (открывается сочетанием `Ctrl+L` или нажатием иконки в правом верхнем углу)[docs.windsurf.com](https://docs.windsurf.com/windsurf/cascade/cascade#:~:text=Windsurf%E2%80%99s%20Cascade%20unlocks%20a%20new,terminal%20will%20automatically%20be%20included). Cascade действует как чат-бот, помогающий в коде. У него есть два режима: **Chat** (отвечает на вопросы по коду и даёт пояснения) и **Code** (генерирует или правит код по запросу)[docs.windsurf.com](https://docs.windsurf.com/windsurf/cascade/cascade#:~:text=Cascade%20Code%20%2F%20Cascade%20Chat). Cascade «умеет думать»: при длительных задачах он строит план (список задач) и поочерёдно их выполняет[docs.windsurf.com](https://docs.windsurf.com/windsurf/cascade/cascade#:~:text=Planning%20Mode%20%2F%20Todo%20Lists). У агента есть инструменты (поиск в документации, веб-поиск, встроенный терминал и т.д.), и он может автоматически определять нужные библиотеки и даже устанавливать их по вашему приказу[docs.windsurf.com](https://docs.windsurf.com/windsurf/cascade/cascade#:~:text=Tool%20Calling). Благодаря Cascade вы можете говорить с IDE на естественном языке, просить «Напиши для меня функцию…», «Объясни эту ошибку…», «Запусти проект» и т.д. (Cascade выполнит команды или сгенерирует код автоматически).
    

## Запуск и типичный рабочий процесс

1.  **Создание или открытие проекта:** Запустите Windsurf и войдите в аккаунт. На стартовой странице нажмите **New Project** (или «Open Folder»)[docs.windsurf.com](https://docs.windsurf.com/windsurf/getting-started#:~:text=Generate%20a%20project%20with%20Cascade). Если вы создаёте новый проект, Cascade может задать начальные вопросы или сразу сгенерировать структуру по вашим пожеланиям. Если открываете существующий проект, просто укажите путь к папке.
    
2.  **Написание кода:** В редакторе пишите код как обычно. Для Python вы можете создавать модули, функции и классы, а при необходимости выделять код и нажимать `Ctrl+I` (Command) для получения изменений по описанию. Линзы («Explain», «Refactor», «Docstring») над функциями всегда под рукой. Cascade (панель справа) может помогать в фоне: спрашивайте у него подсказки или давайте задачи — он добавляет изменения в код, которые вы можете принять или отклонить.
    
3.  **Запуск программы:** Для запуска Python-кода откройте встроенный терминал (меню _View > Terminal_ или `Ctrl+` ``). Выполните команду `python your_script.py` или `python3 your_app.py`. При необходимости установите зависимости: `pip install -r requirements.txt`. Можно дать команду Cascade: например, выделите вызов скрипта в терминале и нажмите `Ctrl+L`, чтобы отправить проблему или вопрос в чат. Кроме того, вы можете использовать Cascade для генерации команд в терминале: нажмите `Ctrl+I` в терминале, опишите, что нужно сделать, и Cascde выдаст нужный синтаксис[docs.windsurf.com](https://docs.windsurf.com/windsurf/terminal#:~:text=Command%20in%20the%20terminal).
    
4.  **Просмотр веб-приложения (если есть):** Если проект – веб-приложение (например, Flask/Django или Node.js), запустите локальный сервер. Затем в Windsurf кликните значок веб-обозревателя в панели Cascade — он откроет превью вашего сайта. Все изменения и ошибки будут видны в реальном времени[docs.windsurf.com](https://docs.windsurf.com/windsurf/previews#:~:text=Previews%20in%20Windsurf%20allow%20you,prompt%20to%20enter%20the%20proxy), и вы сможете отправлять элементы страницы в чат Cascade для анализа.
    
5.  **Отладка и коммиты:** Для отладки приложений установите расширение **Python Debugger**. Устанавливайте точки останова, запускайте дебаг и следите за переменными прямо в IDE. По завершении работы используйте боковую панель Source Control для коммитов Git. Windsurf может предложить AI-сгенерированные сообщения коммитов.
    

## Ресурсы и примеры

-   **Официальная документация:** Подробная документация Windsurf доступна на сайте docs.windsurf.com (русского перевода нет, но интерфейс понятен). Страница «Getting Started» содержит инструкции по установке и настройке[docs.windsurf.com](https://docs.windsurf.com/windsurf/getting-started#:~:text=Set%20Up).
    
-   **Видеоуроки:** На YouTube можно найти ролики по установке и знакомству с Windsurf (например, “How to Download and Install Windsurf on Windows”).
    
-   **Демо-проекты:** Компания Exafunction публикует примеры проектов. Например, репозиторий windsurf-demo демонстрирует работу Windsurf с Flask-приложением (Python 3.7+)[github.com](https://github.com/Exafunction/windsurf-demo#:~:text=,js%20and%20npm). Инструкции в нём показывают запуск сервера командой `python3 app.py` и другие шаги[github.com](https://github.com/Exafunction/windsurf-demo#:~:text=,js%20and%20npm)[github.com](https://github.com/Exafunction/windsurf-demo#:~:text=pip3%20install%20).
    

В целом, Windsurf предоставляет знакомую среду разработки (VS Code-подобную) с мощным AI-ассистентом Cascade. Всё взаимодействие с кодом происходит естественно: пишите код, просите ИИ помочь и держите акцент на задаче разработки, а не на рутине. Пройдя описанные шаги, вы получите готовую к работе среду для Python-проектов.

**Источники:** официальные ресурсы Windsurf (сайт и документация)[windsurf.com](https://windsurf.com/download/editor?os=linux#:~:text=Minimum%20Requirements%3A)[docs.windsurf.com](https://docs.windsurf.com/windsurf/getting-started#:~:text=Set%20Up)[docs.windsurf.com](https://docs.windsurf.com/windsurf/previews#:~:text=Previews%20in%20Windsurf%20allow%20you,prompt%20to%20enter%20the%20proxy)[docs.windsurf.com](https://docs.windsurf.com/windsurf/cascade/cascade#:~:text=Windsurf%E2%80%99s%20Cascade%20unlocks%20a%20new,terminal%20will%20automatically%20be%20included), а также GitHub‑репозитории разработчика (Exafunction)[github.com](https://github.com/Exafunction/WindsurfVisualStudio#:~:text=%2A%20Unlimited%20single%20and%20multi,C%2B%2B%2C%20Rust%2C%20Ruby%2C%20and%20more)[github.com](https://github.com/Exafunction/windsurf-demo#:~:text=,js%20and%20npm). Эти ссылки подтверждают системные требования, наличие поддержки Python и основные возможности Windsurf.

Цитаты

[](https://windsurf.com/download/editor?os=linux#:~:text=Minimum%20Requirements%3A)

![](https://www.google.com/s2/favicons?domain=https://windsurf.com&sz=32)

Download Windsurf Editor | Windsurf

https://windsurf.com/download/editor?os=linux

[](https://windsurf.com/download/editor?os=linux#:~:text=Minimum%20Requirements%3A)

![](https://www.google.com/s2/favicons?domain=https://windsurf.com&sz=32)

Download Windsurf Editor | Windsurf

https://windsurf.com/download/editor?os=linux

[](https://apidog.com/blog/download-install-windsurf/#:~:text=,2%20GB%20free%20disk%20space)

![](https://www.google.com/s2/favicons?domain=https://apidog.com&sz=32)

How to Download and Install Windsurf on Windows, Mac, and Linux

https://apidog.com/blog/download-install-windsurf/

[](https://apidog.com/blog/download-install-windsurf/#:~:text=,for%20downloading%20and%20syncing%20plugins)

![](https://www.google.com/s2/favicons?domain=https://apidog.com&sz=32)

How to Download and Install Windsurf on Windows, Mac, and Linux

https://apidog.com/blog/download-install-windsurf/

[](https://github.com/Exafunction/windsurf-demo#:~:text=,js%20and%20npm)

![](https://www.google.com/s2/favicons?domain=https://github.com&sz=32)

GitHub - Exafunction/windsurf-demo: Learn hands on how to use the Windsurf Editor!

https://github.com/Exafunction/windsurf-demo

[](https://apidog.com/blog/download-install-windsurf/#:~:text=Step%201%3A%20Download%20the%20Windsurf,Installer)

![](https://www.google.com/s2/favicons?domain=https://apidog.com&sz=32)

How to Download and Install Windsurf on Windows, Mac, and Linux

https://apidog.com/blog/download-install-windsurf/

[](https://docs.windsurf.com/windsurf/getting-started#:~:text=3,in)

![](https://www.google.com/s2/favicons?domain=https://docs.windsurf.com&sz=32)

Welcome to Windsurf - Windsurf Docs

https://docs.windsurf.com/windsurf/getting-started

[](https://apidog.com/blog/download-install-windsurf/#:~:text=Step%202%3A%20Make%20the%20AppImage,Executable)

![](https://www.google.com/s2/favicons?domain=https://apidog.com&sz=32)

How to Download and Install Windsurf on Windows, Mac, and Linux

https://apidog.com/blog/download-install-windsurf/

[](https://apidog.com/blog/download-install-windsurf/#:~:text=Execute%20the%20AppImage%20by%20typing%3A)

![](https://www.google.com/s2/favicons?domain=https://apidog.com&sz=32)

How to Download and Install Windsurf on Windows, Mac, and Linux

https://apidog.com/blog/download-install-windsurf/

[](https://docs.windsurf.com/troubleshooting/windsurf-common-issues#:~:text=This%20is%20usually%20due%20to,is%20to%20run%20the%20following)

![](https://www.google.com/s2/favicons?domain=https://docs.windsurf.com&sz=32)

Common Windsurf Issues - Windsurf Docs

https://docs.windsurf.com/troubleshooting/windsurf-common-issues

[](https://docs.windsurf.com/windsurf/getting-started#:~:text=1)

![](https://www.google.com/s2/favicons?domain=https://docs.windsurf.com&sz=32)

Welcome to Windsurf - Windsurf Docs

https://docs.windsurf.com/windsurf/getting-started

[](https://docs.windsurf.com/windsurf/getting-started#:~:text=Forgot%20to%20Import%20VS%20Code,Configurations)

![](https://www.google.com/s2/favicons?domain=https://docs.windsurf.com&sz=32)

Welcome to Windsurf - Windsurf Docs

https://docs.windsurf.com/windsurf/getting-started

[](https://docs.windsurf.com/windsurf/recommended-plugins#:~:text=%2A%20ms,Debugging%20support%20for%20Python%20applications)

![](https://www.google.com/s2/favicons?domain=https://docs.windsurf.com&sz=32)

Recommended Plugins - Windsurf Docs

https://docs.windsurf.com/windsurf/recommended-plugins

[](https://docs.windsurf.com/windsurf/recommended-plugins#:~:text=Python)

![](https://www.google.com/s2/favicons?domain=https://docs.windsurf.com&sz=32)

Recommended Plugins - Windsurf Docs

https://docs.windsurf.com/windsurf/recommended-plugins

[](https://docs.windsurf.com/windsurf/terminal#:~:text=Command%20in%20the%20terminal)

![](https://www.google.com/s2/favicons?domain=https://docs.windsurf.com&sz=32)

Terminal - Windsurf Docs

https://docs.windsurf.com/windsurf/terminal

[](https://docs.windsurf.com/windsurf/recommended-plugins#:~:text=General)

![](https://www.google.com/s2/favicons?domain=https://docs.windsurf.com&sz=32)

Recommended Plugins - Windsurf Docs

https://docs.windsurf.com/windsurf/recommended-plugins

[](https://docs.windsurf.com/command/windsurf-related-features#:~:text=write%20your%20own,generated%20underneath%20the%20function%20header)

![](https://www.google.com/s2/favicons?domain=https://docs.windsurf.com&sz=32)

Code Lenses - Windsurf Docs

https://docs.windsurf.com/command/windsurf-related-features

[](https://docs.windsurf.com/windsurf/getting-started#:~:text=Generate%20a%20project%20with%20Cascade)

![](https://www.google.com/s2/favicons?domain=https://docs.windsurf.com&sz=32)

Welcome to Windsurf - Windsurf Docs

https://docs.windsurf.com/windsurf/getting-started

[](https://docs.windsurf.com/windsurf/getting-started#:~:text=Open%20Folder%20%2F%20Connect%20to,Remote%20Server)

![](https://www.google.com/s2/favicons?domain=https://docs.windsurf.com&sz=32)

Welcome to Windsurf - Windsurf Docs

https://docs.windsurf.com/windsurf/getting-started

[](https://docs.windsurf.com/windsurf/previews#:~:text=Previews%20in%20Windsurf%20allow%20you,prompt%20to%20enter%20the%20proxy)

![](https://www.google.com/s2/favicons?domain=https://docs.windsurf.com&sz=32)

Previews (Beta) - Windsurf Docs

https://docs.windsurf.com/windsurf/previews

[](https://docs.windsurf.com/windsurf/previews#:~:text=In%20the%20Preview%2C%20you%20can,you%20want%20in%20the%20prompt)

![](https://www.google.com/s2/favicons?domain=https://docs.windsurf.com&sz=32)

Previews (Beta) - Windsurf Docs

https://docs.windsurf.com/windsurf/previews

[](https://docs.windsurf.com/windsurf/cascade/cascade#:~:text=Windsurf%E2%80%99s%20Cascade%20unlocks%20a%20new,terminal%20will%20automatically%20be%20included)

![](https://www.google.com/s2/favicons?domain=https://docs.windsurf.com&sz=32)

Windsurf - Cascade

https://docs.windsurf.com/windsurf/cascade/cascade

[](https://docs.windsurf.com/windsurf/cascade/cascade#:~:text=Cascade%20Code%20%2F%20Cascade%20Chat)

![](https://www.google.com/s2/favicons?domain=https://docs.windsurf.com&sz=32)

Windsurf - Cascade

https://docs.windsurf.com/windsurf/cascade/cascade

[](https://docs.windsurf.com/windsurf/cascade/cascade#:~:text=Planning%20Mode%20%2F%20Todo%20Lists)

![](https://www.google.com/s2/favicons?domain=https://docs.windsurf.com&sz=32)

Windsurf - Cascade

https://docs.windsurf.com/windsurf/cascade/cascade

[](https://docs.windsurf.com/windsurf/cascade/cascade#:~:text=Tool%20Calling)

![](https://www.google.com/s2/favicons?domain=https://docs.windsurf.com&sz=32)

Windsurf - Cascade

https://docs.windsurf.com/windsurf/cascade/cascade

[](https://docs.windsurf.com/windsurf/getting-started#:~:text=Set%20Up)

![](https://www.google.com/s2/favicons?domain=https://docs.windsurf.com&sz=32)

Welcome to Windsurf - Windsurf Docs

https://docs.windsurf.com/windsurf/getting-started

[](https://github.com/Exafunction/windsurf-demo#:~:text=,js%20and%20npm)

![](https://www.google.com/s2/favicons?domain=https://github.com&sz=32)

GitHub - Exafunction/windsurf-demo: Learn hands on how to use the Windsurf Editor!

https://github.com/Exafunction/windsurf-demo

[](https://github.com/Exafunction/windsurf-demo#:~:text=pip3%20install%20)

![](https://www.google.com/s2/favicons?domain=https://github.com&sz=32)

GitHub - Exafunction/windsurf-demo: Learn hands on how to use the Windsurf Editor!

https://github.com/Exafunction/windsurf-demo

[](https://github.com/Exafunction/WindsurfVisualStudio#:~:text=%2A%20Unlimited%20single%20and%20multi,C%2B%2B%2C%20Rust%2C%20Ruby%2C%20and%20more)

![](https://www.google.com/s2/favicons?domain=https://github.com&sz=32)

GitHub - Exafunction/WindsurfVisualStudio: Visual Studio extension for Codeium

https://github.com/Exafunction/WindsurfVisualStudio

Все источники
