from flask import Blueprint, render_template, request, jsonify
import os
from werkzeug.utils import secure_filename
from models.armario import db, Prenda, Outfit, OutfitPrenda, OutfitCalendario

armario_bp = Blueprint('armario', __name__)

UPLOAD_FOLDER = 'static/uploads/ropa'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp',"avif"}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@armario_bp.route('/armario', methods=['GET'])
def index():
    return render_template('armario.html')

import calendar
from datetime import datetime, date

@armario_bp.route('/armario/calendario', methods=['GET'])
def calendario():
    hoy = datetime.today()
    anio = request.args.get('anio', default=hoy.year, type=int)
    mes = request.args.get('mes', default=hoy.month, type=int)
    
    # Calcular mes anterior/siguiente para navegación
    mes_anterior = mes - 1 if mes > 1 else 12
    anio_mes_anterior = anio if mes > 1 else anio - 1
    mes_siguiente = mes + 1 if mes < 12 else 1
    anio_mes_siguiente = anio if mes < 12 else anio + 1
    
    cal = calendar.Calendar(firstweekday=0) # Lunes
    semanas = cal.monthdayscalendar(anio, mes)
    
    nombre_mes = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
                  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][mes]
                  
    # Aqui se pueden cargar outfits planeados desde OutfitCalendario
    outfits_planeados = OutfitCalendario.query.filter(
        db.extract('year', OutfitCalendario.fecha_planeada) == anio,
        db.extract('month', OutfitCalendario.fecha_planeada) == mes
    ).all()
    
    outfits_por_dia = {}
    for op in outfits_planeados:
        dia = op.fecha_planeada.day
        if dia not in outfits_por_dia:
            outfits_por_dia[dia] = []
        outfits_por_dia[dia].append(op.outfit.nombre)
        
    return render_template('armario_calendario.html',
                           hoy=hoy, anio=anio, mes=mes,
                           mes_anterior=mes_anterior, anio_mes_anterior=anio_mes_anterior,
                           mes_siguiente=mes_siguiente, anio_mes_siguiente=anio_mes_siguiente,
                           semanas=semanas, nombre_mes=nombre_mes,
                           outfits_por_dia=outfits_por_dia)

@armario_bp.route('/armario/subir_prenda', methods=['POST'])
def subir_prenda():
    if 'imagen' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['imagen']
    categoria = request.form.get('categoria', 'Top')
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Asegurar que el directorio exista
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        # Guardar en base de datos
        nueva_prenda = Prenda(ruta_imagen=filepath, categoria=categoria)
        db.session.add(nueva_prenda)
        db.session.commit()
        
        return jsonify({'success': True, 'prenda_id': nueva_prenda.id, 'ruta_imagen': filepath})
    
    return jsonify({'error': 'File type not allowed'}), 400

@armario_bp.route('/armario/api/prendas', methods=['GET'])
def get_prendas():
    prendas = Prenda.query.all()
    resultado = [
        {
            'id': p.id,
            'ruta_imagen': p.ruta_imagen,
            'categoria': p.categoria,
            'fecha_subida': p.fecha_subida.isoformat() if p.fecha_subida else None
        } for p in prendas
    ]
    return jsonify(resultado)

@armario_bp.route('/armario/api/outfit/guardar', methods=['POST'])
def guardar_outfit():
    data = request.json
    if not data or 'nombre' not in data or 'prendas' not in data:
        return jsonify({'error': 'Invalid payload'}), 400
        
    nombre = data.get('nombre')
    prendas_data = data.get('prendas')
    
    nuevo_outfit = Outfit(nombre=nombre)
    db.session.add(nuevo_outfit)
    db.session.commit()
    
    for pd in prendas_data:
        op = OutfitPrenda(
            outfit_id=nuevo_outfit.id,
            prenda_id=pd.get('id'),
            pos_x=pd.get('x', 0.0),
            pos_y=pd.get('y', 0.0),
            escala=pd.get('escala', 1.0),
            rotacion=pd.get('rotacion', 0.0)
        )
        db.session.add(op)
        
    db.session.commit()
    return jsonify({"mensaje": "Outfit guardado con éxito", "status": "success"}), 200
@armario_bp.route('/armario/api/outfits', methods=['GET'])
def get_outfits():
    outfits = Outfit.query.all()
    resultado = [{'id': o.id, 'nombre': o.nombre} for o in outfits]
    return jsonify(resultado)

@armario_bp.route('/armario/api/calendario/asignar', methods=['POST'])
def asignar_outfit_calendario():
    data = request.json
    if not data or 'fecha' not in data or 'outfit_id' not in data:
        return jsonify({'error': 'Invalid payload'}), 400
        
    fecha_str = data.get('fecha')
    outfit_id = data.get('outfit_id')
    
    try:
        fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Formato de fecha invalido (YYYY-MM-DD)'}), 400
        
    # Verificar que exista
    if not Outfit.query.get(outfit_id):
        return jsonify({'error': 'Outfit no existe'}), 404
        
    # Crear asignacion
    asignacion = OutfitCalendario(outfit_id=outfit_id, fecha_planeada=fecha)
    db.session.add(asignacion)
    db.session.commit()
    
    return jsonify({'success': True, 'id': asignacion.id})
