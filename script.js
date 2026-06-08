(function(){
 try{
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* burger menu */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('nav');
  if(toggle && nav){
    var closeNav = function(){
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded','false');
      toggle.setAttribute('aria-label','Открыть меню');
    };
    toggle.addEventListener('click', function(){
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
    Array.prototype.forEach.call(nav.querySelectorAll('a'), function(a){ a.addEventListener('click', closeNav); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeNav(); });
    document.addEventListener('pointerdown', function(e){
      if(nav.classList.contains('open') && !nav.contains(e.target) && !toggle.contains(e.target)) closeNav();
    });
    if(window.matchMedia){
      var desktopMq = window.matchMedia('(min-width:940px)');
      var onMq = function(e){ if(e.matches) closeNav(); };
      if(desktopMq.addEventListener) desktopMq.addEventListener('change', onMq);
      else if(desktopMq.addListener) desktopMq.addListener(onMq);
    }
  }

  /* count-up */
  function runCounter(el){
    var target = parseInt(el.getAttribute('data-count'), 10);
    if(isNaN(target)) return;
    if(reduceMotion){ el.textContent = target; return; }
    var dur = 1100, start = null;
    function step(ts){
      if(start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if(p < 1) requestAnimationFrame(step); else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  /* scroll reveal + steps connector + counters
     scroll-based (not IntersectionObserver): IO is unreliable during iOS Safari
     momentum scrolling and can leave sections invisible. This fires on every
     scroll frame + has a failsafe so content is never stuck hidden. */
  var revealEls = document.querySelectorAll('.reveal, .lfill');
  var stepsEl = document.querySelector('.steps');
  var stepEls = document.querySelectorAll('.step');
  var statsEl = document.querySelector('.stats');
  var statsDone = false;
  var stepsPlayed = false;
  var eyebrows = [].filter.call(document.querySelectorAll('.eyebrow'), function(e){ return !(e.closest && e.closest('.hero')); });
  function showEl(el){
    if(el.classList.contains('is-visible')) return;
    el.classList.add('is-visible');
    Array.prototype.forEach.call(el.querySelectorAll('[data-count]'), runCounter);
  }
  function revealInView(){
    var vh = window.innerHeight || document.documentElement.clientHeight;
    Array.prototype.forEach.call(revealEls, function(el){
      if(el.classList.contains('is-visible')) return;
      if(el.getBoundingClientRect().top < vh * 0.90) showEl(el);
    });
    // (1) lightning: charge each section eyebrow once when it enters view
    Array.prototype.forEach.call(eyebrows, function(el){
      if(!el.classList.contains('charged') && el.getBoundingClientRect().top < vh * 0.90) el.classList.add('charged');
    });
    // (3) cinematic dark stats: clip-wipe + run counters once
    if(statsEl && !statsDone && statsEl.getBoundingClientRect().top < vh * 0.85){
      statsDone = true;
      statsEl.classList.add('is-shown');
      Array.prototype.forEach.call(statsEl.querySelectorAll('[data-count]'), runCounter);
    }
    // (2) steps: play the stepper once when it enters view — connector draws + numbers fire 1→2→3.
    // (auto-play, not scroll-linked: the steps sit on the first screen, so a scroll-progress fill
    //  would complete instantly; a timed sequence on first view actually reads as a demo.)
    if(stepsEl && !stepsPlayed && stepsEl.getBoundingClientRect().top < vh * 0.92){
      stepsPlayed = true;
      requestAnimationFrame(function(){ requestAnimationFrame(function(){
        stepsEl.classList.add('is-playing');
        for(var si = 0; si < stepEls.length; si++){
          (function(el, delay){ setTimeout(function(){ el.classList.add('fired'); }, delay); })(stepEls[si], 300 + si * 480);
        }
      }); });
    }
  }
  var revealTicking = false;
  function onRevealScroll(){
    if(revealTicking) return;
    revealTicking = true;
    requestAnimationFrame(function(){ revealInView(); revealTicking = false; });
  }
  revealInView();
  window.addEventListener('scroll', onRevealScroll, { passive: true });
  window.addEventListener('resize', onRevealScroll, { passive: true });
  window.addEventListener('load', revealInView);
  /* main script works → cancel the head-level reveal-failsafe so scroll reveals actually animate */
  if(window.__revealFailsafe){ clearTimeout(window.__revealFailsafe); }

  /* scroll progress bar (top) */
  var prog = document.querySelector('.scrollprog');
  if(prog){
    var progTick = false;
    function updProg(){
      var d = document.documentElement;
      var max = (d.scrollHeight - d.clientHeight) || 1;
      var p = (window.pageYOffset || d.scrollTop || 0) / max;
      if(p < 0) p = 0; else if(p > 1) p = 1;
      prog.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
    window.addEventListener('scroll', function(){ if(progTick) return; progTick = true; requestAnimationFrame(function(){ updProg(); progTick = false; }); }, { passive: true });
    window.addEventListener('resize', updProg, { passive: true });
    updProg();
  }

  /* multi-layer hero parallax (depth): cream block 0.12x + glow 0.34x + card -0.05x.
     card layer is desktop-only (it has room there and there's no mobile overlap risk).
     card parallax lives on a non-reveal wrapper so it never fights the reveal transform. */
  var heroBg = document.querySelector('.hero__bg');
  var cardWrap = document.querySelector('.hero__cardwrap');
  var deskMq = window.matchMedia ? window.matchMedia('(min-width:940px)') : { matches: false };
  if((heroBg || cardWrap) && !reduceMotion){
    if(heroBg) heroBg.style.willChange = 'transform';
    if(cardWrap) cardWrap.style.willChange = 'transform';
    var hpTick = false;
    function heroPar(){
      var y = window.pageYOffset || 0;
      if(y < 1100){
        if(heroBg){
          heroBg.style.transform = 'translateY(' + (y * 0.12).toFixed(1) + 'px)';
          heroBg.style.setProperty('--glow-y', (y * 0.34).toFixed(1) + 'px');
        }
        if(cardWrap){
          cardWrap.style.transform = deskMq.matches ? 'translateY(' + (y * -0.05).toFixed(1) + 'px)' : '';
        }
      }
    }
    window.addEventListener('scroll', function(){ if(hpTick) return; hpTick = true; requestAnimationFrame(function(){ heroPar(); hpTick = false; }); }, { passive: true });
    heroPar();
  }
 }catch(e){
  /* any runtime error must not leave content hidden */
  Array.prototype.forEach.call(document.querySelectorAll('.reveal,.lfill'), function(el){ el.classList.add('is-visible'); });
  var _s=document.querySelector('.stats'); if(_s){ _s.classList.add('is-shown'); }
  var _st=document.querySelector('.steps'); if(_st){ _st.classList.add('is-playing'); }
 }
})();
