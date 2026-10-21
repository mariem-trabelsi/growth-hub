// Bibliothèque de départ : ressources gratuites, triées par domaine.
// Chaque ressource s'ajoute à « Mes ressources » d'un clic ; l'IA en propose d'autres.
window.RESSOURCES_DE_BASE = [
  { titre: 'SQLBolt — leçons SQL interactives', url: 'https://sqlbolt.com', type: 'exercice', domaine: 'SQL', duree: '3 h', pourquoi: 'Les bases (SELECT, JOIN, GROUP BY) avec un exercice par leçon.' },
  { titre: 'HackerRank — parcours SQL', url: 'https://www.hackerrank.com/domains/sql', type: 'exercice', domaine: 'SQL', duree: '15 min / jour', pourquoi: 'Des exercices notés, du facile au difficile : idéal au quotidien.' },
  { titre: 'ISTQB — Certified Tester Foundation Level', url: 'https://www.istqb.org/certifications/certified-tester-foundation-level', type: 'certification', domaine: 'Tests et QA', duree: '20 h', pourquoi: 'Le syllabus gratuit de la certification QA la plus demandée.' },
  { titre: 'Postman Academy', url: 'https://academy.postman.com', type: 'cours', domaine: 'Tests et QA', duree: '4 h', pourquoi: 'Tester des API, écrire des tests et des collections.' },
  { titre: 'Camunda Academy', url: 'https://academy.camunda.com', type: 'cours', domaine: 'BPMN et processus', duree: '6 h', pourquoi: 'BPMN et DMN par l’éditeur de Camunda, avec badges gratuits.' },
  { titre: 'IIBA — le guide BABOK', url: 'https://www.iiba.org/career-resources/a-business-analysis-professionals-foundation-for-success/babok/', type: 'article', domaine: 'Business analysis', duree: 'référence', pourquoi: 'Le référentiel du métier de Business Analyst.' },
  { titre: 'Scrum Guide (français)', url: 'https://scrumguides.org/', type: 'article', domaine: 'Agile', duree: '1 h', pourquoi: 'Le texte officiel de Scrum, court : à connaître par cœur.' },
  { titre: 'LeetCode — problèmes faciles', url: 'https://leetcode.com/problemset/', type: 'exercice', domaine: 'Algorithmes', duree: '30 min / jour', pourquoi: 'Garder la main pour les tests techniques.' },
  { titre: 'BBC Learning English', url: 'https://www.bbc.co.uk/learningenglish', type: 'cours', domaine: 'Anglais', duree: '15 min / jour', pourquoi: 'Leçons courtes, audio et vidéo, par niveau.' },
  { titre: 'Microsoft Learn — Excel', url: 'https://learn.microsoft.com/training/', type: 'cours', domaine: 'Bureautique', duree: '3 h', pourquoi: 'Formules, tableaux croisés et graphiques.' },
  { titre: 'DSN — Déclaration sociale nominative', url: '', type: 'article', domaine: 'Paie et SIRH', duree: '1 h', pourquoi: 'Comprendre la DSN avant un entretien chez Sopra HR ou ADP.' },
  { titre: 'Lutte anti-blanchiment (AML, KYC, TBML)', url: '', type: 'article', domaine: 'Finance et conformité', duree: '1 h', pourquoi: 'Le vocabulaire de base avant un entretien chez Vneuron.' },
  { titre: 'Cycle de vie du financement automobile', url: '', type: 'vidéo', domaine: 'Finance et conformité', duree: '1 h', pourquoi: 'Origination, financement, recouvrement : pour Teamwill (Alfa).' },
  { titre: 'Fibre FTTH : architecture et déploiement', url: '', type: 'vidéo', domaine: 'Télécom', duree: '1 h', pourquoi: 'PM, PBO, PTO, GraceTHD : pour Amaris et les opérateurs.' },
];
