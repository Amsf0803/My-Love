"""
Decoradores reutilizables para las rutas de la aplicación.
"""

from functools import wraps

from flask import session, redirect, url_for, flash


def login_required(view_func):
    """
    Protege una ruta exigiendo que exista una sesión activa
    (session['logueado'] == True). Si no la hay, redirige al login.
    """

    @wraps(view_func)
    def wrapped_view(*args, **kwargs):
        if not session.get("logueado"):
            flash("Por favor inicia sesión para continuar.", "warning")
            return redirect(url_for("auth.login"))
        return view_func(*args, **kwargs)

    return wrapped_view
