"""
Blueprint del Universo 3D.

Solo se encarga de la parte de servidor: obtener las rutas de todas las
fotos subidas y pasárselas a la plantilla para que el JS de Three.js
(static/js/universo3d.js) las use como texturas en el espiral de planos
alrededor de la estrella central.
"""

from flask import Blueprint, render_template, url_for

from models import Foto
from routes.decorators import login_required

universo_bp = Blueprint("universo", __name__)


@universo_bp.route("/universo")
@login_required
def index():
    fotos = Foto.query.order_by(Foto.fecha_asociada.asc()).all()

    # Construimos URLs absolutas servibles por Flask (/static/uploads/...)
    # para que Three.js pueda cargarlas directamente como texturas.
    rutas_fotos = [url_for("static", filename=f.ruta_archivo) for f in fotos]

    return render_template("universo.html", rutas_fotos=rutas_fotos)
