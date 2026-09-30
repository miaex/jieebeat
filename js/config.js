'use strict';
/* ===== CONFIG (toutes les valeurs ajustables) ===== */
const CFG={
 lanes:4, approach:1.7, hitYRatio:.8, leadIn:2.0,
 windows:{PERFECT:.07,GREAT:.12,GOOD:.2},
 points:{PERFECT:300,GREAT:200,GOOD:100}, accWeight:{PERFECT:1,GREAT:.8,GOOD:.5},
 multiplierEvery:10, multiplierMax:4, feverCombo:40,
 holdReleaseTolerance:.25,
 stars:[0,.85,.92,.97,.99], mastery:['discover','initiate','confirmed','expert','master'],
 modes:{normal:{failOnMiss:true,rate:1},practice:{failOnMiss:false,rate:.75,ranked:false}},
 chapterUnlockStars:4, chapterNames:['AWAKENING','PULSE','RUSH','AFTER DARK','JIEE'],
 coinsPerStar:10,
 storeKey:'jieebeat.save', schemaVersion:1
};
