/* Growth Hub — tâches, routine, calendrier, statistiques, ressources et conseiller IA.
   Toutes les données passent par le serveur local (serveur.py) et vivent dans donnees.json. */
'use strict';

/* ---------- utilitaires ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const auj = () => iso(new Date());
const versDate = s => { const [a, m, j] = s.split('-').map(Number); return new Date(a, m - 1, j); };
const ajouterJours = (s, n) => { const d = versDate(s); d.setDate(d.getDate() + n); return iso(d); };
const nouvelId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const urlSure = u => /^https?:\/\//i.test(u || '') ? u : '';
const fmtJour = s => versDate(s).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtCourt = s => versDate(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const majuscule = s => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- données ---------- */
const PROFIL_DEFAUT = `Meriem Trabelsi, ingénieure en génie logiciel (ISI Tunis, 2026), à Tunis.
Recherche un premier emploi : Business Analyst / analyste fonctionnelle, consultante junior, analyste qualité (QA) ou développeuse Java.
Compétences : Java, Spring Boot, Quarkus, SQL (PostgreSQL), API REST, BPMN 2.0, Camunda, Drools, DMN, Kafka, recette (UAT), user stories, GenAI.
Projet de fin d'études : plateforme de commande fibre (Order-to-Activate) alignée TM Forum.
Points à renforcer : anglais oral (B2), connaissances métier (finance, paie/DSN, AML, télécom), outils QA (ISTQB).
Préférence : ressources gratuites, en français ou en anglais simple.`;

const CATEGORIES = ['Candidature', 'Entretiens', 'Compétence', 'Langue', 'Lecture', 'Santé', 'Perso'];
// Anciennes catégories (première version) -> nouvelles.
const ANCIENNES = { Candidatures: 'Candidature', 'Réseau': 'Candidature', 'Compétences': 'Compétence', Anglais: 'Langue', Posts: 'Compétence' };

const PREFS = { prenom: 'Meriem', accent: 'terre', fleurs: true, theme: 'auto' };
const ACCENTS = { terre: '#B4553A', rose: '#B5466B', prune: '#7A4A86', bleu: '#3D6A8C', vert: '#4E7D5B' };
const NOMS_JOURS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

// Routine : une case à cocher, ou un compteur avec objectif (ex. 2 candidatures) ;
// des thèmes qui tournent chaque jour ; des jours précis (vide = tous les jours).
function routineDeBase() {
  const h = (titre, categorie, minutes, plus = {}) => ({ id: nouvelId(), titre, categorie, minutes, actif: true,
    type: 'case', objectif: 1, themes: [], jours: [], ...plus });
  return [
    h('Marche (au moins 15 min)', 'Santé', 15),
    h('Candidatures ciblées (2 à 3)', 'Candidature', 60, { type: 'compteur', objectif: 2 }),
    h('Apprendre un métier', 'Compétence', 30, { themes: ['Finance', 'Télécom', 'Marketing', 'RH et paie', 'Assurance', 'Logistique'] }),
    h('Hard skill', 'Compétence', 45, { themes: ['SQL', 'Programmation Java', 'Algorithmes', 'Tests et QA', 'BPMN et processus', 'Git et DevOps'] }),
    h('Lecture (15 min)', 'Lecture', 15),
    h('Préparer les entretiens', 'Entretiens', 20, { themes: ['Se présenter', 'Question comportementale (STAR)', 'Question technique', "Connaître l'entreprise", 'Simulation complète'] }),
    h('Anglais (30 min)', 'Langue', 30, { themes: ['Écoute (podcast, vidéo)', 'Parler à voix haute', 'Vocabulaire métier', 'Écrire un e-mail', 'Lire un article'] }),
    h('Bilan du soir : 1 réussite, 1 chose apprise', 'Perso', 5, { actif: false }),
    h('1 message ou commentaire LinkedIn', 'Candidature', 10, { actif: false }),
    h('Préparer le post LinkedIn de la semaine', 'Compétence', 45, { actif: false, jours: [4] }),
    h("Pas d'écran 30 min avant de dormir", 'Santé', 30, { actif: false }),
  ];
}

let aMigrer = false;
function migrer(d) {
  if (d.categories.some(c => c in ANCIENNES)) {
    aMigrer = true;
    const nv = c => ANCIENNES[c] || c;
    d.taches.forEach(t => { t.categorie = nv(t.categorie); });
    d.habitudes.forEach(h => { h.categorie = nv(h.categorie); });
    d.categories = [...new Set([...CATEGORIES, ...d.categories.map(nv)])];
  }
  if (d.routineVersion !== 2) { d.habitudes = routineDeBase(); d.routineVersion = 2; aMigrer = true; }
  d.habitudes.forEach(h => { h.type = h.type || 'case'; h.objectif = h.objectif || 1; h.themes = h.themes || []; h.jours = h.jours || []; });
  d.prefs = { ...PREFS, ...(d.prefs || {}) };
  return d;
}

function donneesParDefaut() {
  return {
    version: 1,
    routineVersion: 2,
    prefs: { ...PREFS },
    categories: CATEGORIES,
    taches: [],
    habitudes: routineDeBase(),
    journal: {},      // 'AAAA-MM-JJ' -> { habitudes: [id], focus, compteurs: {id: n}, notes: {id: texte} }
    sessions: [],     // { date, minutes, tacheId }
    ressources: (window.RESSOURCES_DE_BASE || []).map(r => ({ ...r, id: nouvelId(), statut: 'a-faire', source: 'liste' })),
    profil: PROFIL_DEFAUT,
  };
}

let D = null;
let minuterieSauvegarde = null;

function sauver() {
  $('#etat-sauvegarde').textContent = 'Enregistrement…';
  clearTimeout(minuterieSauvegarde);
  minuterieSauvegarde = setTimeout(async () => {
    try {
      const r = await fetch('/api/donnees', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(D) });
      if (!r.ok) throw new Error(r.status);
      $('#etat-sauvegarde').textContent = 'Enregistré';
    } catch (e) {
      $('#etat-sauvegarde').textContent = 'Échec de l’enregistrement : le serveur est-il lancé ?';
    }
  }, 350);
}

function jour(d) {
  if (!D.journal[d]) D.journal[d] = { habitudes: [], focus: 0 };
  return D.journal[d];
}
const habitudesActives = () => D.habitudes.filter(h => h.actif);
const jourSemaine = s => ((versDate(s).getDay() + 6) % 7) + 1;          // 1 = lundi … 7 = dimanche
const prevuLe = (h, s) => h.actif && (!h.jours.length || h.jours.includes(jourSemaine(s)));
const habitudesDuJour = s => D.habitudes.filter(h => prevuLe(h, s));
const faitesLe = s => (D.journal[s]?.habitudes || []).filter(id => habitudesDuJour(s).some(h => h.id === id)).length;
const numeroJour = s => { const [a, m, j] = s.split('-').map(Number); return Math.round(Date.UTC(a, m - 1, j) / 864e5); };
const themeDuJour = (h, s) => h.themes.length ? h.themes[numeroJour(s) % h.themes.length] : '';

function appliquerPrefs() {
  const p = D.prefs, r = document.documentElement;
  if (p.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', p.theme);
  r.style.setProperty('--accent', ACCENTS[p.accent] || ACCENTS.terre);
  r.style.setProperty('--accent-doux', `color-mix(in srgb, ${ACCENTS[p.accent] || ACCENTS.terre} 22%, var(--surface))`);
  document.body.classList.toggle('sans-fleurs', !p.fleurs);
}

/* ---------- navigation ---------- */
let vueCourante = 'aujourdhui';
function afficherVue(v) {
  vueCourante = v;
  $$('.onglets button').forEach(b => b.classList.toggle('actif', b.dataset.vue === v));
  $$('.vue').forEach(s => s.classList.toggle('actif', s.id === 'vue-' + v));
  try { localStorage.setItem('gh-vue', v); } catch (e) { /* stockage indisponible */ }
  rendre();
}
function rendre() {
  ({ aujourdhui: rendreAujourdhui, taches: rendreTaches, calendrier: rendreCalendrier, stats: rendreStats,
     ressources: rendreRessources, conseiller: () => {}, reglages: rendreReglages })[vueCourante]();
}

function remplirCategories() {
  const opts = D.categories.map(c => `<option>${esc(c)}</option>`).join('');
  ['#ajout-rapide-cat', '#t-cat', '#h-cat'].forEach(s => { const el = $(s), v = el.value; el.innerHTML = opts; if (v) el.value = v; });
  const f = $('#f-cat'), v = f.value;
  f.innerHTML = '<option value="">Toutes les catégories</option>' + opts; f.value = v;
}

/* ---------- tâches : fonctions communes ---------- */
function ligneTache(t, { date = true } = {}) {
  const retard = !t.faite && t.echeance && t.echeance < auj();
  const meta = [];
  if (date && t.echeance) meta.push(`<span class="${retard ? 'retard' : ''}">${retard ? 'en retard · ' : ''}${fmtCourt(t.echeance)}</span>`);
  if (t.minutes) meta.push(t.minutes + ' min');
  const notes = t.notes ? (urlSure(t.notes) ? ` · <a href="${esc(t.notes)}" target="_blank" rel="noopener">lien</a>` : ` · ${esc(t.notes)}`) : '';
  return `<li class="${t.faite ? 'faite' : ''} ${t.priorite === 'haute' && !t.faite ? 'prio-haute' : ''}" data-id="${t.id}">
    <input type="checkbox" data-action="cocher" ${t.faite ? 'checked' : ''} aria-label="Terminer">
    <span class="titre">${esc(t.titre)}<span class="meta">${notes}</span></span>
    <span class="puce">${esc(t.categorie)}</span>
    <span class="meta">${meta.join(' · ')}</span>
    <span class="actions">
      ${t.faite ? '' : '<button data-action="demain" title="Reporter à demain">Demain</button>'}
      <button data-action="modifier" title="Modifier">Modifier</button>
      <button data-action="supprimer" title="Supprimer">×</button>
    </span></li>`;
}

function actionTache(e) {
  const b = e.target.closest('[data-action]'); if (!b) return;
  const li = b.closest('li[data-id]'); if (!li) return;
  const t = D.taches.find(x => x.id === li.dataset.id); if (!t) return;
  const a = b.dataset.action;
  if (a === 'cocher') { t.faite = b.checked; t.faiteLe = t.faite ? auj() : null; }
  if (a === 'demain') t.echeance = ajouterJours(auj(), 1);
  if (a === 'supprimer' && confirm('Supprimer « ' + t.titre + ' » ?')) D.taches = D.taches.filter(x => x !== t);
  if (a === 'modifier') {
    const titre = prompt('Titre', t.titre); if (titre === null) return;
    const ech = prompt('Échéance (AAAA-MM-JJ, vide pour aucune)', t.echeance || ''); if (ech === null) return;
    t.titre = titre.trim() || t.titre;
    t.echeance = /^\d{4}-\d{2}-\d{2}$/.test(ech.trim()) ? ech.trim() : null;
  }
  sauver(); rendre();
}

function creerTache(champs) {
  const t = { id: nouvelId(), titre: '', categorie: D.categories[0], priorite: 'normale', echeance: null, minutes: null,
              notes: '', faite: false, faiteLe: null, creeeLe: auj(), ...champs };
  D.taches.push(t);
  return t;
}

/* ---------- AUJOURD'HUI ---------- */
function serie() {
  if (!habitudesActives().length) return 0;
  const reussi = d => { const n = habitudesDuJour(d).length; return n > 0 && faitesLe(d) / n >= 0.5; };
  let d = auj(), s = 0;
  if (!reussi(d)) d = ajouterJours(d, -1); // la journée en cours ne casse pas la série
  while (reussi(d)) { s++; d = ajouterJours(d, -1); }
  return s;
}

function rendreAujourdhui() {
  const a = auj(), j = jour(a);
  const heure = new Date().getHours();
  $('#salut').textContent = (heure < 18 ? 'Bonjour' : 'Bonsoir') + (D.prefs.prenom ? ' ' + D.prefs.prenom : '');
  $('#titre-jour').textContent = majuscule(fmtJour(a));
  const hs = habitudesDuJour(a);
  $('#liste-habitudes').innerHTML = hs.length ? hs.map(h => ligneHabitude(h, a, j)).join('')
    : '<li class="vide">Ajoute ta routine dans Réglages.</li>';
  const faites = hs.filter(h => j.habitudes.includes(h.id)).length;
  $('#barre-habitudes').style.width = (hs.length ? faites / hs.length * 100 : 0) + '%';
  const s = serie();
  $('#resume-habitudes').textContent = `${faites} sur ${hs.length} aujourd'hui · série : ${s} jour${s > 1 ? 's' : ''}`;

  const ouvertes = D.taches.filter(t => !t.faite && t.echeance && t.echeance <= a)
    .sort((x, y) => (x.priorite === 'haute' ? -1 : 0) - (y.priorite === 'haute' ? -1 : 0) || x.echeance.localeCompare(y.echeance));
  const sansDate = D.taches.filter(t => !t.faite && !t.echeance && t.priorite === 'haute');
  const finies = D.taches.filter(t => t.faite && t.faiteLe === a);
  const toutes = [...ouvertes, ...sansDate, ...finies];
  $('#liste-jour').innerHTML = toutes.length ? toutes.map(t => ligneTache(t)).join('')
    : '<li class="vide">Rien de prévu aujourd’hui. Ajoute une tâche ou demande un plan au conseiller.</li>';

  const sel = $('#minuteur-tache'), v = sel.value;
  sel.innerHTML = '<option value="">Sans tâche</option>' + D.taches.filter(t => !t.faite)
    .map(t => `<option value="${t.id}">${esc(t.titre)}</option>`).join('');
  sel.value = v;
  $('#focus-jour').textContent = `Concentration aujourd'hui : ${j.focus || 0} min`;
}

function ligneHabitude(h, s, j) {
  const fait = j.habitudes.includes(h.id), n = j.compteurs?.[h.id] || 0, theme = themeDuJour(h, s), note = j.notes?.[h.id] || '';
  const controle = h.type === 'compteur'
    ? `<span class="compteur"><button data-action="moins" aria-label="Un de moins">−</button><b>${n}/${h.objectif}</b><button data-action="plus" aria-label="Un de plus">+</button></span>`
    : `<input type="checkbox" data-action="cocher-h" ${fait ? 'checked' : ''} aria-label="Fait">`;
  return `<li data-h="${h.id}" class="habitude ${fait ? 'faite' : ''}">
    ${controle}
    <span class="titre">${esc(h.titre)}${theme ? `<span class="theme">Aujourd'hui : ${esc(theme)}</span>` : ''}</span>
    <span class="puce">${esc(h.categorie)}</span>
    <span class="meta">${h.minutes ? h.minutes + ' min' : ''}</span>
    <button class="bouton-note ${note ? 'a-note' : ''}" data-action="note" title="Note du jour">${note ? 'Note ✓' : 'Note'}</button>
    <input class="note" data-action="note-texte" placeholder="Ce que j'ai fait ou appris aujourd'hui…" value="${esc(note)}" ${note ? '' : 'hidden'}>
  </li>`;
}
const marquer = (j, h, fait) => { j.habitudes = fait ? [...new Set([...j.habitudes, h.id])] : j.habitudes.filter(x => x !== h.id); };

/* minuteur de concentration */
let minuteur = null; // { fin, duree, tacheId, debut }
function majMinuteur() {
  if (!minuteur) return;
  const reste = Math.max(0, minuteur.fin - Date.now());
  $('#affichage-minuteur').textContent = pad(Math.floor(reste / 60000)) + ':' + pad(Math.floor(reste / 1000) % 60);
  document.title = $('#affichage-minuteur').textContent + ' · Growth Hub';
  if (reste === 0) terminerMinuteur(minuteur.duree, true);
}
function terminerMinuteur(minutes, complet) {
  if (!minuteur) return;
  const m = Math.round(minutes);
  if (m >= 1) {
    jour(auj()).focus = (jour(auj()).focus || 0) + m;
    D.sessions.push({ date: auj(), minutes: m, tacheId: minuteur.tacheId || null });
    sauver();
  }
  clearInterval(minuteur.intervalle);
  minuteur = null;
  document.title = 'Growth Hub';
  $('#minuteur-lancer').disabled = false;
  $('#affichage-minuteur').textContent = pad($('#minuteur-duree').value) + ':00';
  if (complet) {
    try {
      const ctx = new AudioContext(), o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination); o.frequency.value = 660; g.gain.value = .08; o.start(); o.stop(ctx.currentTime + .6);
    } catch (e) { /* pas de son */ }
    if ('Notification' in window && Notification.permission === 'granted') new Notification('Session terminée', { body: m + ' min de concentration. Fais une pause.' });
  }
  rendreAujourdhui();
}

/* ---------- TÂCHES ---------- */
function rendreTaches() {
  const st = $('#f-statut').value, cat = $('#f-cat').value, txt = $('#f-texte').value.trim().toLowerCase();
  let l = D.taches.filter(t => (st === 'toutes' || (st === 'faites') === t.faite) && (!cat || t.categorie === cat)
    && (!txt || (t.titre + ' ' + t.notes).toLowerCase().includes(txt)));
  const rangPrio = { haute: 0, normale: 1, basse: 2 };
  l.sort(st === 'faites' ? (x, y) => (y.faiteLe || '').localeCompare(x.faiteLe || '')
    : (x, y) => (x.echeance || '9999').localeCompare(y.echeance || '9999') || rangPrio[x.priorite] - rangPrio[y.priorite]);
  $('#liste-taches').innerHTML = l.length ? l.map(t => ligneTache(t)).join('') : '<li class="vide">Aucune tâche.</li>';
}

/* ---------- CALENDRIER ---------- */
let moisAffiche = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();
let jourChoisi = auj();

function rendreCalendrier() {
  $('#cal-titre').textContent = moisAffiche.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const debut = new Date(moisAffiche); debut.setDate(1 - ((debut.getDay() + 6) % 7)); // lundi
  const a = auj();
  let html = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(debut); d.setDate(debut.getDate() + i);
    const s = iso(d);
    if (i === 35 && d.getMonth() !== moisAffiche.getMonth()) break;
    const evts = D.taches.filter(t => t.echeance === s || (t.faite && !t.echeance && t.faiteLe === s));
    const h = faitesLe(s), n = habitudesDuJour(s).length;
    html += `<button class="cal-jour ${d.getMonth() !== moisAffiche.getMonth() ? 'hors' : ''} ${s === a ? 'auj' : ''} ${s === jourChoisi ? 'choisi' : ''}" data-jour="${s}">
      <span class="num">${d.getDate()}</span>
      ${evts.slice(0, 3).map(t => `<span class="evt ${t.faite ? 'fait' : ''}">${esc(t.titre)}</span>`).join('')}
      ${evts.length > 3 ? `<span class="evt">+${evts.length - 3} autre(s)</span>` : ''}
      ${s <= a && n ? `<span class="mini" title="Routine : ${h}/${n}"><div style="width:${Math.min(100, h / n * 100)}%"></div></span>` : ''}
    </button>`;
  }
  $('#cal-grille').innerHTML = html;
  rendreDetailJour();
}

function rendreDetailJour() {
  const s = jourChoisi, j = D.journal[s] || { habitudes: [], focus: 0 };
  const prevues = D.taches.filter(t => t.echeance === s);
  const finies = D.taches.filter(t => t.faite && t.faiteLe === s && t.echeance !== s);
  $('#cal-detail').innerHTML = `<h2>${esc(majuscule(fmtJour(s)))}</h2>
    <p class="discret">Routine : ${faitesLe(s)}/${habitudesDuJour(s).length} · concentration : ${j.focus || 0} min</p>
    ${Object.keys(j.notes || {}).length ? `<h2 style="margin-top:14px">Notes du jour</h2><ul class="liste notes-jour">${Object.entries(j.notes).map(([id, txt]) =>
      `<li><span class="titre"><b>${esc(D.habitudes.find(h => h.id === id)?.titre || 'Habitude')}</b> : ${esc(txt)}</span></li>`).join('')}</ul>` : ''}
    <h2 style="margin-top:14px">Prévu</h2>
    <ul class="liste">${prevues.length ? prevues.map(t => ligneTache(t, { date: false })).join('') : '<li class="vide">Rien de prévu.</li>'}</ul>
    ${finies.length ? `<h2 style="margin-top:14px">Terminé ce jour-là</h2><ul class="liste">${finies.map(t => ligneTache(t)).join('')}</ul>` : ''}
    <form id="cal-ajout" class="ligne" style="margin-top:12px">
      <input id="cal-ajout-titre" placeholder="Ajouter une tâche ce jour-là" required style="flex:1 1 160px">
      <button class="principal">Ajouter</button>
    </form>`;
}

/* ---------- STATISTIQUES ---------- */
let periode = 30;
const infobulle = () => $('#infobulle');

function statsJour(s) {
  const j = D.journal[s] || { habitudes: [], focus: 0 };
  const taches = D.taches.filter(t => t.faite && t.faiteLe === s).length;
  return { date: s, taches, habitudes: j.habitudes.length, focus: j.focus || 0, points: taches + j.habitudes.length };
}
const joursPeriode = (n, fin = auj()) => Array.from({ length: n }, (_, i) => ajouterJours(fin, i - n + 1));

function rendreStats() {
  $$('#stats-periode button').forEach(b => b.classList.toggle('actif', +b.dataset.jours === periode));
  const jours = joursPeriode(periode).map(statsJour);
  const avant = joursPeriode(periode, ajouterJours(auj(), -periode)).map(statsJour);
  const somme = (l, k) => l.reduce((s, x) => s + x[k], 0);
  const tauxSur = l => { const prevu = l.reduce((s, x) => s + habitudesDuJour(x.date).length, 0);
    return prevu ? Math.round(l.reduce((s, x) => s + faitesLe(x.date), 0) / prevu * 100) : 0; };
  const taux = tauxSur(jours), tauxAvant = tauxSur(avant);
  const t = somme(jours, 'taches'), tAvant = somme(avant, 'taches');
  const f = somme(jours, 'focus');
  const delta = (x, y, u = '') => x === y ? 'comme la période précédente' : (x > y ? '+' : '−') + Math.abs(x - y) + u + ' vs période précédente';
  $('#tuiles').innerHTML = [
    { val: t, lib: 'tâches terminées', delta: delta(t, tAvant) },
    { val: taux + ' %', lib: 'de la routine réalisée', delta: delta(taux, tauxAvant, ' pts') },
    { val: serie(), lib: 'jours de série en cours', delta: 'au moins la moitié de la routine' },
    { val: (f / 60).toFixed(1).replace('.', ',') + ' h', lib: 'de concentration', delta: D.sessions.filter(s => jours.some(j => j.date === s.date)).length + ' sessions' },
  ].map(x => `<div class="tuile"><div class="val">${x.val}</div><div class="lib">${x.lib}</div><div class="delta">${x.delta}</div></div>`).join('');

  graphJours(jours);
  graphBarresH('#graph-cats', D.categories.map(c => ({
    lib: c, val: D.taches.filter(x => x.faite && x.categorie === c && x.faiteLe && x.faiteLe > ajouterJours(auj(), -periode)).length,
  })).filter(x => x.val > 0).sort((a, b) => b.val - a.val), v => v, 'Aucune tâche terminée sur la période.');
  graphBarresH('#graph-habitudes', habitudesActives().map(h => {
    const prevus = jours.filter(j => prevuLe(h, j.date));
    return { lib: h.titre, val: prevus.length ? Math.round(prevus.filter(j => (D.journal[j.date]?.habitudes || []).includes(h.id)).length / prevus.length * 100) : 0 };
  }), v => v + ' %', 'Aucune habitude active.', 100);
  carteChaleur();
}

function chemin(x, y, w, h, r) {
  // barre arrondie en haut seulement, posée sur la ligne de base
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}
const arrondiHaut = m => { if (m <= 4) return 4; const p = Math.pow(10, Math.floor(Math.log10(m))); return Math.ceil(m / p * 2) / 2 * p; };

function graphJours(jours) {
  const W = 1000, H = 230, g = 34, b = 26, haut = 10;
  const max = arrondiHaut(Math.max(1, ...jours.map(j => j.points)));
  const lw = (W - g) / jours.length, bw = Math.max(2, lw - 2);
  const y = v => haut + (H - haut - b) * (1 - v / max);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Activité par jour sur ${jours.length} jours">`;
  [0, .5, 1].forEach(p => { const v = Math.round(max * p), yy = y(v);
    svg += `<line class="grille" x1="${g}" x2="${W}" y1="${yy}" y2="${yy}"/><text x="${g - 6}" y="${yy + 4}" text-anchor="end">${v}</text>`; });
  const pas = Math.ceil(jours.length / 8);
  jours.forEach((j, i) => {
    const x = g + i * lw + 1;
    if (j.points > 0) svg += `<path d="${chemin(x, y(j.points), bw, y(0) - y(j.points), 4)}" fill="var(--accent)"/>`;
    svg += `<rect x="${g + i * lw}" y="${haut}" width="${lw}" height="${H - haut - b}" fill="transparent" data-tip="${esc(majuscule(fmtJour(j.date)))}<br>${j.taches} tâche(s) · ${j.habitudes} habitude(s)<br>${j.focus} min de concentration"/>`;
    if ((jours.length - 1 - i) % pas === 0) svg += `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${fmtCourt(j.date)}</text>`;
  });
  svg += '</svg>';
  const table = `<details class="table-donnees"><summary>Voir les données</summary><table><tr><th>Jour</th><th>Tâches</th><th>Habitudes</th><th>Concentration</th></tr>${
    jours.slice().reverse().map(j => `<tr><td>${fmtCourt(j.date)}</td><td>${j.taches}</td><td>${j.habitudes}</td><td>${j.focus} min</td></tr>`).join('')}</table></details>`;
  $('#graph-jours').innerHTML = svg + table;
}

function graphBarresH(sel, lignes, fmt, vide, maxFixe) {
  if (!lignes.length) { $(sel).innerHTML = `<p class="vide">${vide}</p>`; return; }
  const W = 500, lh = 30, gl = 190, gd = 46, H = lignes.length * lh;
  const max = maxFixe || Math.max(1, ...lignes.map(l => l.val));
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img">`;
  lignes.forEach((l, i) => {
    const yy = i * lh, w = (W - gl - gd) * l.val / max, lib = l.lib.length > 30 ? l.lib.slice(0, 29) + '…' : l.lib;
    svg += `<text class="lib-cat" x="0" y="${yy + 19}">${esc(lib)}</text>
      <rect x="${gl}" y="${yy + 8}" width="${W - gl - gd}" height="14" rx="4" fill="var(--surface-2)"/>
      ${w > 0 ? `<rect x="${gl}" y="${yy + 8}" width="${Math.max(w, 4)}" height="14" rx="4" fill="var(--accent)"/>` : ''}
      <text class="val-cat" x="${W - gd + 8}" y="${yy + 19}">${fmt(l.val)}</text>
      <rect x="0" y="${yy}" width="${W}" height="${lh}" fill="transparent" data-tip="${esc(l.lib)} : ${fmt(l.val)}"/>`;
  });
  $(sel).innerHTML = svg + '</svg>';
}

function carteChaleur() {
  const a = auj(), fin = versDate(a);
  const lundi = new Date(fin); lundi.setDate(fin.getDate() - ((fin.getDay() + 6) % 7) - 7 * 11);
  const cases = [];
  for (let d = new Date(lundi); iso(d) <= a; d.setDate(d.getDate() + 1)) cases.push(statsJour(iso(d)));
  const niveau = p => p === 0 ? 0 : p <= 2 ? 1 : p <= 4 ? 2 : p <= 6 ? 3 : 4;
  $('#carte-chaleur').innerHTML = `<div class="chaleur">${cases.map(c =>
    `<div style="background:var(--s${niveau(c.points)})" data-tip="${esc(majuscule(fmtJour(c.date)))}<br>${c.points} point(s) d'activité"></div>`).join('')}</div>
    <div class="chaleur-legende">moins ${[0, 1, 2, 3, 4].map(n => `<div style="background:var(--s${n})"></div>`).join('')} plus
    <span style="margin-left:10px">(1 point = 1 tâche ou 1 habitude)</span></div>`;
}

/* ---------- RESSOURCES ---------- */
const lienRecherche = (r, ou) => (ou === 'yt' ? 'https://www.youtube.com/results?search_query=' : 'https://www.google.com/search?q=')
  + encodeURIComponent(r.titre + (r.domaine ? ' ' + r.domaine : ''));
const LIB_STATUT = { 'a-faire': 'À faire', 'en-cours': 'En cours', termine: 'Terminé' };

function carteRessource(r, { proposee = false } = {}) {
  const url = urlSure(r.url);
  return `<li class="ressource" data-id="${r.id || ''}">
    <h3>${esc(r.titre)}</h3>
    <div class="ligne"><span class="puce">${esc(r.domaine || 'Divers')}</span><span class="puce">${esc(r.type || 'ressource')}</span>${r.duree ? `<span class="puce">${esc(r.duree)}</span>` : ''}</div>
    ${r.pourquoi ? `<p>${esc(r.pourquoi)}</p>` : ''}
    <div class="liens">
      ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">Ouvrir</a>` : ''}
      <a href="${lienRecherche(r)}" target="_blank" rel="noopener">Rechercher</a>
      <a href="${lienRecherche(r, 'yt')}" target="_blank" rel="noopener">YouTube</a>
    </div>
    ${url && (proposee || r.source === 'ia') ? '<span class="avertissement">Lien proposé par l’IA : vérifie qu’il existe.</span>' : ''}
    <div class="ligne">${proposee
      ? `<button data-action="garder" class="principal">Garder</button><button data-action="planifier">Planifier aujourd'hui</button>`
      : `<select data-action="statut">${Object.entries(LIB_STATUT).map(([k, v]) => `<option value="${k}" ${r.statut === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
         <button data-action="planifier">Planifier aujourd'hui</button><button data-action="supprimer">×</button>`}</div>
  </li>`;
}

function rendreRessources() {
  const doms = [...new Set(D.ressources.map(r => r.domaine || 'Divers'))].sort();
  const sd = $('#r-domaine'), v = sd.value;
  sd.innerHTML = '<option value="">Tous les domaines</option>' + doms.map(d => `<option>${esc(d)}</option>`).join('');
  sd.value = v;
  const st = $('#r-statut').value;
  const l = D.ressources.filter(r => (!st || r.statut === st) && (!sd.value || (r.domaine || 'Divers') === sd.value));
  $('#liste-ressources').innerHTML = l.length ? l.map(r => carteRessource(r)).join('') : '<li class="vide">Aucune ressource.</li>';
}

function planifierRessource(r) {
  const cat = /anglais|english|langue/i.test((r.domaine || '') + r.titre) ? 'Langue' : 'Compétence';
  creerTache({ titre: 'Étudier : ' + r.titre, categorie: D.categories.includes(cat) ? cat : D.categories[0],
               echeance: auj(), notes: urlSure(r.url) || lienRecherche(r) });
}

/* ---------- CONSEILLER IA ---------- */
let derniereProposition = null;

function contexte() {
  const jours = joursPeriode(30).map(statsJour);
  const prevu = jours.reduce((s, j) => s + habitudesDuJour(j.date).length, 0);
  const parCat = D.categories.map(c => c + ' ' + D.taches.filter(t => t.faite && t.categorie === c && t.faiteLe > ajouterJours(auj(), -30)).length).join(', ');
  const parHab = habitudesActives().map(h => h.titre + ' ' + Math.round(jours.filter(j => (D.journal[j.date]?.habitudes || []).includes(h.id)).length / 30 * 100) + '%').join(' ; ');
  return `Date du jour : ${auj()}.
PROFIL :
${D.profil}

STATISTIQUES (30 derniers jours) : ${jours.reduce((s, j) => s + j.taches, 0)} tâches terminées ; routine réalisée à ${prevu ? Math.round(jours.reduce((s, j) => s + faitesLe(j.date), 0) / prevu * 100) : 0} % ; série en cours ${serie()} jours ; ${jours.reduce((s, j) => s + j.focus, 0)} min de concentration.
Tâches terminées par catégorie : ${parCat}.
Réussite par habitude : ${parHab}.
TÂCHES OUVERTES : ${D.taches.filter(t => !t.faite).slice(0, 20).map(t => t.titre + (t.echeance ? ' (' + t.echeance + ')' : '')).join(' ; ') || 'aucune'}.
RESSOURCES DÉJÀ CONNUES : ${D.ressources.map(r => r.titre).slice(0, 40).join(' ; ')}.`;
}

const CONSIGNES = {
  ressources: `Réponds UNIQUEMENT avec un objet JSON, sans texte autour :
{"conseil": "2 à 4 phrases de conseil personnalisé", "ressources": [{"titre": "...", "type": "cours|vidéo|article|exercice|certification|livre", "domaine": "...", "duree": "ex. 2 h", "url": "", "pourquoi": "une phrase : pourquoi c'est utile pour moi"}]}
Propose 5 à 8 ressources GRATUITES, connues et sérieuses, différentes de celles que je connais déjà.
Mets une URL seulement si tu es certain qu'elle existe (page d'accueil officielle de préférence) ; sinon laisse "url" vide.`,
  plan: `Réponds UNIQUEMENT avec un objet JSON, sans texte autour :
{"conseil": "2 à 4 phrases", "taches": [{"titre": "tâche concrète et courte", "categorie": "une de : CATEGORIES", "minutes": 30, "date": "AAAA-MM-JJ"}]}
Propose 8 à 15 tâches réalistes réparties sur les 7 prochains jours (dimanche léger), en tenant compte de mes statistiques et de mes tâches ouvertes. Maximum 3 h de tâches par jour.`,
  libre: 'Réponds en français, de façon concrète et bienveillante, en 200 mots maximum. Utilise des listes courtes.',
};

function extraireJson(texte) {
  try { return JSON.parse(texte); } catch (e) { /* on tente plus bas */ }
  const a = texte.indexOf('{'), b = texte.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(texte.slice(a, b + 1)); } catch (e) { /* rien */ } }
  return null;
}

async function demanderIA(question, mode) {
  const zone = $('#ia-reponse'), bouton = $('#ia-envoyer');
  bouton.disabled = true;
  zone.innerHTML = '<div class="carte chargement">Le conseiller réfléchit…</div>';
  const systeme = `Tu es un conseiller de carrière et de développement personnel, pragmatique et bienveillant. Tu t'adresses à moi en me tutoyant, en français.
${contexte()}

${CONSIGNES[mode].replace('CATEGORIES', D.categories.join(', '))}`;
  try {
    const r = await fetch('/api/ia', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: mode !== 'libre', messages: [{ role: 'system', content: systeme }, { role: 'user', content: question }] }) });
    const rep = await r.json();
    if (!r.ok) throw new Error(rep.erreur || 'erreur ' + r.status);
    afficherReponse(rep.texte, mode);
  } catch (e) {
    zone.innerHTML = `<div class="carte erreur">${esc(e.message)}</div>`;
  } finally {
    bouton.disabled = false;
  }
}

function afficherReponse(texte, mode) {
  const zone = $('#ia-reponse');
  const j = mode === 'libre' ? null : extraireJson(texte);
  if (!j) { derniereProposition = null; zone.innerHTML = `<div class="carte conseil">${esc(texte)}</div>`; return; }
  derniereProposition = { mode, ...j };
  let html = j.conseil ? `<div class="carte conseil">${esc(j.conseil)}</div>` : '';
  if (mode === 'ressources' && Array.isArray(j.ressources)) {
    derniereProposition.ressources = j.ressources.map((r, i) => ({ ...r, id: 'p' + i }));
    html += `<ul class="cartes-ressources" id="propositions">${derniereProposition.ressources.map(r => carteRessource(r, { proposee: true })).join('')}</ul>`;
  }
  if (mode === 'plan' && Array.isArray(j.taches)) {
    const ts = j.taches.filter(t => t && t.titre);
    derniereProposition.taches = ts;
    html += `<div class="carte"><h2>Tâches proposées</h2><ul class="liste">${ts.map((t, i) => `<li>
      <input type="checkbox" data-i="${i}" checked aria-label="Garder">
      <span class="titre">${esc(t.titre)}</span><span class="puce">${esc(t.categorie || '')}</span>
      <span class="meta">${/^\d{4}-\d{2}-\d{2}$/.test(t.date || '') ? fmtCourt(t.date) : ''}${t.minutes ? ' · ' + t.minutes + ' min' : ''}</span></li>`).join('')}</ul>
      <button id="ajouter-plan" class="principal" style="margin-top:10px">Ajouter les tâches cochées</button></div>`;
  }
  zone.innerHTML = html || `<div class="carte conseil">${esc(texte)}</div>`;
}

/* ---------- RÉGLAGES ---------- */
let configIA = null;
async function chargerConfig() {
  try { configIA = await (await fetch('/api/config')).json(); } catch (e) { return; }
  $('#c-fournisseur').innerHTML = Object.entries(configIA.fournisseurs).map(([k, v]) => `<option value="${k}">${esc(v.nom)}</option>`).join('');
  $('#c-fournisseur').value = configIA.fournisseur;
  $('#c-modele').value = configIA.modele;
  majEtatCle();
}
function majEtatCle() {
  const f = configIA.fournisseurs[$('#c-fournisseur').value];
  $('#c-cle').disabled = !f.cle;
  $('#c-etat').textContent = !f.cle ? 'Pas de clé nécessaire : installe Ollama et lance « ollama pull ' + f.modele + ' ».'
    : ($('#c-fournisseur').value === configIA.fournisseur && configIA.cleEnregistree ? 'Clé enregistrée.' : 'Aucune clé enregistrée pour ce fournisseur.');
}

function rendreReglages() {
  $('#profil').value = D.profil || '';
  $('#liste-habitudes-reglages').innerHTML = D.habitudes.map((h, i) => `<li data-h="${h.id}" class="${h.actif ? '' : 'inactive'}">
    <input type="checkbox" data-action="actif" ${h.actif ? 'checked' : ''} title="${h.actif ? 'Active' : 'Inactive : coche pour l’ajouter à ta routine'}">
    <span class="titre">${esc(h.titre)}
      <span class="meta">${[h.type === 'compteur' ? 'objectif ' + h.objectif : '', h.minutes ? h.minutes + ' min' : '',
        h.jours.length ? h.jours.map(n => NOMS_JOURS[n - 1]).join(', ') : 'tous les jours',
        h.themes.length ? h.themes.length + ' thèmes' : ''].filter(Boolean).join(' · ')}</span></span>
    <span class="puce">${esc(h.categorie)}</span>
    <span class="actions">
      <button data-action="monter-h" title="Monter" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button data-action="descendre-h" title="Descendre" ${i === D.habitudes.length - 1 ? 'disabled' : ''}>↓</button>
      <button data-action="modifier-h">Modifier</button>
      <button data-action="suppr-h" title="Supprimer">×</button>
    </span></li>`).join('') || '<li class="vide">Aucune habitude.</li>';
  const p = D.prefs;
  $('#p-prenom').value = p.prenom || '';
  $('#p-theme').value = p.theme; $('#p-fleurs').checked = p.fleurs;
  $$('#p-accents button').forEach(b => b.classList.toggle('actif', b.dataset.accent === p.accent));
  $('#liste-categories').innerHTML = D.categories.map((c, i) => `<li data-c="${esc(c)}"><span class="titre">${esc(c)}</span>
    <span class="meta">${D.taches.filter(t => t.categorie === c).length} tâche(s) · ${D.habitudes.filter(h => h.categorie === c).length} habitude(s)</span>
    <span class="actions">
      <button data-action="monter-c" title="Monter" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button data-action="descendre-c" title="Descendre" ${i === D.categories.length - 1 ? 'disabled' : ''}>↓</button>
      <button data-action="renommer-c" title="Renommer">Renommer</button>
      <button data-action="suppr-c" title="Supprimer">×</button>
    </span></li>`).join('');
}

/* ---------- événements ---------- */
function brancher() {
  $$('.onglets button').forEach(b => b.addEventListener('click', () => afficherVue(b.dataset.vue)));
  ['#liste-jour', '#liste-taches', '#cal-detail'].forEach(s => $(s).addEventListener('click', actionTache));

  $('#liste-habitudes').addEventListener('click', e => {
    const b = e.target.closest('[data-action]'); if (!b) return;
    const li = b.closest('[data-h]'), h = D.habitudes.find(x => x.id === li.dataset.h), j = jour(auj()), a = b.dataset.action;
    if (a === 'cocher-h') marquer(j, h, b.checked);
    else if (a === 'plus' || a === 'moins') {
      j.compteurs = j.compteurs || {};
      const n = Math.max(0, (j.compteurs[h.id] || 0) + (a === 'plus' ? 1 : -1));
      j.compteurs[h.id] = n; marquer(j, h, n >= h.objectif);
    } else if (a === 'note') { const i = li.querySelector('.note'); i.hidden = !i.hidden; if (!i.hidden) i.focus(); return; }
    else return;
    sauver(); rendreAujourdhui();
  });
  $('#liste-habitudes').addEventListener('change', e => {
    if (e.target.dataset.action !== 'note-texte') return;
    const id = e.target.closest('[data-h]').dataset.h, j = jour(auj()), v = e.target.value.trim();
    j.notes = j.notes || {};
    if (v) j.notes[id] = v; else delete j.notes[id];
    sauver(); rendreAujourdhui();
  });
  $('#ajout-rapide').addEventListener('submit', e => {
    e.preventDefault();
    creerTache({ titre: $('#ajout-rapide-titre').value.trim(), categorie: $('#ajout-rapide-cat').value, echeance: auj() });
    $('#ajout-rapide-titre').value = ''; sauver(); rendreAujourdhui();
  });
  $('#minuteur-duree').addEventListener('change', () => { if (!minuteur) $('#affichage-minuteur').textContent = pad($('#minuteur-duree').value) + ':00'; });
  $('#minuteur-lancer').addEventListener('click', () => {
    if (minuteur) return;
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    const duree = +$('#minuteur-duree').value;
    minuteur = { duree, debut: Date.now(), fin: Date.now() + duree * 60000, tacheId: $('#minuteur-tache').value, intervalle: setInterval(majMinuteur, 500) };
    $('#minuteur-lancer').disabled = true; majMinuteur();
  });
  $('#minuteur-arreter').addEventListener('click', () => { if (minuteur) terminerMinuteur((Date.now() - minuteur.debut) / 60000, false); });

  $('#form-tache').addEventListener('submit', e => {
    e.preventDefault();
    creerTache({ titre: $('#t-titre').value.trim(), categorie: $('#t-cat').value, priorite: $('#t-prio').value,
                 echeance: $('#t-date').value || null, minutes: +$('#t-min').value || null, notes: $('#t-notes').value.trim() });
    $('#t-titre').value = $('#t-notes').value = $('#t-min').value = ''; sauver(); rendreTaches();
  });
  ['#f-statut', '#f-cat'].forEach(s => $(s).addEventListener('change', rendreTaches));
  $('#f-texte').addEventListener('input', rendreTaches);

  $('#cal-prec').addEventListener('click', () => { moisAffiche.setMonth(moisAffiche.getMonth() - 1); rendreCalendrier(); });
  $('#cal-suiv').addEventListener('click', () => { moisAffiche.setMonth(moisAffiche.getMonth() + 1); rendreCalendrier(); });
  $('#cal-auj').addEventListener('click', () => { const d = new Date(); moisAffiche = new Date(d.getFullYear(), d.getMonth(), 1); jourChoisi = auj(); rendreCalendrier(); });
  $('#cal-grille').addEventListener('click', e => { const b = e.target.closest('[data-jour]'); if (b) { jourChoisi = b.dataset.jour; rendreCalendrier(); } });
  $('#cal-detail').addEventListener('submit', e => {
    if (e.target.id !== 'cal-ajout') return;
    e.preventDefault();
    creerTache({ titre: $('#cal-ajout-titre').value.trim(), echeance: jourChoisi });
    sauver(); rendreCalendrier();
  });

  $('#stats-periode').addEventListener('click', e => { const b = e.target.closest('[data-jours]'); if (b) { periode = +b.dataset.jours; rendreStats(); } });
  $('#vue-stats').addEventListener('mousemove', e => {
    const c = e.target.closest('[data-tip]'), ib = infobulle();
    if (!c) { ib.hidden = true; return; }
    ib.innerHTML = c.dataset.tip; ib.hidden = false;
    const x = Math.min(e.clientX + 14, innerWidth - ib.offsetWidth - 8);
    ib.style.left = x + 'px'; ib.style.top = (e.clientY + 14) + 'px';
  });
  $('#vue-stats').addEventListener('mouseleave', () => { infobulle().hidden = true; });

  ['#r-statut', '#r-domaine'].forEach(s => $(s).addEventListener('change', rendreRessources));
  $('#liste-ressources').addEventListener('change', e => {
    if (e.target.dataset.action !== 'statut') return;
    const r = D.ressources.find(x => x.id === e.target.closest('[data-id]').dataset.id);
    r.statut = e.target.value; sauver(); rendreRessources();
  });
  $('#liste-ressources').addEventListener('click', e => {
    const b = e.target.closest('button[data-action]'); if (!b) return;
    const r = D.ressources.find(x => x.id === b.closest('[data-id]').dataset.id); if (!r) return;
    if (b.dataset.action === 'supprimer' && confirm('Supprimer « ' + r.titre + ' » ?')) D.ressources = D.ressources.filter(x => x !== r);
    if (b.dataset.action === 'planifier') { planifierRessource(r); if (r.statut === 'a-faire') r.statut = 'en-cours'; b.textContent = 'Planifié ✓'; }
    sauver(); if (b.dataset.action === 'supprimer') rendreRessources();
  });
  $('#form-ressource').addEventListener('submit', e => {
    e.preventDefault();
    D.ressources.unshift({ id: nouvelId(), titre: $('#r-titre').value.trim(), url: $('#r-url').value.trim(), domaine: $('#r-dom').value.trim(),
                           type: $('#r-type').value, statut: 'a-faire', source: 'moi' });
    e.target.reset(); sauver(); rendreRessources();
  });

  const RACCOURCIS = {
    domaine: ['ressources', 'Cours et ressources pour apprendre le métier : '],
    entretien: ['ressources', 'Je prépare un entretien chez [entreprise] pour le poste de [poste]. Que dois-je apprendre ?'],
    plan: ['plan', 'Planifie ma semaine prochaine selon mes priorités de recherche d’emploi et mes statistiques.'],
    bilan: ['libre', 'Fais le bilan de ma productivité des 30 derniers jours et donne-moi 3 conseils concrets.'],
  };
  $$('[data-raccourci]').forEach(b => b.addEventListener('click', () => {
    const [mode, texte] = RACCOURCIS[b.dataset.raccourci];
    $('#ia-mode').value = mode; $('#ia-question').value = texte; $('#ia-question').focus();
  }));
  $('#form-ia').addEventListener('submit', e => { e.preventDefault(); demanderIA($('#ia-question').value.trim(), $('#ia-mode').value); });
  $('#ia-reponse').addEventListener('click', e => {
    const p = derniereProposition; if (!p) return;
    if (e.target.id === 'ajouter-plan') {
      let n = 0;
      $$('#ia-reponse input[data-i]').forEach(c => {
        if (!c.checked) return;
        const t = p.taches[+c.dataset.i];
        creerTache({ titre: String(t.titre).slice(0, 200), categorie: D.categories.includes(t.categorie) ? t.categorie : D.categories[0],
                     minutes: +t.minutes || null, echeance: /^\d{4}-\d{2}-\d{2}$/.test(t.date || '') ? t.date : null });
        n++;
      });
      sauver(); e.target.textContent = n + ' tâche(s) ajoutée(s) ✓'; e.target.disabled = true;
      return;
    }
    const b = e.target.closest('button[data-action]'); if (!b) return;
    const r = p.ressources?.find(x => x.id === b.closest('[data-id]').dataset.id); if (!r) return;
    const copie = { titre: String(r.titre || '').slice(0, 200), url: urlSure(r.url), type: r.type, domaine: r.domaine, duree: r.duree,
                    pourquoi: r.pourquoi, id: nouvelId(), statut: 'a-faire', source: 'ia' };
    if (b.dataset.action === 'garder') { D.ressources.unshift(copie); b.textContent = 'Gardée ✓'; b.disabled = true; }
    if (b.dataset.action === 'planifier') { D.ressources.unshift({ ...copie, statut: 'en-cours' }); planifierRessource(copie); b.textContent = 'Planifiée ✓'; b.disabled = true; }
    sauver();
  });

  $('#c-fournisseur').addEventListener('change', () => { $('#c-modele').value = configIA.fournisseurs[$('#c-fournisseur').value].modele; majEtatCle(); });
  $('#form-ia-config').addEventListener('submit', async e => {
    e.preventDefault();
    const r = await fetch('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fournisseur: $('#c-fournisseur').value, modele: $('#c-modele').value, cle: $('#c-cle').value }) });
    configIA = await r.json(); $('#c-cle').value = ''; majEtatCle();
    $('#c-etat').textContent += ' Réglages enregistrés.';
  });
  $('#c-effacer').addEventListener('click', async () => {
    const r = await fetch('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fournisseur: $('#c-fournisseur').value, modele: $('#c-modele').value, effacerCle: true }) });
    configIA = await r.json(); majEtatCle();
  });
  $('#c-tester').addEventListener('click', async () => {
    $('#c-etat').textContent = 'Test en cours…';
    try {
      const r = await fetch('/api/ia', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Réponds seulement : OK' }] }) });
      const rep = await r.json();
      $('#c-etat').textContent = r.ok ? 'Connexion réussie : « ' + rep.texte.trim().slice(0, 60) + ' »' : rep.erreur;
    } catch (e) { $('#c-etat').textContent = 'Le serveur ne répond pas.'; }
  });
  $('#profil-enregistrer').addEventListener('click', () => { D.profil = $('#profil').value; sauver(); });

  let habitudeEnCours = null; // id de l'habitude en cours de modification
  const viderFormHabitude = () => {
    habitudeEnCours = null; $('#form-habitude').reset(); $('#h-objectif').value = 2; majFormHabitude();
    $$('#h-jours input').forEach(c => { c.checked = false; });
    $('#h-valider').textContent = 'Ajouter'; $('#h-annuler').hidden = true;
  };
  const majFormHabitude = () => { $('#h-objectif-label').hidden = $('#h-type').value !== 'compteur'; };
  $('#h-type').addEventListener('change', majFormHabitude);
  $('#h-annuler').addEventListener('click', viderFormHabitude);
  $('#liste-habitudes-reglages').addEventListener('click', e => {
    const b = e.target.closest('[data-action]'); if (!b) return;
    const h = D.habitudes.find(x => x.id === b.closest('[data-h]').dataset.h), i = D.habitudes.indexOf(h), a = b.dataset.action;
    if (a === 'actif') h.actif = b.checked;
    if (a === 'monter-h' || a === 'descendre-h') {
      const k = a === 'monter-h' ? i - 1 : i + 1;
      if (k >= 0 && k < D.habitudes.length) [D.habitudes[i], D.habitudes[k]] = [D.habitudes[k], D.habitudes[i]];
    }
    if (a === 'modifier-h') {
      habitudeEnCours = h.id;
      $('#h-titre').value = h.titre; $('#h-cat').value = h.categorie; $('#h-min').value = h.minutes || '';
      $('#h-type').value = h.type; $('#h-objectif').value = h.objectif; $('#h-themes').value = h.themes.join(', ');
      $$('#h-jours input').forEach(c => { c.checked = h.jours.includes(+c.value); });
      majFormHabitude(); $('#h-valider').textContent = 'Enregistrer'; $('#h-annuler').hidden = false;
      $('#form-habitude').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#h-titre').focus();
      return;
    }
    if (a === 'suppr-h' && confirm('Supprimer l’habitude « ' + h.titre + ' » ? Les jours passés restent dans les statistiques d’activité.')) D.habitudes = D.habitudes.filter(x => x !== h);
    sauver(); rendreReglages();
  });
  $('#form-habitude').addEventListener('submit', e => {
    e.preventDefault();
    const champs = {
      titre: $('#h-titre').value.trim(), categorie: $('#h-cat').value, minutes: +$('#h-min').value || null,
      type: $('#h-type').value, objectif: Math.max(1, +$('#h-objectif').value || 1),
      themes: $('#h-themes').value.split(',').map(x => x.trim()).filter(Boolean),
      jours: $$('#h-jours input').filter(c => c.checked).map(c => +c.value),
    };
    if (champs.type === 'case') champs.objectif = 1;
    const h = D.habitudes.find(x => x.id === habitudeEnCours);
    if (h) Object.assign(h, champs); else D.habitudes.push({ id: nouvelId(), actif: true, ...champs });
    viderFormHabitude(); remplirCategories(); sauver(); rendreReglages();
  });
  majFormHabitude();
  // personnalisation
  const majPrefs = () => { appliquerPrefs(); sauver(); };
  $('#p-prenom').addEventListener('change', e => { D.prefs.prenom = e.target.value.trim(); majPrefs(); });
  $('#p-theme').addEventListener('change', e => { D.prefs.theme = e.target.value; majPrefs(); });
  $('#p-fleurs').addEventListener('change', e => { D.prefs.fleurs = e.target.checked; majPrefs(); });
  $('#p-accents').addEventListener('click', e => {
    const b = e.target.closest('[data-accent]'); if (!b) return;
    D.prefs.accent = b.dataset.accent; majPrefs(); rendreReglages();
  });
  $('#form-categorie').addEventListener('submit', e => {
    e.preventDefault();
    const c = $('#cat-nom').value.trim();
    if (c && !D.categories.includes(c)) D.categories.push(c);
    e.target.reset(); remplirCategories(); sauver(); rendreReglages();
  });
  $('#liste-categories').addEventListener('click', e => {
    const b = e.target.closest('button[data-action]'); if (!b) return;
    const c = b.closest('[data-c]').dataset.c, i = D.categories.indexOf(c), a = b.dataset.action;
    if (a === 'monter-c' || a === 'descendre-c') {
      const j = a === 'monter-c' ? i - 1 : i + 1;
      if (j < 0 || j >= D.categories.length) return;
      [D.categories[i], D.categories[j]] = [D.categories[j], D.categories[i]];
    }
    if (a === 'renommer-c') {
      const nom = (prompt('Nouveau nom de la catégorie', c) || '').trim();
      if (!nom || nom === c) return;
      if (D.categories.includes(nom) && !confirm('« ' + nom + ' » existe déjà : fusionner les deux catégories ?')) return;
      D.categories = D.categories.includes(nom) ? D.categories.filter(x => x !== c) : D.categories.map(x => x === c ? nom : x);
      D.taches.forEach(t => { if (t.categorie === c) t.categorie = nom; });
      D.habitudes.forEach(h => { if (h.categorie === c) h.categorie = nom; });
    }
    if (a === 'suppr-c') {
      if (D.categories.length === 1) return alert('Il faut garder au moins une catégorie.');
      const n = D.taches.filter(t => t.categorie === c).length + D.habitudes.filter(h => h.categorie === c).length;
      const vers = D.categories.find(x => x !== c);
      if (!confirm('Supprimer la catégorie « ' + c + ' » ?' + (n ? ' Ses ' + n + ' tâche(s) et habitude(s) passeront dans « ' + vers + ' ».' : ''))) return;
      D.taches.forEach(t => { if (t.categorie === c) t.categorie = vers; });
      D.habitudes.forEach(h => { if (h.categorie === c) h.categorie = vers; });
      D.categories = D.categories.filter(x => x !== c);
    }
    remplirCategories(); sauver(); rendreReglages();
  });
  $('#exporter').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(D, null, 2)], { type: 'application/json' }));
    a.download = 'growth-hub-' + auj() + '.json'; a.click(); URL.revokeObjectURL(a.href);
  });
  $('#importer').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!Array.isArray(d.taches)) throw new Error('fichier non reconnu');
      if (!confirm('Remplacer toutes les données actuelles par ce fichier ?')) return;
      D = completer(d); remplirCategories(); sauver(); rendre();
    } catch (err) { alert('Import impossible : ' + err.message); }
    e.target.value = '';
  });

  // changement de jour pendant que l'app reste ouverte
  let dernierJour = auj();
  setInterval(() => { if (auj() !== dernierJour) { dernierJour = auj(); rendre(); } }, 60000);
}

function completer(d) {
  const base = donneesParDefaut();
  for (const k of Object.keys(base)) if (d[k] === undefined && k !== 'routineVersion') d[k] = base[k];
  return migrer(d);
}

/* ---------- démarrage ---------- */
(async function demarrer() {
  try {
    const d = await (await fetch('/api/donnees')).json();
    D = d ? completer(d) : donneesParDefaut();
    if (!d || aMigrer) sauver();
  } catch (e) {
    document.body.innerHTML = '<main><div class="carte erreur">Le serveur local ne répond pas. Lance « python3 serveur.py » puis recharge la page.</div></main>';
    return;
  }
  remplirCategories();
  appliquerPrefs();
  brancher();
  chargerConfig();
  let v = 'aujourdhui';
  try { v = localStorage.getItem('gh-vue') || v; } catch (e) { /* stockage indisponible */ }
  afficherVue($('#vue-' + v) ? v : 'aujourdhui');
})();
