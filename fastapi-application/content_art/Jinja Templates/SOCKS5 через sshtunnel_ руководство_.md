

# **Динамический проброс портов (SOCKS-прокси) через SSH и возможности библиотеки sshtunnel**

## **Введение**

SSH-туннелирование представляет собой мощный механизм, позволяющий устанавливать зашифрованные соединения между локальной и удаленной машинами, обеспечивая безопасную передачу данных через ненадежные сети.1 Одним из распространенных вариантов использования SSH-туннелирования является создание SOCKS-прокси, который позволяет перенаправлять сетевой трафик различных приложений через SSH-соединение.3 Пользователи часто прибегают к этому методу для безопасного просмотра веб\-страниц, обхода сетевых ограничений или доступа к ресурсам, находящимся за брандмауэром.6  
В контексте создания SOCKS-прокси особый интерес представляет команда ssh \-D, которая позволяет быстро развернуть динамический проброс портов, превращая SSH-сервер в SOCKS-прокси. Одновременно с этим возникает вопрос о возможности использования Python-библиотеки sshtunnel для достижения аналогичной функциональности или даже написания собственного SOCKS5-сервера на ее основе. Целью данного отчета является исследование этих возможностей, анализ преимуществ и ограничений использования sshtunnel для создания SOCKS-прокси, а также рассмотрение альтернативных подходов.

## **Понимание SSH-туннелирования**

SSH-туннелирование, также известное как проброс портов, позволяет перенаправлять TCP-трафик через зашифрованное SSH-соединение между SSH-клиентом и SSH-сервером.8 Существует три основных типа проброса портов: локальный, удаленный и динамический.3  
**Локальный проброс портов** (-L) используется для перенаправления соединения с локальной машины на удаленную. SSH-клиент прослушивает указанный локальный порт, и при подключении к этому порту трафик безопасно перенаправляется через SSH-туннель на указанный удаленный хост и порт.3 Это часто используется для доступа к сервисам на удаленном сервере, которые недоступны напрямую.3  
**Удаленный проброс портов** (-R) работает в обратном направлении. SSH-сервер прослушивает указанный порт, и при подключении к нему трафик перенаправляется через SSH-туннель на указанный локальный хост и порт.3 Это может быть полезно, когда необходимо предоставить доступ к сервису, запущенному на локальной машине, извне.3  
**Динамический проброс портов** (-D) создает на локальной машине SOCKS-прокси.3 SSH-клиент начинает прослушивать указанный локальный порт и действует как SOCKS-прокси-сервер. Приложения, настроенные на использование этого прокси, могут отправлять запросы, указывая целевой хост и порт. Затем SSH-клиент устанавливает соединение с SSH-сервером, который, в свою очередь, перенаправляет трафик к конечному адресату.4  
Для лучшего понимания различий между типами SSH-туннелирования можно рассмотреть следующую таблицу:

| Тип туннелирования | Опция командной строки (OpenSSH) | Описание | Типичные сценарии использования |
| :---- | :---- | :---- | :---- |
| Локальный | \-L \[local\_addr:\]local\_port:remote\_addr:remote\_port \[user@\]sshd\_addr | Перенаправляет трафик с локального порта на удаленный хост и порт через SSH-сервер. | Доступ к базе данных или веб\-сервису на удаленном сервере, который недоступен напрямую. |
| Удаленный | \-R \[bind\_address:\]port:host:hostport \[user@\]server | Перенаправляет трафик с порта на удаленном сервере на локальный хост и порт через SSH-сервер. | Предоставление доступа к локальному веб\-серверу или другому сервису извне через SSH-сервер. |
| Динамический | \-D \[bind\_address:\]port \[user@\]server | Создает SOCKS-прокси на локальной машине. Приложения, настроенные на использование этого прокси, могут перенаправлять свой трафик через SSH-сервер к любому целевому хосту и порту. | Безопасный просмотр веб\-страниц через зашифрованное соединение, обход сетевых ограничений, доступ к нескольким внутренним ресурсам через один туннель. |

## **Библиотека sshtunnel для создания SSH-туннелей**

Библиотека sshtunnel представляет собой Python-инструмент, основанный на paramiko, который позволяет программно создавать и управлять SSH-туннелями.15 Она предоставляет API для установления различных типов проброса портов, включая локальный и удаленный.15  
Основным классом в библиотеке является SSHTunnelForwarder, который инкапсулирует параметры SSH-соединения и логику управления туннелем.15 Для создания туннеля необходимо инициализировать объект  
SSHTunnelForwarder, указав адрес SSH-сервера, учетные данные (имя пользователя, пароль или приватный ключ), а также локальный и удаленный адреса для проброса портов.15 Методы  
start() и stop() используются для запуска и остановки туннеля соответственно.15  
Ниже представлена таблица с ключевыми свойствами и методами класса SSHTunnelForwarder, релевантными для создания туннелей:

| Название свойства/метода | Тип | Описание |
| :---- | :---- | :---- |
| ssh\_address\_or\_host | str или tuple | IP-адрес или имя хоста удаленного SSH-сервера, может включать порт в виде кортежа (host, port). |
| ssh\_username | str | Имя пользователя для аутентификации на SSH-сервере. |
| ssh\_password | str | Пароль для аутентификации на SSH-сервере. |
| ssh\_pkey | str или paramiko.PKey | Путь к файлу приватного ключа SSH или объект приватного ключа paramiko. |
| remote\_bind\_address | tuple | Кортеж (host, port), представляющий удаленный адрес, на который будет направляться трафик. |
| local\_bind\_address | tuple | Кортеж (host, port), представляющий локальный адрес, на котором будет прослушиваться входящий трафик для перенаправления. |
| start() | метод | Запускает SSH-туннель в фоновом потоке. |
| stop() | метод | Останавливает SSH-туннель и закрывает соединения. |
| local\_bind\_port | int | Возвращает локальный порт, назначенный для туннеля. |

Библиотека sshtunnel предоставляет удобный способ программного управления SSH-туннелями для конкретных задач проброса портов, например, для доступа к удаленной базе данных или веб\-сервису.15

## **Динамический проброс портов (ssh \-D) и SOCKS5-прокси**

Команда ssh \-D является стандартным инструментом OpenSSH для создания динамического проброса портов, который по сути представляет собой SOCKS5-прокси.3 При выполнении команды  
ssh \-D \[local\_bind\_address:\]port \[user@\]server SSH-клиент начинает прослушивать указанный локальный порт (обычно 1080).4 Любое приложение, настроенное на использование этого локального адреса и порта в качестве SOCKS5-прокси, может перенаправлять свой сетевой трафик через SSH-соединение на удаленный SSH-сервер.4 Затем SSH-сервер действует как посредник, устанавливая соединения с запрошенными целевыми хостами и портами в интернете или во внутренней сети.6  
Ключевым преимуществом SOCKS5-прокси, созданного с помощью ssh \-D, является его универсальность. Он может обрабатывать трафик различных протоколов, включая HTTP, HTTPS, FTP и другие, а также поддерживает как TCP, так и UDP соединения.14 Кроме того, SOCKS5-прокси может выполнять разрешение DNS на стороне сервера, что может быть полезно в определенных сетевых конфигурациях.14

## **Может ли sshtunnel напрямую создать SOCKS5-прокси?**

Анализ документации библиотеки sshtunnel и примеров ее использования показывает, что она в первую очередь предназначена для создания туннелей с явным указанием локального и удаленного портов.15 Хотя в некоторых источниках упоминается возможность использования  
sshtunnel в качестве SOCKS-прокси 22, это относится скорее к способности библиотеки устанавливать SSH-соединение, через которое впоследствии может быть организован SOCKS-прокси с использованием других средств.  
В частности, документация sshtunnel не предоставляет прямого эквивалента опции \-D команды ssh для создания динамического проброса портов, функционирующего как SOCKS5-прокси.18 Примеры использования библиотеки обычно демонстрируют перенаправление трафика с одного локального порта на определенный удаленный хост и порт.15  
Тем не менее, библиотека chilkat предоставляет класс SshTunnel, который поддерживает режим динамического проброса портов и может выступать в качестве SOCKS-прокси, принимая соединения от SOCKS4 или SOCKS5 клиентов.22 Для этого необходимо установить свойство  
DynamicPortForwarding в True и указать версию SOCKS-протокола (InboundSocksVersion).22 При использовании SOCKS5 также можно настроить аутентификацию с помощью свойств  
InboundSocksUsername и InboundSocksPassword.22

## **Альтернативные подходы и потенциальные решения**

Несмотря на отсутствие прямой поддержки создания динамического SOCKS5-прокси в sshtunnel, существует несколько альтернативных способов решения задачи:  
**A. Использование sshtunnel для стандартного проброса портов:**  
Если требуется доступ к определенному ресурсу на удаленном сервере (например, веб\-серверу на порту 80), можно использовать sshtunnel для создания туннеля, перенаправляющего локальный порт (например, 8080\) на удаленный адрес и порт.15

Python

from sshtunnel import SSHTunnelForwarder

with SSHTunnelForwarder(  
    ('remote\_host', 22),  
    ssh\_username="your\_username",  
    ssh\_password="your\_password", \# Или использовать ssh\_pkey  
    remote\_bind\_address=('remote\_host', 80),  
    local\_bind\_address=('localhost', 8080\)  
) as server:  
    print(f"Туннель запущен на {server.local\_bind\_address}")  
    \# Ваше приложение теперь может обращаться к удаленному веб\-серверу через localhost:8080  
    input("Нажмите Enter, чтобы закрыть туннель...")

**B. Настройка приложений для использования SOCKS5-прокси, созданного с помощью ssh \-D:**  
Наиболее простой способ использовать SOCKS5-прокси через SSH \- это воспользоваться стандартной командой ssh \-D.3 После установления туннеля с помощью команды  
ssh \-D localhost:1080 user@remote\_server, различные приложения могут быть настроены на использование localhost:1080 в качестве SOCKS5-прокси.4  
Например, для библиотеки requests в Python это можно сделать следующим образом 27:

Python

import requests

proxies \= {  
    'http': 'socks5://localhost:1080',  
    'https': 'socks5://localhost:1080'  
}

try:  
    response \= requests.get('http://example.com', proxies=proxies)  
    print(response.status\_code)  
    print(response.text)  
except requests.exceptions.RequestException as e:  
    print(f"Ошибка: {e}")

Аналогично настраиваются веб\-браузеры, такие как Firefox и Chrome, для использования SOCKS5-прокси на localhost:1080.4  
**C. Создание собственного SOCKS5-сервера с использованием sshtunnel и SOCKS-библиотеки:**  
Более сложный подход заключается в создании собственного SOCKS5-сервера на Python, который бы использовал sshtunnel для установления SSH-соединения, а затем перенаправлял бы трафик, получаемый SOCKS-сервером, через этот туннель.28 Для реализации SOCKS5-протокола можно использовать существующие Python-библиотеки, такие как  
pysocks, или адаптировать код из примеров.27  
Концептуально это может выглядеть следующим образом:

1. Использовать sshtunnel для установления SSH-туннеля к удаленному серверу.  
2. Запустить отдельный SOCKS5-сервер (например, на localhost:1080) с использованием библиотеки pysocks или собственного кода.  
3. Настроить SOCKS5-сервер для перенаправления всех входящих соединений через установленный SSH-туннель.

Пример кода из 28 демонстрирует базовый SOCKS5-сервер на Python, который перенаправляет трафик через SSH-туннель с использованием библиотеки  
fabric. Этот пример может служить отправной точкой для создания собственного SOCKS5-сервера, использующего sshtunnel вместо fabric для управления SSH-соединением.

## **Вопросы безопасности и лучшие практики**

Использование SSH-туннелирования и SOCKS-прокси обеспечивает шифрование трафика, защищая его от перехвата.1 Однако важно учитывать и другие аспекты безопасности.15 Компрометация SSH-ключей или паролей может привести к несанкционированному доступу.15 В корпоративных сетях использование SSH-туннелей может рассматриваться как средство обхода сетевого мониторинга и фильтрации трафика.1 Следует помнить, что сам по себе протокол SOCKS5 не обеспечивает шифрование, оно обеспечивается SSH-туннелем, через который он работает.20  
Для обеспечения безопасности при использовании SSH-туннелей и SOCKS-прокси рекомендуется следовать следующим лучшим практикам 5:

* Использовать надежные SSH-ключи и защищать приватные ключи.5  
* Рассмотреть возможность отключения аутентификации по паролю для SSH.15  
* Ограничивать доступ к SSH-серверу доверенными сетями или IP-адресами.33  
* Регулярно отслеживать SSH-логи на предмет подозрительной активности.33  
* С осторожностью относиться к безопасности удаленного SSH-сервера, через который будет проходить трафик.

Также следует учитывать потенциальные ограничения и риски 31:

* Возможные накладные расходы на производительность из\-за шифрования и маршрутизации.36  
* Зависимость от доступности и безопасности удаленного SSH-сервера.  
* Риск утечки DNS, если SOCKS-клиент настроен неправильно.5  
* Не все приложения поддерживают SOCKS-прокси.38  
* В корпоративных сетях могут действовать политики, запрещающие использование SSH-туннелей или прокси.32

## **Заключение и рекомендации**

На основании проведенного анализа можно заключить, что библиотека sshtunnel не предоставляет встроенной функциональности для прямого создания динамического SOCKS5-прокси, аналогичного команде ssh \-D. Основным назначением библиотеки является установление и управление SSH-туннелями для конкретных задач проброса портов.  
Для пользователя, заинтересованного в создании SOCKS5-прокси через SSH, наиболее простым и быстрым решением будет использование стандартной команды ssh \-D с последующей настройкой необходимых приложений для работы с прокси на localhost:1080.  
Если же требуется программное решение на Python, можно рассмотреть два основных варианта:

1. Использовать sshtunnel для установления SSH-туннеля и затем настраивать приложения на использование этого туннеля для конкретных задач проброса портов.  
2. Разработать собственный SOCKS5-сервер на Python, который бы использовал sshtunnel для установления SSH-соединения и библиотеку, реализующую протокол SOCKS5 (например, pysocks или адаптированный код), для обработки прокси-запросов и перенаправления трафика через SSH-туннель.

В любом случае, при использовании SSH-туннелирования и SOCKS-прокси необходимо уделять особое внимание вопросам безопасности, следовать лучшим практикам и учитывать потенциальные ограничения и риски.

#### **Источники**

1. What is an SSH Tunnel & SSH Tunneling? \- SSH Communications Security, дата последнего обращения: мая 7, 2025, [https://www.ssh.com/academy/ssh/tunneling](https://www.ssh.com/academy/ssh/tunneling)  
2. What is SSH Tunnel, SSH Reverse Tunnel and SSH Port Forwarding? \- Teleport, дата последнего обращения: мая 7, 2025, [https://goteleport.com/blog/ssh-tunneling-explained/](https://goteleport.com/blog/ssh-tunneling-explained/)  
3. How to SSH a Tunnel Proxy \- SnapShooter Tutorials, дата последнего обращения: мая 7, 2025, [https://snapshooter.com/learn/linux/how-to-ssh-tunel-proxy](https://snapshooter.com/learn/linux/how-to-ssh-tunel-proxy)  
4. Create a SOCKS proxy on a Linux server with SSH to bypass content filters \- Mattias Geniar, дата последнего обращения: мая 7, 2025, [https://ma.ttias.be/socks-proxy-linux-ssh-bypass-content-filters/](https://ma.ttias.be/socks-proxy-linux-ssh-bypass-content-filters/)  
5. How To Route Web Traffic Securely Without a VPN Using a SOCKS ..., дата последнего обращения: мая 7, 2025, [https://www.digitalocean.com/community/tutorials/how-to-route-web-traffic-securely-without-a-vpn-using-a-socks-tunnel](https://www.digitalocean.com/community/tutorials/how-to-route-web-traffic-securely-without-a-vpn-using-a-socks-tunnel)  
6. SSH Port Forwarding (SSH Tunneling): A How-To Guide | Built In, дата последнего обращения: мая 7, 2025, [https://builtin.com/software-engineering-perspectives/ssh-port-forwarding](https://builtin.com/software-engineering-perspectives/ssh-port-forwarding)  
7. How to set up SSH dynamic port forwarding on Linux \- Red Hat, дата последнего обращения: мая 7, 2025, [https://www.redhat.com/en/blog/ssh-dynamic-port-forwarding](https://www.redhat.com/en/blog/ssh-dynamic-port-forwarding)  
8. Visual guide to SSH tunneling and port forwarding \- ITTAVERN.COM, дата последнего обращения: мая 7, 2025, [https://ittavern.com/visual-guide-to-ssh-tunneling-and-port-forwarding/](https://ittavern.com/visual-guide-to-ssh-tunneling-and-port-forwarding/)  
9. How to Use SSH Port Forwarding {Ultimate Guide} \- phoenixNAP, дата последнего обращения: мая 7, 2025, [https://phoenixnap.com/kb/ssh-port-forwarding](https://phoenixnap.com/kb/ssh-port-forwarding)  
10. SSH Tunnel \- Local, Remote and Dynamic Port Forwarding | Jakub Arnold's Blog, дата последнего обращения: мая 7, 2025, [https://blog.jakuba.net/ssh-tunnel---local-remote-and-dynamic-port-forwarding/](https://blog.jakuba.net/ssh-tunnel---local-remote-and-dynamic-port-forwarding/)  
11. SSH Tunneling: Client Command & Server Configuration, дата последнего обращения: мая 7, 2025, [https://www.ssh.com/academy/ssh/tunneling-example](https://www.ssh.com/academy/ssh/tunneling-example)  
12. A Visual Guide to SSH Tunnels: Local and Remote Port Forwarding, дата последнего обращения: мая 7, 2025, [https://iximiuz.com/en/posts/ssh-tunnels/](https://iximiuz.com/en/posts/ssh-tunnels/)  
13. docs.aws.amazon.com, дата последнего обращения: мая 7, 2025, [https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-ssh-tunnel.html\#:\~:text=This%20is%20also%20known%20as,This%20creates%20a%20SOCKS%20proxy.](https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-ssh-tunnel.html#:~:text=This%20is%20also%20known%20as,This%20creates%20a%20SOCKS%20proxy.)  
14. SSH Tunnel: Dynamic Port Forwarding \- Andrew B. Collier / @datawookie, дата последнего обращения: мая 7, 2025, [https://datawookie.dev/blog/2023/12/ssh-tunnel-dynamic-port-forwarding/](https://datawookie.dev/blog/2023/12/ssh-tunnel-dynamic-port-forwarding/)  
15. python-sshtunnel(1) \- Arch Linux manual pages, дата последнего обращения: мая 7, 2025, [https://man.archlinux.org/man/extra/python-sshtunnel/python-sshtunnel.1.en](https://man.archlinux.org/man/extra/python-sshtunnel/python-sshtunnel.1.en)  
16. SSH Tunnel, дата последнего обращения: мая 7, 2025, [https://www.legendu.net/en/blog/ssh-tunnel/](https://www.legendu.net/en/blog/ssh-tunnel/)  
17. sshtunnel \- PyPI, дата последнего обращения: мая 7, 2025, [https://pypi.org/project/sshtunnel/](https://pypi.org/project/sshtunnel/)  
18. Welcome to sshtunnel's documentation\! — sshtunnel 0.4.0 documentation, дата последнего обращения: мая 7, 2025, [https://sshtunnel.readthedocs.io/en/latest/index.html](https://sshtunnel.readthedocs.io/en/latest/index.html)  
19. Using Google Chrome's Socks5 Proxy With SSH Tunnels \- Paul Bradley, дата последнего обращения: мая 7, 2025, [https://paulbradley.org/chrome-socks5/](https://paulbradley.org/chrome-socks5/)  
20. Everything You Need to Know About SSH SOCKS5 Proxy \- Cloudzy, дата последнего обращения: мая 7, 2025, [https://cloudzy.com/blog/ssh-socks5-proxy/](https://cloudzy.com/blog/ssh-socks5-proxy/)  
21. Proxying via socks5 (simple ssh tunnel) doesn't work · Issue \#1484 · guzzle/guzzle \- GitHub, дата последнего обращения: мая 7, 2025, [https://github.com/guzzle/guzzle/issues/1484](https://github.com/guzzle/guzzle/issues/1484)  
22. SshTunnel Python Reference Documentation, дата последнего обращения: мая 7, 2025, [https://www.chilkatsoft.com/refdoc/pythonSshTunnelRef.html](https://www.chilkatsoft.com/refdoc/pythonSshTunnelRef.html)  
23. Top 10 Examples of sshtunnel code in Python \- CloudDefense.AI, дата последнего обращения: мая 7, 2025, [https://www.clouddefense.ai/code/python/example/sshtunnel](https://www.clouddefense.ai/code/python/example/sshtunnel)  
24. CkPython SSH Tunnel with Dynamic Port Forwarding \- Chilkat Examples, дата последнего обращения: мая 7, 2025, [https://www.example-code.com/python/sshTunnel\_dpf.asp](https://www.example-code.com/python/sshTunnel_dpf.asp)  
25. Chilkat2-Python SSH Tunnel with Dynamic Port Forwarding \- Chilkat Examples, дата последнего обращения: мая 7, 2025, [https://www.example-code.com/chilkat2-python/sshTunnel\_dpf.asp](https://www.example-code.com/chilkat2-python/sshTunnel_dpf.asp)  
26. Creating an SSH Proxy Tunnel with PuTTY \- UCLA Department of Mathematics, дата последнего обращения: мая 7, 2025, [https://www.math.ucla.edu/computing/kb/creating-ssh-proxy-tunnel-putty](https://www.math.ucla.edu/computing/kb/creating-ssh-proxy-tunnel-putty)  
27. How to make python Requests work via SOCKS proxy \- Stack Overflow, дата последнего обращения: мая 7, 2025, [https://stackoverflow.com/questions/12601316/how-to-make-python-requests-work-via-socks-proxy](https://stackoverflow.com/questions/12601316/how-to-make-python-requests-work-via-socks-proxy)  
28. This is a basic python SOCK5 server which forwards the traffic through a SSH tunnel \- GitHub Gist, дата последнего обращения: мая 7, 2025, [https://gist.github.com/cybiere/abe5caa3a7504bfd733eb2e5eb829fb1](https://gist.github.com/cybiere/abe5caa3a7504bfd733eb2e5eb829fb1)  
29. Emulating SSH's SOCKS Proxy Tunnel in Python \- Stack Overflow, дата последнего обращения: мая 7, 2025, [https://stackoverflow.com/questions/8997142/emulating-sshs-socks-proxy-tunnel-in-python](https://stackoverflow.com/questions/8997142/emulating-sshs-socks-proxy-tunnel-in-python)  
30. SSH Tunnel and SSH Tunneling (Port Forwarding) Explained \- StrongDM, дата последнего обращения: мая 7, 2025, [https://www.strongdm.com/blog/ssh-tunneling](https://www.strongdm.com/blog/ssh-tunneling)  
31. SSH Tunneling: Benefits, Limitations, and Usage Guide \- 2coffee.dev, дата последнего обращения: мая 7, 2025, [https://2coffee.dev/en/articles/benefits-and-limitations-of-using-ssh-tunneling-how-to-use-ssh-tunneling](https://2coffee.dev/en/articles/benefits-and-limitations-of-using-ssh-tunneling-how-to-use-ssh-tunneling)  
32. Is socks5 proxy over ssh tunnel secure in a corporate network? : r/privacy \- Reddit, дата последнего обращения: мая 7, 2025, [https://www.reddit.com/r/privacy/comments/8y72o5/is\_socks5\_proxy\_over\_ssh\_tunnel\_secure\_in\_a/](https://www.reddit.com/r/privacy/comments/8y72o5/is_socks5_proxy_over_ssh_tunnel_secure_in_a/)  
33. SSH Tunneling Part 1 \- RBT Security, дата последнего обращения: мая 7, 2025, [https://www.rbtsec.com/blog/ssh-tunneling-1/](https://www.rbtsec.com/blog/ssh-tunneling-1/)  
34. is plain SOCKS5 secure? \- ssh \- Information Security Stack Exchange, дата последнего обращения: мая 7, 2025, [https://security.stackexchange.com/questions/254909/is-plain-socks5-secure](https://security.stackexchange.com/questions/254909/is-plain-socks5-secure)  
35. Option 2, part 1: Set up an SSH tunnel to the primary node using dynamic port forwarding \- Amazon EMR, дата последнего обращения: мая 7, 2025, [https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-ssh-tunnel.html](https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-ssh-tunnel.html)  
36. SSH Tunneling: the Good, the Bad, and the Ugly \- DbVisualizer, дата последнего обращения: мая 7, 2025, [https://www.dbvis.com/thetable/ssh-tunneling-the-good-the-bad-and-the-ugly/](https://www.dbvis.com/thetable/ssh-tunneling-the-good-the-bad-and-the-ugly/)  
37. Are there disadvantages in SSH tunneling? \- Unix & Linux Stack Exchange, дата последнего обращения: мая 7, 2025, [https://unix.stackexchange.com/questions/34499/are-there-disadvantages-in-ssh-tunneling](https://unix.stackexchange.com/questions/34499/are-there-disadvantages-in-ssh-tunneling)  
38. How can I use SSH with a SOCKS 5 proxy? \- Super User, дата последнего обращения: мая 7, 2025, [https://superuser.com/questions/454210/how-can-i-use-ssh-with-a-socks-5-proxy](https://superuser.com/questions/454210/how-can-i-use-ssh-with-a-socks-5-proxy)