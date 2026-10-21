# Growth Hub

Une application de bureau pour piloter son développement personnel et sa recherche d'emploi :
tâches, routine quotidienne, calendrier, statistiques de productivité, bibliothèque de ressources
et un conseiller IA gratuit qui recommande des cours et des ressources métier.

*A desktop app to run your personal development and job search: tasks, daily routine, calendar,
productivity statistics, a resource library and a free AI advisor. Interface in French.*

## Ce qu'elle fait

| Onglet | |
|---|---|
| **Aujourd'hui** | La routine du jour à cocher, une série de jours réussis, les tâches du jour et un minuteur de concentration (15 à 60 min) qui compte le temps passé. |
| **Tâches** | Catégories, priorités, échéances, durée estimée, notes ou lien ; filtres et recherche. |
| **Calendrier** | Vue mois avec les tâches et la routine de chaque jour ; ajout d'une tâche sur une date. |
| **Statistiques** | Tâches terminées, part de la routine réalisée, série, temps de concentration (7, 30 ou 90 jours), activité jour par jour, tâches par catégorie, régularité sur 12 semaines, réussite de chaque habitude. |
| **Ressources** | Une bibliothèque de ressources gratuites (SQL, tests, BPMN, BA, anglais…), avec statut et « planifier aujourd'hui ». |
| **Conseiller IA** | Recommande des cours et ressources sur un domaine métier, prépare un entretien, construit le plan de la semaine à partir des statistiques, ou fait un bilan. Les propositions s'ajoutent en un clic. |

## Installation (Ubuntu)

Aucune dépendance à installer : Python 3, GTK et WebKit sont déjà présents sur Ubuntu 22.04 et plus.

```bash
git clone https://github.com/mariem-trabelsi/growth-hub.git
cd growth-hub
./installer.sh
```

Growth Hub apparaît ensuite dans le menu des applications et sur le Bureau.
Sans installer : `python3 growth_hub.py` (fenêtre) ou `./lancer.sh` (dans le navigateur).

Si GTK/WebKit manquent : `sudo apt install python3-gi gir1.2-webkit2-4.0`.

## Brancher une IA gratuite

Dans **Réglages**, choisir un fournisseur et coller sa clé :

| Fournisseur | Clé gratuite | Remarque |
|---|---|---|
| Google Gemini | [aistudio.google.com](https://aistudio.google.com) | Le plus simple, bon en français |
| Groq | [console.groq.com](https://console.groq.com) | Très rapide (Llama 3.3 70B) |
| OpenRouter | [openrouter.ai](https://openrouter.ai) | Modèles suffixés `:free` |
| Ollama | sans clé | 100 % local ; `ollama pull llama3.2:3b` (8 Go de RAM suffisent pour un petit modèle) |

Les liens proposés par l'IA peuvent être inventés : chaque ressource a aussi un lien de recherche
Google et YouTube, et l'application signale les liens à vérifier.

## Vos données restent chez vous

- `donnees.json` : tâches, routine, journal, ressources ;
- `config.json` : fournisseur d'IA et clé, jamais renvoyée à la page ;
- `sauvegardes/` : une copie par jour ; **Réglages > Exporter** pour une sauvegarde manuelle.

Ces fichiers sont dans `.gitignore` : ils ne partent jamais sur GitHub.

## Architecture

```
growth_hub.py     fenêtre native GTK + WebKit, lance le serveur dans le même processus
serveur.py        serveur HTTP local (bibliothèque standard Python) : fichiers, données, appel à l'IA
web/              interface : HTML, CSS et JavaScript sans framework ni dépendance
installer.sh      lanceur .desktop (menu + Bureau)
```

Le navigateur intégré ne parle qu'au serveur local, qui seul appelle le fournisseur d'IA :
la clé d'API n'est jamais exposée à la page. Le serveur n'écoute que sur `127.0.0.1` et refuse les
requêtes venant d'un autre site.

## Licence

MIT
