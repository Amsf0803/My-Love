"""
Blueprint de Calendario / Galería.

Responsabilidades:
- Mostrar el calendario mensual, resaltando el día 3 de cada mes.
- Servir vía JSON las fotos asociadas a un día concreto (para el modal
  que se abre al hacer clic en un día).
- Recibir la subida de nuevas fotos (multipart/form-data) con nombres anti-caché.
- Endpoints asíncronos para eliminar físicamente (os.remove), fijar portada de día,
  cambiar portada general del calendario y reordenar fotos.
"""

import calendar
import os
import time
import uuid
from datetime import date

from flask import (
    Blueprint, render_template, request, jsonify,
    current_app, url_for, flash, redirect,
)
from werkzeug.utils import secure_filename

from extensions import db
from models import Foto, AjusteGlobal
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


def _es_ruta_segura(ruta_absoluta: str, directorio_base: str) -> bool:
    """Previene Directory Traversal (LFI) verificando que la ruta pertenezca a directorio_base."""
    base_real = os.path.realpath(directorio_base)
    ruta_real = os.path.realpath(ruta_absoluta)
    return os.path.commonpath([base_real]) == os.path.commonpath([base_real, ruta_real])


def _eliminar_archivo_fisico(ruta_relativa: str) -> bool:
    """
    Busca y elimina físicamente el archivo del servidor en PythonAnywhere
    usando os.remove() para liberar espacio en disco.
    """
    if not ruta_relativa:
        return False

    directorio_estatico = os.path.join(current_app.root_path, "static")
    ruta_absoluta = os.path.join(directorio_estatico, ruta_relativa)

    if not _es_ruta_segura(ruta_absoluta, directorio_estatico):
        current_app.logger.error(f"[Seguridad] Intento de acceso no seguro: {ruta_absoluta}")
        return False

    try:
        if os.path.exists(ruta_absoluta) and os.path.isfile(ruta_absoluta):
            os.remove(ruta_absoluta)
            current_app.logger.info(f"Archivo eliminado físicamente: {ruta_absoluta}")
            return True
        else:
            current_app.logger.warning(f"El archivo físico no existía en disco: {ruta_absoluta}")
            return True
    except PermissionError:
        current_app.logger.error(f"Error de permisos al eliminar: {ruta_absoluta}")
        return False
    except Exception as e:
        current_app.logger.error(f"Error al eliminar archivo {ruta_absoluta}: {e}")
        return False


def _generar_nombre_cache_busting(nombre_original: str, prefijo: str = "media") -> str:
    """
    Genera un nombre con timestamp UNIX (ej. portada_172841_ab12cd.jpg)
    para obligar a dispositivos móviles a refrescar la imagen automáticamente.
    """
    nombre_seguro = secure_filename(nombre_original)
    extension = nombre_seguro.rsplit(".", 1)[-1].lower() if "." in nombre_seguro else "jpg"
    timestamp = int(time.time())
    token = uuid.uuid4().hex[:6]
    return f"{prefijo}_{timestamp}_{token}.{extension}"


@galeria_bp.route("/calendario")
@login_required
def calendario():
    """
    Renderiza la vista de calendario mensual y la portada general.
    """
    hoy = date.today()
    anio = request.args.get("anio", default=hoy.year, type=int)
    mes = request.args.get("mes", default=hoy.month, type=int)

    while mes < 1:
        mes += 12
        anio -= 1
    while mes > 12:
        mes -= 12
        anio += 1

    # Obtenemos la portada específica del mes si existe (o fallback a portada general)
    clave_mensual = f"portada_calendario_{anio}_{mes:02d}"
    ajuste_portada = AjusteGlobal.query.filter_by(clave=clave_mensual).first()
    if not ajuste_portada:
        ajuste_portada = AjusteGlobal.query.filter_by(clave="portada_calendario").first()
    portada_calendario = ajuste_portada.valor if ajuste_portada else None

    # Trae las fotos del mes ordenadas por is_preview DESC (para que la primera sea la portada)
    # y luego por orden ASC
    fotos_del_mes = Foto.query.filter(
        db.extract("year", Foto.fecha_asociada) == anio,
        db.extract("month", Foto.fecha_asociada) == mes,
    ).order_by(Foto.is_preview.desc(), Foto.orden.asc(), Foto.fecha_subida.asc()).all()

    fotos_por_dia = {}
    for foto in fotos_del_mes:
        fotos_por_dia.setdefault(foto.fecha_asociada.day, []).append(foto.to_dict())

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
        portada_calendario=portada_calendario,
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
    Devuelve en JSON todas las fotos asociadas a una fecha dada
    ordenadas por su posición ('orden' ASC), usado por el modal vía Fetch API.
    """
    try:
        fecha = date.fromisoformat(fecha_iso)
    except ValueError:
        return jsonify({"error": "Formato de fecha inválido, usa YYYY-MM-DD."}), 400

    fotos = Foto.query.filter_by(fecha_asociada=fecha).order_by(Foto.orden.asc(), Foto.fecha_subida.asc()).all()
    return jsonify({"fecha": fecha_iso, "fotos": [f.to_dict() for f in fotos]})


@galeria_bp.route("/galeria/subir", methods=["POST"])
@login_required
def subir_foto():
    """
    Recibe múltiples fotos/videos, renombra con timestamp UNIX (cache-busting),
    asigna orden correlativo y portada automática si el día aún no tenía.
    """
    archivos = request.files.getlist("archivos")
    fecha_str = request.form.get("fecha_asociada")

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

    # Determinar el orden máximo actual para continuar la secuencia
    max_orden_actual = db.session.query(db.func.max(Foto.orden)).filter_by(fecha_asociada=fecha_asociada).scalar()
    siguiente_orden = 0 if max_orden_actual is None else (max_orden_actual + 1)

    # Verificar si ya existe una foto marcada como preview en esta fecha
    tiene_preview = Foto.query.filter_by(fecha_asociada=fecha_asociada, is_preview=True).first() is not None

    fotos_subidas = 0

    for archivo in archivos:
        if archivo and archivo.filename != "":
            if not _extension_permitida(archivo.filename, extensiones_permitidas):
                flash(f"Formato no permitido para: {archivo.filename}. Se omitió.", "error")
                continue

            # Anti-caché con timestamp UNIX
            nombre_final = _generar_nombre_cache_busting(archivo.filename, prefijo="media")
            ruta_absoluta = os.path.join(carpeta_destino, nombre_final)
            archivo.save(ruta_absoluta)

            ruta_relativa = f"uploads/fotos/{nombre_final}"
            extension = nombre_final.rsplit(".", 1)[-1].lower()
            tipo_archivo = "video" if extension in {'mp4', 'webm', 'mov', 'mkv'} else "image"

            es_portada = False
            if not tiene_preview and fotos_subidas == 0:
                es_portada = True
                tiene_preview = True

            nueva_foto = Foto(
                ruta_archivo=ruta_relativa,
                fecha_asociada=fecha_asociada,
                tipo_media=tipo_archivo,
                orden=siguiente_orden,
                is_preview=es_portada
            )
            db.session.add(nueva_foto)
            siguiente_orden += 1
            fotos_subidas += 1

    if fotos_subidas > 0:
        db.session.commit()
        flash(f"¡{fotos_subidas} recuerdo(s) guardado(s) con éxito! 📸", "success")
    else:
        flash("No se pudo subir ningún archivo válido.", "error")

    return redirect(
        url_for("galeria.calendario", anio=fecha_asociada.year, mes=fecha_asociada.month)
    )


# =========================================================================
# ENDPOINTS ASÍNCRONOS (FETCH API)
# =========================================================================

@galeria_bp.route("/delete-media", methods=["POST"])
@login_required
def delete_media():
    """
    Eliminación Total:
    - Recibe el ID o nombre del archivo.
    - Elimina físicamente el archivo del servidor con os.remove() (liberando espacio).
    - Elimina la referencia en la base de datos.
    - Si era portada del día, promueve automáticamente el siguiente archivo restante.
    """
    data = request.get_json(silent=True) or {}
    media_id = data.get("id")
    nombre_archivo = data.get("nombre_archivo")

    foto = None
    if media_id:
        foto = db.session.get(Foto, media_id)
    elif nombre_archivo:
        foto = Foto.query.filter(Foto.ruta_archivo.like(f"%{nombre_archivo}")).first()

    if not foto:
        return jsonify({"success": False, "error": "Recurso multimedia no encontrado."}), 404

    fecha_asociada = foto.fecha_asociada
    era_portada = foto.is_preview
    ruta_archivo = foto.ruta_archivo
    foto_id = foto.id

    # 1. Eliminación física en el servidor
    eliminado_fisico = _eliminar_archivo_fisico(ruta_archivo)

    # 2. Eliminación lógica en base de datos
    db.session.delete(foto)
    db.session.commit()

    # 3. Si era portada, actualizar automáticamente al primer restante
    nueva_portada = None
    if era_portada:
        siguiente = Foto.query.filter_by(fecha_asociada=fecha_asociada)\
                              .order_by(Foto.orden.asc(), Foto.fecha_subida.asc()).first()
        if siguiente:
            siguiente.is_preview = True
            db.session.commit()
            nueva_portada = {
                "id": siguiente.id,
                "ruta_archivo": siguiente.ruta_archivo,
                "tipo_media": siguiente.tipo_media
            }

    total_restantes = Foto.query.filter_by(fecha_asociada=fecha_asociada).count()

    return jsonify({
        "success": True,
        "message": "Archivo y registro eliminados con éxito.",
        "deleted_id": foto_id,
        "fecha": fecha_asociada.isoformat(),
        "total_restantes": total_restantes,
        "archivo_fisico_eliminado": eliminado_fisico,
        "nueva_portada": nueva_portada
    })


@galeria_bp.route("/set-preview", methods=["POST"])
@login_required
def set_preview():
    """
    Selección de Preview:
    Actualiza el registro del día y marca un archivo multimedia específico
    como la portada que se muestra en la vista general del calendario.
    """
    data = request.get_json(silent=True) or {}
    media_id = data.get("id")

    if not media_id:
        return jsonify({"success": False, "error": "ID de archivo no proporcionado."}), 400

    foto = db.session.get(Foto, media_id)
    if not foto:
        return jsonify({"success": False, "error": "Recurso no encontrado."}), 404

    # Desmarca todas las fotos de este día
    Foto.query.filter_by(fecha_asociada=foto.fecha_asociada).update({"is_preview": False})

    # Marca la seleccionada como preview
    foto.is_preview = True
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Portada del día actualizada con éxito.",
        "preview_id": foto.id,
        "fecha": foto.fecha_asociada.isoformat(),
        "ruta_archivo": foto.ruta_archivo,
        "tipo_media": foto.tipo_media
    })


@galeria_bp.route("/set-calendar-cover", methods=["POST"])
@login_required
def set_calendar_cover():
    """
    Cambio de Portada Mensual del Calendario:
    Actualiza la imagen de portada para el mes y año seleccionados.
    Aplica timestamp UNIX anti-caché y borra la portada anterior de ese mes.
    """
    archivo = request.files.get("archivo") or request.files.get("portada")

    if not archivo or archivo.filename == "":
        return jsonify({"success": False, "error": "No se envió ningún archivo de imagen."}), 400

    extensiones_permitidas = current_app.config.get(
        "ALLOWED_EXTENSIONS_FOTOS",
        {"png", "jpg", "jpeg", "webp", "gif", "avif", "mp4", "webm", "mov", "mkv", "3gp"}
    )
    if not _extension_permitida(archivo.filename, extensiones_permitidas):
        return jsonify({"success": False, "error": "Formato de archivo (foto o video) no permitido."}), 400

    # Mes y año a los que corresponde la portada
    hoy = date.today()
    anio = request.form.get("anio", default=hoy.year, type=int)
    mes = request.form.get("mes", default=hoy.month, type=int)
    clave_mensual = f"portada_calendario_{anio}_{mes:02d}"

    carpeta_destino = current_app.config["UPLOAD_FOLDER_FOTOS"]
    os.makedirs(carpeta_destino, exist_ok=True)

    # Renombrado anti-caché con timestamp UNIX
    nombre_final = _generar_nombre_cache_busting(archivo.filename, prefijo=f"portada_{anio}_{mes:02d}")
    ruta_absoluta = os.path.join(carpeta_destino, nombre_final)
    archivo.save(ruta_absoluta)

    nueva_ruta_relativa = f"uploads/fotos/{nombre_final}"
    extension = nombre_final.rsplit(".", 1)[-1].lower()
    video_exts = current_app.config.get("VIDEO_EXTENSIONS", {"mp4", "webm", "mov", "mkv", "3gp"})
    tipo_media = "video" if extension in video_exts else "image"

    # Recuperar o crear registro en AjusteGlobal para el mes específico
    ajuste = AjusteGlobal.query.filter_by(clave=clave_mensual).first()
    if ajuste:
        # Eliminamos físicamente la portada previa de este mes para no acumular archivos
        if ajuste.valor and ajuste.valor != nueva_ruta_relativa:
            _eliminar_archivo_fisico(ajuste.valor)
        ajuste.valor = nueva_ruta_relativa
    else:
        ajuste = AjusteGlobal(clave=clave_mensual, valor=nueva_ruta_relativa)
        db.session.add(ajuste)

    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Portada de {MESES_ES[mes]} {anio} actualizada exitosamente.",
        "ruta_portada": nueva_ruta_relativa,
        "tipo_media": tipo_media,
        "anio": anio,
        "mes": mes,
        "timestamp": int(time.time())
    })


@galeria_bp.route("/reorder-media", methods=["POST"])
@login_required
def reorder_media():
    """
    Persiste el orden de los archivos de un día tras mover las flechas en el frontend.
    Espera JSON: {"orden_ids": [id1, id2, id3, ...]}
    """
    data = request.get_json(silent=True) or {}
    orden_ids = data.get("orden_ids", [])

    if not isinstance(orden_ids, list) or not orden_ids:
        return jsonify({"success": False, "error": "Lista de IDs inválida."}), 400

    for indice, foto_id in enumerate(orden_ids):
        try:
            fid = int(foto_id)
            Foto.query.filter_by(id=fid).update({"orden": indice})
        except (ValueError, TypeError):
            continue

    db.session.commit()
    return jsonify({"success": True, "message": "Orden actualizado correctamente."})