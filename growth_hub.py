#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Growth Hub — application de bureau.

Une fenêtre native (GTK + WebKit, déjà présents sur Ubuntu) qui affiche l'interface
et fait tourner le serveur local dans le même processus. Fermer la fenêtre arrête tout.

    python3 growth_hub.py
"""
import os, subprocess, sys, threading, urllib.request

import gi
gi.require_version('Gtk', '3.0')
gi.require_version('WebKit2', '4.0')
from gi.repository import GLib, Gtk, WebKit2  # noqa: E402

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
import serveur  # noqa: E402

ICONE = os.path.join(ICI, 'web', 'icone.png')


def lancer_serveur():
    """Démarre le serveur sur le port habituel, ou réutilise celui qui tourne déjà."""
    try:
        s = serveur.creer_serveur(serveur.PORT)
    except OSError:
        url = 'http://127.0.0.1:%d' % serveur.PORT
        try:
            urllib.request.urlopen(url + '/api/config', timeout=2)
            return url  # une autre fenêtre Growth Hub sert déjà les données
        except OSError:
            s = serveur.creer_serveur(0)  # port occupé par autre chose : un port libre
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return 'http://127.0.0.1:%d' % s.server_port


def ouvrir_dehors(uri):
    subprocess.Popen(['xdg-open', uri], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


class Fenetre(Gtk.Window):
    def __init__(self, url):
        super().__init__(title='Growth Hub')
        self.base = url
        self.set_default_size(1280, 860)
        if os.path.exists(ICONE):
            self.set_icon_from_file(ICONE)

        contexte = WebKit2.WebContext.get_default()
        contexte.connect('download-started', self.telechargement)
        self.vue = WebKit2.WebView.new_with_context(contexte)
        reglages = self.vue.get_settings()
        reglages.set_enable_developer_extras(True)       # clic droit > Inspecter, pour déboguer
        reglages.set_javascript_can_open_windows_automatically(False)
        self.vue.connect('decide-policy', self.politique)
        self.vue.connect('permission-request', self.permission)
        self.vue.connect('create', self.nouvelle_fenetre)
        self.add(self.vue)
        self.vue.load_uri(url)
        self.connect('destroy', Gtk.main_quit)

    def politique(self, vue, decision, type_):
        # Les liens externes (cours, ressources) s'ouvrent dans le navigateur habituel.
        if type_ in (WebKit2.PolicyDecisionType.NAVIGATION_ACTION, WebKit2.PolicyDecisionType.NEW_WINDOW_ACTION):
            uri = decision.get_navigation_action().get_request().get_uri()
            if not uri.startswith(self.base) and not uri.startswith('blob:') and not uri.startswith('about:'):
                decision.ignore()
                ouvrir_dehors(uri)
                return True
        return False

    def nouvelle_fenetre(self, vue, action):
        ouvrir_dehors(action.get_request().get_uri())
        return None

    def permission(self, vue, demande):
        # Notifications de fin de session de concentration.
        if isinstance(demande, WebKit2.NotificationPermissionRequest):
            demande.allow()
            return True
        demande.deny()
        return True

    def telechargement(self, contexte, telechargement):
        # Export JSON : enregistré dans Téléchargements.
        def destination(t, nom):
            dossier = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOWNLOAD) or os.path.expanduser('~')
            t.set_destination('file://' + os.path.join(dossier, nom or 'growth-hub.json'))
            return True

        def fini(t):
            d = Gtk.MessageDialog(transient_for=self, message_type=Gtk.MessageType.INFO,
                                  buttons=Gtk.ButtonsType.OK, text='Sauvegarde exportée')
            d.format_secondary_text(GLib.filename_from_uri(t.get_destination())[0])
            d.run()
            d.destroy()

        telechargement.connect('decide-destination', destination)
        telechargement.connect('finished', fini)


def main():
    url = lancer_serveur()
    GLib.set_prgname('growth-hub')  # relie la fenêtre à son lanceur .desktop
    Fenetre(url).show_all()
    Gtk.main()


if __name__ == '__main__':
    main()
