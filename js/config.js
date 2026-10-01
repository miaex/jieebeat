'use strict';
/* ===== CONFIG (toutes les valeurs ajustables) ===== */
const DEV=new URLSearchParams(location.search).has('dev');/* ?dev dans l'URL : tout débloquer (tests uniquement) */
const CFG={
 lanes:4, approach:1.7, hitYRatio:.8, leadIn:2.0,
 windows:{PERFECT:.07,GREAT:.12,GOOD:.2},
 points:{PERFECT:300,GREAT:200,GOOD:100}, accWeight:{PERFECT:1,GREAT:.8,GOOD:.5},
 multiplierEvery:10, multiplierMax:4, feverCombo:40,
 holdReleaseTolerance:.25,
 goalSec:90, speedRef:39, speedStart:22, speedLast:36, rampStart:1.7, rampLast:2.3, minApproach:.62,/* chute: 39/vitesse = secondes ; la vitesse monte de morceau en morceau */
 starRules:{minSec:30,acc3:.75,acc4:.88,bonus4:45,acc5:.92}, mastery:['discover','initiate','confirmed','expert','master'],
 modes:{normal:{failOnMiss:true,rate:1},practice:{failOnMiss:false,rate:.75,ranked:false}},
 chapterUnlockStars:5,
 coinsPerStar:10,
 storeKey:'jieebeat.save', schemaVersion:2
};
