from datetime import datetime

from extensions import db


class Foto(db.Model):
    """
    Representa una foto subida por el usuario, asociada a una fecha
    específica del calendario (normalmente un día 3 de algún mes).
    """

    __tablename__ = "fotos"

    id = db.Column(db.Integer, primary_key=True)

    # Ruta relativa dentro de /static, ej: "uploads/fotos/imagen123.jpg"
    ruta_archivo = db.Column(db.String(255), nullable=False)

    # Fecha "lógica" a la que pertenece la foto (la fecha del calendario,
    # no necesariamente la fecha en que se subió el archivo).
    fecha_asociada = db.Column(db.Date, nullable=False, index=True)

    fecha_subida = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        """Serializa el modelo a un diccionario, útil para respuestas JSON
        (por ejemplo, al cargar fotos dinámicamente vía Fetch API o al
        pasar las rutas de fotos al Universo 3D)."""
        return {
            "id": self.id,
            "ruta_archivo": self.ruta_archivo,
            "fecha_asociada": self.fecha_asociada.isoformat(),
            "fecha_subida": self.fecha_subida.isoformat(),
        }

    def __repr__(self):
        return f"<Foto id={self.id} fecha={self.fecha_asociada}>"
