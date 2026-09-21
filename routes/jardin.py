"""
Blueprint del Jardín: sección escalable donde se "plantan" flores digitales
con mensajes románticos.

La lista de flores se define aquí como estructura de datos en memoria.
Cada entrada es un diccionario con: id, fecha, titulo, mensaje, imagen y
opcionalmente un color_acento para personalizar la tarjeta.

Para añadir una nueva flor, basta con agregar un diccionario más a la lista.
"""

from flask import Blueprint, render_template

from routes.decorators import login_required

jardin_bp = Blueprint("jardin", __name__)


# =========================================================================
#  DATOS DE LAS FLORES
#  -------------------------------------------------------------------------
#  Lista 100 % escalable.  Para plantar una flor nueva, copia un bloque,
#  cambia los campos y coloca la imagen en:
#
#      static/img/jardin/<nombre-archivo>
#
#  Campos disponibles:
#    id            → identificador único (int incremental)
#    fecha         → texto con la fecha para mostrar (ej. "21 de septiembre")
#    titulo        → título corto de la flor / ocasión
#    mensaje       → el mensaje romántico
#    imagen        → nombre del archivo dentro de static/img/jardin/
#    color_acento  → color CSS para el borde y detalles (opcional)
# =========================================================================
FLORES = [
    {
        "id": 1,
        "tipo": "amarillas",
        "fecha": "21 de septiembre, 2026",
        "titulo": "Tus Flores Amarillas 🌻",
        "mensaje": (
            "Hoy es 21 de septiembre y aunque la distancia nos separa, "
            "mis ganas de darte flores amarillas no entienden de kilómetros. "
            "Estas flores son la promesa de que, sin importar dónde esté, "
            "siempre voy a encontrar la manera de hacerte sonreír. "
            "Te amo más de lo que las palabras alcanzan a decir e incluso más que el otro jajaja."
        ),
        "imagen": "flores-amarillas.webp",
        "color_acento": "#eab654",
    },
    {
        "id": 2,
        "tipo": "hortensia",
        "fecha": "21 de septiembre, 2026",
        "titulo": "Hortensias Azules 🩵",
        "mensaje": (
            "Dicen que las hortensias azules representan la serenidad, la devoción "
            "y los sentimientos sinceros que florecen desde lo más profundo del corazón. "
            "Igual por ahi vi que eran tus favoritas jejeje, asi que espero que te gusten estas. "
            " "
            "En otro momento no solo estaran aqui sino que las tendras en tu mano :). "
            "Te amoooo. Muaaak"
        ),
        "imagen": "hortensias-azules.webp",
        "color_acento": "#8c7ae6",
    },

    {
        "id": 3,
        "tipo": "tulipan",
        "fecha": "21 de septiembre, 2026",
        "titulo": "Las primeras flores que te di",
        "mensaje": (
            "Aunque no fueron las más bonitas siento que son las que empezaron todo, "
            "Te amoo demasiado y estas flores fueron las primeras de infinitas que te dare "
            "por el resto de nuestra vida y las demás si seran más lindas lo juro jejeje."
        ),
        "imagen": "tulipanes-1.jpeg",
        "color_acento": "#f478a7",
    },
    {
        "id": 4,
        "tipo": "hortensia",
        "fecha": "21 de septiembre, 2026",
        "titulo": "Unas flores igual de lindas que tu.",
        "mensaje": (
            "Estas espero que si hayan sido más lindas jejeje. "
            "Sabes toda la historia detras de estas y cada que las veia solo podia pensar en algo "
            "y eso era como te verias con ellas, lo hermosa que te verias junto a unas flores igual de lindas que tu. "
            "Aunque cuando te las di me di cuenta que no hay nada en este mundo más lindo que tu, te amooo muchoo amor. Muaaaaak"
        ),
        "imagen": "hortencias-1.jpeg",
        "color_acento": "#ba75ff",
    },
    # ------------------------------------------------------------------
    #  ¿Quieres plantar otra flor?  Copia este bloque y llena los campos:
    # ------------------------------------------------------------------
    # {
    #     "id": 3,
    #     "tipo": "rosa",
    #     "fecha": "14 de febrero, 2027",
    #     "titulo": "Rosas para ti 🌹",
    #     "mensaje": "Tu mensaje aquí…",
    #     "imagen": "rosas-san-valentin.webp",
    #     "color_acento": "#ef9bb3",
    # },
]


@jardin_bp.route("/jardin")
@login_required
def index():
    return render_template("jardin.html", flores=FLORES)
