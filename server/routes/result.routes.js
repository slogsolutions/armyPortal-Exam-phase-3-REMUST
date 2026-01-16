const router = require("express").Router();
const ctrl = require("../controllers/result.controller");

router.get("/:candidateId", ctrl.getResult);

module.exports = router;
