import express from 'express';
import { getPrepStats } from '../services/warService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError } from '../utils/errors.js';
const router = express.Router();
router.get('/prep-stats', asyncHandler(async (req,res) => {
	const clanTag = req.query.tag || process.env.COC_CLAN_TAG;
	if (!clanTag) throw new BadRequestError('clan tag required');
	const includeHeroes = ['1','true','yes'].includes(String(req.query.heroes).toLowerCase());
	const heroSampleSize = Math.min(Number(req.query.heroSampleSize)||30,50);
	const data = await getPrepStats(clanTag, { includeHeroes, heroSampleSize });
	res.json({ success:true, data });
}));

// Push prep stats via socket (placeholder for future Discord webhook integration)
router.post('/push-prep', asyncHandler(async (req,res) => {
	const { clanTag = process.env.COC_CLAN_TAG, includeHeroes=false, heroSampleSize=30 } = req.body||{};
	if (!clanTag) throw new BadRequestError('clan tag required');
	const data = await getPrepStats(clanTag, { includeHeroes: !!includeHeroes, heroSampleSize: Math.min(Number(heroSampleSize)||30,50) });
	try { req.app.get('io')?.emit('war:prepStatsPush', { clanTag, data }); } catch(_){}
	res.json({ success:true, pushed:true, data });
}));
export default router;
