const router = require("express").Router();
const ctrl = require("../controllers/result.controller");

// Get individual candidate result
router.get("/candidate/:candidateId", ctrl.getResult);

// Get comprehensive results with filters
router.get("/all", ctrl.getAllResults);

// Get trade-wise results
router.get("/trade-wise", ctrl.getTradeWiseResults);

// Get candidate-wise results  
router.get("/candidate-wise", ctrl.getCandidateResults);

module.exports = router;
