"""
Blueprint de autenticación.

No hay registro de usuarios: es un login estático protegido por una
única "contraseña" que es la fecha de aniversario. Se acepta en varios
formatos (0307, 03/07, 03-07) para que sea más tolerante a cómo la
escriba tu novia.
"""

import re

from flask import Blueprint, render_template, request, redirect, url_for, session, flash, current_app

auth_bp = Blueprint("auth", __name__)


def _normalizar_password(valor: str) -> str:
    """Deja solo dígitos, ej: '03/07' -> '0307', '03-07' -> '0307'."""
    return re.sub(r"\D", "", valor or "")


@auth_bp.route("/", methods=["GET", "POST"])
@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    # Si ya inició sesión, lo mandamos directo al dashboard.
    if session.get("logueado"):
        return redirect(url_for("dashboard.index"))

    if request.method == "POST":
        password_ingresada = _normalizar_password(request.form.get("password", ""))
        password_correcta = _normalizar_password(current_app.config["APP_PASSWORD"])

        if password_ingresada == password_correcta:
            session["logueado"] = True
            session.permanent = True
            return redirect(url_for("dashboard.index"))

        flash("Fecha incorrecta, inténtalo de nuevo. 💔", "error")

    return render_template("login.html")


@auth_bp.route("/logout")
def logout():
    session.clear()
    flash("Sesión cerrada.", "info")
    return redirect(url_for("auth.login"))
