(() => {
  const layoutStyle = document.createElement('style');
  layoutStyle.textContent = `
    .guide-layout{
      grid-template-columns:minmax(185px,220px) minmax(0,1fr);
      gap:clamp(1.75rem,4vw,4rem);
      width:min(calc(100% - 2rem),var(--shell));
      margin-inline:auto;
    }
    .guide-content{
      width:100%;
      max-width:940px;
    }
    .guide-layout>.guide-content:only-child{
      grid-column:1/-1;
      width:min(100%,960px);
      max-width:960px;
      margin-inline:auto;
    }
    .prose>p,.prose>ul,.prose>ol,.prose>blockquote{
      max-width:82ch;
    }
    .prose>.table-wrap,.prose>.subregion-section,.prose>.related-links{
      max-width:100%;
    }
    @media(max-width:900px){
      .guide-layout{grid-template-columns:1fr}
      .guide-content{max-width:100%;margin-inline:auto}
      .prose>p,.prose>ul,.prose>ol,.prose>blockquote{max-width:100%}
    }
  `;
  document.head.appendChild(layoutStyle);

  const search = document.querySelector('#glossary-search');
  if (search) {
    const entries = [...document.querySelectorAll('.glossary-entry')];
    const count = document.querySelector('#glossary-count');
    const update = () => {
      const q = search.value.trim().toLowerCase();
      let shown = 0;
      entries.forEach((el) => {
        const hay = `${el.dataset.term || ''} ${el.textContent}`.toLowerCase();
        const visible = !q || hay.includes(q);
        el.hidden = !visible;
        if (visible) shown++;
      });
      if (count) count.textContent = `${shown} ${shown === 1 ? 'entry' : 'entries'}`;
    };
    search.addEventListener('input', update);
    update();
  }
})();
