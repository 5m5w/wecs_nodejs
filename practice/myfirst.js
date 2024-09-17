function score( dice ) {
  let score = 0
  let counts = {
    1:0,
    2:0,
    3:0,
    4:0,
    5:0,
    6:0
  }
  
for(let i=0; i<dice.length; i++){
  counts[dice[i]]++;
  console.log(counts);
}
  
for(let i=0; i<dice.length; i++){
  if(dice[i] === 1){
    score += 100;
  }else if(dice[i] === 5){
    score+=50;
  }
}

if(counts[1] >= 3){
  score+=1000-300;
}
    
for(let i=2; i<=6; i++){
  if(counts[i] >= 3){
    score = score + i * 100;
}
    return score;
}
if(counts[5] >= 3){
  score-=150;
}
}
console.log(score([5, 5, 5, 3, 3]));