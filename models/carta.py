from datetime import datetime

from extensions import db


class Carta(db.Model):
    """
    Representa una carta. Puede ser de tipo 'texto' (contenido escrito
    directamente en la app) o de tipo 'archivo' (una foto o PDF subido).
    """

    __tablename__ = "cartas"

    id = db.Column(db.Integer, primary_key=True)

    # 'texto' o 'archivo'
    tipo = db.Column(db.String(20), nullable=False)

    # Contenido de texto libre, solo aplica si tipo == 'texto'
    contenido_texto = db.Column(db.Text, nullable=True)

    # Ruta relativa dentro de /static, solo aplica si tipo == 'archivo'
    ruta_archivo = db.Column(db.String(255), nullable=True)

    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "tipo": self.tipo,
            "contenido_texto": self.contenido_texto,
            "ruta_archivo": self.ruta_archivo,
            "fecha_creacion": self.fecha_creacion.isoformat(),
        }

    def __repr__(self):
        return f"<Carta id={self.id} tipo={self.tipo}>"
