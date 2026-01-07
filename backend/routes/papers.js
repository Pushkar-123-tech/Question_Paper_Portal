const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const jwt = require('jsonwebtoken');

const { authMiddleware: auth } = require('./auth');
const roleAuth = require('../middleware/roleAuth');

// POST /api/papers - create or update
router.post('/', auth, async (req, res) => {
  try {
    const data = req.body;
    // Ensure logos are not saved — ignore any provided logo fields
    if (data.jspmLogo) delete data.jspmLogo;
    if (data.rscoeLogo) delete data.rscoeLogo;
    data.owner = req.userId;
    
    if (data.id) {
      // Update existing
      const { data: paper, error } = await supabase
        .from('papers')
        .update(data)
        .eq('id', data.id)
        .eq('owner', req.userId)
        .select()
        .single();
      if (error) throw error;
      return res.json({ paper });
    } else {
      // Create new
      data.status = 'draft';
      const { data: paper, error } = await supabase
        .from('papers')
        .insert([data])
        .select()
        .single();
      if (error) throw error;
      return res.json({ paper });
    }
  } catch (err) {
    console.error('Paper Save Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/papers - list based on role
router.get('/', auth, async (req, res) => {
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.userId)
      .single();

    if (!user || userError) {
      console.warn('User not found in GET /api/papers:', req.userId);
      return res.status(401).json({ message: 'User not found' });
    }

    let query = supabase.from('papers').select('*, owner:users(name, email)');

    if (user.role === 'teacher' || user.role === 'faculty') {
      query = query.eq('owner', req.userId);
    } else if (user.role === 'chairman') {
      query = query.in('status', ['submitted_to_chairman', 'pending_coordinator', 'finalized']);
    } else if (user.role === 'module_coordinator') {
      query = query.in('status', ['pending_coordinator', 'finalized']);
    } else if (user.role === 'admin') {
      // no filter
    }

    const { data: papers, error } = await query.order('createdAt', { ascending: false });
    
    if (error) throw error;
    res.json({ papers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/papers/:id/submit - Teacher -> Chairman
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const { data: paper, error: findError } = await supabase
      .from('papers')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!paper || findError) return res.status(404).json({ message: 'Paper not found' });
    if (String(paper.owner) !== String(req.userId)) return res.status(403).json({ message: 'Forbidden' });

    const newWorkflowHistory = [...(paper.workflowHistory || []), {
      action: 'submitted',
      from: req.userId,
      timestamp: new Date().toISOString()
    }];

    const { data: updatedPaper, error: updateError } = await supabase
      .from('papers')
      .update({ 
        status: 'submitted_to_chairman',
        workflowHistory: newWorkflowHistory
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Notify Chairmen
    const { data: chairmen } = await supabase.from('users').select('id').eq('role', 'chairman');
    if (chairmen) {
      const notifications = chairmen.map(chairman => ({
        recipient: chairman.id,
        sender: req.userId,
        paper: paper.id,
        type: 'workflow_update',
        message: `New question paper submitted: ${paper.paperTitle || paper.courseName}`
      }));
      await supabase.from('notifications').insert(notifications);
    }

    res.json({ message: 'Submitted to Chairman', paper: updatedPaper });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/papers/:id/forward - Chairman -> Coordinator
router.post('/:id/forward', auth, roleAuth(['chairman']), async (req, res) => {
  try {
    const { data: paper, error: findError } = await supabase
      .from('papers')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!paper || findError) return res.status(404).json({ message: 'Paper not found' });

    const newWorkflowHistory = [...(paper.workflowHistory || []), {
      action: 'forwarded',
      from: req.userId,
      timestamp: new Date().toISOString()
    }];

    const { data: updatedPaper, error: updateError } = await supabase
      .from('papers')
      .update({ 
        status: 'pending_coordinator',
        workflowHistory: newWorkflowHistory
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Notify Coordinators
    const { data: coordinators } = await supabase.from('users').select('id').eq('role', 'module_coordinator');
    if (coordinators) {
      const notifications = coordinators.map(coordinator => ({
        recipient: coordinator.id,
        sender: req.userId,
        paper: paper.id,
        type: 'workflow_update',
        message: `Paper forwarded for coordination: ${paper.paperTitle || paper.courseName}`
      }));
      await supabase.from('notifications').insert(notifications);
    }

    res.json({ message: 'Forwarded to Module Coordinator', paper: updatedPaper });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/papers/:id/finalize - Coordinator -> Teacher
router.post('/:id/finalize', auth, roleAuth(['module_coordinator']), async (req, res) => {
  try {
    const { data: paper, error: findError } = await supabase
      .from('papers')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!paper || findError) return res.status(404).json({ message: 'Paper not found' });

    const newWorkflowHistory = [...(paper.workflowHistory || []), {
      action: 'finalized',
      from: req.userId,
      to: paper.owner,
      timestamp: new Date().toISOString()
    }];

    const { data: updatedPaper, error: updateError } = await supabase
      .from('papers')
      .update({ 
        status: 'finalized',
        workflowHistory: newWorkflowHistory
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Notify Teacher
    await supabase.from('notifications').insert([{
      recipient: paper.owner,
      sender: req.userId,
      paper: paper.id,
      type: 'finalized',
      message: `Your paper has been finalized: ${paper.paperTitle || paper.courseName}`
    }]);

    res.json({ message: 'Paper finalized and teacher notified', paper: updatedPaper });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/papers/:id/comment
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const { data: paper, error: findError } = await supabase
      .from('papers')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!paper || findError) return res.status(404).json({ message: 'Paper not found' });

    const { data: user } = await supabase
      .from('users')
      .select('name, role')
      .eq('id', req.userId)
      .single();

    const newComments = [...(paper.comments || []), {
      user: req.userId,
      userName: user.name,
      role: user.role,
      text,
      createdAt: new Date().toISOString()
    }];
    
    const newWorkflowHistory = [...(paper.workflowHistory || []), {
      action: 'commented',
      from: req.userId,
      timestamp: new Date().toISOString()
    }];

    const { data: updatedPaper, error: updateError } = await supabase
      .from('papers')
      .update({ 
        comments: newComments,
        workflowHistory: newWorkflowHistory
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Notify owner if not the owner
    if (String(paper.owner) !== String(req.userId)) {
      await supabase.from('notifications').insert([{
        recipient: paper.owner,
        sender: req.userId,
        paper: paper.id,
        type: 'comment',
        message: `New comment on your paper from ${user.role}: ${text.substring(0, 50)}...`
      }]);
    }

    res.json({ message: 'Comment added', paper: updatedPaper });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/papers/notifications
router.get('/notifications/all', auth, async (req, res) => {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*, sender:users(name, role), paper:papers("paperTitle", "courseName")')
      .eq('recipient', req.userId)
      .order('createdAt', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ notifications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/papers/stats - returns counts for dashboard
router.get('/stats', auth, async (req, res) => {
  try{
    const { count: total } = await supabase
      .from('papers')
      .select('*', { count: 'exact', head: true })
      .eq('owner', req.userId);

    const { data: all } = await supabase
      .from('papers')
      .select('*')
      .eq('owner', req.userId);

    const isComplete = (p) => {
      const hasTitle = (p.paperTitle && p.paperTitle.trim().length>0) || (p.courseName && p.courseName.trim().length>0);
      const hasQuestions = Array.isArray(p.sections) && p.sections.some(s => Array.isArray(s.questions) && s.questions.some(q => (q.text && q.text.trim().length>0) || (q.marks && q.marks>0)));
      return hasTitle && (p.totalQuestions && p.totalQuestions>0) && hasQuestions;
    };
    let drafts = 0;
    if (all) {
      for(const p of all) if(!isComplete(p)) drafts++;
    }

    const { count: shared } = await supabase
      .from('shared')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', req.userId);

    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', req.userId)
      .single();

    const { count: received } = await supabase
      .from('shared')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_email', user.email);

    // include latest received timestamp for notification seen logic
    let latestReceivedAt = null;
    const { data: latest } = await supabase
      .from('shared')
      .select('created_at')
      .eq('recipient_email', user.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if(latest && latest.created_at) latestReceivedAt = latest.created_at;
    
    res.json({ total, drafts, shared, received, latestReceivedAt });
  }catch(err){ console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// GET /api/papers/:id - get single
router.get('/:id', auth, async (req, res) => {
  try {
    const { data: p, error } = await supabase
      .from('papers')
      .select('*, owner:users(id, name, email)')
      .eq('id', req.params.id)
      .single();

    if (!p || error) return res.status(404).json({ message: 'Not found' });
    
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.userId)
      .single();

    // Access control: owner OR (Chairman if submitted+) OR (Coordinator if pending+) OR Admin
    const isOwner = String(p.owner.id) === String(req.userId);
    const isChairman = user.role === 'chairman' && ['submitted_to_chairman', 'pending_coordinator', 'finalized'].includes(p.status);
    const isCoordinator = user.role === 'module_coordinator' && ['pending_coordinator', 'finalized'].includes(p.status);
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isChairman && !isCoordinator && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    res.json({ paper: p });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/papers/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { data: p } = await supabase
      .from('papers')
      .select('owner')
      .eq('id', req.params.id)
      .single();

    if (!p) return res.status(404).json({ message: 'Not found' });
    if (String(p.owner) !== String(req.userId)) return res.status(403).json({ message: 'Forbidden' });
    
    await supabase.from('papers').delete().eq('id', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
