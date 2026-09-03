from base_dir_path import BASE_DIR
from pathlib import Path

import logging.config
import os

import yaml


# Дефолты пути и имени файла лога — единое место для всего модуля.
DEFAULT_LOG_DIR: str = "./log"
DEFAULT_LOG_FILE: str = "one_fast.log"


class ConfigLogger:
    def __init__(self, log_dir: str, log_file: str) -> None:
        self._log_dir: str = log_dir
        self._log_file: str = log_file

        self._create_log_dir()
        self._settings_logger()

    def _create_log_dir(self):
        """Создание папки для лог-файлов"""
        path_dir: Path = BASE_DIR / self._log_dir
        if not os.path.exists(path_dir):
            os.mkdir(path_dir)

    def _settings_logger(self) -> None:
        """настройка логгера с использованием словаря"""
        logging_config: dict = _load_logging_config(self._log_dir, self._log_file)
        logging.config.dictConfig(logging_config)

    def get_logger(self, name_base: str):
        """nameBase берётся из logging_config.yaml - блок loggers
        OnlyFile = логгер будет писать в файл, в консоль не будет
        Stdout = только в консоль; FileStdout = и в консоль и в файл
        """
        return logging.getLogger(name_base)


def _load_logging_config(log_dir: str, log_file: str) -> dict:
    """Загрузка словаря dictConfig из YAML-файла с подстановкой пути к лог-файлу"""
    path_dir: Path = BASE_DIR / log_dir

    with open(BASE_DIR / "logging_config.yaml", encoding="utf-8") as f:
        cfg: dict = yaml.safe_load(f)

    cfg["handlers"]["rotating_file1"]["filename"] = str(path_dir / log_file)
    return cfg


# Инстанс уровня модуля — побочный эффект настройки логирования на импорте.
# Имя файла выбрано отличным от дефолта (one_fast.log) — это контракт приложения.
config_logger: ConfigLogger = ConfigLogger(log_dir=DEFAULT_LOG_DIR, log_file=DEFAULT_LOG_FILE)

logF = config_logger.get_logger("OnlyFile")
logFC = config_logger.get_logger("FileStdout")