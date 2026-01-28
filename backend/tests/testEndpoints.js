
(async ()=>{
  const PORT = process.env.PORT || 3000;
  const base = process.env.BASE_URL || `http://localhost:${PORT}`;
  const log = console.log;
  const rand = Date.now();
  try{
    log('1) GET /api/health');
    let r = await fetch(base + '/api/health');
    if (!r.ok) throw new Error('/api/health failed');
    log('  ok');

    log('2) POST /api/auth/signup');
    r = await fetch(base + '/api/auth/signup', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name:'Test User', email:`test${rand}@example.com`, password:'password123' }) });
    const signup = await r.json();
    if (!r.ok) { console.error(signup); throw new Error('signup failed'); }
    log('  ok', signup.user.email);

    log('3) POST /api/auth/login');
    r = await fetch(base + '/api/auth/login', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: signup.user.email, password:'password123' }) });
    const login = await r.json();
    if (!r.ok) { console.error(login); throw new Error('login failed'); }
    const token = login.token;
    if (!token) throw new Error('no token returned');
    log('  ok, token received');

    log('3.1) GET /api/auth/me');
    r = await fetch(base + '/api/auth/me', { headers: { 'Authorization': 'Bearer '+token } });
    const me = await r.json();
    if(!r.ok){ console.error(me); throw new Error('/api/auth/me failed'); }
    log('  ok, me', me.user.email);

    log('3.2) PUT /api/auth/me (update name)');
    r = await fetch(base + '/api/auth/me', { method:'PUT', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token }, body: JSON.stringify({ name:'Test User 2' }) });
    const me2 = await r.json(); if(!r.ok){ console.error(me2); throw new Error('update profile failed'); } log('  ok, name updated');

    log('3.3) PUT /api/auth/me/password (change password)');
    r = await fetch(base + '/api/auth/me/password', { method:'PUT', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token }, body: JSON.stringify({ currentPassword:'password123', newPassword:'newpass456' }) });
    const pwdRes = await r.json(); if(!r.ok){ console.error(pwdRes); throw new Error('change password failed'); } log('  ok, password changed');

    log('3.4) Login with new password');
    r = await fetch(base + '/api/auth/login', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: signup.user.email, password:'newpass456' }) });
    const reLogin = await r.json(); if(!r.ok){ console.error(reLogin); throw new Error('login with new password failed'); } log('  ok, login with new password');

    log('4) POST /api/papers (create)');
    const paper = {
      paperTitle: 'Test Paper 1', semester:'I', academicYear:'2025-26', program:'TestProg', programName:'Test Program', courseCode:'T100', courseName:'Testing', duration:'2 Hours', maxMarks:50, totalQuestions:5, courseOutcomes:['CO1'], instructions:['Read carefully'], sections:[{title:'A',questions:[{qno:1,text:'Sample Q',marks:5,bl:'2',co:'CO1'}]}]
    };
    r = await fetch(base + '/api/papers', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}, body: JSON.stringify(paper) });
    const created = await r.json();
    if (!r.ok) { console.error(created); throw new Error('create paper failed'); }
    const paperId = created.paper._id || created.paper.id;
    log('  ok, created id', paperId);

    log('5) GET /api/papers (list)');
    r = await fetch(base + '/api/papers', { headers:{'Authorization':'Bearer '+token} });
    const list = await r.json();
    if (!r.ok) { console.error(list); throw new Error('list failed'); }
    if (!Array.isArray(list.papers)) throw new Error('list response invalid');
    log('  ok, papers count =', list.papers.length);

    log('5.1) GET /api/papers/stats');
    r = await fetch(base + '/api/papers/stats', { headers:{'Authorization':'Bearer '+token} });
    const stats = await r.json();
    if(!r.ok){ console.error(stats); throw new Error('stats failed'); }
    log('  ok, stats =', stats);

    log('6) GET /api/papers/:id (single)');
    r = await fetch(base + '/api/papers/' + paperId, { headers:{'Authorization':'Bearer '+token} });
    const single = await r.json();
    if (!r.ok) { console.error(single); throw new Error('get single failed'); }
    log('  ok, courseName =', single.paper.courseName);

    log('7) DELETE /api/papers/:id');
    r = await fetch(base + '/api/papers/' + paperId, { method:'DELETE', headers:{'Authorization':'Bearer '+token} });
    const del = await r.json();
    if (!r.ok) { console.error(del); throw new Error('delete failed'); }
    log('  ok, deleted');

    log('8) GET deleted /api/papers/:id expect 404');
    r = await fetch(base + '/api/papers/' + paperId, { headers:{'Authorization':'Bearer '+token} });
    if (r.status === 404) { log('  ok, 404 after delete'); }
    else { const dd = await r.json(); console.error(dd); throw new Error('expected 404 after delete'); }

    // Additional: test share flow (create recipient, send to them, recipient sees it)
    log('9) Create recipient user');
    r = await fetch(base + '/api/auth/signup', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name:'Recipient User', email:`recip${rand}@example.com`, password:'password123' }) });
    const recipSignup = await r.json(); if(!r.ok){ console.error(recipSignup); throw new Error('recipient signup failed'); } log('  ok', recipSignup.user.email);

    log('10) Login as first user again');
    r = await fetch(base + '/api/auth/login', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: signup.user.email, password:'password123' }) });
    const sLogin = await r.json(); if(!r.ok) { console.error(sLogin); throw new Error('login failed'); } const sToken = sLogin.token;

    log('11) Create a new paper to share');
    const paper2 = { paperTitle:'Shared Paper 1', semester:'I', academicYear:'2025-26', program:'Test', programName:'Test', courseCode:'S100', courseName:'SharedPaper', duration:'1 Hour', maxMarks:20, totalQuestions:2, sections:[{title:'A',questions:[{qno:1,text:'Q1',marks:10}]}] };
    r = await fetch(base + '/api/papers', { method:'POST', headers: {'Content-Type':'application/json','Authorization':'Bearer '+sToken}, body: JSON.stringify(paper2) });
    const created2 = await r.json(); if(!r.ok){ console.error(created2); throw new Error('create paper2 failed'); } const paper2Id = created2.paper._id;
    log('  ok, paper id', paper2Id);

    log('12) Send share to recipient');
    r = await fetch(base + '/api/share/send', { method:'POST', headers: {'Content-Type':'application/json','Authorization':'Bearer '+sToken}, body: JSON.stringify({ paperId: paper2Id, recipientEmail: recipSignup.user.email, message:'Please review' }) });
    const sendRes = await r.json(); if(!r.ok){ console.error(sendRes); throw new Error('send failed'); } log('  ok, shared', sendRes.shared._id || sendRes.shared.id);

    log('13) Login as recipient and fetch /api/share/received');
    r = await fetch(base + '/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: recipSignup.user.email, password:'password123' }) });
    const recipLogin = await r.json(); if(!r.ok){ console.error(recipLogin); throw new Error('recipient login failed'); } const rToken = recipLogin.token;
    r = await fetch(base + '/api/share/received', { headers: { 'Authorization': 'Bearer '+rToken } }); const recList = await r.json(); if(!r.ok){ console.error(recList); throw new Error('received list failed'); }
    if(!Array.isArray(recList.list) || recList.list.length===0) throw new Error('no received items for recipient'); log('  ok, received count', recList.list.length);

    log('\nAll tests passed ✅');
    process.exit(0);
  }catch(err){
    console.error('\nTest failed:', err.message);
    process.exit(2);
  }
})();
