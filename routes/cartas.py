"""
Blueprint de Cartas.

Permite ver el muro/línea de tiempo de cartas existentes y agregar
nuevas, ya sea como texto libre o como archivo adjunto (foto o PDF).
"""

import os
import uuid

from flask import (
    Blueprint, render_template, request, redirect,
    url_for, flash, current_app,
)
from werkzeug.utils import secure_filename

from extensions import db
from models import Carta
from routes.decorators import login_required

cartas_bp = Blueprint("cartas", __name__)


def _extension_permitida(filename, extensiones_permitidas):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in extensiones_permitidas
    )


@cartas_bp.route("/cartas")
@login_required
def index():
    """Muestra todas las cartas en formato de línea de tiempo (más reciente primero)."""
    todas_las_cartas = Carta.query.order_by(Carta.fecha_creacion.desc()).all()
    return render_template("cartas.html", cartas=todas_las_cartas)


@cartas_bp.route("/cartas/nueva", methods=["POST"])
@login_required
def nueva_carta():
    """
    Crea una nueva carta. El formulario en el frontend debe enviar:
        - tipo: 'texto' o 'archivo'
        - contenido_texto: (si tipo == 'texto')
        - archivo: (si tipo == 'archivo')
    """
    tipo = request.form.get("tipo")

    if tipo == "texto":
        contenido = (request.form.get("contenido_texto") or "").strip()
        if not contenido:
            flash("Escribe algo antes de guardar la carta.", "error")
            return redirect(url_for("cartas.index"))

        carta = Carta(tipo="texto", contenido_texto=contenido)
        db.session.add(carta)
        db.session.commit()
        flash("Carta guardada. 💌", "success")
        return redirect(url_for("cartas.index"))

    elif tipo == "archivo":
        archivo = request.files.get("archivo")
        if not archivo or archivo.filename == "":
            flash("No seleccionaste ningún archivo.", "error")
            return redirect(url_for("cartas.index"))

        extensiones_permitidas = current_app.config["ALLOWED_EXTENSIONS_CARTAS"]
        if not _extension_permitida(archivo.filename, extensiones_permitidas):
            flash("Formato de archivo no permitido.", "error")
            return redirect(url_for("cartas.index"))

        nombre_seguro = secure_filename(archivo.filename)
        extension = nombre_seguro.rsplit(".", 1)[1].lower()
        nombre_final = f"{uuid.uuid4().hex}.{extension}"

        carpeta_destino = current_app.config["UPLOAD_FOLDER_CARTAS"]
        os.makedirs(carpeta_destino, exist_ok=True)
        ruta_absoluta = os.path.join(carpeta_destino, nombre_final)
        archivo.save(ruta_absoluta)

        ruta_relativa = f"uploads/cartas/{nombre_final}"

        carta = Carta(tipo="archivo", ruta_archivo=ruta_relativa)
        db.session.add(carta)
        db.session.commit()
        flash("Carta guardada. 💌", "success")
        return redirect(url_for("cartas.index"))

    flash("Tipo de carta inválido.", "error")
    return redirect(url_for("cartas.index"))
