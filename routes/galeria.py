"""
Blueprint de Calendario / Galería.

Responsabilidades:
- Mostrar el calendario mensual, resaltando el día 3 de cada mes.
- Servir vía JSON los archivos multimedia asociados a un día concreto
  (para el modal que se abre al hacer clic en un día).
- Recibir la subida de nuevas fotos y videos (multipart/form-data) y
  guardarlas en /static/uploads/fotos/, registrando la ruta en SQLite.
"""

import calendar
import os
import uuid
from datetime import date

from flask import (
    Blueprint, render_template, request, jsonify,
    current_app, url_for, flash, redirect,
)
from werkzeug.utils import secure_filename

from extensions import db
from models import Foto
from routes.decorators import login_required

galeria_bp = Blueprint("galeria", __name__)

MESES_ES = [
    "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]


def _extension_permitida(filename, extensiones_permitidas):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in extensiones_permitidas
    )


def _detectar_tipo_media(extension):
    """Devuelve 'video' si la extensión pertenece a un archivo de video,
    en caso contrario devuelve 'imagen'."""
    video_exts = current_app.config.get("VIDEO_EXTENSIONS", {"mp4", "webm", "mov"})
    return "video" if extension in video_exts else "imagen"


@galeria_bp.route("/calendario")
@login_required
def calendario():
    """
    Renderiza la vista de calendario. El mes/año a mostrar puede venir
    por query string (?anio=2024&mes=6); si no, se usa el mes actual.

    Se calcula aquí (con el módulo `calendar` de Python) la grilla de
    semanas para no depender de lógica de fechas en Jinja, y se arman
    los enlaces de navegación al mes anterior/siguiente.
    """
    hoy = date.today()
    anio = request.args.get("anio", default=hoy.year, type=int)
    mes = request.args.get("mes", default=hoy.month, type=int)

    # Normaliza meses fuera de rango (ej. al navegar de enero hacia atrás)
    while mes < 1:
        mes += 12
        anio -= 1
    while mes > 12:
        mes -= 12
        anio += 1

    # Trae solo los archivos del mes solicitado, para poder marcar en el
    # calendario qué días ya tienen thumbnail sin hacer una consulta
    # por cada celda.
    fotos_del_mes = Foto.query.filter(
        db.extract("year", Foto.fecha_asociada) == anio,
        db.extract("month", Foto.fecha_asociada) == mes,
    ).all()

    fotos_por_dia = {}
    for foto in fotos_del_mes:
        fotos_por_dia.setdefault(foto.fecha_asociada.day, []).append(foto.to_dict())

    # lunes=0 ... domingo=6. monthdayscalendar devuelve semanas de 7 días,
    # rellenando con 0 los días que no pertenecen al mes.
    cal = calendar.Calendar(firstweekday=0)
    semanas = cal.monthdayscalendar(anio, mes)

    mes_anterior, anio_mes_anterior = (12, anio - 1) if mes == 1 else (mes - 1, anio)
    mes_siguiente, anio_mes_siguiente = (1, anio + 1) if mes == 12 else (mes + 1, anio)

    return render_template(
        "calendario.html",
        anio=anio,
        mes=mes,
        nombre_mes=MESES_ES[mes],
        semanas=semanas,
        fotos_por_dia=fotos_por_dia,
        hoy=hoy,
        mes_anterior=mes_anterior,
        anio_mes_anterior=anio_mes_anterior,
        mes_siguiente=mes_siguiente,
        anio_mes_siguiente=anio_mes_siguiente,
    )


@galeria_bp.route("/galeria/fotos/<fecha_iso>")
@login_required
def fotos_por_fecha(fecha_iso):
    """
    Devuelve en JSON todos los archivos multimedia asociados a una fecha
    dada (formato YYYY-MM-DD). Usado por el modal del calendario vía
    Fetch API.
    """
    try:
        fecha = date.fromisoformat(fecha_iso)
    except ValueError:
        return jsonify({"error": "Formato de fecha inválido, usa YYYY-MM-DD."}), 400

    fotos = Foto.query.filter_by(fecha_asociada=fecha).order_by(Foto.fecha_subida.desc()).all()
    return jsonify({"fecha": fecha_iso, "fotos": [f.to_dict() for f in fotos]})

@galeria_bp.route("/galeria/subir", methods=["POST"])
@login_required
def subir_foto():
    """
    Recibe múltiples archivos multimedia (multipart/form-data) junto con
    la fecha a la que pertenecen, los guarda en disco y crea los
    registros en SQLite.

    Campos de formulario esperados:
        - archivos: lista de ficheros de imagen/video (atributo multiple)
        - fecha_asociada: fecha en formato YYYY-MM-DD
    """
    # 1. Usamos getlist() y buscamos 'archivos' (en plural)
    archivos = request.files.getlist("archivos")
    fecha_str = request.form.get("fecha_asociada")

    # Verificamos si la lista está vacía o si el primer archivo no tiene nombre
    if not archivos or (len(archivos) == 1 and archivos[0].filename == ""):
        flash("No seleccionaste ningún archivo.", "error")
        return redirect(request.referrer or url_for("galeria.calendario"))

    if not fecha_str:
        flash("Falta la fecha asociada a los archivos.", "error")
        return redirect(request.referrer or url_for("galeria.calendario"))

    try:
        fecha_asociada = date.fromisoformat(fecha_str)
    except ValueError:
        flash("Fecha inválida.", "error")
        return redirect(request.referrer or url_for("galeria.calendario"))

    extensiones_permitidas = current_app.config["ALLOWED_EXTENSIONS_FOTOS"]
    carpeta_destino = current_app.config["UPLOAD_FOLDER_FOTOS"]
    os.makedirs(carpeta_destino, exist_ok=True)

    archivos_subidos = 0

    # 2. Iteramos sobre cada archivo recibido
    for archivo in archivos:
        if archivo and archivo.filename != "":
            if not _extension_permitida(archivo.filename, extensiones_permitidas):
                flash(f"Formato no permitido para: {archivo.filename}. Se omitió.", "error")
                continue  # Saltamos este archivo y pasamos al siguiente

            # Generamos nombre seguro con UUID
            nombre_seguro = secure_filename(archivo.filename)
            extension = nombre_seguro.rsplit(".", 1)[1].lower()
            nombre_final = f"{uuid.uuid4().hex}.{extension}"

            ruta_absoluta = os.path.join(carpeta_destino, nombre_final)
            archivo.save(ruta_absoluta)

            # Ruta relativa para BD
            ruta_relativa = f"uploads/fotos/{nombre_final}"

            # Detectar tipo de media
            tipo_media = _detectar_tipo_media(extension)

            # Añadimos a la sesión
            nueva_foto = Foto(
                ruta_archivo=ruta_relativa,
                fecha_asociada=fecha_asociada,
                tipo_media=tipo_media,
            )
            db.session.add(nueva_foto)

            archivos_subidos += 1

    # 3. Hacemos el commit una sola vez al final, guardando todos los archivos válidos
    if archivos_subidos > 0:
        db.session.commit()
        flash(f"¡{archivos_subidos} archivo(s) subido(s) con éxito! 📸", "success")
    else:
        flash("No se pudo subir ningún archivo válido.", "error")

    return redirect(
        url_for("galeria.calendario", anio=fecha_asociada.year, mes=fecha_asociada.month)
    )