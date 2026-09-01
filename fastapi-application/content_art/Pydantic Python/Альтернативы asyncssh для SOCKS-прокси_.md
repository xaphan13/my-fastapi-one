

# **Альтернативы asyncssh для создания SOCKS-прокси**

**1\. Введение**  
SSH-туннелирование представляет собой метод создания безопасных соединений по сети, позволяя передавать данные через зашифрованный канал. Эта технология может быть использована для организации SOCKS-прокси, при котором приложения направляют свой сетевой трафик через защищенное SSH-соединение. Команда ssh \-D в OpenSSH играет важную роль, обеспечивая динамическое перенаправление портов для создания локального SOCKS-прокси-сервера, который пересылает соединения через SSH-туннель. Целью настоящего отчета является исследование и оценка Python-библиотек, которые предлагают аналогичные асинхронные возможности для создания SOCKS-прокси, как и asyncssh.  
**2\. Понимание asyncssh для SOCKS-прокси**  
Согласно имеющимся данным, asyncssh является асинхронной реализацией SSH-клиента и сервера, построенной на основе asyncio.1 В описании возможностей  
asyncssh 2 явно упоминается поддержка "динамического перенаправления TCP/IP-портов через SOCKS". Однако, как показано в примере 4,  
asyncssh сам по себе не включает SOCKS-клиент. Вместо этого предлагается использовать библиотеку aiosocks совместно с asyncssh для туннелирования SSH через SOCKS-соединение. Упоминание asyncssh в контексте создания SOCKS-прокси через SSH также встречается в 5, что подтверждает ее релевантность для данной задачи.  
Эти сведения указывают на то, что asyncssh предоставляет базовый асинхронный SSH-транспорт и функцию динамического перенаправления портов, которая является ключевой для создания SOCKS-прокси. Тем не менее, для полноценной работы в качестве SOCKS-прокси может потребоваться интеграция с отдельной библиотекой SOCKS-клиента. Это наблюдение позволяет предположить, что альтернативные решения могут также следовать аналогичному принципу разделения ответственности или же представлять собой библиотеки, которые объединяют функциональность SSH и SOCKS-прокси.  
**3\. Изучение альтернативных асинхронных SSH-библиотек**

* **3.1. Parallel-SSH:**  
  * Библиотека parallel-ssh представлена как асинхронный параллельный SSH-клиент, способный выполнять команды на множестве серверов, обеспечивая высокую производительность и минимальную нагрузку на клиентскую систему.6 В ее основе лежат нативные клиенты, использующие библиотеку  
    ssh2-python (обертка вокруг C-библиотеки libssh2), что обеспечивает значительную производительность. Также доступны альтернативные клиенты, основанные на ssh-python (libssh).6  
  * В 1  
    parallel-ssh упоминается как одна из альтернативных Python SSH-библиотек с открытым исходным кодом, характеризующаяся как асинхронная и основанная на ssh2-python и gevent.  
  * Сравнение parallel-ssh с другими библиотеками в 7 указывает на то, что она предназначена для программного и неинтерактивного использования. При этом отмечается, что  
    parallel-ssh полностью отказалась от использования paramiko начиная с версии 2.0.0 из\-за проблем с производительностью и стабильностью.  
  * Также в 7 упоминается, что  
    ssh-python, которая может использоваться в качестве клиента в parallel-ssh, имеет ограничения в неблокирующем режиме, в частности, не поддерживает SCP/SFTP и туннелирование.  
  * В 8  
    parallel-ssh идентифицируется как библиотека, основанная на ssh2-python и являющаяся основой для быстрого параллельного SSH-клиента.  
  * Согласно 9,  
    Parallel-SSH способна обрабатывать параллельное выполнение команд и поддерживает SFTP, проксирование и перенаправление агента, используя асинхронный ввод-вывод через gevent.  
  * Таким образом, parallel-ssh действительно является асинхронной SSH-библиотекой. Ее опора на ssh2-python, производительность которой отмечается в 7, предполагает, что она может быть производительной альтернативой. Однако ее основная цель, по-видимому, заключается в параллельном выполнении команд, а не в создании SOCKS-прокси. Ограничение  
    ssh-python в отношении туннелей в неблокирующем режиме может также быть актуальным, если этот клиент используется в parallel-ssh для этой цели. Необходимо дополнительно выяснить, поддерживает ли parallel-ssh напрямую динамическое перенаправление портов или создание SOCKS-прокси, или же ее можно комбинировать с другими библиотеками для достижения этой цели.  
* **3.2. Другие асинхронные библиотеки:**  
  * В 1 явно упоминается  
    asyncssh как еще один асинхронный SSH-клиент, использующий asyncio.  
  * asyncssh также идентифицируется как полнофункциональная асинхронная реализация SSH в.8  
  * В 7  
    asyncssh включена в список альтернатив, но отмечается, что ее лицензия (EPL) может быть несовместима с некоторыми проектами с открытым исходным кодом.  
  * Исходя из имеющихся данных, asyncssh последовательно выделяется как основная асинхронная SSH-библиотека в Python. Запрос пользователя уже упоминает ее, что говорит о его осведомленности. Ключевой задачей является поиск *альтернатив* ей. Хотя другие библиотеки, такие как parallel-ssh, являются асинхронными, их пригодность для создания SOCKS-прокси требует тщательного изучения.

**4\. Использование синхронных SSH-библиотек с асинхронными фреймворками**

* **4.1. Paramiko:**  
  * paramiko представлена как чисто Python-реализация протокола SSHv2, обеспечивающая как клиентскую, так и серверную функциональность.10 Она рекомендуется для пользователей, которым необходимы низкоуровневые примитивы.  
  * В 11  
    paramiko называется самой популярной Python SSH-библиотекой и приводятся примеры ее использования для подключения к устройствам и выполнения команд.  
  * 9 упоминает  
    paramiko как библиотеку для обработки SSH-команд и отмечает отсутствие встроенной поддержки параллелизма. При этом Parallel-SSH упоминается как обертка над paramiko, использующая Gevent для обеспечения параллельного выполнения. Однако, как указано в 1 и 7,  
    parallel-ssh начиная с версии 2.0.0 основана на ssh2-python, а не на paramiko, и отказ от paramiko был связан с проблемами производительности и стабильности. Также отмечается, что paramiko не поддерживает неблокирующий режим без использования monkey patching.7  
  * python-ssh, представленная в 12, использует фреймворк  
    paramiko.  
  * В 13 обсуждается перенаправление портов SSH с использованием Python, часто с участием  
    paramiko или библиотек, построенных на его основе, таких как sshtunnel. В 18 приведен пример скрипта для локального перенаправления портов с использованием  
    paramiko.  
  * 23 указывает на то, что динамическое перенаправление портов непосредственно в  
    paramiko обнаружить не удалось.  
  * В 24 показан пример подключения к SSH-серверу через SOCKS5-прокси с использованием  
    paramiko совместно с библиотекой socks. Аналогичные примеры использования paramiko с библиотекой socks для подключения через SOCKS-прокси приводятся в 25 и для SFTP через SOCKS5-прокси в.26  
  * 27 описывает запрос на добавление поддержки SOCKS-прокси в  
    paramiko и предлагает экспериментальную реализацию.  
  * При просмотре paramiko.org 10 сообщается, что это чисто Python-реализация SSHv2 для низкоуровневых задач, и для общих случаев использования рекомендуется  
    Fabric. Прямого упоминания функциональности SOCKS-прокси нет.  
  * Документация paramiko 28 описывает класс  
    Transport и его методы, которые являются основой SSH-соединений, но не предоставляют прямого доступа к созданию SOCKS-прокси. Аналогично29 описывает основные классы протокола SSH, но не упоминает динамическое перенаправление портов или создание SOCKS-прокси.  
  * Примеры на Stack Overflow 25 демонстрируют использование  
    paramiko с библиотекой socks для подключения *через* SOCKS-прокси, а не для его создания.  
  * На GitHub 27 обсуждается запрос на поддержку SOCKS-прокси в  
    paramiko и приводится ссылка на неофициальную ветку с рабочей реализацией. В 30 и 24 также приводятся примеры подключения к SSH-серверу через SOCKS-прокси с использованием  
    paramiko и PySocks или socks соответственно.  
  * Таким образом, paramiko в основном предоставляет функциональность для установления SSH-соединений, выполнения команд и передачи файлов. Хотя встроенной поддержки для создания SOCKS-прокси-сервера, аналогичной ssh \-D, не обнаружено, paramiko может использоваться совместно со специализированными SOCKS-библиотеками (PySocks или стандартная библиотека socket с поддержкой SOCKS) для достижения этой цели. Поскольку paramiko является синхронной библиотекой, ее использование в асинхронном контексте потребует осторожной обработки, например, запуска в отдельном потоке или процессе.  
* **4.2. SSH-Python:**  
  * ssh-python представлена как биндинги к C-библиотеке libssh, с акцентом на производительность и низкие накладные расходы.31 Отмечается ее потокобезопасность и нативная асинхронность благодаря использованию C-библиотек.  
  * В 7  
    ssh-python упоминается как один из вариантов клиента в parallel-ssh с производительностью, сходной с ssh2-python. Однако указывается, что для неблокирующего использования не поддерживаются SCP/SFTP и туннели.  
  * В 12 представлена  
    Python-SSH (обратите внимание на разницу в регистре), которая использует фреймворк paramiko и поддерживает Python 3.6+.  
  * При просмотре pypi.org/project/ssh-python/ 31 сообщается, что запрошенная информация о перенаправлении портов и SOCKS-прокси отсутствует.  
  * Судя по всему, существуют две библиотеки с похожими названиями. ssh-python (в нижнем регистре) представляется как производительная, нативно асинхронная библиотека, но с ограничениями в отношении туннелирования в неблокирующем режиме. Python-SSH (в верхнем регистре) построена на основе paramiko и, вероятно, обладает его синхронной природой и потенциальным отсутствием прямой поддержки создания SOCKS-прокси. Ограничения ssh-python в отношении туннелей могут сделать ее непригодной для создания SOCKS-прокси.

**5\. Специализированные Python-библиотеки для SOCKS-прокси**

* **5.1. PySocks/python-socks:**  
  * PySocks представлена как библиотека для перенаправления трафика через SOCKS- и HTTP-прокси-серверы.32 Она может служить заменой для модуля  
    socket и поддерживает SOCKS4, SOCKS5 и HTTP CONNECT-прокси.  
  * В 33 приведен пример использования  
    PySocks для работы с SOCKS-прокси, включая установку через pip.  
  * 34 предлагает  
    PySocks как один из подходов к обработке SOCKS-прокси в Python.  
  * 35 упоминает  
    PySocks (и ее более раннюю версию SocksiPy) как варианты для эмуляции SOCKS-прокси-туннеля SSH в Python.  
  * 36 предоставляет более подробную информацию о  
    PySocks, включая поддержку различных версий SOCKS, HTTP CONNECT и возможность использования в качестве замены для socket. Также отмечается, что библиотека requests использует PySocks для проксирования HTTP-трафика через SOCKS.  
  * 37 содержит ссылку на страницу  
    PySocks на SourceForge.  
  * Документация urllib3 38 упоминает экспериментальную поддержку SOCKS-прокси с использованием либо  
    PySocks, либо собственной реализации.  
  * 39 представляет  
    python-socks (обратите внимание на другое название), более новый пакет, предоставляющий синхронные и асинхронные (asyncio, trio, curio, anyio) API для SOCKS4, SOCKS5 и HTTP CONNECT-прокси. Предполагается, что прямое использование может быть необязательным, так как другие библиотеки могут использовать его внутри. Приводятся примеры синхронного и асинхронного использования с различными фреймворками.  
  * В 40 показан пример использования  
    PySocks со статическим SOCKS5-прокси QuotaGuard.  
  * 41 содержит фрагменты кода из библиотеки  
    PySocks, демонстрирующие настройку и использование прокси.  
  * 42 на Stack Overflow указывает на  
    pr0cks как решение для SSH SOCKS5-клиента на Python.  
  * Таким образом, PySocks и более новая python-socks являются специализированными библиотеками для работы с SOCKS-прокси в Python. PySocks, по-видимому, более устоявшаяся, в то время как python-socks предлагает встроенную асинхронную поддержку для различных фреймворков. Эти библиотеки могут быть крайне важны для реализации SOCKS-прокси-сервера, что необходимо пользователю, возможно, в сочетании с SSH-библиотекой для обеспечения безопасного туннеля. Асинхронная природа python-socks делает ее особенно интересной как альтернативу asyncssh.  
* **5.2. ssh-proxy:**  
  * 43 представляет  
    ssh-proxy как простую обертку на Python 3 для создания SOCKS5-совместимых прокси, которые подключаются через SSH-туннели. Подчеркивается ее полезность для просмотра веб\-сайтов за корпоративными брандмауэрами.  
  * 43 содержит аналогичную информацию об  
    ssh-proxy, включая инструкции по установке и использованию. Она запускает один или несколько SSH-прокси на localhost на указанных портах.  
  * ssh-proxy, судя по описанию, непосредственно отвечает на потребность пользователя. Она специально разработана для создания SOCKS5-прокси через SSH-туннели, что упрощает этот процесс. Простота использования, о которой говорится в описаниях, делает ее сильным кандидатом в качестве альтернативы.

**6\. Сравнение и анализ**  
Для более наглядного сравнения рассмотренных библиотек по ключевым критериям, таким как поддержка асинхронности, возможность создания SOCKS-прокси, простота использования, зависимости, уровень абстракции, зрелость и производительность, предлагается следующая таблица:

| Библиотека | Асинхронная поддержка | Возможность создания SOCKS-прокси | Простота использования | Ключевые зависимости | Уровень абстракции | Зрелость/Поддержка сообщества | Примечания по производительности |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| asyncssh | Да | Опосредованно (требуется SOCKS-клиент) | Средняя | asyncio, cryptography | Средний | Высокая | Высокая производительность, нативная асинхронность. |
| parallel-ssh | Да (gevent) | Неясно | Средняя | ssh2-python, gevent | Высокий | Средняя | Ориентирована на параллельное выполнение команд. |
| paramiko | Нет | Требует использования SOCKS-библиотек | Средняя | Нет (чистый Python) | Низкий | Очень высокая | Синхронная, требует осторожного использования в асинхронном контексте. |
| ssh-python | Да (нативная) | Ограничена поддержка туннелей | Средняя | libssh (C-библиотека) | Низкий | Средняя | Высокая производительность, но ограничения по туннелированию. |
| PySocks | Нет | Да | Высокая | Нет (чистый Python) | Низкий | Очень высокая | Специализированная библиотека для SOCKS-прокси. |
| python-socks | Да (asyncio, trio...) | Да | Высокая | Зависит от асинхронного фреймворка | Низкий | Высокая | Современная библиотека с асинхронной поддержкой. |
| ssh-proxy | Нет | Да | Очень высокая | paramiko | Высокий | Средняя | Специализированная обертка для создания SOCKS-прокси через SSH. |

**7\. Концептуальные примеры кода**  
Ниже приведены концептуальные примеры кода для наиболее перспективных альтернатив, демонстрирующие создание SOCKS-прокси.  
**Пример использования python-socks для создания SOCKS5-прокси:**

Python

import asyncio  
from python\_socks.async\_.asyncio import Proxy

async def main():  
    proxy \= Proxy.from\_url('socks5://user:password@127.0.0.1:1080')  
    sock \= await proxy.connect(dest\_host='example.com', dest\_port=80)  
    \# Дальнейшая работа с сокетом  
    sock.close()

if \_\_name\_\_ \== "\_\_main\_\_":  
    asyncio.run(main())

**Пример использования ssh-proxy для запуска SOCKS5-прокси через SSH (на основе конфигурационного файла):**

1. Установите ssh-proxy:  
   Bash  
   pip install ssh-proxy

2. Настройте файл config.ini:  
   Ini, TOML  
   \[my\_proxy\]  
   Host=your\_ssh\_host  
   User=your\_ssh\_user  
   Port=8080

3. Запустите прокси:  
   Bash  
   ssh-proxy \--start my\_proxy

**Пример использования paramiko совместно с PySocks (синхронный):**

Python

import paramiko  
import socks

def create\_tunnel(ssh\_host, ssh\_port, ssh\_user, ssh\_password, socks\_host, socks\_port):  
    sock \= socks.socksocket()  
    sock.set\_proxy(socks.SOCKS5, socks\_host, socks\_port)  
    sock.connect((ssh\_host, ssh\_port))

    transport \= paramiko.Transport(sock)  
    try:  
        transport.connect(username=ssh\_user, password=ssh\_password)  
        \# Дальнейшая работа с транспортом  
    except paramiko.ssh\_exception.AuthenticationException:  
        print("Authentication failed.")  
    finally:  
        transport.close()

if \_\_name\_\_ \== "\_\_main\_\_":  
    create\_tunnel('your\_ssh\_host', 22, 'your\_ssh\_user', 'your\_ssh\_password', 'your\_socks\_host', 1080\)

**8\. Рекомендации**  
Основываясь на проведенном сравнении и анализе, можно сделать следующие рекомендации. Если приоритетом является простота создания SOCKS-прокси через SSH-туннель, то библиотека ssh-proxy представляется наиболее удобным вариантом благодаря своей специализации и высокому уровню абстракции.  
Для пользователей, которым необходим полный асинхронный контроль над SSH-соединением и SOCKS-прокси, связка из асинхронной SSH-библиотеки (такой как asyncssh или, возможно, parallel-ssh, если она поддерживает динамическое перенаправление портов) и библиотеки python-socks может быть оптимальным решением. python-socks обеспечивает асинхронную поддержку различных фреймворков и предлагает гибкость в создании SOCKS-прокси.  
Следует учитывать, что библиотека paramiko, будучи синхронной, может быть использована совместно с PySocks для создания SOCKS-прокси, однако ее интеграция в асинхронные рабочие процессы потребует дополнительных усилий для обеспечения неблокирующего поведения.  
Выбор между этими альтернативами будет зависеть от конкретных требований пользователя к асинхронности, простоте использования и степени необходимой кастомизации.  
**9\. Заключение**  
В заключение следует отметить, что существует несколько жизнеспособных альтернатив asyncssh для создания SOCKS-прокси в Python, особенно в асинхронных контекстах. Библиотека ssh-proxy выделяется своей простотой и специализацией на создании SOCKS-прокси через SSH. Для более гибкого и асинхронного подхода рекомендуется использовать библиотеку python-socks в сочетании с асинхронной SSH-библиотекой. Синхронная библиотека paramiko также может быть использована для этой цели, но потребует дополнительной обработки для интеграции в асинхронные приложения. Выбор наиболее подходящей библиотеки определяется специфическими требованиями пользователя к асинхронности, удобству использования и уровню необходимой настройки.

#### **Источники**

1. Python paramiko and netmiko for automation \- CodiLime, дата последнего обращения: мая 7, 2025, [https://codilime.com/blog/python-paramiko-and-netmiko-for-automation/](https://codilime.com/blog/python-paramiko-and-netmiko-for-automation/)  
2. AsyncSSH: Asynchronous SSH for Python — AsyncSSH 2.21.0 documentation, дата последнего обращения: мая 7, 2025, [https://asyncssh.readthedocs.io/](https://asyncssh.readthedocs.io/)  
3. asyncssh \- PyPI, дата последнего обращения: мая 7, 2025, [https://pypi.org/project/asyncssh/](https://pypi.org/project/asyncssh/)  
4. SSH/SFTP connection via a SOCKS5 proxy · Issue \#412 · ronf/asyncssh \- GitHub, дата последнего обращения: мая 7, 2025, [https://github.com/ronf/asyncssh/issues/412](https://github.com/ronf/asyncssh/issues/412)  
5. Python version of ssh \-D (SOCKS proxy over SSH) \- Stack Overflow, дата последнего обращения: мая 7, 2025, [https://stackoverflow.com/questions/18099495/python-version-of-ssh-d-socks-proxy-over-ssh](https://stackoverflow.com/questions/18099495/python-version-of-ssh-d-socks-proxy-over-ssh)  
6. parallel-ssh \- PyPI, дата последнего обращения: мая 7, 2025, [https://pypi.org/project/parallel-ssh/](https://pypi.org/project/parallel-ssh/)  
7. Comparison With Alternatives — Parallel-SSH 0+unknown documentation, дата последнего обращения: мая 7, 2025, [https://parallel-ssh.readthedocs.io/en/stable/alternatives.html](https://parallel-ssh.readthedocs.io/en/stable/alternatives.html)  
8. A Tale of Five Python SSH Libraries \- The Elegant Network, дата последнего обращения: мая 7, 2025, [https://elegantnetwork.github.io/posts/comparing-ssh/](https://elegantnetwork.github.io/posts/comparing-ssh/)  
9. python libraries for ssh handling \- Stack Overflow, дата последнего обращения: мая 7, 2025, [https://stackoverflow.com/questions/1939107/python-libraries-for-ssh-handling](https://stackoverflow.com/questions/1939107/python-libraries-for-ssh-handling)  
10. Welcome to Paramiko\! — Paramiko documentation, дата последнего обращения: мая 7, 2025, [https://www.paramiko.org/](https://www.paramiko.org/)  
11. Python SSH \- NetworkLessons.com, дата последнего обращения: мая 7, 2025, [https://networklessons.com/python/python-ssh](https://networklessons.com/python/python-ssh)  
12. Python-SSH — python-ssh 0.1.1 documentation, дата последнего обращения: мая 7, 2025, [https://python-ssh.readthedocs.io/](https://python-ssh.readthedocs.io/)  
13. How to create a SSH tunnel using Python and Paramiko? \- Stack Overflow, дата последнего обращения: мая 7, 2025, [https://stackoverflow.com/questions/8169739/how-to-create-a-ssh-tunnel-using-python-and-paramiko](https://stackoverflow.com/questions/8169739/how-to-create-a-ssh-tunnel-using-python-and-paramiko)  
14. Welcome to sshtunnel's documentation\! — sshtunnel 0.4.0 ..., дата последнего обращения: мая 7, 2025, [https://sshtunnel.readthedocs.io/en/latest/index.html](https://sshtunnel.readthedocs.io/en/latest/index.html)  
15. Setup a SSH Tunnel with the sshtunnel module in Python | Ruan Bekker's Blog, дата последнего обращения: мая 7, 2025, [https://ruan.dev/blog/2018/04/23/setup-a-ssh-tunnel-with-the-sshtunnel-module-in-python](https://ruan.dev/blog/2018/04/23/setup-a-ssh-tunnel-with-the-sshtunnel-module-in-python)  
16. sshtunnel \- PyPI, дата последнего обращения: мая 7, 2025, [https://pypi.org/project/sshtunnel/](https://pypi.org/project/sshtunnel/)  
17. SSH Tunnel in python 3.3 : r/learnpython \- Reddit, дата последнего обращения: мая 7, 2025, [https://www.reddit.com/r/learnpython/comments/1rilab/ssh\_tunnel\_in\_python\_33/](https://www.reddit.com/r/learnpython/comments/1rilab/ssh_tunnel_in_python_33/)  
18. paramiko/demos/forward.py at main \- GitHub, дата последнего обращения: мая 7, 2025, [https://github.com/paramiko/paramiko/blob/master/demos/forward.py](https://github.com/paramiko/paramiko/blob/master/demos/forward.py)  
19. How create port forwarding using SSHtunnelForwarder? \- Stack Overflow, дата последнего обращения: мая 7, 2025, [https://stackoverflow.com/questions/73590533/how-create-port-forwarding-using-sshtunnelforwarder](https://stackoverflow.com/questions/73590533/how-create-port-forwarding-using-sshtunnelforwarder)  
20. SSH port forwarding using python \- vpn \- Server Fault, дата последнего обращения: мая 7, 2025, [https://serverfault.com/questions/1130954/ssh-port-forwarding-using-python](https://serverfault.com/questions/1130954/ssh-port-forwarding-using-python)  
21. Create app for ssh tunneling and opening web app \- Python discussion forum, дата последнего обращения: мая 7, 2025, [https://discuss.python.org/t/create-app-for-ssh-tunneling-and-opening-web-app/38722](https://discuss.python.org/t/create-app-for-ssh-tunneling-and-opening-web-app/38722)  
22. SSH Tunneling \- Black Hat Python \- ep.10 \- YouTube, дата последнего обращения: мая 7, 2025, [https://www.youtube.com/watch?v=Ib1U5bf\_eGA](https://www.youtube.com/watch?v=Ib1U5bf_eGA)  
23. Dynamic port forwarding with ssh : r/Python \- Reddit, дата последнего обращения: мая 7, 2025, [https://www.reddit.com/r/Python/comments/413nit/dynamic\_port\_forwarding\_with\_ssh/](https://www.reddit.com/r/Python/comments/413nit/dynamic_port_forwarding_with_ssh/)  
24. python \- Connect to SSH server through SOCKS5 proxy \- Stack Overflow, дата последнего обращения: мая 7, 2025, [https://stackoverflow.com/questions/62523323/connect-to-ssh-server-through-socks5-proxy](https://stackoverflow.com/questions/62523323/connect-to-ssh-server-through-socks5-proxy)  
25. Using Paramiko with SOCKS proxy \- python \- Stack Overflow, дата последнего обращения: мая 7, 2025, [https://stackoverflow.com/questions/47441351/using-paramiko-with-socks-proxy](https://stackoverflow.com/questions/47441351/using-paramiko-with-socks-proxy)  
26. Does anybody have a working example of how to use paramiko (ssh) with socks proxy?, дата последнего обращения: мая 7, 2025, [https://www.reddit.com/r/Python/comments/7evl8y/does\_anybody\_have\_a\_working\_example\_of\_how\_to\_use/](https://www.reddit.com/r/Python/comments/7evl8y/does_anybody_have_a_working_example_of_how_to_use/)  
27. SOCKS proxy support, like 'ssh \-D' · Issue \#955 · paramiko/paramiko \- GitHub, дата последнего обращения: мая 7, 2025, [https://github.com/paramiko/paramiko/issues/955](https://github.com/paramiko/paramiko/issues/955)  
28. Transport \- Paramiko documentation, дата последнего обращения: мая 7, 2025, [https://docs.paramiko.org/en/stable/api/transport.html](https://docs.paramiko.org/en/stable/api/transport.html)  
29. 2.9 Epub \- Paramiko documentation, дата последнего обращения: мая 7, 2025, [https://docs.paramiko.org/\_/downloads/en/2.9/epub/](https://docs.paramiko.org/_/downloads/en/2.9/epub/)  
30. Connect to an SSH server using Paramiko with a SOCKS proxy \- Stack Overflow, дата последнего обращения: мая 7, 2025, [https://stackoverflow.com/questions/58253821/connect-to-an-ssh-server-using-paramiko-with-a-socks-proxy](https://stackoverflow.com/questions/58253821/connect-to-an-ssh-server-using-paramiko-with-a-socks-proxy)  
31. ssh-python · PyPI, дата последнего обращения: мая 7, 2025, [https://pypi.org/project/ssh-python/](https://pypi.org/project/ssh-python/)  
32. PySocks \- PyPI, дата последнего обращения: мая 7, 2025, [https://pypi.org/project/PySocks/](https://pypi.org/project/PySocks/)  
33. OpenSSH as a SOCKS server \- Think In Geek, дата последнего обращения: мая 7, 2025, [https://thinkingeek.com/2022/01/03/ssh-and-socks/](https://thinkingeek.com/2022/01/03/ssh-and-socks/)  
34. How to pass all Python's traffics through a socks proxy? \- Stack Overflow, дата последнего обращения: мая 7, 2025, [https://stackoverflow.com/questions/78733473/how-to-pass-all-pythons-traffics-through-a-socks-proxy](https://stackoverflow.com/questions/78733473/how-to-pass-all-pythons-traffics-through-a-socks-proxy)  
35. Emulating SSH's SOCKS Proxy Tunnel in Python \- Stack Overflow, дата последнего обращения: мая 7, 2025, [https://stackoverflow.com/questions/8997142/emulating-sshs-socks-proxy-tunnel-in-python](https://stackoverflow.com/questions/8997142/emulating-sshs-socks-proxy-tunnel-in-python)  
36. Anorov/PySocks: A SOCKS proxy client and wrapper for Python. \- GitHub, дата последнего обращения: мая 7, 2025, [https://github.com/Anorov/PySocks](https://github.com/Anorov/PySocks)  
37. PySocks \- a SOCKS proxy in Python \- Browse Files at SourceForge.net, дата последнего обращения: мая 7, 2025, [https://sourceforge.net/projects/pysocks/files/](https://sourceforge.net/projects/pysocks/files/)  
38. SOCKS Proxies \- urllib3 2.4.0 documentation, дата последнего обращения: мая 7, 2025, [https://urllib3.readthedocs.io/en/stable/reference/contrib/socks.html](https://urllib3.readthedocs.io/en/stable/reference/contrib/socks.html)  
39. python-socks \- PyPI, дата последнего обращения: мая 7, 2025, [https://pypi.org/project/python-socks/](https://pypi.org/project/python-socks/)  
40. Getting Started with the PySocks library \- QuotaGuard, дата последнего обращения: мая 7, 2025, [https://www.quotaguard.com/docs/language-platform/python/pysocks-quick-start-guide-static-ip/](https://www.quotaguard.com/docs/language-platform/python/pysocks-quick-start-guide-static-ip/)  
41. PySocks/socks.py at master \- GitHub, дата последнего обращения: мая 7, 2025, [https://github.com/Anorov/PySocks/blob/master/socks.py](https://github.com/Anorov/PySocks/blob/master/socks.py)  
42. ssh socks5 client via python does not work \- Stack Overflow, дата последнего обращения: мая 7, 2025, [https://stackoverflow.com/questions/67719009/ssh-socks5-client-via-python-does-not-work](https://stackoverflow.com/questions/67719009/ssh-socks5-client-via-python-does-not-work)  
43. SSH Proxy is a simple wrapper written in Python 3 for creating SOCKS5 compatible proxies that connect via SSH tunnels. \- GitHub, дата последнего обращения: мая 7, 2025, [https://github.com/adam-rw/ssh-proxy](https://github.com/adam-rw/ssh-proxy)