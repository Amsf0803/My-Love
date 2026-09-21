from datetime import datetime
from extensions import db

class Prenda(db.Model):
    __tablename__ = 'prenda'
    id = db.Column(db.Integer, primary_key=True)
    ruta_imagen = db.Column(db.String(255), nullable=False)
    categoria = db.Column(db.String(50), nullable=False) # Top, Bottom, Calzado, Accesorio
    fecha_subida = db.Column(db.DateTime, default=datetime.utcnow)

class Outfit(db.Model):
    __tablename__ = 'outfit'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    
    prendas = db.relationship('OutfitPrenda', back_populates='outfit')

class OutfitPrenda(db.Model):
    __tablename__ = 'outfit_prenda'
    id = db.Column(db.Integer, primary_key=True)
    outfit_id = db.Column(db.Integer, db.ForeignKey('outfit.id'), nullable=False)
    prenda_id = db.Column(db.Integer, db.ForeignKey('prenda.id'), nullable=False)
    pos_x = db.Column(db.Float, nullable=False, default=0.0)
    pos_y = db.Column(db.Float, nullable=False, default=0.0)
    escala = db.Column(db.Float, nullable=False, default=1.0)
    rotacion = db.Column(db.Float, nullable=False, default=0.0)
    
    outfit = db.relationship('Outfit', back_populates='prendas')
    prenda = db.relationship('Prenda')

class OutfitCalendario(db.Model):
    __tablename__ = 'outfit_calendario'
    id = db.Column(db.Integer, primary_key=True)
    outfit_id = db.Column(db.Integer, db.ForeignKey('outfit.id'), nullable=False)
    fecha_planeada = db.Column(db.Date, nullable=False)
    
    outfit = db.relationship('Outfit')
