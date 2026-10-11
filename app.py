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
from datetime import datetime
import pytz

from flask import Flask, request, render_template

from config.settings import config_by_name
from extensions import db


def create_app(config_name=None):
    config_name = config_name or os.environ.get("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # --- FORZAR SQLITE EN PYTHONANYWHERE ---
    basedir = os.path.abspath(os.path.dirname(__file__))
    os.makedirs(os.path.join(basedir, 'instance'), exist_ok=True)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'instance', 'mi_universo.db')
    # --------------------------------------

    db.init_app(app)

    # --- LÓGICA DE SORPRESA DE CUMPLEAÑOS ---
    @app.context_processor
    def inyectar_variables():
        # Aseguramos la zona horaria de México
        tz = pytz.timezone('America/Mexico_City')
        hoy = datetime.now(tz)
        
        # Definimos la fecha de su cumpleaños (9 de noviembre del año actual)
        fecha_cumple = datetime(hoy.year, 11, 9, tzinfo=tz)
        
        # El regalo flotante solo sale el mero día (o si usas ?test_cumple=1)
        es_mero_dia = (hoy.month == 11 and hoy.day == 9) or request.args.get('test_cumple') == '1'
        ya_paso_cumple = hoy >= fecha_cumple or request.args.get('test_cumple') == '1'
        
        return dict(mostrar_regalo=es_mero_dia, mostrar_boton_permanente=ya_paso_cumple)
    @app.route('/feliz-cumpleanos')
    def feliz_cumpleanos():
        return render_template('cumpleanos.html')
    # ----------------------------------------

    # --- Registrar Blueprints ---
    from routes.auth import auth_bp
    from routes.dashboard import dashboard_bp
    from routes.galeria import galeria_bp
    from routes.cartas import cartas_bp
    from routes.universo import universo_bp
    from routes.armario import armario_bp
    from routes.jardin import jardin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(galeria_bp)
    app.register_blueprint(cartas_bp)
    app.register_blueprint(universo_bp)
    app.register_blueprint(armario_bp)
    app.register_blueprint(jardin_bp)

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