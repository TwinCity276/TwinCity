import { Router, type IRouter } from "express";
import healthRouter from "./health";
import civicRouter from "./civic";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(civicRouter);
router.use(storageRouter);

export default router;
