const router = require("express").Router();
const { register } = require("../controllers/candidate.controller");

router.post("/register", register);
module.exports = router;
