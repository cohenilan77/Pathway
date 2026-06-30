// Candidate Assignments API
// List and manage assignments for the current candidate

import { getUserIdByToken, getUserById } from '../../lib/db.js';
import { getUserAssignments, getUserAssignmentsByStatus, updateAssignmentStatus } from '../../lib/assignments.js';

function getToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}

export default async function handler(req, res) {
  const token = getToken(req);
  const userId = await getUserIdByToken(token);

  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const user = await getUserById(userId);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const { status, sort = 'dueDate' } = req.query;

      let assignments;
      if (status) {
        assignments = await getUserAssignmentsByStatus(userId, status);
      } else {
        assignments = await getUserAssignments(userId);
      }

      // Sort assignments
      if (sort === 'dueDate') {
        assignments.sort((a, b) => (new Date(a.dueDate) - new Date(b.dueDate)));
      } else if (sort === 'priority') {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        assignments.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      }

      res.status(200).json({ assignments });
    } catch (error) {
      console.error('Error fetching assignments:', error);
      res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { assignmentId, status } = req.body;

      if (!assignmentId || !status) {
        res.status(400).json({ error: 'assignmentId and status are required' });
        return;
      }

      const updated = await updateAssignmentStatus(assignmentId, status);
      if (!updated) {
        res.status(404).json({ error: 'Assignment not found' });
        return;
      }

      res.status(200).json({ assignment: updated });
    } catch (error) {
      console.error('Error updating assignment:', error);
      res.status(500).json({ error: 'Failed to update assignment' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
