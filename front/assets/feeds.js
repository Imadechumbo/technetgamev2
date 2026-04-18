
document.querySelectorAll('.bench-col').forEach((el,i)=>{
  const val = 50 + (i*5);
  el.querySelector('.value').innerText = val+'%';
  const fill=document.createElement('div');
  fill.style.position='absolute';
  fill.style.bottom=0;
  fill.style.width='100%';
  fill.style.height=val+'%';
  fill.style.background='currentColor';
  el.querySelector('.bar').appendChild(fill);
});
