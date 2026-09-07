"""
Configuración central de la aplicación.

Todas las variables sensibles se leen desde variables de entorno para poder
desplegar de forma segura en PythonAnywhere (o cualquier otro host) sin
exponer credenciales en el código fuente.

En PythonAnywhere puedes definir estas variables en el archivo WSGI de tu
app, ej:
    import os
    os.environ['DB_USER'] = 'tuusuario'
    os.environ['DB_PASSWORD'] = 'tucontraseña'
    ...

O bien usar un archivo .env local con python-dotenv (ya incluido en
requirements.txt) para desarrollo.
"""

import os
from datetime import date

# Carga variables desde un archivo .env si existe (solo para desarrollo local)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))


class Config:
    """Configuración base compartida por todos los entornos."""

    # --- Seguridad / Sesiones ---
    SECRET_KEY = os.environ.get("SECRET_KEY", "cambia-esta-clave-en-produccion")

    # Contraseña de acceso a la app (fecha de aniversario).
    # Se acepta tanto "0307" como "03/07" gracias a la normalización en el
    # blueprint de auth (ver routes/auth.py).
    APP_PASSWORD = os.environ.get("APP_PASSWORD", "0307")

    # Fecha de inicio de la relación, usada por el contador en tiempo real.
    # Formato ISO: YYYY-MM-DD. Aniversario: 3 de julio de 2026.
    FECHA_INICIO_RELACION = os.environ.get("FECHA_INICIO_RELACION", "2026-07-03")

    # --- Base de datos MySQL (SQLAlchemy) ---
    DB_USER = os.environ.get("DB_USER", "root")
    DB_PASSWORD = os.environ.get("DB_PASSWORD", "password")
    DB_HOST = os.environ.get("DB_HOST", "localhost")
    DB_PORT = os.environ.get("DB_PORT", "3306")
    DB_NAME = os.environ.get("DB_NAME", "mi_universo_db")

    # mysql+pymysql es el driver recomendado (puro Python) y es el que
    # PythonAnywhere soporta sin compilación adicional.
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # --- Uploads ---
    UPLOAD_FOLDER_FOTOS = os.path.join(BASE_DIR, "static", "uploads", "fotos")
    UPLOAD_FOLDER_CARTAS = os.path.join(BASE_DIR, "static", "uploads", "cartas")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB máximo por archivo subido
    ALLOWED_EXTENSIONS_FOTOS = {"png", "jpg", "jpeg", "gif", "webp"}
    ALLOWED_EXTENSIONS_CARTAS = {"png", "jpg", "jpeg", "gif", "webp", "pdf"}


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}
