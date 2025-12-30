const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const { authMiddleware: auth } = require('./auth');

// Helper to map camelCase (frontend) to snake_case (database)
const mapToDb = (data, userId) => {
  return {
    owner_id: userId,
    paper_title: data.paperTitle,
    examination: data.examination,
    semester: data.semester,
    academic_year: data.academicYear,
    program: data.program,
    program_name: data.programName,
    course_code: data.courseCode,
    course_name: data.courseName,
    duration: data.duration,
    max_marks: data.maxMarks,
    total_questions: data.totalQuestions,
    course_outcomes: data.courseOutcomes,
    instructions: data.instructions,
    sections: data.sections,
    qp_code: data.qpCode,
    prn_no: data.prnNo,
    jspm_logo: data.jspmLogo,
    rscoe_logo: data.rscoeLogo
  };
};

// Helper to map snake_case (database) to camelCase (frontend)
const mapFromDb = (p) => {
  if (!p) return null;
  return {
    _id: p.id,
    id: p.id,
    owner: p.owner_id,
    paperTitle: p.paper_title,
    examination: p.examination,
    semester: p.semester,
    academicYear: p.academic_year,
    program: p.program,
    programName: p.program_name,
    courseCode: p.course_code,
    courseName: p.course_name,
    duration: p.duration,
    maxMarks: p.max_marks,
    totalQuestions: p.total_questions,
    courseOutcomes: p.course_outcomes,
    instructions: p.instructions,
    sections: p.sections,
    qpCode: p.qp_code,
    prnNo: p.prn_no,
    jspmLogo: p.jspm_logo,
    rscoeLogo: p.rscoe_logo,
    createdAt: p.created_at
  };
};

// POST /api/papers - create
router.post('/', auth, async (req, res) => {
  try {
    const dbData = mapToDb(req.body, req.userId);
    const { data, error } = await supabase
      .from('papers')
      .insert([dbData])
      .select()
      .single();

    if (error) return res.status(400).json({ message: error.message });
    res.json({ paper: mapFromDb(data) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/papers - list for current user
router.get('/', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('papers')
      .select('*')
      .eq('owner_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ message: error.message });
    res.json({ papers: data.map(mapFromDb) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/papers/stats - returns counts for dashboard
router.get('/stats', auth, async (req, res) => {
  try{
    const { count: total, error: countErr } = await supabase
      .from('papers')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', req.userId);

    const { data: all, error: allErr } = await supabase
      .from('papers')
      .select('*')
      .eq('owner_id', req.userId);

    const isComplete = (p) => {
      const hasTitle = (p.paper_title && p.paper_title.trim().length>0) || (p.course_name && p.course_name.trim().length>0);
      const hasQuestions = Array.isArray(p.sections) && p.sections.some(s => Array.isArray(s.questions) && s.questions.some(q => (q.text && q.text.trim().length>0) || (q.marks && q.marks>0)));
      return hasTitle && (p.total_questions && p.total_questions>0) && hasQuestions;
    };
    
    let drafts = 0;
    if (all) {
      for(const p of all) if(!isComplete(p)) drafts++;
    }

    const { count: sharedCount } = await supabase
      .from('shared')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', req.userId);

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', req.userId)
      .single();

    const { count: receivedCount } = await supabase
      .from('shared')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_email', profile?.email || '');

    let latestReceivedAt = null;
    const { data: latestShared } = await supabase
      .from('shared')
      .select('created_at')
      .eq('recipient_email', profile?.email || '')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if(latestShared) latestReceivedAt = latestShared.created_at;

    res.json({ total: total || 0, drafts, shared: sharedCount || 0, received: receivedCount || 0, latestReceivedAt });
  }catch(err){ console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// GET /api/papers/:id - get single
router.get('/:id', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('papers')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ message: 'Not found' });
    if (data.owner_id !== req.userId) return res.status(403).json({ message: 'Forbidden' });
    res.json({ paper: mapFromDb(data) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/papers/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { data: p, error: getErr } = await supabase
      .from('papers')
      .select('owner_id')
      .eq('id', req.params.id)
      .single();

    if (getErr || !p) return res.status(404).json({ message: 'Not found' });
    if (p.owner_id !== req.userId) return res.status(403).json({ message: 'Forbidden' });

    const { error: delErr } = await supabase
      .from('papers')
      .delete()
      .eq('id', req.params.id);

    if (delErr) return res.status(400).json({ message: delErr.message });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
