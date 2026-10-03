document.addEventListener('DOMContentLoaded', () => {
    cargarPrendas();

    const btnSubir = document.getElementById('btn-subir');
    btnSubir.addEventListener('click', subirPrenda);

    const btnGuardar = document.getElementById('btn-guardar');
    btnGuardar.addEventListener('click', guardarOutfit);
});

let zIndexCounter = 1;

function cargarPrendas() {
    fetch('/armario/api/prendas')
        .then(res => res.json())
        .then(data => {
            ['Top', 'Bottom', 'Calzado', 'Accesorio'].forEach(cat => {
                const el = document.getElementById(`cat-${cat}`);
                if (el) el.innerHTML = '';
            });

            data.forEach(prenda => {
                const img = document.createElement('img');
                img.src = '/' + prenda.ruta_imagen; 
                img.classList.add('prenda-item');
                img.dataset.id = prenda.id;
                img.dataset.categoria = prenda.categoria;
                img.draggable = false; 

                img.addEventListener('mousedown', (e) => iniciarDragDesdeCatalogo(e, prenda));

                const container = document.getElementById(`cat-${prenda.categoria}`);
                if(container) {
                    container.appendChild(img);
                }
            });
        });
}

function subirPrenda() {
    const fileInput = document.getElementById('upload-file');
    const catInput = document.getElementById('upload-cat');
    
    if (fileInput.files.length === 0) {
        alert('Selecciona una imagen');
        return;
    }

    const formData = new FormData();
    formData.append('imagen', fileInput.files[0]);
    formData.append('categoria', catInput.value);

    fetch('/armario/subir_prenda', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            fileInput.value = '';
            cargarPrendas();
        } else {
            alert('Error al subir: ' + data.error);
        }
    })
    .catch(err => {
        alert('Error en la petición: ' + err);
    });
}

function iniciarDragDesdeCatalogo(e, prendaData) {
    e.preventDefault();

    const lienzo = document.getElementById('lienzo-outfit');
    const lienzoRect = lienzo.getBoundingClientRect();
    
    const clon = document.createElement('img');
    clon.src = '/' + prendaData.ruta_imagen;
    clon.classList.add('prenda-en-lienzo');
    clon.dataset.id = prendaData.id;
    clon.style.zIndex = zIndexCounter++;
    
    clon.dataset.escala = 1.0;
    clon.dataset.rotacion = 0.0;

    lienzo.appendChild(clon);
    
    const offsetX = e.clientX - lienzoRect.left - (clon.offsetWidth / 2);
    const offsetY = e.clientY - lienzoRect.top - (clon.offsetHeight / 2);
    
    clon.style.left = offsetX + 'px';
    clon.style.top = offsetY + 'px';

    let currentX = e.clientX;
    let currentY = e.clientY;

    function onMouseMoveCatalogo(moveEvent) {
        const dx = moveEvent.clientX - currentX;
        const dy = moveEvent.clientY - currentY;
        
        let left = parseFloat(clon.style.left) || 0;
        let top = parseFloat(clon.style.top) || 0;
        
        clon.style.left = (left + dx) + 'px';
        clon.style.top = (top + dy) + 'px';
        
        currentX = moveEvent.clientX;
        currentY = moveEvent.clientY;
    }

    function onMouseUpCatalogo(upEvent) {
        document.removeEventListener('mousemove', onMouseMoveCatalogo);
        document.removeEventListener('mouseup', onMouseUpCatalogo);
        
        if (
            upEvent.clientX < lienzoRect.left || 
            upEvent.clientX > lienzoRect.right || 
            upEvent.clientY < lienzoRect.top || 
            upEvent.clientY > lienzoRect.bottom
        ) {
            clon.remove(); 
        } else {
            clon.addEventListener('mousedown', iniciarDragEnLienzo);
            
            clon.addEventListener('contextmenu', (evt) => {
                evt.preventDefault();
                clon.remove();
            });
        }
    }

    document.addEventListener('mousemove', onMouseMoveCatalogo);
    document.addEventListener('mouseup', onMouseUpCatalogo);
}

function iniciarDragEnLienzo(e) {
    if (e.button !== 0) return; 
    e.preventDefault();
    
    const el = e.target;
    el.style.zIndex = zIndexCounter++;
    
    let currentX = e.clientX;
    let currentY = e.clientY;

    function onMouseMoveLienzo(moveEvent) {
        const dx = moveEvent.clientX - currentX;
        const dy = moveEvent.clientY - currentY;
        
        let left = parseFloat(el.style.left) || 0;
        let top = parseFloat(el.style.top) || 0;
        
        el.style.left = (left + dx) + 'px';
        el.style.top = (top + dy) + 'px';
        
        currentX = moveEvent.clientX;
        currentY = moveEvent.clientY;
    }

    function onMouseUpLienzo() {
        document.removeEventListener('mousemove', onMouseMoveLienzo);
        document.removeEventListener('mouseup', onMouseUpLienzo);
    }

    document.addEventListener('mousemove', onMouseMoveLienzo);
    document.addEventListener('mouseup', onMouseUpLienzo);
}

function guardarOutfit() {
    const nombreInput = document.getElementById('outfit-nombre');
    const nombre = nombreInput.value.trim();
    
    if (!nombre) {
        alert('Por favor ingresa un nombre para el outfit');
        return;
    }

    const lienzo = document.getElementById('lienzo-outfit');
    const prendasEnLienzo = lienzo.querySelectorAll('.prenda-en-lienzo');
    
    if (prendasEnLienzo.length === 0) {
        alert('Agrega al menos una prenda al lienzo');
        return;
    }

    const payloadPrendas = Array.from(prendasEnLienzo).map(el => {
        return {
            id: parseInt(el.dataset.id),
            x: parseFloat(el.style.left) || 0,
            y: parseFloat(el.style.top) || 0,
            escala: parseFloat(el.dataset.escala) || 1.0,
            rotacion: parseFloat(el.dataset.rotacion) || 0.0
        };
    });

    const payload = {
        nombre: nombre,
        prendas: payloadPrendas
    };

    fetch('/armario/api/outfit/guardar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Outfit guardado con éxito! ID: ' + data.outfit_id);
            nombreInput.value = '';
            lienzo.innerHTML = ''; 
        } else {
            alert('Error al guardar: ' + data.error);
        }
    })
    .catch(err => {
        alert('Error en la petición: ' + err);
    });
}
