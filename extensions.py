"""
Instancias de extensiones compartidas por toda la app.

Se definen aquí (fuera de app.py y de /models) para evitar imports
circulares: tanto app.py como los modelos y las rutas pueden importar
`db` desde este módulo sin depender unos de otros.
"""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
