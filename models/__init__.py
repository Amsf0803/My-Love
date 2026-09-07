"""
Este archivo asegura que todos los modelos se registren en SQLAlchemy
cuando se importa el paquete `models`. Esto es importante para que
`db.create_all()` y Flask-Migrate detecten todas las tablas.
"""

from .foto import Foto
from .carta import Carta

__all__ = ["Foto", "Carta"]
