import { Router } from 'express'; import createKey from '../create-key.js'; const router=Router(); router.post('/create-key',createKey); export default router;
