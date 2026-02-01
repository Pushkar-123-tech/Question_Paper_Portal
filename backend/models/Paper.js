const supabase = require('../supabaseClient');

// Supabase-backed Paper helper to replace Mongoose model.
// Provides minimal API used by routes/tests: create, find, findById, deleteById, countDocuments



const toSnake = (p) => ({
  owner: p.owner,
  paper_title: p.paperTitle,
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

const create = async (data) => {
  const { data: paper, error } = await supabase
    .from('papers')
    .insert([toSnake(data)])
    .select()
    .single();

  if (error) throw error;
  return paper;
};


const find = async (filter = {}, options = {}) => {
  let query = supabase.from('papers').select('*');

  if (filter.owner) {
    query = query.eq('owner', filter.owner);
  }

  // ✅ FIXED: using correct column name
  if (options.order === 'created_desc') {
  query = query.order('created_at', { ascending: false });
}


  const { data: papers, error } = await query;

  if (error) throw error;
  return papers || [];
};

const findById = async (id) => {
  const { data: paper, error } = await supabase
    .from('papers')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // no rows found
  return paper || null;
};

const deleteById = async (id) => {
  const { error } = await supabase
    .from('papers')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

const countDocuments = async (filter = {}) => {
  let query = supabase
    .from('papers')
    .select('id', { count: 'exact', head: true });

  if (filter.owner) {
    query = query.eq('owner', filter.owner);
  }

  const { error, count } = await query;

  if (error) throw error;
  return count || 0;
};

module.exports = {
  create,
  find,
  findById,
  deleteById,
  countDocuments,
};
