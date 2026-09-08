"""
Blueprint del Universo 3D.

Solo se encarga de la parte de servidor: obtener las rutas de todos los
archivos multimedia subidos y pasárselos a la plantilla para que el JS
de Three.js (static/js/universo3d.js) los use como texturas/videos en
el espiral de planos alrededor de la estrella central.
"""

from flask import Blueprint, render_template, url_for

from models import Foto
from routes.decorators import login_required

universo_bp = Blueprint("universo", __name__)


@universo_bp.route("/universo")
@login_required
def index():
    fotos = Foto.query.order_by(Foto.fecha_asociada.asc()).all()

    # Construimos un array de objetos { ruta, tipo } para que Three.js
    # pueda distinguir entre imágenes (TextureLoader) y videos (VideoTexture).
    media_items = [
        {
            "ruta": url_for("static", filename=f.ruta_archivo),
            "tipo": f.tipo_media,
        }
        for f in fotos
    ]

    return render_template("universo.html", media_items=media_items)
