const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const { authMiddleware: auth } = require('./auth');

// Helper to map DB paper to frontend format
const mapFromDb = (p) => {
  if (!p) return null;
  return {
    ...p,
    id: p.id,
  };
};

// POST /api/papers - create
router.post('/', auth, async (req, res) => {
  try {
    const { data: paper, error } = await supabase
      .from('papers')
      .insert([{
        ...req.body,
        owner_id: req.userId
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ paper: mapFromDb(paper) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/papers - list for current user
router.get('/', auth, async (req, res) => {
  try {
    const { data: papers, error } = await supabase
      .from('papers')
      .select('*')
      .eq('owner_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ papers: papers.map(mapFromDb) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/papers/stats - returns counts for dashboard
router.get('/stats', auth, async (req, res) => {
  try {
    // Total papers
    const { count: total, error: totalError } = await supabase
      .from('papers')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', req.userId);

    // All papers for draft logic
    const { data: all, error: allDocsError } = await supabase
      .from('papers')
      .select('*')
      .eq('owner_id', req.userId);

    const isComplete = (p) => {
      const hasTitle = (p.paper_title && p.paper_title.trim().length > 0) || (p.course_name && p.course_name.trim().length > 0);
      const hasQuestions = Array.isArray(p.sections) && p.sections.some(s => Array.isArray(s.questions) && s.questions.some(q => (q.text && q.text.trim().length > 0) || (q.marks && q.marks > 0)));
      return hasTitle && (p.total_questions && p.total_questions > 0) && hasQuestions;
    };
    
    let drafts = 0;
    if (all) {
      for (const p of all) if (!isComplete(p)) drafts++;
    }

    // Shared count
    const { count: sharedCount, error: sharedError } = await supabase
      .from('shared')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', req.userId);

    // User for received count
    const { data: user } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', req.userId)
      .single();

    const { count: receivedCount } = await supabase
      .from('shared')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_email', user?.email || '');

    const { data: latestShared } = await supabase
      .from('shared')
      .select('created_at')
      .eq('recipient_email', user?.email || '')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    res.json({ 
      total: total || 0, 
      drafts, 
      shared: sharedCount || 0, 
      received: receivedCount || 0, 
      latestReceivedAt: latestShared ? latestShared.created_at : null 
    });
  } catch (err) { 
    console.error(err); 
    res.status(500).json({ message: 'Server error' }); 
  }
});

// GET /api/papers/:id - get single
router.get('/:id', auth, async (req, res) => {
  try {
    const { data: paper, error } = await supabase
      .from('papers')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !paper) return res.status(404).json({ message: 'Not found' });
    if (paper.owner_id !== req.userId) return res.status(403).json({ message: 'Forbidden' });
    res.json({ paper: mapFromDb(paper) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/papers/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { data: paper, error: fetchError } = await supabase
      .from('papers')
      .select('owner_id')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !paper) return res.status(404).json({ message: 'Not found' });
    if (paper.owner_id !== req.userId) return res.status(403).json({ message: 'Forbidden' });

    const { error: deleteError } = await supabase
      .from('papers')
      .delete()
      .eq('id', req.params.id);

    if (deleteError) throw deleteError;
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
