const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');
const { authMiddleware } = require('./users');


router.get('/', authMiddleware, async (req, res) => {
  const projects = await Project.find().populate('leader teamMembers');
  res.render('projects/index', { projects, user: req.user });
});


router.get('/my-lead', authMiddleware, async (req, res) => {
  const projects = await Project.find({ leader: req.user._id }).populate('leader teamMembers');
  res.render('projects/my_lead', { projects, user: req.user });
});


router.get('/my-team', authMiddleware, async (req, res) => {
  const projects = await Project.find({ teamMembers: req.user._id }).populate('leader teamMembers');
  res.render('projects/my_team', { projects, user: req.user });
});

router.get('/archive', authMiddleware, async (req, res) => {
  const projects = await Project.find({
    $or: [{ leader: req.user._id }, { teamMembers: req.user._id }],
    archived: true
  }).populate('leader teamMembers');
  res.render('projects/archive', { projects, user: req.user });
});


router.get('/new', authMiddleware, (req, res) => {
  res.render('projects/new', { user: req.user, error: null });
});


router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, price, tasks, startDate, endDate } = req.body;
    if (!name || !description || !price || !startDate || !endDate) {
      return res.render('projects/new', { user: req.user, error: 'All required fields must be filled' });
    }
    await Project.create({
      name,
      description,
      price: Number(price),
      tasks: tasks || '',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      leader: req.user._id
    });
    res.redirect('/projects');
  } catch (error) {
    res.render('projects/new', { user: req.user, error: 'Error creating project' });
  }
});


router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('leader teamMembers');
    if (!project) {
      return res.redirect('/projects');
    }
    const users = await User.find({ _id: { $nin: [req.user._id, project.leader._id, ...project.teamMembers] } });
    res.render('projects/show', { project, user: req.user, users });
  } catch (error) {
    res.redirect('/projects');
  }
});


router.get('/:id/edit', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('leader');
    if (!project || project.leader._id.toString() !== req.user._id.toString()) {
      return res.redirect('/projects');
    }
    res.render('projects/edit', { project, user: req.user });
  } catch (error) {
    res.redirect('/projects');
  }
});


router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project || project.leader._id.toString() !== req.user._id.toString()) {
      return res.redirect('/projects');
    }
    const { name, description, price, tasks, startDate, endDate, archived } = req.body;
    if (!name || !description || !price || !startDate || !endDate) {
      return res.redirect('/projects');
    }
    await Project.findByIdAndUpdate(req.params.id, {
      name,
      description,
      price: Number(price),
      tasks: tasks || '',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      archived: archived === 'on'
    });
    res.redirect('/projects/' + req.params.id);
  } catch (error) {
    res.redirect('/projects');
  }
});


router.put('/:id/tasks', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('teamMembers');
    if (!project || (!project.teamMembers.some(m => m._id.toString() === req.user._id.toString()) && project.leader._id.toString() !== req.user._id.toString())) {
      return res.redirect('/projects');
    }
    await Project.findByIdAndUpdate(req.params.id, { tasks: req.body.tasks || '' });
    res.redirect('/projects/' + req.params.id);
  } catch (error) {
    res.redirect('/projects');
  }
});


router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project || project.leader._id.toString() !== req.user._id.toString()) {
      return res.redirect('/projects');
    }
    await Project.findByIdAndDelete(req.params.id);
    res.redirect('/projects');
  } catch (error) {
    res.redirect('/projects');
  }
});

router.post('/:id/team', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project || project.leader._id.toString() !== req.user._id.toString()) {
      return res.redirect('/projects');
    }
    const userId = req.body.userId;
    if (userId && !project.teamMembers.includes(userId)) {
      project.teamMembers.push(userId);
      await project.save();
    }
    res.redirect('/projects/' + req.params.id);
  } catch (error) {
    res.redirect('/projects');
  }
});


router.post('/:id/archive', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project || project.leader._id.toString() !== req.user._id.toString()) {
      return res.redirect('/projects');
    }
    project.archived = true;
    await project.save();
    res.redirect('/projects/' + req.params.id);
  } catch (error) {
    res.redirect('/projects');
  }
});

module.exports = router;