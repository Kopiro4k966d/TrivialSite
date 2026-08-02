import { Router } from 'express'; const router=Router(); router.get('/configs',(_req,res)=>res.json({success:true,version:'2.4',minecraft:'1.21.4'})); export default router;
