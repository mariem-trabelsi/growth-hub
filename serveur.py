#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Growth Hub — serveur local (Python 3 seul, aucune dépendance).

    python3 serveur.py            puis ouvrir http://127.0.0.1:8765

Les données restent sur ta machine :
  donnees.json   tâches, habitudes, journal, ressources
  config.json    fournisseur d'IA et clé d'API (jamais renvoyée au navigateur)
  sauvegardes/   une copie de donnees.json par jour

Le navigateur ne parle qu'à ce serveur ; c'est lui qui appelle l'IA, pour que la
clé ne soit jamais exposée dans la page.
"""
import json, os, shutil, sys, time, urllib.error, urllib.request
from datetime import date
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ICI = os.path.dirname(os.path.abspath(__file__))
DONNEES = os.path.join(ICI, 'donnees.json')
CONFIG = os.path.join(ICI, 'config.json')
SAUVEGARDES = os.path.join(ICI, 'sauvegardes')
PORT = int(os.environ.get('PORT', '8765'))

# Fichiers servis tels quels ; rien d'autre n'est lisible depuis le navigateur.
STATIQUES = {
    '/': ('web/index.html', 'text/html; charset=utf-8'),
    '/app.js': ('web/app.js', 'application/javascript; charset=utf-8'),
    '/style.css': ('web/style.css', 'text/css; charset=utf-8'),
    '/ressources.js': ('web/ressources.js', 'application/javascript; charset=utf-8'),
    '/fleurs.svg': ('web/fleurs.svg', 'image/svg+xml'),
}

# Fournisseurs compatibles avec l'API « chat completions » d'OpenAI.
FOURNISSEURS = {
    'gemini': {'nom': 'Google Gemini (gratuit, clé sur aistudio.google.com)',
               'url': 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
               'modele': 'gemini-3.8-flash', 'cle': True},
    'groq': {'nom': 'Groq (gratuit, clé sur console.groq.com)',
             'url': 'https://api.groq.com/openai/v1/chat/completions',
             'modele': 'llama-3.3-70b-versatile', 'cle': True},
    'openrouter': {'nom': 'OpenRouter (modèles « :free », clé sur openrouter.ai)',
                   'url': 'https://openrouter.ai/api/v1/chat/completions',
                   'modele': 'meta-llama/llama-3.3-70b-instruct:free', 'cle': True},
    'ollama': {'nom': 'Ollama (100 % local, sans clé)',
               'url': 'http://127.0.0.1:11434/v1/chat/completions',
               'modele': 'llama3.2:3b', 'cle': False},
}


def lire_json(chemin, defaut):
    try:
        with open(chemin, encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return defaut


def ecrire_json(chemin, valeur):
    # Écriture atomique : un plantage en plein milieu ne corrompt pas le fichier.
    tmp = chemin + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(valeur, f, ensure_ascii=False, indent=2)
    os.replace(tmp, chemin)


def sauvegarde_du_jour():
    if not os.path.exists(DONNEES):
        return
    os.makedirs(SAUVEGARDES, exist_ok=True)
    cible = os.path.join(SAUVEGARDES, 'donnees-%s.json' % date.today().isoformat())
    if not os.path.exists(cible):
        shutil.copy(DONNEES, cible)


def config_publique():
    c = lire_json(CONFIG, {})
    f = c.get('fournisseur', 'gemini')
    p = FOURNISSEURS.get(f, FOURNISSEURS['gemini'])
    return {
        'fournisseur': f,
        'modele': c.get('modele') or p['modele'],
        'cleEnregistree': bool(c.get('cles', {}).get(f)),
        'fournisseurs': {k: {'nom': v['nom'], 'modele': v['modele'], 'cle': v['cle']}
                         for k, v in FOURNISSEURS.items()},
    }


def appeler_ia(messages, json_attendu):
    c = lire_json(CONFIG, {})
    f = c.get('fournisseur', 'gemini')
    p = FOURNISSEURS.get(f)
    if not p:
        raise RuntimeError('Fournisseur inconnu : %s' % f)
    cle = c.get('cles', {}).get(f, '')
    if p['cle'] and not cle:
        raise RuntimeError("Aucune clé d'API pour %s : ajoute-la dans Réglages." % p['nom'])
    corps = {'model': c.get('modele') or p['modele'], 'messages': messages, 'temperature': 0.4}
    if json_attendu:  # Ollama le gère aussi via son API compatible OpenAI
        corps['response_format'] = {'type': 'json_object'}
    # Certains fournisseurs (derrière Cloudflare) refusent l'agent « Python-urllib » par défaut.
    entetes = {'Content-Type': 'application/json', 'User-Agent': 'growth-hub/1.0'}
    if cle:
        entetes['Authorization'] = 'Bearer ' + cle
    donnees = json.dumps(corps).encode('utf-8')
    try:
        # Surcharge ou quota momentané (429, 5xx) : on réessaie deux fois, après 2 puis 5 secondes.
        for attente in (2, 5, None):
            try:
                with urllib.request.urlopen(urllib.request.Request(p['url'], data=donnees, headers=entetes), timeout=300 if f == 'ollama' else 90) as r:
                    rep = json.load(r)
                break
            except urllib.error.HTTPError as e:
                if e.code in (429, 500, 502, 503, 504) and attente:
                    time.sleep(attente)
                    continue
                detail = e.read().decode('utf-8', 'replace')[:400]
                if e.code == 429:
                    raise RuntimeError("Limite gratuite atteinte pour le moment : réessaie dans une minute "
                                       "(ou change de fournisseur dans Réglages).")
                if e.code in (500, 502, 503, 504):
                    raise RuntimeError('Le service de %s est surchargé en ce moment. Réessaie dans quelques minutes, '
                                       'ou choisis un autre fournisseur ou modèle dans Réglages.' % p['nom'].split(' (')[0])
                if e.code in (401, 403):
                    raise RuntimeError("Clé d'API refusée : vérifie-la dans Réglages. (%s)" % detail)
                raise RuntimeError('Le fournisseur a répondu %s : %s' % (e.code, detail))
    except urllib.error.URLError as e:
        raise RuntimeError('Impossible de joindre %s (%s). Ollama est-il lancé ?' % (p['nom'], e.reason)
                           if f == 'ollama' else 'Impossible de joindre %s : %s' % (p['nom'], e.reason))
    try:
        return rep['choices'][0]['message']['content']
    except (KeyError, IndexError, TypeError):
        raise RuntimeError('Réponse inattendue du fournisseur : %s' % json.dumps(rep)[:400])


class Gestionnaire(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # console silencieuse

    def repondre(self, code, corps, type_='application/json; charset=utf-8'):
        if corps is None or isinstance(corps, (dict, list)):
            corps = json.dumps(corps, ensure_ascii=False)
        if isinstance(corps, str):
            corps = corps.encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', type_)
        self.send_header('Content-Length', str(len(corps)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(corps)

    def lire_corps(self):
        n = int(self.headers.get('Content-Length') or 0)
        return json.loads(self.rfile.read(n).decode('utf-8') or '{}')

    def origine_locale(self):
        # Refuse les requêtes envoyées par un autre site ouvert dans le navigateur.
        o = self.headers.get('Origin')
        port = self.server.server_port
        return o is None or o in ('http://127.0.0.1:%d' % port, 'http://localhost:%d' % port)

    def do_GET(self):
        chemin = self.path.split('?')[0]
        if chemin in STATIQUES:
            fichier, type_ = STATIQUES[chemin]
            with open(os.path.join(ICI, fichier), 'rb') as f:
                return self.repondre(200, f.read(), type_)
        if chemin == '/api/donnees':
            return self.repondre(200, lire_json(DONNEES, None))
        if chemin == '/api/config':
            return self.repondre(200, config_publique())
        self.repondre(404, {'erreur': 'introuvable'})

    def do_PUT(self):
        if not self.origine_locale():
            return self.repondre(403, {'erreur': 'origine refusée'})
        if self.path == '/api/donnees':
            d = self.lire_corps()
            if not isinstance(d, dict) or 'taches' not in d:
                return self.repondre(400, {'erreur': 'données invalides'})
            sauvegarde_du_jour()
            ecrire_json(DONNEES, d)
            return self.repondre(200, {'ok': True})
        if self.path == '/api/config':
            n = self.lire_corps()
            c = lire_json(CONFIG, {})
            f = n.get('fournisseur', c.get('fournisseur', 'gemini'))
            if f not in FOURNISSEURS:
                return self.repondre(400, {'erreur': 'fournisseur inconnu'})
            c['fournisseur'] = f
            c['modele'] = (n.get('modele') or '').strip() or FOURNISSEURS[f]['modele']
            if n.get('cle'):
                c.setdefault('cles', {})[f] = n['cle'].strip()
            if n.get('effacerCle'):
                c.get('cles', {}).pop(f, None)
            ecrire_json(CONFIG, c)
            return self.repondre(200, config_publique())
        self.repondre(404, {'erreur': 'introuvable'})

    def do_POST(self):
        if not self.origine_locale():
            return self.repondre(403, {'erreur': 'origine refusée'})
        if self.path == '/api/ia':
            n = self.lire_corps()
            try:
                texte = appeler_ia(n.get('messages', []), bool(n.get('json')))
                return self.repondre(200, {'texte': texte})
            except RuntimeError as e:
                return self.repondre(502, {'erreur': str(e)})
        self.repondre(404, {'erreur': 'introuvable'})


def creer_serveur(port=PORT):
    """Serveur prêt à tourner (port 0 : un port libre choisi par le système)."""
    return ThreadingHTTPServer(('127.0.0.1', port), Gestionnaire)


if __name__ == '__main__':
    serveur = creer_serveur()
    print('Growth Hub : http://127.0.0.1:%d  (Ctrl+C pour arrêter)' % PORT)
    try:
        serveur.serve_forever()
    except KeyboardInterrupt:
        print('\nArrêté.')
        sys.exit(0)
