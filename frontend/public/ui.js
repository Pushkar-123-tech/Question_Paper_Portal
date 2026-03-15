// Toast & Modal utilities
(function(){
  function ensureContainer(){
    if(!document.getElementById('toastContainer')){
      const c = document.createElement('div'); c.id='toastContainer'; document.body.appendChild(c);
    }
  }
  window.showToast = function(text, type='info', timeout=3500){
    ensureContainer();
    const el = document.createElement('div'); el.className = 'toast '+type; el.innerText = text;
    document.getElementById('toastContainer').appendChild(el);
    // trigger show
    setTimeout(()=>el.classList.add('show'),10);
    setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(),250); }, timeout);
  }

  window.showModal = function(html){
    const overlay = document.createElement('div'); overlay.className='modal-overlay';
    const m = document.createElement('div'); m.className='modal'; m.innerHTML = html;
    overlay.appendChild(m);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.remove(); });
    return overlay;
  }
  window.closeModal = function(overlay){ if(overlay && overlay.remove) overlay.remove(); }

  window.showConfirm = function(message){
    return new Promise((resolve)=>{
      const html = `<h3>Confirm</h3><div class="muted">${message}</div><div class="modal-actions"><button class="btn ghost" id="confirmNo">No</button><button class="btn primary" id="confirmYes">Yes</button></div>`;
      const overlay = showModal(html);
      overlay.querySelector('#confirmNo').addEventListener('click', ()=>{ overlay.remove(); resolve(false); });
      overlay.querySelector('#confirmYes').addEventListener('click', ()=>{ overlay.remove(); resolve(true); });
    });
  }
})();