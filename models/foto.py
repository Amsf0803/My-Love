from datetime import datetime

from extensions import db


class Foto(db.Model):
    """
    Representa una foto (o video) subida por el usuario, asociada a una fecha
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

    # Tipo de media: 'image' o 'video'
    tipo_media = db.Column(db.String(20), nullable=False, default="image")

    # Posición/orden relativo dentro del día
    orden = db.Column(db.Integer, default=0, nullable=False)

    # Marca si es la foto/video de portada que se muestra en el día del calendario
    is_preview = db.Column(db.Boolean, default=False, nullable=False)

    def to_dict(self):
        """Serializa el modelo a un diccionario, útil para respuestas JSON
        (por ejemplo, al cargar fotos dinámicamente vía Fetch API o al
        pasar las rutas de fotos al Universo 3D)."""
        return {
            "id": self.id,
            "ruta_archivo": self.ruta_archivo,
            "fecha_asociada": self.fecha_asociada.isoformat(),
            "fecha_subida": self.fecha_subida.isoformat(),
            "tipo_media": self.tipo_media,
            "orden": self.orden,
            "is_preview": self.is_preview,
        }

    def __repr__(self):
        return f"<Foto id={self.id} fecha={self.fecha_asociada} tipo={self.tipo_media} orden={self.orden} is_preview={self.is_preview}>"


class AjusteGlobal(db.Model):
    """
    Configuraciones globales persistentes de la app (clave-valor),
    por ejemplo: la imagen de portada de todo el calendario.
    """

    __tablename__ = "ajustes_globales"

    clave = db.Column(db.String(50), primary_key=True)
    valor = db.Column(db.String(255), nullable=False)
    fecha_actualizacion = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<AjusteGlobal {self.clave}={self.valor}>"