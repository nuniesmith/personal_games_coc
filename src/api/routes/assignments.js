import express from 'express';
import { generateAssignments } from '../services/assignmentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError } from '../utils/errors.js';
const router = express.Router();
router.post('/generate', asyncHandler(async (req,res) => {
	const { clanTag = process.env.COC_CLAN_TAG, warSize, algorithm } = req.body||{};
	if (!clanTag) throw new BadRequestError('clanTag required');
	const data = await generateAssignments({ clanTag, warSize, algorithm });
	// Emit socket event for UI live updates (non-blocking)
	try { req.app.get('io')?.emit('assignments:generated', { clanTag, payload: data }); } catch(_){}
	res.json({ success:true, data });
}));
export default router;
