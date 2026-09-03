from base_dir_path import DIR_CWD, BASE_DIR
from pathlib import Path

import logging.config
import os

import yaml


class ConfigLogger:
    pathDir_default: str = "./log"
    nameFile_default: str = "example.log"
    isSetting: bool = False  # для того чтобы settingLogger() вызвать один раз при запуске программы

    @staticmethod
    def __create_log_dir(log_dir: str):
        """Создание папки для лог-файлов"""
        path_dir: Path = BASE_DIR / log_dir
        if not os.path.exists(path_dir):
            os.mkdir(path_dir)

    @staticmethod
    def __settings_logger(log_dir: str = pathDir_default, log_file: str = nameFile_default):
        """настройка логгера с использованием словаря"""
        ConfigLogger.__create_log_dir(log_dir=log_dir)

        logging_config: dict = _load_logging_config(log_dir, log_file)
        logging.config.dictConfig(logging_config)

        # logging.basicConfig(level=logging.INFO, handlers=[])
        ConfigLogger.isSetting = True

    @staticmethod
    def setting_path_logger(log_dir: str = pathDir_default, log_file: str = nameFile_default):
        """настройка имени файла логгера и директории"""
        ConfigLogger.pathDir_default = log_dir
        ConfigLogger.nameFile_default = log_file
        ConfigLogger.__settings_logger(log_dir, log_file)

    @staticmethod
    def get_logger(nameBase: str):
        """nameBase берётся из словаря = 'loggers'
        OnlyFile = логгер будет писать в файл, в консоль не будет
        Stdout = только в консоль; FileStdout = и в консоль и в файл
        """
        if not ConfigLogger.isSetting:
            ConfigLogger.__settings_logger()
        return logging.getLogger(nameBase)


def _load_logging_config(log_dir: str, log_file: str) -> dict:
    """Загрузка словаря dictConfig из YAML-файла с подстановкой пути к лог-файлу"""
    path_dir: Path = BASE_DIR / log_dir

    with open(BASE_DIR / "logging_config.yaml", encoding="utf-8") as f:
        cfg: dict = yaml.safe_load(f)

    cfg["handlers"]["rotating_file1"]["filename"] = str(path_dir / log_file)
    return cfg


ConfigLogger.setting_path_logger(log_file="one_fast.log")

logF = ConfigLogger.get_logger("OnlyFile")
logFC = ConfigLogger.get_logger("FileStdout")
