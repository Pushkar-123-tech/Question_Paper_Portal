const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const supabase = require('../supabaseClient');
const { sendPaperCreationEmail } = require('../services/emailService');






const toSnake = (p) => ({
  owner: p.owner,
  paper_title: p.paperTitle,
  base_title: p.baseTitle, 
  examination: p.examination,
  semester: p.semester,
  academic_year: p.academicYear,
  program: p.program,
  program_name: p.programName,
  course_code: p.courseCode,
  course_name: p.courseName,
  duration: p.duration,
  max_marks: p.maxMarks,
  total_questions: p.totalQuestions,
  course_outcomes: p.courseOutcomes,
  instructions: p.instructions,
  sections: p.sections,
  qp_code: p.qpCode,
  prn_no: p.prnNo,
  status: p.status,
  comments: p.comments,
  workflow_history: p.workflowHistory,
});

// convert snake_case DB rows to camelCase expected by frontend
const toCamel = (r = {}) => ({
  id: r.id,
  owner: r.owner,
  paperTitle: r.paper_title || r.paperTitle || '',
  examination: r.examination || r.examination || '',
  semester: r.semester || '',
  academicYear: r.academic_year || r.academicYear || '',
  program: r.program || '',
  programName: r.program_name || r.programName || '',
  courseCode: r.course_code || r.courseCode || '',
  courseName: r.course_name || r.courseName || '',
  duration: r.duration || '',
  maxMarks: r.max_marks || r.maxMarks || 0,
  totalQuestions: r.total_questions || r.totalQuestions || 0,
  courseOutcomes: r.course_outcomes || r.courseOutcomes || [],
  instructions: r.instructions || r.instructions || [],
  sections: r.sections || r.sections || [],
  qpCode: r.qp_code || r.qpCode || '',
  prnNo: r.prn_no || r.prnNo || '',
  status: r.status || '',
  comments: r.comments || r.comments || [],
  baseTitle: r.base_title || r.baseTitle || '',
  workflowHistory: r.workflow_history || r.workflowHistory || [],
  createdAt: r.created_at || r.createdAt,
  updatedAt: r.updated_at || r.updatedAt,
});


// simple auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'Unauthorized' });
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = payload.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

// POST /api/papers - create
// router.post('/', auth, async (req, res) => {
//   try {
//     const data = req.body;
//     // Ensure logos are not saved — ignore any provided logo fields
//     if (data.jspmLogo) delete data.jspmLogo;
//     if (data.rscoeLogo) delete data.rscoeLogo;
//     data.owner = req.userId;
//     const paper = new Paper(data);
//     await paper.save();
//     res.json({ paper });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // GET /api/papers - list for current user
// router.get('/', auth, async (req, res) => {
//   try {
//     const papers = await Paper.find({ owner: req.userId }).sort({ createdAt: -1 });
//     res.json({ papers });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // GET /api/papers/stats - returns counts for dashboard
// router.get('/stats', auth, async (req, res) => {
//   try{
//     const total = await Paper.countDocuments({ owner: req.userId });
//     const all = await Paper.find({ owner: req.userId }).lean();
//     const isComplete = (p) => {
//       const hasTitle = (p.paperTitle && p.paperTitle.trim().length>0) || (p.courseName && p.courseName.trim().length>0);
//       const hasQuestions = Array.isArray(p.sections) && p.sections.some(s => Array.isArray(s.questions) && s.questions.some(q => (q.text && q.text.trim().length>0) || (q.marks && q.marks>0)));
//       return hasTitle && (p.totalQuestions && p.totalQuestions>0) && hasQuestions;
//     };
//     let drafts = 0;
//     for(const p of all) if(!isComplete(p)) drafts++;
//     const shared = await Shared.countDocuments({ senderId: req.userId });
//     const user = await User.findById(req.userId).lean();
//     const received = user && user.email ? await Shared.countDocuments({ recipientEmail: user.email }) : 0;
//     // include latest received timestamp for notification seen logic
//     let latestReceivedAt = null;
//     if(user && user.email){
//       const latest = await Shared.findOne({ recipientEmail: user.email }).sort({ createdAt: -1 }).lean();
//       if(latest && latest.createdAt) latestReceivedAt = latest.createdAt;
//     }
//     res.json({ total, drafts, shared, received, latestReceivedAt });
//   }catch(err){ console.error(err); res.status(500).json({ message: 'Server error' }); }
// });

// // GET /api/papers/:id - get single
// router.get('/:id', auth, async (req, res) => {
//   try {
//     const p = await Paper.findById(req.params.id);
//     if (!p) return res.status(404).json({ message: 'Not found' });
//     if (String(p.owner) !== String(req.userId)) return res.status(403).json({ message: 'Forbidden' });
//     res.json({ paper: p });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // DELETE /api/papers/:id
// router.delete('/:id', auth, async (req, res) => {
//   try {
//     const p = await Paper.findById(req.params.id);
//     if (!p) return res.status(404).json({ message: 'Not found' });
//     if (String(p.owner) !== String(req.userId)) return res.status(403).json({ message: 'Forbidden' });
//     await p.deleteOne();
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });















// Add timeout error handling middleware
router.use((req, res, next) => {
  // Set response timeout for Vercel (default is 10s, max is 60s)
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ message: 'Request timeout' });
    }
  }, 45000); // 45 second timeout

  res.on('finish', () => clearTimeout(timeout));
  res.on('close', () => clearTimeout(timeout));
  next();
});

router.post('/', auth, async (req, res) => {
  try {
    const data = req.body;
    data.owner = req.userId; // ensure owner is always set

    // If an `id` is provided in the payload, update the existing paper
    if (data.id) {
      // verify ownership
      const { data: existing, error: fetchErr } = await supabase.from('papers').select('owner').eq('id', data.id).single();
      if (fetchErr || !existing) return res.status(404).json({ message: 'Not found' });
      if (String(existing.owner) !== String(req.userId)) return res.status(403).json({ message: 'Forbidden' });

      const { data: updated, error: updErr } = await supabase
        .from('papers')
        .update(toSnake(data))
        .eq('id', data.id)
        .select()
        .single();

      if (updErr) {
        console.error('Supabase update error:', updErr);
        return res.status(500).json({ message: 'Failed to update paper' });
      }

      return res.json({ paper: toCamel(updated) });
    }

    // Otherwise create a new paper
    const { data: paper, error } = await supabase
      .from('papers')
      .insert([toSnake(data)])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ message: 'Failed to save paper' });
    }

    // Send paper creation notification to all admin/faculty/coordinator roles (non-blocking)
    const { data: user } = await supabase.from('users').select('*').eq('id', req.userId).single();
    if (user) {
      const { data: recipients } = await supabase.from('users').select('*').in('role', ['admin', 'faculty', 'module_coordinator', 'chairman']);

      console.log(`📄 Paper saved by ${user.name} (${user.email})`);
      console.log(`📬 Found ${recipients ? recipients.length : 0} recipients to notify`);

      const paperTitle = data.paperTitle || data.courseName || 'Untitled Paper';

      // Send emails asynchronously without blocking the response
      if (recipients && recipients.length > 0) {
        setImmediate(async () => {
          for (const recipient of recipients) {
            try {
              console.log(`📧 Sending email to ${recipient.email} (${recipient.role})...`);
              await sendPaperCreationEmail({
                userEmail: user.email,
                userName: user.name,
                paperTitle: paperTitle,
                recipientEmail: recipient.email,
                recipientRole: recipient.role
              });
            } catch (emailErr) {
              console.error(`❌ Failed to send email to ${recipient.email}:`, emailErr.message);
            }
          }
        });
      }
    } else {
      console.log('⚠️  User not found for paper save');
    }

    res.json({ paper: toCamel(paper) });

  } catch (err) {
    console.error("❌ Save Error:", err);
    res.status(400).json({ message: err.message });
  }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const { data: papers, error } = await supabase
      .from('papers')
      .select('*')
      .eq('owner', req.userId);

    if (error) throw error;

    const total = papers ? papers.length : 0;
    res.json({ total });

  } catch (err) {
    console.error("❌ Stats Error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { data: papers, error } = await supabase
      .from('papers')
      .select('*')
      .eq('owner', req.userId)
     .order('created_at', { ascending: false })


    if (error) throw error;

    res.json({ papers: (papers || []).map(toCamel) });

  } catch (err) {
    console.error("❌ Fetch Error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/papers/:id - get single (owner or shared recipient can view)
router.get('/:id', auth, async (req, res) => {
  try {
    const { data: paper, error } = await supabase
      .from('papers')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!paper) return res.status(404).json({ message: 'Not found' });

    // Owner can always view
    if (String(paper.owner) === String(req.userId)) return res.json({ paper: toCamel(paper) });

    // Fetch user to check email for shared access
    const { data: user } = await supabase.from('users').select('email,role').eq('id', req.userId).single();

    if (user && user.email) {
      const { data: shared } = await supabase
        .from('shared')
        .select('*')
        .eq('paper_id', req.params.id)
        .eq('recipient_email', user.email)
        .single();

      if (shared) return res.json({ paper: toCamel(paper) });
    }

    // Forbidden otherwise
    return res.status(403).json({ message: 'Forbidden' });

  } catch (err) {
    console.error("❌ Fetch single Error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/papers/:id - owner only
router.delete('/:id', auth, async (req, res) => {
  try {
    const { data: paper } = await supabase
      .from('papers')
      .select('owner')
      .eq('id', req.params.id)
      .single();

    if (!paper) return res.status(404).json({ message: 'Not found' });
    if (String(paper.owner) !== String(req.userId)) return res.status(403).json({ message: 'Forbidden' });

    const { error } = await supabase.from('papers').delete().eq('id', req.params.id);
    if (error) throw error;

    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error("❌ Delete Error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/papers/:id/submit - faculty submits to DGCA
router.post('/:id/submit', auth, async (req, res) => {
  try {
    // ensure paper exists and user owns it
    const { data: paper, error } = await supabase.from('papers').select('*').eq('id', req.params.id).single();
    if (error || !paper) return res.status(404).json({ message: 'Not found' });
    if (String(paper.owner) !== String(req.userId)) return res.status(403).json({ message: 'Forbidden' });

    const newHistory = (paper.workflow_history || []).concat([{ action: 'submitted_to_dgca', by: req.userId, at: new Date().toISOString() }]);
    const { error: updErr } = await supabase
      .from('papers')
      .update({ status: 'submitted_to_dgca', workflow_history: newHistory })
      .eq('id', req.params.id);
    if (updErr) throw updErr;

    res.json({ message: 'Submitted', status: 'submitted_to_dgca' });
  } catch (err) {
    console.error('❌ Submit Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/papers/:id/finalize - DGCA finalizes and notifies external
router.post('/:id/finalize', auth, async (req, res) => {
  try {
    const { data: paper } = await supabase.from('papers').select('*').eq('id', req.params.id).single();
    if (!paper) return res.status(404).json({ message: 'Not found' });

    // fetch user role
    const { data: user } = await supabase.from('users').select('role').eq('id', req.userId).single();
    if (!user || user.role !== 'dgca') return res.status(403).json({ message: 'Forbidden' });

    const newHistory = (paper.workflow_history || []).concat([{ action: 'finalized', by: req.userId, at: new Date().toISOString() }]);
    const { error: updErr } = await supabase
      .from('papers')
      .update({ status: 'finalized', workflow_history: newHistory })
      .eq('id', req.params.id);
    if (updErr) throw updErr;

    // Optionally could notify external users here (omitted for brevity)

    res.json({ message: 'Finalized', status: 'finalized' });
  } catch (err) {
    console.error('❌ Finalize Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});









module.exports = router;