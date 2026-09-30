'use strict';
/* ===== I18N ===== */
const I18N={
fr:{play:'JOUER',songs:'Parcours',settings:'Paramètres',back:'Retour',retry:'REJOUER',menu:'Menu',tap:'Touche pour démarrer',
 over:'RUN TERMINÉE',done:'MORCEAU RÉUSSI',score:'Score',acc:'Précision',combo:'Combo max',best:'Record',newrec:'NOUVEAU RECORD',
 unlocked:'NOUVEAU MORCEAU DÉBLOQUÉ',locked:'Terminez « {s} » pour débloquer',left:'Tu étais à {n} s de la fin.',coins:'JIEE Coins',
 streak:'jours de série',music:'Musique',sfx:'Effets',offset:'Décalage audio (ms)',reduce:'Réduire les animations',vib:'Vibration',lang:'Langue',
 reset:'Réinitialiser les données',resetq:'Effacer toute la progression ?',resume:'Reprendre',paused:'PAUSE',dur:'Durée',
 discover:'Découverte',initiate:'Initié',confirmed:'Confirmé',expert:'Expert',master:'Maître',diff:'Difficulté',original:'JIEE ORIGINAL',
 err:'Impossible de charger ce morceau.',calib:'Calibration',calibmsg:'Appuie lorsque tu entends la pulsation.',calibres:'Décalage mesuré : {n} ms',again:'Refaire',challenges:'Défis du jour',collection:'Collection',equip:'Équiper',short:'Pas assez',loading:'Chargement…',chapter:'CHAPITRE',chaplock:'Obtiens {n} étoiles dans le chapitre {c} pour débloquer.',chapunlocked:'NOUVEAU CHAPITRE DÉBLOQUÉ',stats:'Statistiques',ach:'Succès',achnew:'SUCCÈS DÉBLOQUÉ',played:'Parties',cleared:'Réussies',notes:'Notes jouées',tstars:'Étoiles',ptime:'Temps de jeu (min)',practice:'ENTRAÎNEMENT',normal:'Normal',trainmode:'Entraînement ×0,75',testmode:'Mode test : tout débloquer',dlall:'Télécharger hors-ligne',bpm:'BPM',chdone:'Défis réussis',tabhome:'Accueil',tabchal:'Défis',tabcol:'Collection',tabset:'Réglages',mult:'Multiplicateur'},
en:{play:'PLAY',songs:'Journey',settings:'Settings',back:'Back',retry:'RETRY',menu:'Menu',tap:'Touch to start',
 over:'RUN OVER',done:'SONG CLEARED',score:'Score',acc:'Accuracy',combo:'Max combo',best:'Best',newrec:'NEW RECORD',
 unlocked:'NEW SONG UNLOCKED',locked:'Clear "{s}" to unlock',left:'You were {n}s from the end.',coins:'JIEE Coins',
 streak:'day streak',music:'Music',sfx:'Effects',offset:'Audio offset (ms)',reduce:'Reduce motion',vib:'Vibration',lang:'Language',
 reset:'Reset local data',resetq:'Erase all progress?',resume:'Resume',paused:'PAUSED',dur:'Length',
 discover:'Discovery',initiate:'Initiate',confirmed:'Confirmed',expert:'Expert',master:'Master',diff:'Difficulty',original:'JIEE ORIGINAL',
 err:'This song could not be loaded.',calib:'Calibration',calibmsg:'Tap when you hear the pulse.',calibres:'Measured offset: {n} ms',again:'Retry',challenges:'Daily challenges',collection:'Collection',equip:'Equip',short:'Not enough',loading:'Loading…',chapter:'CHAPTER',chaplock:'Get {n} stars in chapter {c} to unlock.',chapunlocked:'NEW CHAPTER UNLOCKED',stats:'Statistics',ach:'Achievements',achnew:'ACHIEVEMENT UNLOCKED',played:'Runs',cleared:'Cleared',notes:'Notes hit',tstars:'Stars',ptime:'Play time (min)',practice:'PRACTICE',normal:'Normal',trainmode:'Practice ×0.75',testmode:'Test mode: unlock everything',dlall:'Download offline',bpm:'BPM',chdone:'Challenges done',tabhome:'Home',tabchal:'Challenges',tabcol:'Collection',tabset:'Settings',mult:'Multiplier'}};
let lang='fr';const T=(k,v={})=>(I18N[lang][k]||k).replace(/\{(\w+)\}/g,(_,x)=>v[x]);
