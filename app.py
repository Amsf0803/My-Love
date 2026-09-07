"""
Punto de entrada de "Mi Universo".

Usa el patrón application factory (`create_app`) para poder registrar
Blueprints de forma limpia y para que el archivo WSGI de PythonAnywhere
pueda importar la app fácilmente:

    # En el archivo WSGI de PythonAnywhere:
    from app import create_app
    application = create_app("production")
"""

import os

from flask import Flask

from config.settings import config_by_name
from extensions import db


def create_app(config_name=None):
    config_name = config_name or os.environ.get("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # --- Inicializar extensiones ---
    db.init_app(app)

    # --- Registrar Blueprints ---
    from routes.auth import auth_bp
    from routes.dashboard import dashboard_bp
    from routes.galeria import galeria_bp
    from routes.cartas import cartas_bp
    from routes.universo import universo_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(galeria_bp)
    app.register_blueprint(cartas_bp)
    app.register_blueprint(universo_bp)

    # --- Crear tablas y carpetas de uploads si no existen ---
    with app.app_context():
        # Importa los modelos para que SQLAlchemy los conozca antes de
        # crear las tablas.
        import models  # noqa: F401
        db.create_all()

        os.makedirs(app.config["UPLOAD_FOLDER_FOTOS"], exist_ok=True)
        os.makedirs(app.config["UPLOAD_FOLDER_CARTAS"], exist_ok=True)

    return app


# Instancia global usada por `flask run` y por PythonAnywhere en modo simple.
app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
