"""
Blueprint del Dashboard: pantalla principal tras el login, con el menú
hacia Calendario, Cartas y Universo, y el contador en tiempo real.
"""

from flask import Blueprint, render_template, current_app

from routes.decorators import login_required

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/dashboard")
@login_required
def index():
    # La fecha de inicio se pasa al template para que el JS del contador
    # (static/js/contador.js) sepa desde cuándo calcular.
    fecha_inicio = current_app.config["FECHA_INICIO_RELACION"]
    return render_template("dashboard.html", fecha_inicio=fecha_inicio)
