"""
Blueprint del Universo 3D.

Solo se encarga de la parte de servidor: obtener las rutas de todas las
fotos/videos subidos y pasárselas a la plantilla para que el JS de Three.js
(static/js/universo3d.js) las use como texturas en el espiral de planos
alrededor de la estrella central.
"""

from flask import Blueprint, render_template

from models import Foto
from routes.decorators import login_required

universo_bp = Blueprint("universo", __name__)


@universo_bp.route("/universo")
@login_required
def index():
    fotos = Foto.query.order_by(Foto.fecha_asociada.asc()).all()

    # IMPORTANTE: enviamos la ruta relativa (f.ruta_archivo), NO el resultado
    # de url_for("static", ...). El JS ya antepone "/static/" a cada ruta
    # (`/static/${ruta}`), así que pasar la URL completa aquí generaba un
    # doble prefijo ("/static//static/...") y todas las peticiones fallaban.
    #
    # También mandamos el diccionario completo (to_dict) para que el
    # frontend reciba explícitamente "tipo_media" en vez de tener que
    # adivinar el tipo solo por la extensión del archivo.
    media_items = [f.to_dict() for f in fotos]

    return render_template("universo.html", media_items=media_items)